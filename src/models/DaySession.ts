import { Schema, models, model, Types, Model } from "mongoose";
import type { DayStatus } from "@/lib/types";

export interface ILocationCapture {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  capturedAt: Date;
}

export interface IDaySession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  status: DayStatus;
  startLocation: ILocationCapture;
  endLocation?: ILocationCapture | null;
  totalDistanceKm: number;
  distanceProvider: "openrouteservice" | "haversine" | "none";
  localDate: string;
  timezoneOffsetMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const LocationCaptureSchema = new Schema<ILocationCapture>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracyMeters: { type: Number, default: null },
    capturedAt: { type: Date, required: true },
  },
  { _id: false }
);

const DaySessionSchema = new Schema<IDaySession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: { type: String, enum: ["open", "closed"], required: true, default: "open" },
    startLocation: { type: LocationCaptureSchema, required: true },
    endLocation: { type: LocationCaptureSchema, default: null },
    totalDistanceKm: { type: Number, default: 0 },
    distanceProvider: {
      type: String,
      enum: ["openrouteservice", "haversine", "none"],
      default: "none",
    },
    localDate: { type: String, required: true },
    timezoneOffsetMinutes: { type: Number, required: true },
  },
  { timestamps: true }
);

DaySessionSchema.index({ userId: 1, status: 1 });
DaySessionSchema.index({ userId: 1, localDate: 1 });
DaySessionSchema.index({ userId: 1, createdAt: 1 });

export const DaySession: Model<IDaySession> =
  (models.DaySession as Model<IDaySession>) ||
  model<IDaySession>("DaySession", DaySessionSchema);
