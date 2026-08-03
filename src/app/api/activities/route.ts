import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DaySession } from "@/models/DaySession";
import { Activity } from "@/models/Activity";
import { Lead } from "@/models/Lead";
import {
  badRequest,
  forbidden,
  getSessionUser,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth";
import { addActivitySchema } from "@/lib/validations";
import { calculateRouteDistance } from "@/lib/distance";
import { buildDayPayload } from "@/lib/day-payload";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!requireRole(user, ["sales_associate"])) {
    return forbidden("Only sales associates can log activities");
  }

  try {
    const body = await req.json();
    const parsed = addActivitySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid activity payload", parsed.error.flatten());
    }

    const { leadId, notes, location } = parsed.data;
    const capturedAt = location.capturedAt
      ? new Date(location.capturedAt)
      : new Date();

    if (Number.isNaN(capturedAt.getTime())) {
      return badRequest("Invalid capturedAt timestamp");
    }

    await connectDB();

    const session = await DaySession.findOne({
      userId: user.id,
      status: "open",
    });

    if (!session) {
      return NextResponse.json(
        { error: "No open day. Start your day before logging activities." },
        { status: 409 }
      );
    }

    if (session.status === "closed") {
      return NextResponse.json(
        { error: "Cannot log activity after the day has ended." },
        { status: 409 }
      );
    }

    if (capturedAt.getTime() < new Date(session.startLocation.capturedAt).getTime()) {
      return badRequest("Activity time cannot be before day start");
    }

    const lead = await Lead.findById(leadId);
    if (!lead) return notFound("Lead not found");

    // Segment distance from last route point (start or previous activity)
    const previousActivities = await Activity.find({ daySessionId: session._id })
      .sort({ "location.capturedAt": -1 })
      .limit(1)
      .lean();

    const prevPoint = previousActivities[0]
      ? {
          latitude: previousActivities[0].location.latitude,
          longitude: previousActivities[0].location.longitude,
          capturedAt: previousActivities[0].location.capturedAt,
        }
      : {
          latitude: session.startLocation.latitude,
          longitude: session.startLocation.longitude,
          capturedAt: session.startLocation.capturedAt,
        };

    const { totalKm, segmentsKm, provider } = await calculateRouteDistance([
      prevPoint,
      {
        latitude: location.latitude,
        longitude: location.longitude,
        capturedAt,
      },
    ]);

    const activity = await Activity.create({
      daySessionId: session._id,
      userId: user.id,
      type: "in_person_meeting",
      leadId: lead._id,
      notes,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters ?? null,
        capturedAt,
      },
      segmentDistanceKm: segmentsKm[0] ?? totalKm,
    });

    // Keep running total on open day (finalised again on end)
    const allActivities = await Activity.find({ daySessionId: session._id })
      .sort({ "location.capturedAt": 1 })
      .lean();

    const running = await calculateRouteDistance([
      {
        latitude: session.startLocation.latitude,
        longitude: session.startLocation.longitude,
        capturedAt: session.startLocation.capturedAt,
      },
      ...allActivities.map((a) => ({
        latitude: a.location.latitude,
        longitude: a.location.longitude,
        capturedAt: a.location.capturedAt,
      })),
    ]);

    session.totalDistanceKm = running.totalKm;
    session.distanceProvider = running.provider;
    await session.save();

    void activity;
    void provider;

    const day = await buildDayPayload(String(session._id));
    return NextResponse.json({ day }, { status: 201 });
  } catch (error) {
    console.error("POST /api/activities", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
