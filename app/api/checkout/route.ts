/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { payPalClient } from "@/lib/paypal";

function getCors(req: NextRequest) {
  const origin = req.headers.get("origin") || "";
  const allowed = [String(process.env.ECOMMERCE_STORE_URL || "")].filter(Boolean);
  const allowAll = process.env.NODE_ENV !== "production";
  const ok = allowAll || allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? (allowAll ? "*" : origin) : "",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCors(req) });
}

const toMoney = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

function toPayPalItems(cartItems: any[]) {
  return cartItems.map((ci) => ({
    name: String(ci.item.title ?? "Item"),
    unit_amount: {
      currency_code: "EUR",
      value: toMoney(Number(ci.item.price || 0)),
    },
    quantity: String(Number(ci.quantity || 1)),
    sku: String(ci.item._id),
    description: JSON.stringify({
      productId: ci.item._id,
      ...(ci.size && { size: ci.size }),
      ...(ci.color && { color: ci.color }),
    }),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartItems, customer, shippingOption } = body || {};
    if (!Array.isArray(cartItems) || !customer?.clerkId) {
      return new NextResponse("Not Enough Data To Checkout", { status: 400 });
    }

    const items = toPayPalItems(cartItems);

    const itemSubTotal = cartItems.reduce(
      (sum: number, ci: any) =>
        sum + Number(ci.item.price || 0) * Number(ci.quantity || 1),
      0,
    );

    const normalizedShip = shippingOption === "EXPRESS" ? "EXPRESS" : "FREE";
    const shippingMap = {
      FREE: { id: "FREE_DELIVERY", label: "FREE DELIVERY", amount: 0 },
      EXPRESS: {
        id: "EXPRESS_DELIVERY",
        label: "EXPRESS DELIVERY",
        amount: 20,
      },
    } as const;

    const chosen = shippingMap[normalizedShip];
    const amountValue = itemSubTotal + chosen.amount;

    // Build PayPal order
const { default: paypal } = await import("@paypal/checkout-server-sdk");
// @ts-ignore
const createReq = new paypal.orders.OrdersCreateRequest();
createReq.headers["Prefer"] = "return=representation";

// Build the body separately and cast to any so TS stops flagging valid fields
const orderBody: any = {
  intent: "CAPTURE",
  purchase_units: [
    {
      reference_id: String(customer.clerkId),
      custom_id: JSON.stringify({ shippingRate: chosen.id }),
      amount: {
        currency_code: "EUR",
        value: toMoney(amountValue),
        breakdown: {
          item_total: { currency_code: "EUR", value: toMoney(itemSubTotal) },
          shipping: { currency_code: "EUR", value: toMoney(chosen.amount) },
        },
      },
      items, // PayPal supports this; SDK’s types are just behind
      shipping: { method: chosen.label },
    },
  ],
  application_context: {
    brand_name: "Milos BG",
    landing_page: "NO_PREFERENCE",
    user_action: "PAY_NOW",
    shipping_preference: "GET_FROM_FILE",
    return_url: `${process.env.ECOMMERCE_STORE_URL}/payment_success`,
    cancel_url: `${process.env.ECOMMERCE_STORE_URL}/the-hoop`,
  },
};

createReq.requestBody(orderBody);
const order = await payPalClient.execute(createReq);

    const approve = order.result.links?.find(
      (l: any) => l.rel === "approve",
    )?.href;
    if (!approve) {
      return new NextResponse("No approve link from PayPal", { status: 502 });
    }

    return NextResponse.json(
      { id: order.result.id, approveUrl: approve },
      { headers: getCors(req) },
    );
  } catch (err) {
    console.log("[paypal_checkout_POST]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { NextRequest, NextResponse } from "next/server";
// import Stripe from "stripe";

// export const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!, {
//   typescript: true,
// });

// const corsHeaders = {
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type, Authorization",
// };

// export async function OPTIONS() {
//   return NextResponse.json({}, { headers: corsHeaders });
// }

// export async function POST(req: NextRequest) {
//   try {
//     const { cartItems, customer } = await req.json();

//     if (!cartItems || !customer) {
//       return new NextResponse("Not Enough Data To Checkout", { status: 400 });
//     }

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       mode: "payment",
//       shipping_address_collection: {
//         allowed_countries: ["FR", "ES", "BE", "DE"],
//       },
//       shipping_options: [
//         { shipping_rate: "shr_1S11TGLwQY76oKSOLjY4EpzF" },
//         { shipping_rate: "shr_1S11UULwQY76oKSO6nfcORVT" },
//       ],
//       line_items: cartItems.map((cartItem: any) => ({
//         price_data: {
//           currency: "eur",
//           product_data: {
//             name: cartItem.item.title,
//             metadata: {
//               productId: cartItem.item._id,
//               ...(cartItem.size && { size: cartItem.size }),
//               ...(cartItem.color && { color: cartItem.color }),
//             },
//           },
//           unit_amount: cartItem.item.price * 100,
//         },
//         quantity: cartItem.quantity,
//       })),
//       client_reference_id: customer.clerkId,
//       success_url: `${process.env.ECOMMERCE_STORE_URL}/payment_success`,
//       cancel_url: `${process.env.ECOMMERCE_STORE_URL}/cart`,
//     });

//     return NextResponse.json(session, { headers: corsHeaders });
//   } catch (err) {
//     console.log("[chechout_POST]", err);
//     return new NextResponse("Internal Server Error", { status: 500 });
//   }
// }
