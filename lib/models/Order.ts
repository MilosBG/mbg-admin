/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  // Stripe identifiers for idempotent upserts
  stripeSessionId: { type: String, index: true, unique: true, sparse: true },
  stripePaymentIntentId: { type: String, index: true, sparse: true },
  status: {
    type: String,
    enum: ["PENDING", "PAID", "NOT PAID"],
    default: "PENDING",
  },

  contact: {
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    name: { type: String, trim: true },
  },
  notes: String,
  metadata: mongoose.Schema.Types.Mixed,

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
      unitPrice: Number,
      productLegacyId: String,
      titleSnapshot: String,
    },
  ],

  shippingAddress: {
    firstName: String,
    lastName: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    phone: String,
  },

  shippingRate: String,
  // Shipping details (manually managed)
  shippingMethod: {
    type: String,
    enum: ["FREE", "EXPRESS"],
  },
  trackingNumber: String,
  transporter: String,
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

let Order: mongoose.Model<any>;
if (mongoose.models.Order) {
  Order = mongoose.models.Order as mongoose.Model<any>;
  const schema = Order.schema;
  // Hot-reload guard: ensure newly added fields exist on cached model
  if (!schema.path("stripeSessionId"))
    schema.add({ stripeSessionId: { type: String, index: true, unique: true, sparse: true } });
  if (!schema.path("stripePaymentIntentId"))
    schema.add({ stripePaymentIntentId: { type: String, index: true, sparse: true } });
  const statusPath = schema.path("status");
  if (statusPath) {
    statusPath.options.enum = ["PENDING", "PAID", "NOT PAID"];
    statusPath.options.default = "PENDING";
  } else {
    schema.add({
      status: {
        type: String,
        enum: ["PENDING", "PAID", "NOT PAID"],
        default: "PENDING",
      },
    });
  }
  if (!schema.path("contact")) {
    schema.add({
      contact: {
        email: { type: String, lowercase: true, trim: true },
        phone: { type: String, trim: true },
        name: { type: String, trim: true },
      },
    });
  }
  if (!schema.path("notes")) schema.add({ notes: String });
  if (!schema.path("metadata")) schema.add({ metadata: mongoose.Schema.Types.Mixed });
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
  if (!schema.path("shippingMethod"))
    schema.add({ shippingMethod: { type: String, enum: ["FREE", "EXPRESS"] } });
  if (!schema.path("trackingNumber")) schema.add({ trackingNumber: String });
  const shippingAddressPath = schema.path("shippingAddress") as any;
  if (shippingAddressPath && typeof shippingAddressPath === "object" && shippingAddressPath.schema) {
    const shippingSchema = shippingAddressPath.schema as mongoose.Schema;
    if (!shippingSchema.path("firstName")) shippingSchema.add({ firstName: String });
    if (!shippingSchema.path("lastName")) shippingSchema.add({ lastName: String });
    if (!shippingSchema.path("phone")) shippingSchema.add({ phone: String });
  }
  if (!schema.path("transporter")) schema.add({ transporter: String });
  const productsPath = schema.path("products") as any;
  if (productsPath && typeof productsPath === "object" && productsPath.schema) {
    const productsSchema = productsPath.schema as mongoose.Schema;
    if (!productsSchema.path("unitPrice")) {
      productsSchema.add({ unitPrice: Number });
    }
    if (!productsSchema.path("productLegacyId")) {
      productsSchema.add({ productLegacyId: String });
    }
    if (!productsSchema.path("titleSnapshot")) {
      productsSchema.add({ titleSnapshot: String });
    }
  }
  if (!schema.path("weightGrams")) schema.add({ weightGrams: Number });
  if (!schema.path("dateMailed")) schema.add({ dateMailed: Date });
} else {
  Order = mongoose.model("Order", orderSchema);
}

export default Order;
