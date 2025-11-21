/* eslint-disable @typescript-eslint/no-explicit-any */


"use client";


import React, { useEffect, useState } from "react";
import Container from "@/components/mbg-components/Container";
import { DataTable } from "@/components/mbg-components/DataTable";
import { H2 } from "@/components/mbg-components/H2";
import Loader from "@/components/mbg-components/Loader";
import Separator from "@/components/mbg-components/Separator";
import { orderColumns } from "@/components/orders/OrderColumns";
import { fetchWithTimeout } from "@/lib/utils";

export const dynamic = "force-dynamic";

const Orders = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  const getOrders = async () => {
    try {
      const res = await fetchWithTimeout("/api/orders?limit=100", { cache: "no-store", timeoutMs: 20000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (err: any) {
      console.log("orders_GET", err);
      setError(err?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { getOrders(); }, []);

  if (loading) return <Loader />;
  if (error) return (
    <Container>
      <H2>Orders</H2>
      <Separator className="bg-mbg-black mt-2 mb-4" />
      <p className="text-red-600 text-sm">{error}</p>
    </Container>
  );

  const filtered = statusFilter === "ALL"
    ? orders
    : orders.filter((o) => String(o.fulfillmentStatus || "PENDING").toUpperCase() === String(statusFilter).toUpperCase());

  return (
    <Container>
      <H2>Orders</H2>
      <Separator className="bg-mbg-black mt-2 mb-4" />
      <div className="flex flex-col space-y-4 mb-4">
        
        <div className="flex flex-col items-start gap-2">
          <label className="text-[10px] font-semibold uppercase text-mbg-black">Status</label>
          <select
            className="border rounded-xs text-xs px-2 py-1"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">ALL</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>
      <DataTable
        key={`${statusFilter}|${filtered.map((o:any)=>o._id+':'+(o.fulfillmentStatus||'')).join('|')}`}
        columns={orderColumns({
          onStatusChange: (id, next) => {
            setOrders((prev) => prev.map((o: any) => (o._id === id ? { ...o, fulfillmentStatus: next } : o)));
          },
          onShipmentChange: (id, patch) => {
            setOrders((prev) => prev.map((o: any) => (
              o._id === id ? { ...o, ...patch } : o
            )));
          },
          onPaymentStatusChange: (id, next) => {
            setOrders((prev) => prev.map((o: any) => (
              o._id === id ? { ...o, paymentStatus: next } : o
            )));
          },
        })}
        data={filtered}
        searchKey="_id"
      />
    </Container>
  );
};

export default Orders;
