/**
 * Seed script — creates branch head, associates, leads, and sample history.
 *
 * Usage:
 *   1. Copy .env.example → .env.local and set MONGODB_URI + JWT_SECRET
 *   2. npm run seed
 */
import dns from "dns";
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// Some Windows/router DNS setups refuse Node SRV lookups for mongodb+srv://
dns.setServers(["8.8.8.8", "1.1.1.1"]);

// Load env from .env.local if present
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Set it in .env.local");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: String,
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

const LeadSchema = new mongoose.Schema(
  {
    name: String,
    contact: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
  },
  { timestamps: true }
);

const DaySessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: String,
    startLocation: {
      latitude: Number,
      longitude: Number,
      accuracyMeters: Number,
      capturedAt: Date,
    },
    endLocation: {
      latitude: Number,
      longitude: Number,
      accuracyMeters: Number,
      capturedAt: Date,
    },
    totalDistanceKm: Number,
    distanceProvider: String,
    localDate: String,
    timezoneOffsetMinutes: Number,
  },
  { timestamps: true }
);

const ActivitySchema = new mongoose.Schema(
  {
    daySessionId: { type: mongoose.Schema.Types.ObjectId, ref: "DaySession" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: String,
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
    notes: String,
    location: {
      latitude: Number,
      longitude: Number,
      accuracyMeters: Number,
      capturedAt: Date,
    },
    segmentDistanceKm: Number,
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
const DaySession =
  mongoose.models.DaySession || mongoose.model("DaySession", DaySessionSchema);
const Activity = mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))) * 100) / 100;
}

async function main() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  // Clear existing demo data
  await Promise.all([
    Activity.deleteMany({}),
    DaySession.deleteMany({}),
    Lead.deleteMany({}),
    User.deleteMany({}),
  ]);
  console.log("Cleared collections");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const branchHead = await User.create({
    name: "Priya Sharma",
    email: "priya.head@raha.example",
    passwordHash,
    role: "branch_head",
    reportsTo: null,
  });

  const associates = await User.insertMany([
    {
      name: "Arjun Reddy",
      email: "arjun.sales@raha.example",
      passwordHash,
      role: "sales_associate",
      reportsTo: branchHead._id,
    },
    {
      name: "Sneha Patel",
      email: "sneha.sales@raha.example",
      passwordHash,
      role: "sales_associate",
      reportsTo: branchHead._id,
    },
    {
      name: "Vikram Rao",
      email: "vikram.sales@raha.example",
      passwordHash,
      role: "sales_associate",
      reportsTo: branchHead._id,
    },
  ]);

  const leads = await Lead.insertMany([
    {
      name: "GreenLeaf Grocers",
      contact: "+91 98765 10001",
      location: {
        latitude: 17.4483,
        longitude: 78.3915,
        address: "Hitech City, Hyderabad",
      },
    },
    {
      name: "Sunrise Pharmacy",
      contact: "+91 98765 10002",
      location: {
        latitude: 17.4399,
        longitude: 78.4983,
        address: "Begumpet, Hyderabad",
      },
    },
    {
      name: "Deccan Textiles",
      contact: "+91 98765 10003",
      location: {
        latitude: 17.385,
        longitude: 78.4867,
        address: "Abids, Hyderabad",
      },
    },
    {
      name: "Pearl Dental Clinic",
      contact: "+91 98765 10004",
      location: {
        latitude: 17.4126,
        longitude: 78.4098,
        address: "Jubilee Hills, Hyderabad",
      },
    },
    {
      name: "Lakshmi Kirana Mart",
      contact: "+91 98765 10005",
      location: {
        latitude: 17.3616,
        longitude: 78.4747,
        address: "Charminar area, Hyderabad",
      },
    },
  ]);

  // Historical closed days for monthly export (previous month + this month)
  const now = new Date();
  const samples: Array<{
    associateIndex: number;
    dayOffset: number;
    leadIndexes: number[];
  }> = [
    { associateIndex: 0, dayOffset: 2, leadIndexes: [0, 1] },
    { associateIndex: 0, dayOffset: 5, leadIndexes: [2, 3] },
    { associateIndex: 1, dayOffset: 1, leadIndexes: [1, 4] },
    { associateIndex: 1, dayOffset: 8, leadIndexes: [0, 2, 3] },
    { associateIndex: 2, dayOffset: 3, leadIndexes: [4, 1] },
    { associateIndex: 2, dayOffset: 12, leadIndexes: [3] },
  ];

  for (const sample of samples) {
    const associate = associates[sample.associateIndex];
    const start = new Date(now);
    start.setDate(start.getDate() - sample.dayOffset);
    start.setHours(9, 0, 0, 0);

    const home = { latitude: 17.44, longitude: 78.35 };
    const points = [home];

    const session = await DaySession.create({
      userId: associate._id,
      status: "closed",
      startLocation: {
        ...home,
        accuracyMeters: 18,
        capturedAt: start,
      },
      endLocation: null,
      totalDistanceKm: 0,
      distanceProvider: "haversine",
      localDate: start.toISOString().slice(0, 10),
      timezoneOffsetMinutes: 330,
    });

    let prev = { ...home, capturedAt: start };
    let total = 0;
    let t = start.getTime();

    for (const li of sample.leadIndexes) {
      const lead = leads[li];
      t += 90 * 60 * 1000;
      const capturedAt = new Date(t);
      const loc = {
        latitude: lead.location.latitude,
        longitude: lead.location.longitude,
        accuracyMeters: 25,
        capturedAt,
      };
      const seg = haversineKm(prev, loc);
      total += seg;
      await Activity.create({
        daySessionId: session._id,
        userId: associate._id,
        type: "in_person_meeting",
        leadId: lead._id,
        notes: `Demo meeting with ${lead.name}. Discussed product demo and follow-up.`,
        location: loc,
        segmentDistanceKm: seg,
      });
      prev = loc;
      points.push(loc);
    }

    t += 60 * 60 * 1000;
    const endLoc = {
      latitude: home.latitude + 0.01,
      longitude: home.longitude + 0.01,
      accuracyMeters: 22,
      capturedAt: new Date(t),
    };
    total += haversineKm(prev, endLoc);
    total = Math.round(total * 100) / 100;

    session.endLocation = endLoc;
    session.totalDistanceKm = total;
    await session.save();
  }

  console.log("Seed complete.");
  console.log("");
  console.log("Test credentials (password for all: Password123!):");
  console.log("  Branch Head : priya.head@raha.example");
  console.log("  Associate   : arjun.sales@raha.example");
  console.log("  Associate   : sneha.sales@raha.example");
  console.log("  Associate   : vikram.sales@raha.example");
  console.log(`  Leads       : ${leads.length}`);
  console.log(`  History days: ${samples.length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
