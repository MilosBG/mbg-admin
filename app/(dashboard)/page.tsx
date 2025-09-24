import Container from "@/components/mbg-components/Container";
import { H2 } from "@/components/mbg-components/H2";
import Separator from "@/components/mbg-components/Separator";
import { GiBasketballBall, GiCardboardBox } from "react-icons/gi";
import { LucideBadgeEuro } from "lucide-react";
import { RiFolderUserLine } from "react-icons/ri";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getSalesPerMonth,
  getTotalCustomers,
  getTotalSales,
  getTotalProducts,
} from "@/lib/actions/actions";
import SalesChart from "@/components/mbg-components/SalesChart";

export const dynamic = "force-dynamic";

export default async function Home() {
  const totalRevenue = await getTotalSales().then((data) => data.totalRevenue);
  const totalOrders = await getTotalSales().then((data) => data.totalOrders);
  const totalCustomers = await getTotalCustomers();
  const totalProducts = await getTotalProducts();

  const graphData = await getSalesPerMonth();

  return (
    <Container>
      <H2>Dashboard</H2>
      <Separator className="bg-mbg-black mt-2 mb-4" />

      <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
        {/* TOTAL REVENUE */}
        <Card className="px-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-mbg-black text-sm font-bold tracking-wider uppercase">
              Total Revenue
            </CardTitle>
            <div className="bg-mbg-green/20 px-2 py-1 max-sm:hidden">
              <LucideBadgeEuro className="text-mbg-green h-5 w-5 p-0.5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-mbg-green text-xl font-bold">€ {totalRevenue}</p>
          </CardContent>
        </Card>
        {/* TOTAL ORDERS */}
        <Card className="px-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-mbg-black text-sm font-bold tracking-wider uppercase">
              Total Orders
            </CardTitle>
            <div className="bg-mbg-green/20 px-2 py-1 max-sm:hidden">
              <GiBasketballBall className="text-mbg-green h-5 w-5 p-0.5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-mbg-green text-xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
        {/* TOTAL CUSTOMERS */}
        <Card className="px-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-mbg-black text-sm font-bold tracking-wider uppercase">
              Total Customers
            </CardTitle>
            <div className="bg-mbg-green/20 px-2 py-1 max-sm:hidden">
              <RiFolderUserLine className="text-mbg-green h-5 w-5 p-0.5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-mbg-green text-xl font-bold">{totalCustomers}</p>
          </CardContent>
        </Card>{" "}
        {/* TOTAL PRODUCTS */}
        <Card className="px-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-mbg-black text-sm font-bold tracking-wider uppercase">
              Total Products
            </CardTitle>
            <div className="bg-mbg-green/20 px-2 py-1 max-sm:hidden">
              <GiCardboardBox className="text-mbg-green h-5 w-5 p-0.5" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-mbg-green text-xl font-bold">{totalProducts}</p>
          </CardContent>
        </Card>
      </div>
      {/* SALES CHART */}
      <Card className="mt-10 px-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-mbg-black text-sm font-bold tracking-wider uppercase">
            Sales Chart (€)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart data={graphData} />
        </CardContent>
      </Card>
    </Container>
  );
}
