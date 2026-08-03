import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { DaySession } from "@/models/DaySession";
import {
  forbidden,
  getSessionUser,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth";
import { buildDayPayload } from "@/lib/day-payload";
import { idStr } from "@/lib/ids";

/** Search associates by name (branch head only, scoped to their team) */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!requireRole(user, ["branch_head"])) {
    return forbidden("Only branch heads can search associates");
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const associateId = searchParams.get("id");

  await connectDB();

  if (associateId) {
    const associate = await User.findOne({
      _id: associateId,
      role: "sales_associate",
      reportsTo: user.id,
    })
      .select("name email")
      .lean();

    if (!associate) return notFound("Associate not found on your team");

    const sessions = await DaySession.find({ userId: associateId })
      .sort({ "startLocation.capturedAt": -1 })
      .limit(60)
      .lean();

    const history: NonNullable<Awaited<ReturnType<typeof buildDayPayload>>>[] = [];
    for (const s of sessions) {
      const day = await buildDayPayload(idStr(s._id));
      if (day) history.push(day);
    }

    return NextResponse.json({
      associate: {
        id: idStr(associate._id),
        name: associate.name,
        email: associate.email,
      },
      history,
    });
  }

  const filter: Record<string, unknown> = {
    role: "sales_associate",
    reportsTo: user.id,
  };

  if (q) {
    filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const results = await User.find(filter).select("name email").limit(20).lean();

  return NextResponse.json({
    results: results.map((r) => ({
      id: idStr(r._id),
      name: r.name,
      email: r.email,
    })),
  });
}
