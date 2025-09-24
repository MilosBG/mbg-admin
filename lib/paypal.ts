import {
  Client,
  Environment,
  OrdersController,
  type OAuthToken,
} from "@paypal/paypal-server-sdk";

type VerifyWebhookSignatureInput = {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: unknown;
};

type VerifyWebhookSignatureResponse = {
  verification_status?: string;
};

const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  throw new Error("PayPal credentials are not configured");
}

const environment =
  process.env.PAYPAL_ENV === "live" ? Environment.Production : Environment.Sandbox;

export const payPalClient = new Client({
  environment,
  clientCredentialsAuthCredentials: {
    oAuthClientId: clientId,
    oAuthClientSecret: clientSecret,
  },
});

export const payPalOrders = new OrdersController(payPalClient);

const apiBase =
  environment === Environment.Production
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

let cachedToken: OAuthToken | undefined;

async function getAccessToken() {
  cachedToken = await payPalClient.clientCredentialsAuthManager.updateToken(cachedToken);
  return cachedToken.accessToken;
}

export async function verifyWebhookSignature(
  input: VerifyWebhookSignatureInput,
): Promise<VerifyWebhookSignatureResponse> {
  const token = await getAccessToken();
  const response = await fetch(`${apiBase}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: input.authAlgo,
      cert_url: input.certUrl,
      transmission_id: input.transmissionId,
      transmission_sig: input.transmissionSig,
      transmission_time: input.transmissionTime,
      webhook_id: input.webhookId,
      webhook_event: input.webhookEvent,
    }),
  });

  if (!response.ok) {
    throw new Error(`PayPal webhook verification failed (${response.status})`);
  }

  return (await response.json()) as VerifyWebhookSignatureResponse;
}
