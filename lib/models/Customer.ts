import mongoose, { Schema } from "mongoose";

const customerSchema = new Schema(
  {
    clerkId: { type: String, index: true, unique: true, sparse: true },
    name: { type: String, default: "" },
    email: { type: String, lowercase: true, trim: true, index: true },
    orders: [{ type: Schema.Types.ObjectId, ref: "Order", index: true, default: [] }],
  },
  { timestamps: true }
);

export default mongoose.models.Customer || mongoose.model("Customer", customerSchema);
