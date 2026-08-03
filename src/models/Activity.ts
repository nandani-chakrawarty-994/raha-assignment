import { Schema, models, model, Types, Model } from "mongoose";
import type { ActivityType } from "@/lib/types";

export interface IActivity {
  _id: Types.ObjectId;
  daySessionId: Types.ObjectId;
  userId: Types.ObjectId;
  type: ActivityType;
  leadId: Types.ObjectId;
  notes: string;
  location: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number | null;
    capturedAt: Date;
  };
  segmentDistanceKm: number;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    daySessionId: { type: Schema.Types.ObjectId, ref: "DaySession", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["in_person_meeting"], required: true, default: "in_person_meeting" },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true },
    notes: { type: String, required: true, trim: true, maxlength: 2000 },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracyMeters: { type: Number, default: null },
      capturedAt: { type: Date, required: true },
    },
    segmentDistanceKm: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ActivitySchema.index({ daySessionId: 1, "location.capturedAt": 1 });
ActivitySchema.index({ userId: 1, createdAt: -1 });

export const Activity: Model<IActivity> =
  (models.Activity as Model<IActivity>) || model<IActivity>("Activity", ActivitySchema);
