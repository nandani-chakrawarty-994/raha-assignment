import { Schema, models, model, Types, Model } from "mongoose";
import type { UserRole } from "@/lib/types";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  reportsTo?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["sales_associate", "branch_head"],
      required: true,
    },
    reportsTo: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });
UserSchema.index({ reportsTo: 1 });
UserSchema.index({ name: "text" });

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);
