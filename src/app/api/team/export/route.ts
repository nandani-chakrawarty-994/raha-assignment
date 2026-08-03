import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { DaySession } from "@/models/DaySession";
import {
  badRequest,
  forbidden,
  getSessionUser,
  requireRole,
  unauthorized,
} from "@/lib/auth";
import { monthExportSchema } from "@/lib/validations";
import { escapeCsv } from "@/lib/utils";
import { idStr } from "@/lib/ids";

/** Monthly distance export CSV for fuel reimbursement */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!requireRole(user, ["branch_head"])) {
    return forbidden("Only branch heads can export monthly reports");
  }

  const { searchParams } = new URL(req.url);
  const parsed = monthExportSchema.safeParse({
    year: searchParams.get("year"),
    month: searchParams.get("month"),
  });

  if (!parsed.success) {
    return badRequest("Provide year and month (1-12)", parsed.error.flatten());
  }

  const { year, month } = parsed.data;
  const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;

  await connectDB();

  const associates = await User.find({
    role: "sales_associate",
    reportsTo: user.id,
  })
    .select("name email")
    .lean();

  const rows: {
    associateName: string;
    associateEmail: string;
    localDate: string;
    status: string;
    distanceKm: number;
    provider: string;
  }[] = [];

  const totals = new Map<string, { name: string; email: string; km: number; days: number }>();

  for (const a of associates) {
    totals.set(idStr(a._id), {
      name: a.name,
      email: a.email,
      km: 0,
      days: 0,
    });

    const sessions = await DaySession.find({
      userId: a._id,
      localDate: { $regex: `^${monthPrefix}` },
    }).lean();

    for (const s of sessions) {
      const t = totals.get(idStr(a._id))!;
      t.km += s.totalDistanceKm || 0;
      t.days += 1;
      rows.push({
        associateName: a.name,
        associateEmail: a.email,
        localDate: s.localDate,
        status: s.status,
        distanceKm: s.totalDistanceKm || 0,
        provider: s.distanceProvider,
      });
    }
  }

  const format = searchParams.get("format") || "csv";

  if (format === "json") {
    return NextResponse.json({
      year,
      month,
      summary: Array.from(totals.values()).map((t) => ({
        ...t,
        km: Math.round(t.km * 100) / 100,
      })),
      rows,
    });
  }

  const lines: string[] = [];
  lines.push("Fuel Reimbursement Report");
  lines.push(`Period,${monthPrefix}`);
  lines.push(`Generated At,${new Date().toISOString()}`);
  lines.push("");
  lines.push("Associate Name,Email,Days Worked,Total Distance (km)");
  for (const t of totals.values()) {
    lines.push(
      [
        escapeCsv(t.name),
        escapeCsv(t.email),
        t.days,
        Math.round(t.km * 100) / 100,
      ].join(",")
    );
  }
  lines.push("");
  lines.push("Daily Detail");
  lines.push("Associate Name,Email,Date,Status,Distance (km),Provider");
  for (const r of rows) {
    lines.push(
      [
        escapeCsv(r.associateName),
        escapeCsv(r.associateEmail),
        r.localDate,
        r.status,
        r.distanceKm,
        r.provider,
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fuel-reimbursement-${monthPrefix}.csv"`,
    },
  });
}
