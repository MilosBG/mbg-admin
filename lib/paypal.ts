import paypal from "@paypal/checkout-server-sdk";

const env =
  process.env.PAYPAL_ENV === "live"
    ? new paypal.core.LiveEnvironment(
        process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        process.env.PAYPAL_CLIENT_SECRET!
      )
    : new paypal.core.SandboxEnvironment(
        process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
        process.env.PAYPAL_CLIENT_SECRET!
      );

export const payPalClient = new paypal.core.PayPalHttpClient(env);
