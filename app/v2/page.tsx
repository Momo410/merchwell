import type { Metadata } from "next";

import { HomeAgent, HomeVersionSwitch } from "@/components/home/home-versions";
import { Page } from "@/components/ui/page";

export const metadata: Metadata = { robots: { index: false }, title: "Home V2 Agent" };

export default function HomeV2Page() {
  return (
    <Page className="pt-0">
      <HomeAgent />
      <HomeVersionSwitch current="/v2" />
    </Page>
  );
}
