/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";


import Container from "@/components/mbg-components/Container";
import Loader from "@/components/mbg-components/Loader";
import ProductForm from "@/components/products/ProductForm";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export const dynamic = "force-dynamic";



export default function ProductDetails() {
  const params = useParams<{ productId: string | string[] }>();
  const productId =
    Array.isArray(params.productId) ? params.productId[0] : params.productId;

  const [loading, setLoading] = useState(true);
  const [productDetails, setProductDetails] = useState<ProductType | null>(null);

  useEffect(() => {
    if (!productId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/products/${productId}`, { method: "GET" });
        const data = await res.json();
        if (!cancelled) {
          setProductDetails(data);
          setLoading(false);
        }
      } catch (err) {
        console.log("[productId_GET]", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Live update this product's stock/variants via SSE
  useEffect(() => {
    if (!productId) return;
    const es = new EventSource("/api/products/events");
    es.onmessage = (evt) => {
      try {
        if (!evt?.data) return;
        const msg = JSON.parse(evt.data);
        if (msg?.type === "product" && msg?.kind === "stock" && msg?.productId === productId) {
          setProductDetails((prev) => {
            if (!prev) return prev;
            return {
              ...(prev as any),
              countInStock: typeof msg.countInStock === "number" ? msg.countInStock : (prev as any).countInStock,
              ...(Array.isArray(msg.variants) ? { variants: msg.variants } : {}),
            } as any;
          });
        }
      } catch {}
    };
    es.onerror = () => {
      // ignore; browser will retry
    };
    return () => {
      try { es.close(); } catch {}
    };
  }, [productId]);

  return loading ? (
    <Loader />
  ) : (
    <Container>
      <ProductForm initialData={productDetails} />
    </Container>
  );
}
