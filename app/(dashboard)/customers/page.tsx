/* eslint-disable @typescript-eslint/no-explicit-any */
import { columns } from '@/components/customers/CustomerColumns'
import Container from '@/components/mbg-components/Container'
import { DataTable } from '@/components/mbg-components/DataTable'
import { H2 } from '@/components/mbg-components/H2'
import Separator from '@/components/mbg-components/Separator'
import Customer from '@/lib/models/Customer'
import Order from '@/lib/models/Order'
import { connectToDB } from '@/lib/mongoDB'
import React from 'react'

export const dynamic = "force-dynamic";



type LeanCustomer = {
  clerkId?: string
  name?: string
  email?: string
}

type OrderIdDoc = {
  _id: unknown
}

const Customers = async () => {
  await connectToDB()

  // If the customers collection is empty or missing fields, rebuild from orders
  // 1) Collect distinct clerkIds from orders
  const distinctIds: string[] = await Order.distinct('customerClerkId', { customerClerkId: { $exists: true, $ne: "" } })

  // 2) For each id, ensure there is a Customer doc; enrich from Clerk when possible
  const secret = process.env.CLERK_SECRET_KEY
  for (const id of distinctIds) {
    const existing = await Customer.findOne({ clerkId: id }).select('clerkId name email').lean<LeanCustomer>()
    if (existing && existing.name && existing.email) continue

    let name = existing?.name || ''
    let email = existing?.email || ''
    if (secret) {
      try {
        const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(id)}` as any, {
          headers: { Authorization: `Bearer ${secret}` },
          cache: 'no-store',
        } as any)
        if (res.ok) {
          const u: any = await res.json()
          const n = [u?.first_name, u?.last_name].filter(Boolean).join(' ')
          const primaryEmailId = u?.primary_email_address_id
          const e = (u?.email_addresses || []).find((x: any) => x.id === primaryEmailId)?.email_address || u?.email_addresses?.[0]?.email_address || ''
          if (!name && n) name = n
          if (!email && e) email = String(e).toLowerCase()
        }
      } catch {}
    }

    // Also link this customer's existing orders
    const orderIds = await Order.find({ customerClerkId: id }).select('_id').lean<OrderIdDoc[]>()
    const ids = orderIds.map((o) => o._id)

    const update: any = {
      $setOnInsert: { clerkId: id },
      $set: { ...(name && { name }), ...(email && { email }) },
    }
    if (ids.length) update.$addToSet = { orders: { $each: ids } }

    await Customer.updateOne(
      { clerkId: id },
      update,
      { upsert: true, setDefaultsOnInsert: true }
    )
  }

  // 3) Return only plain, serializable fields for the client table
  const docs = await Customer.find().sort({ createdAt: 'desc' }).select('clerkId name email').lean<LeanCustomer[]>()

  const customers: CustomerType[] = (docs || []).map((d) => ({
    clerkId: String(d?.clerkId || ''),
    name: (d?.name && String(d.name).trim()) || '',
    email: (d?.email && String(d.email).trim()) || '',
  }))
  return (
    <Container>
          <H2>Customers</H2>
      <Separator className="bg-mbg-black mt-2 mb-4" />
      <DataTable columns={columns} data={customers} searchKey='name' />
    </Container>
  )
}

export default Customers
