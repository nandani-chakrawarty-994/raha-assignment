import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Lead } from "@/models/Lead";
import { getSessionUser, unauthorized } from "@/lib/auth";
import { idStr } from "@/lib/ids";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  await connectDB();
  const leads = await Lead.find().sort({ name: 1 }).lean();

  return NextResponse.json({
    leads: leads.map((l) => ({
      id: idStr(l._id),
      name: l.name,
      contact: l.contact,
      location: l.location,
    })),
  });
}
