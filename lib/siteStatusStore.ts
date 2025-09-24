import type { HydratedDocument } from "mongoose";

import StoreStatusModel, { type StoreStatusDocument } from "./models/StoreStatus";
import { connectToDB } from "./mongoDB";

export type MilosBGState = {
  isOnline: boolean;
  updatedAt: string;
  offlineMessage: string;
};

const DEFAULT_OFFLINE_MESSAGE = "offline";
const STORE_KEY = "milos-bg";

type StoreStatusDoc = HydratedDocument<StoreStatusDocument>;

async function ensureStoreRecord(): Promise<StoreStatusDoc> {
  await connectToDB();
  const existing = await StoreStatusModel.findOne({ storeKey: STORE_KEY });
  if (existing) return existing;

  return StoreStatusModel.create({
    storeKey: STORE_KEY,
    offlineMessage: DEFAULT_OFFLINE_MESSAGE,
  });
}

function normalizeState(doc: StoreStatusDoc): MilosBGState {
  const offlineMessage = doc.offlineMessage?.trim() || DEFAULT_OFFLINE_MESSAGE;
  const updatedAt = doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString();

  return {
    isOnline: Boolean(doc.isOnline),
    updatedAt,
    offlineMessage,
  };
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>\"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

export async function getMilosBGState(): Promise<MilosBGState> {
  const doc = await ensureStoreRecord();
  return normalizeState(doc);
}

export async function setMilosBGState(
  isOnline: boolean,
  offlineMessage?: string,
): Promise<MilosBGState> {
  const doc = await ensureStoreRecord();
  doc.isOnline = Boolean(isOnline);

  if (typeof offlineMessage === "string") {
    const trimmed = offlineMessage.trim();
    doc.offlineMessage = trimmed.length ? trimmed : DEFAULT_OFFLINE_MESSAGE;
  } else if (!doc.offlineMessage) {
    doc.offlineMessage = DEFAULT_OFFLINE_MESSAGE;
  }

  await doc.save();
  return normalizeState(doc);
}

export async function getOfflineHtml(): Promise<string> {
  const state = await getMilosBGState();
  const message = escapeHtml(state.offlineMessage || DEFAULT_OFFLINE_MESSAGE);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Milos BG Store | Offline</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        background-color: #020202;
        color: #00ff66;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
      }
      main {
        text-align: center;
        padding: 2rem;
        border: 1px solid #00ff6699;
        border-radius: 0.5rem;
        max-width: 480px;
      }
      h1 {
        text-transform: uppercase;
        letter-spacing: 0.2rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${message}</h1>
    </main>
  </body>
</html>`;
}

export async function getOfflineMessage(): Promise<string> {
  const state = await getMilosBGState();
  return state.offlineMessage || DEFAULT_OFFLINE_MESSAGE;
}

