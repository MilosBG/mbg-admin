/* eslint-disable @typescript-eslint/no-explicit-any */


"use client";


import Button from '@/components/mbg-components/Button';
import Container from '@/components/mbg-components/Container';
import { DataTable } from '@/components/mbg-components/DataTable';
import { H2 } from '@/components/mbg-components/H2';
import Loader from '@/components/mbg-components/Loader';
import Separator from '@/components/mbg-components/Separator';
import { productColumns } from '@/components/products/ProductColumns';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react'

export const dynamic = "force-dynamic";

const Products = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<ProductType[]>([])

  const getProducts = async () => {
    try {
      const res = await fetch("/api/products", {
        method: "GET",
      })

      const data = await res.json()
      setProducts(data)
      setLoading(false)
    } catch (err) {
      console.log("[products_GET]", err);
      
    }
  }


  useEffect(() => {
    getProducts()
  }, [])

  // Subscribe to product stock updates via SSE
  useEffect(() => {
    const es = new EventSource("/api/products/events");
    es.onmessage = (evt) => {
      try {
        if (!evt?.data) return;
        const msg = JSON.parse(evt.data);
        if (msg?.type === "product" && msg?.kind === "stock" && msg?.productId) {
          setProducts((prev) =>
            prev.map((p) =>
              (p as any)._id === msg.productId
                ? ({
                    ...(p as any),
                    countInStock: typeof msg.countInStock === "number" ? msg.countInStock : (p as any).countInStock,
                    ...(Array.isArray(msg.variants) ? { variants: msg.variants } : {}),
                  } as any)
                : p,
            ),
          );
        }
      } catch {}
    };
    es.onerror = () => {
      // keep connection attempts silent; browser will auto-retry
    };
    return () => {
      try { es.close(); } catch {}
    };
  }, []);

  const cols = productColumns({
    onFetchChange: (id, value) => {
      setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, fetchToStore: value } as any : p)));
    },
    getFetchState: (id, initial) => {
      const item = (products as any[]).find((p) => p._id === id);
      return item?.fetchToStore ?? Boolean(initial);
    },
  });

  return loading ? <Loader /> : (
        <Container>
      <H2>Products</H2>
      <Separator className="bg-mbg-black mt-2 mb-4" />
      <Button
        mbg="treyfull"
        className="mbg-center mb-7"
        onClick={() => router.push("/products/new")}
      >
        <Plus className="mbg-icon mbg-icon-fix" /> Create Product
      </Button>
      <DataTable
        key={products.map(p => `${p._id}:${(p as any).fetchToStore ? 1 : 0}`).join("|")}
        columns={cols}
        data={products}
        searchKey='title'
      />
    </Container>
  )
}

export default Products
