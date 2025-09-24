"use client";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<CustomerType>[] = [
  {
    accessorKey: "clerkId",
    header: "Clerk ID",
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const n = (row.original.name || "").trim();
      const e = (row.original.email || "").trim();
      const id = row.original.clerkId;
      return n || e || id;
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const e = (row.original.email || "").trim();
      return e || "—";
    },
  },
];
