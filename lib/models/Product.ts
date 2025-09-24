/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  title: String,
  description: String,
  media: [String],
  category: String,
  chapters: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chapter" }],
  tags: [String],
  sizes: [String],
  colors: [String],
  // If true, the ecommerce store (mbg-store)
  // is allowed to fetch/use this product.
  fetchToStore: { type: Boolean, default: false },
  // Variant-level stock: optional list of { color, size, stock }
  variants: [
    new mongoose.Schema(
      {
        color: { type: String },
        size: { type: String },
        stock: { type: Number, default: 0, min: 0 },
      },
      { _id: false }
    ),
  ],
  // Number of items available in stock
  countInStock: { type: Number, default: 0, min: 0 },
  price: {
    type: mongoose.Schema.Types.Decimal128,
    get: (v: mongoose.Schema.Types.Decimal128) => {
      return parseFloat(v.toString());
    },
  },
  expense: {
    type: mongoose.Schema.Types.Decimal128,
    get: (v: mongoose.Schema.Types.Decimal128) => {
      return parseFloat(v.toString());
    },
    },
  createdAt: {type: Date, default: Date.now},
  updatedAt: {type: Date, default: Date.now},
}, { toJSON: { getters: true } });

// In dev/Next.js, models are cached. If the model was compiled before
// adding new fields (e.g., countInStock), ensure the schema contains it.
let Product: mongoose.Model<any>;
if (mongoose.models.Product) {
  Product = mongoose.models.Product as mongoose.Model<any>;
  if (!Product.schema.path("countInStock")) {
    Product.schema.add({ countInStock: { type: Number, default: 0, min: 0 } });
  }
  if (!Product.schema.path("fetchToStore")) {
    Product.schema.add({ fetchToStore: { type: Boolean, default: false } });
  }
  if (!Product.schema.path("variants")) {
    Product.schema.add({
      variants: [
        new mongoose.Schema(
          { color: { type: String }, size: { type: String }, stock: { type: Number, default: 0, min: 0 } },
          { _id: false }
        ),
      ],
    });
  }
} else {
  Product = mongoose.model("Product", ProductSchema);
}
export default Product;
