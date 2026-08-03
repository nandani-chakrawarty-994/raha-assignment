import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DaySession } from "@/models/DaySession";
import { Activity } from "@/models/Activity";
import {
  badRequest,
  forbidden,
  getSessionUser,
  requireRole,
  unauthorized,
} from "@/lib/auth";
import { endDaySchema } from "@/lib/validations";
import { calculateRouteDistance } from "@/lib/distance";
import { buildDayPayload } from "@/lib/day-payload";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!requireRole(user, ["sales_associate"])) {
    return forbidden("Only sales associates can end a day");
  }

  try {
    const body = await req.json();
    const parsed = endDaySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid end-day payload", parsed.error.flatten());
    }

    const { location } = parsed.data;
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
        { error: "No open day to end. Start a day first." },
        { status: 409 }
      );
    }

    if (capturedAt.getTime() < new Date(session.startLocation.capturedAt).getTime()) {
      return badRequest("End time cannot be before start time");
    }

    const activities = await Activity.find({ daySessionId: session._id })
      .sort({ "location.capturedAt": 1 })
      .lean();

    const routePoints = [
      {
        latitude: session.startLocation.latitude,
        longitude: session.startLocation.longitude,
        capturedAt: session.startLocation.capturedAt,
      },
      ...activities.map((a) => ({
        latitude: a.location.latitude,
        longitude: a.location.longitude,
        capturedAt: a.location.capturedAt,
      })),
      {
        latitude: location.latitude,
        longitude: location.longitude,
        capturedAt,
      },
    ];

    const { totalKm, segmentsKm, provider } = await calculateRouteDistance(routePoints);

    for (let i = 0; i < activities.length; i++) {
      await Activity.updateOne(
        { _id: activities[i]._id },
        { $set: { segmentDistanceKm: segmentsKm[i] ?? 0 } }
      );
    }

    session.endLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: location.accuracyMeters ?? null,
      capturedAt,
    };
    session.status = "closed";
    session.totalDistanceKm = totalKm;
    session.distanceProvider = provider;
    await session.save();

    const day = await buildDayPayload(String(session._id));
    return NextResponse.json({ day });
  } catch (error) {
    console.error("POST /api/day/end", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
