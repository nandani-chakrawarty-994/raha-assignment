import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DaySession } from "@/models/DaySession";
import {
  forbidden,
  getSessionUser,
  requireRole,
  unauthorized,
} from "@/lib/auth";
import { buildDayPayload } from "@/lib/day-payload";
import { idStr } from "@/lib/ids";

/** Associate: list own day history */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!requireRole(user, ["sales_associate"])) {
    return forbidden("Only sales associates can view their history here");
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 30), 90);

  const sessions = await DaySession.find({ userId: user.id })
    .sort({ "startLocation.capturedAt": -1 })
    .limit(limit)
    .lean();

  const days: NonNullable<Awaited<ReturnType<typeof buildDayPayload>>>[] = [];
  for (const s of sessions) {
    const day = await buildDayPayload(idStr(s._id));
    if (day) days.push(day);
  }

  return NextResponse.json({ days });
}
