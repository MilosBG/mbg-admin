"use client";

import { useMemo, useState, useTransition } from "react";
import toast from "react-hot-toast";

type Props = {
  initialState: boolean;
  initialUpdatedAt: string;
  initialOfflineMessage: string;
  storeUrl: string;
};

type UiState = {
  isOnline: boolean;
  updatedAt: string;
  offlineMessage: string;
};

export default function SiteStatusToggle({
  initialState,
  initialUpdatedAt,
  initialOfflineMessage,
  storeUrl,
}: Props) {
  const [state, setState] = useState<UiState>({
    isOnline: initialState,
    updatedAt: initialUpdatedAt,
    offlineMessage: initialOfflineMessage,
  });
  const [pending, startTransition] = useTransition();

  const formattedUpdatedAt = useMemo(() => {
    try {
      const parsed = new Date(state.updatedAt);
      if (Number.isNaN(parsed.getTime())) return state.updatedAt;
      return parsed.toLocaleString();
    } catch {
      return state.updatedAt;
    }
  }, [state.updatedAt]);

  const toggle = () => {
    const previous = { ...state };
    const optimisticNext = !state.isOnline;

    startTransition(async () => {
      setState((current) => ({ ...current, isOnline: optimisticNext }));

      try {
        const response = await fetch("/api/milos-bg/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOnline: optimisticNext }),
        });

        if (!response.ok) throw new Error("Request failed");

        const data = await response.json();
        setState({
          isOnline: Boolean(data?.isOnline),
          updatedAt: String(data?.updatedAt ?? new Date().toISOString()),
          offlineMessage: String(
            data?.offlineMessage ?? previous.offlineMessage,
          ),
        });

        toast.success(
          optimisticNext
            ? "mbg-store is now reachable"
            : "mbg-store has been switched offline",
        );
      } catch {
        setState(previous);
        toast.error("Could not update the store status. Please retry.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="mbg-p-between w-full">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            className={`rounded-xs uppercase px-6 py-2 text-sm font-semibold transition focus:ring-2 focus:ring-offset-2 focus:outline-none ${
              state.isOnline
                ? "bg-mbg-black text-mbg-green focus:ring-mbg-green"
                : "bg-mbg-green text-mbg-black focus:ring-mbg-green"
            } ${pending ? "opacity-60" : ""}`}
          >
            {pending
              ? "Updating..."
              : state.isOnline
                ? "Turn Offline"
                : "Turn Online"}
          </button>

          <span
            className={`rounded-xs px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
              state.isOnline
                ? "bg-mbg-green/20 text-mbg-green"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {state.isOnline ? "Online" : "Offline"}
          </span>
        </div>

        <div className="w-full p-4 bg-mbg-black/7" >
          <a
            href={storeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-mbg-green uppercase text-xs font-medium underline-offset-4 hover:underline"
          >
          Milos BG - Store
          </a>
        </div>
      </div>

      <dl className="text-mbg-black/80 grid gap-2 text-xs uppercase">
        <div className="flex flex-wrap gap-2">
          <dt className="text-mbg-black font-semibold tracking-wide uppercase">
            Last change
          </dt>
          <dd>{formattedUpdatedAt}</dd>
        </div>
      </dl>
    </div>
  );
}
