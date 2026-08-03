import { Types } from "mongoose";
import { DaySession } from "@/models/DaySession";
import { Activity } from "@/models/Activity";
import { idStr } from "@/lib/ids";

export async function buildDayPayload(sessionId: string) {
  const session = await DaySession.findById(sessionId).lean();
  if (!session) return null;

  const activities = await Activity.find({ daySessionId: session._id })
    .sort({ "location.capturedAt": 1 })
    .populate("leadId", "name contact location")
    .lean();

  return {
    id: idStr(session._id),
    userId: idStr(session.userId),
    status: session.status,
    localDate: session.localDate,
    timezoneOffsetMinutes: session.timezoneOffsetMinutes,
    startLocation: session.startLocation,
    endLocation: session.endLocation ?? null,
    totalDistanceKm: session.totalDistanceKm,
    distanceProvider: session.distanceProvider,
    createdAt: session.createdAt,
    activities: activities.map((a) => {
      const lead = a.leadId as unknown as {
        _id: Types.ObjectId;
        name: string;
        contact: string;
        location: { latitude: number; longitude: number; address?: string };
      } | null;

      return {
        id: idStr(a._id),
        type: a.type,
        notes: a.notes,
        location: a.location,
        segmentDistanceKm: a.segmentDistanceKm,
        lead: lead
          ? {
              id: idStr(lead._id),
              name: lead.name,
              contact: lead.contact,
              location: lead.location,
            }
          : null,
      };
    }),
  };
}
