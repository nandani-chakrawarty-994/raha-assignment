import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DaySession } from "@/models/DaySession";
import {
  badRequest,
  forbidden,
  getSessionUser,
  requireRole,
  unauthorized,
} from "@/lib/auth";
import { startDaySchema } from "@/lib/validations";
import { toLocalDateKey } from "@/lib/utils";
import { buildDayPayload } from "@/lib/day-payload";
import { idStr } from "@/lib/ids";

/** GET current open day, or a specific local date */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!requireRole(user, ["sales_associate"])) {
    return forbidden("Only sales associates can view their own day here");
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  let session = await DaySession.findOne({
    userId: user.id,
    status: "open",
  }).sort({ createdAt: -1 });

  if (!session && date) {
    session = await DaySession.findOne({ userId: user.id, localDate: date }).sort({
      createdAt: -1,
    });
  }

  if (!session) {
    return NextResponse.json({ day: null });
  }

  const day = await buildDayPayload(String(session._id));
  return NextResponse.json({ day });
}

/** Start Day */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!requireRole(user, ["sales_associate"])) {
    return forbidden("Only sales associates can start a day");
  }

  try {
    const body = await req.json();
    const parsed = startDaySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Invalid start-day payload", parsed.error.flatten());
    }

    const { location, timezoneOffsetMinutes } = parsed.data;
    const capturedAt = location.capturedAt
      ? new Date(location.capturedAt)
      : new Date();

    if (Number.isNaN(capturedAt.getTime())) {
      return badRequest("Invalid capturedAt timestamp");
    }

    await connectDB();

    const existingOpen = await DaySession.findOne({
      userId: user.id,
      status: "open",
    });

    if (existingOpen) {
      return NextResponse.json(
        {
          error: "You already have an open day. End it before starting a new one.",
          dayId: idStr(existingOpen._id),
        },
        { status: 409 }
      );
    }

    const localDate = toLocalDateKey(capturedAt, timezoneOffsetMinutes);

    const session = await DaySession.create({
      userId: user.id,
      status: "open",
      startLocation: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters ?? null,
        capturedAt,
      },
      totalDistanceKm: 0,
      distanceProvider: "none",
      localDate,
      timezoneOffsetMinutes,
    });

    const day = await buildDayPayload(String(session._id));
    return NextResponse.json({ day }, { status: 201 });
  } catch (error) {
    console.error("POST /api/day", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
