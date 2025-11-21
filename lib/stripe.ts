import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;

if (!secret) {
  throw new Error("Stripe secret key is not configured");
}

export const stripe = new Stripe(secret, {
  apiVersion: "2024-06-20",
  appInfo: { name: "MBG Admin" },
});
