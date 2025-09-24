/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { ColumnDef } from "@tanstack/react-table";
import Delete from "../mbg-components/Delete";
import FetchToggle from "./FetchToggle";
import Link from "next/link";
import { CloudDownload, CloudOff } from "lucide-react";

export function productColumns(opts?: {
  onFetchChange?: (id: string, value: boolean) => void;
  getFetchState?: (id: string, initial: boolean | undefined) => boolean;
}): ColumnDef<ProductType>[] {
  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <Link href={`/products/${row.original._id}`}>{row.original.title}</Link>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "chapters",
      header: "Chapters",
      cell: ({ row }) =>
        row.original.chapters.map((chapter) => chapter.title).join(", "),
    },
    {
      accessorKey: "price",
      header: "Price (€)",
    },
    {
      accessorKey: "expense",
      header: "Expense (€)",
    },
    {
      accessorKey: "countInStock",
      header: "Stock",
      cell: ({ row }) => {
        const anyRow: any = row.original as any;
        const total = Number(anyRow?.countInStock ?? 0);
        const vars = Array.isArray(anyRow?.variants) ? anyRow.variants : [];
        const count = Array.isArray(vars) ? vars.length : 0;
        return count > 0 ? `${total} (${count} variants)` : String(total);
      },
    },
    {
      accessorKey: "fetchToStore",
      header: "Store",
      cell: ({ row }) => {
        const current = opts?.getFetchState
          ? opts.getFetchState(row.original._id as any, (row.original as any)?.fetchToStore)
          : (row.original as any)?.fetchToStore;
        const enabled = Boolean(current);
        const Icon = enabled ? CloudDownload : CloudOff;
        return (
          <span className="inline-flex items-center gap-1 text-[10px]">
            <Icon className={`h-4 w-4 ${enabled ? "text-mbg-green" : "text-mbg-black/40"}`} />
            <span className={enabled ? "text-mbg-green" : "text-mbg-black/60"}>
              {enabled ? "Yes" : "No"}
            </span>
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <FetchToggle
            id={row.original._id}
            initial={(row.original as any)?.fetchToStore}
            onChanged={(next) => opts?.onFetchChange?.(row.original._id, next)}
          />
          <Delete item="product" id={row.original._id} />
        </div>
      ),
    },
  ];
}
