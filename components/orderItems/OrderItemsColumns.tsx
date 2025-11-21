"use client";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";

export const columns: ColumnDef<OrderItemType>[] = [
  {
    accessorKey: "product",
    header: "Product",
    cell: ({ row }) => (
      <Link href={`/products/${row.original?.product?._id ?? row.original.productId ?? ""}`}>
        {row.original?.product?.title ?? row.original.titleSnapshot ?? "Product"}
      </Link>
    ),
  },
  {
    accessorKey: "color",
    header: "Color",
  },
  {
    accessorKey: "size",
    header: "Size",
  },
  {
    accessorKey: "quantity",
    header: "Quantity",
  },
];
