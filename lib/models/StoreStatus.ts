import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface StoreStatusDocument extends Document {
  storeKey: string;
  isOnline: boolean;
  offlineMessage: string;
  updatedAt: Date;
  createdAt: Date;
}

const StoreStatusSchema = new Schema<StoreStatusDocument>(
  {
    storeKey: { type: String, required: true },
    isOnline: { type: Boolean, default: true },
    offlineMessage: { type: String, default: "offline" },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

StoreStatusSchema.index({ storeKey: 1 }, { unique: true });

const StoreStatusModel = (mongoose.models.StoreStatus as Model<StoreStatusDocument>)
  || mongoose.model<StoreStatusDocument>("StoreStatus", StoreStatusSchema);

export default StoreStatusModel;
