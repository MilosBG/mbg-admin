import dns from "dns";
import mongoose from "mongoose";

dns.setDefaultResultOrder("ipv4first");

let isConnected = false;
let connectPromise: Promise<void> | null = null;

mongoose.set("strictQuery", true);
mongoose.set("bufferCommands", false);

mongoose.connection.on("connected", () => {
  isConnected = true;
  console.log("[mongo] connection established");
});

mongoose.connection.on("error", (err) => {
  console.error("[mongo] connection error", err);
});

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("[mongo] connection disconnected");
});

async function attemptConnection(uri: string, retries = 3): Promise<void> {
  let lastError: unknown = null;
  const backoff = [0, 1000, 3000];

  for (let i = 0; i < retries; i += 1) {
    try {
      await mongoose.connect(uri, {
        dbName: "Mbg_Admin",
        serverSelectionTimeoutMS: 20000,
        socketTimeoutMS: 20000,
        heartbeatFrequencyMS: 8000,
        maxPoolSize: 5,
      });
      isConnected = true;
      return;
    } catch (err) {
      lastError = err;
      const wait = backoff[i] ?? backoff[backoff.length - 1];
      if (wait) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? "Mongo connection failed"));
}

export const connectToDB = async (): Promise<void> => {
  if (isConnected) {
    return;
  }

  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL environment variable is not set.");
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = attemptConnection(process.env.MONGODB_URL).catch((err) => {
    connectPromise = null;
    throw err;
  });

  try {
    await connectPromise;
  } finally {
    connectPromise = null;
  }
};
