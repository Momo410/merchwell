import type { Metadata } from "next";

import { HomeStage } from "@/components/home/home-versions";
import { Page } from "@/components/ui/page";
import { shopConfig } from "@/lib/config";
import { buildAlternates, buildOpenGraph } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const title = "Home";
  const description =
    "Custom company merch with your logo: hoodies, tees, caps and drinkware, with price breaks at 24, 50, 100 and 250 pieces.";
  return {
    title: `${title} | ${shopConfig.site.name}`,
    description,
    alternates: buildAlternates({ pathname: "/" }),
    openGraph: buildOpenGraph({
      title,
      description,
      url: "/",
      type: "website",
    }),
  };
}

// Momo approved V1 Stage as the homepage on 20 Nov; /v1, /v2 and /v3 stay as noindex review pages.
export default function HomePage() {
  return (
    <Page className="pt-0">
      <HomeStage />
    </Page>
  );
}
