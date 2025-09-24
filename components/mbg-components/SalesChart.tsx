"use client";

import Container from "./Container";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

type SalesPoint = {
  name: string;
  sales: number;
};

export default function SalesChart({ data }: { data: SalesPoint[] }) {
  return (
    <Container>
      <ResponsiveContainer
        width="100%"
        height={300}
        className="text-[10px] text-mbg-black uppercase"
      >
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#bfbfbf" strokeDasharray="5 5" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip cursor={{ fill: "rgba(0, 130, 26, 0.08)" }} />
          <Bar dataKey="sales" fill="#00821a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Container>
  );
}
