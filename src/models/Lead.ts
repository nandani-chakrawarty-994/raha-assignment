import { Schema, models, model, Types, Model } from "mongoose";

export interface ILead {
  _id: Types.ObjectId;
  name: string;
  contact: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String },
    },
  },
  { timestamps: true }
);

export const Lead: Model<ILead> =
  (models.Lead as Model<ILead>) || model<ILead>("Lead", LeadSchema);
