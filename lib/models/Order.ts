/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  // NEW: lets us upsert/idempotently save the same PayPal order
  paypalOrderId: { type: String, index: true, unique: true, sparse: true },

  // NEW: mirror PayPal order status
  status: {
    type: String,
    enum: ["CREATED", "APPROVED", "COMPLETED", "VOIDED"],
    default: "CREATED",
  },

  // Merchant-managed fulfillment lifecycle
  fulfillmentStatus: {
    type: String,
    enum: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"],
    default: "PENDING",
    index: true,
  },

  customerClerkId: String,

  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      color: String,
      size: String,
      quantity: Number,
    },
  ],

  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },

  shippingRate: String,
  // Shipping details (manually managed)
  shippingMethod: {
    type: String,
    enum: ["FREE", "EXPRESS"],
  },
  trackingNumber: String,
  weightGrams: Number,
  dateMailed: Date,
  totalAmount: Number,

  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Audit timestamps for key transitions
  processingAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  completedAt: Date,
  cancelledAt: Date,
});

// (optional – Mongoose will already create this from the field defs, but explicit is fine)
// orderSchema.index({ paypalOrderId: 1 }, { unique: true, sparse: true });

let Order: mongoose.Model<any>;
if (mongoose.models.Order) {
  Order = mongoose.models.Order as mongoose.Model<any>;
  const schema = Order.schema;
  // Hot-reload guard: ensure newly added fields exist on cached model
  if (!schema.path("fulfillmentStatus")) {
    schema.add({
      fulfillmentStatus: {
        type: String,
        enum: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED"],
        default: "PENDING",
        index: true,
      },
    });
  }
  if (!schema.path("processingAt")) schema.add({ processingAt: Date });
  if (!schema.path("shippedAt")) schema.add({ shippedAt: Date });
  if (!schema.path("deliveredAt")) schema.add({ deliveredAt: Date });
  if (!schema.path("completedAt")) schema.add({ completedAt: Date });
  if (!schema.path("cancelledAt")) schema.add({ cancelledAt: Date });
  if (!schema.path("shippingMethod")) schema.add({ shippingMethod: { type: String, enum: ["FREE", "EXPRESS"] } });
  if (!schema.path("trackingNumber")) schema.add({ trackingNumber: String });
  if (!schema.path("weightGrams")) schema.add({ weightGrams: Number });
  if (!schema.path("dateMailed")) schema.add({ dateMailed: Date });
} else {
  Order = mongoose.model("Order", orderSchema);
}

export default Order;
