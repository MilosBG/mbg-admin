import Container from "@/components/mbg-components/Container";
import { H2 } from "@/components/mbg-components/H2";
import Separator from "@/components/mbg-components/Separator";
import SiteStatusToggle from "@/components/milos-bg/SiteStatusToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMilosBGState } from "@/lib/siteStatusStore";

export const dynamic = "force-dynamic";




export const metadata = {
  title: "Milos BG | Store Control",
};

export default async function MilosBgManagementPage() {
  const state = await getMilosBGState();
  const storeUrl = process.env.ECOMMERCE_STORE_URL || "https://milos-bg.com";

  return (
    <Container>
      <H2>Milos BG Store</H2>
      <Separator className="bg-mbg-black mt-2 mb-4" />

      <Card className="border-mbg-green/30 rounded-none">
        <CardHeader>
          <CardTitle className="text-mbg-black text-xs font-semibold uppercase tracking-wide">
            Availability
          </CardTitle>
          <CardDescription className="text-mbg-green text-[10px] uppercase">
            Toggle whether visitors can reach mbg-store. When offline we serve an offline landing page that the storefront can fetch from the admin API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SiteStatusToggle
            initialState={state.isOnline}
            initialUpdatedAt={state.updatedAt}
            initialOfflineMessage={state.offlineMessage}
            storeUrl={storeUrl}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
