"use client";
import { ColumnDef } from "@tanstack/react-table";
import Delete from "../mbg-components/Delete";
import Link from "next/link";

export const columns: ColumnDef<ChapterType>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <Link href={`/chapters/${row.original._id}`}>{row.original.title}</Link>
    ),
  },
  {
    accessorKey: "products",
    header: "Products",
    cell: ({ row }) => <p>{row.original.products.length}</p>,
  },
  {
    id: "actions",
    header: "Action",
    cell: ({ row }) => <Delete item="chapter" id={row.original._id} />,
  },
];
