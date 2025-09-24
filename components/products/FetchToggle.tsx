/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { CloudDownload, CloudOff } from "lucide-react";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

type Props = {
  id: string;
  initial: boolean | undefined;
  onChanged?: (next: boolean) => void;
};

export default function FetchToggle({ id, initial, onChanged }: Props) {
  const [enabled, setEnabled] = useState(Boolean(initial));
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      try {
        const optimisticNext = !enabled;
        setEnabled(optimisticNext);
        onChanged?.(optimisticNext);

        const res = await fetch(`/api/products/${id}/fetch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fetch: optimisticNext }),
        });
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        const next = Boolean(data?.fetchToStore);
        // If server disagrees, sync back
        if (next !== optimisticNext) {
          setEnabled(next);
          onChanged?.(next);
        }
        toast.success(next ? "Enabled for store" : "Disabled for store");
      } catch (e) {
        // revert optimistic update
        setEnabled((prev) => {
          const reverted = !prev;
          onChanged?.(reverted);
          return reverted;
        });
        toast.error("Could not update store fetch state");
      }
    });
  };

  const Icon = enabled ? CloudDownload : CloudOff;
  const title = enabled ? "Store: fetch" : "Store: don't fetch";

  return (
    <button
      type="button"
      title={title}
      onClick={toggle}
      disabled={pending}
      className="mbg-action"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
