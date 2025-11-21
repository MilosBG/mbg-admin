import "dotenv/config";
import mongoose from "mongoose";
import Order from "../lib/models/Order";
import { collapseOrderProducts } from "../lib/orderProductUtils";

async function main() {
  const uri =
    process.env.MONGODB_URL ||
    "mongodb+srv://gamil:Mbg4624640@milosbg.hyhwfdr.mongodb.net/?retryWrites=true&w=majority&appName=MilosBG";

  await mongoose.connect(uri, { dbName: "Mbg_Admin" });
  console.log("Connected to MongoDB");

  const orders = await Order.find().select("products subtotalAmount totalAmount").lean();
  console.log(`Processing ${orders.length} orders`);

  for (const order of orders) {
    const collapsed = collapseOrderProducts(order.products as any);
    if (!collapsed.length) continue;

    const changed =
      !Array.isArray(order.products) ||
      order.products.length !== collapsed.length ||
      order.products.some((orig: any, idx: number) => {
        const target = collapsed[idx];
        return (
          String(orig?.product || orig?.productLegacyId || "") !==
            String(target?.product || target?.productLegacyId || "") ||
          Number(orig?.quantity ?? 0) !== Number(target?.quantity ?? 0)
        );
      });

    if (changed) {
      const subtotal = collapsed.reduce(
        (sum, item) => sum + Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0),
        0,
      );
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            products: collapsed,
            subtotalAmount: Number(subtotal.toFixed(2)),
            totalAmount: Number(subtotal.toFixed(2)),
          },
        },
      );
      console.log(`Collapsed order ${order._id}`);
    }
  }

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
