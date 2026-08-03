import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { DaySession } from "@/models/DaySession";
import { Activity } from "@/models/Activity";
import {
  forbidden,
  getSessionUser,
  requireRole,
  unauthorized,
} from "@/lib/auth";
import { buildDayPayload } from "@/lib/day-payload";
import { idStr } from "@/lib/ids";

/** Branch head: team activities + per-associate distance for a day */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!requireRole(user, ["branch_head"])) {
    return forbidden("Only branch heads can view team activity");
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const associateId = searchParams.get("associateId");

  const associates = await User.find({
    role: "sales_associate",
    reportsTo: user.id,
  })
    .select("name email")
    .lean();

  const associateIds = associates.map((a) => a._id);
  const associateMap = new Map(associates.map((a) => [idStr(a._id), a]));

  if (associateId) {
    if (!associateMap.has(associateId)) {
      return forbidden("Associate is not on your team");
    }
  }

  const sessionQuery: Record<string, unknown> = {
    userId: associateId ? associateId : { $in: associateIds },
  };
  if (date) {
    sessionQuery.localDate = date;
  }

  const sessions = await DaySession.find(sessionQuery)
    .sort({ "startLocation.capturedAt": -1 })
    .limit(100)
    .lean();

  const days: Array<
    NonNullable<Awaited<ReturnType<typeof buildDayPayload>>> & {
      associate: { id: string; name: string; email: string } | null;
    }
  > = [];
  for (const session of sessions) {
    const payload = await buildDayPayload(idStr(session._id));
    if (!payload) continue;
    const associate = associateMap.get(idStr(session.userId));
    days.push({
      ...payload,
      associate: associate
        ? {
            id: idStr(associate._id),
            name: associate.name,
            email: associate.email,
          }
        : null,
    });
  }

  const activityQuery: Record<string, unknown> = {
    userId: associateId ? associateId : { $in: associateIds },
  };
  if (date) {
    const dayIds = sessions.map((s) => s._id);
    activityQuery.daySessionId = { $in: dayIds };
  }

  const activities = await Activity.find(activityQuery)
    .sort({ "location.capturedAt": -1 })
    .limit(200)
    .populate("leadId", "name contact")
    .lean();

  const feed = activities.map((a) => {
    const associate = associateMap.get(idStr(a.userId));
    const lead = a.leadId as unknown as {
      _id: unknown;
      name: string;
      contact: string;
    } | null;
    return {
      id: idStr(a._id),
      notes: a.notes,
      type: a.type,
      location: a.location,
      segmentDistanceKm: a.segmentDistanceKm,
      associate: associate
        ? { id: idStr(associate._id), name: associate.name }
        : null,
      lead: lead
        ? { id: idStr(lead._id), name: lead.name, contact: lead.contact }
        : null,
    };
  });

  const distanceByAssociate = associates.map((a) => {
    const theirDays = days.filter((d) => d.userId === idStr(a._id));
    const total = theirDays.reduce((sum, d) => sum + (d.totalDistanceKm || 0), 0);
    return {
      id: idStr(a._id),
      name: a.name,
      email: a.email,
      dayCount: theirDays.length,
      totalDistanceKm: Math.round(total * 100) / 100,
      days: theirDays.map((d) => ({
        id: d.id,
        localDate: d.localDate,
        status: d.status,
        totalDistanceKm: d.totalDistanceKm,
      })),
    };
  });

  return NextResponse.json({
    associates: associates.map((a) => ({
      id: idStr(a._id),
      name: a.name,
      email: a.email,
    })),
    days,
    feed,
    distanceByAssociate,
  });
}
