import type { Metadata } from "next";

import { HomeLookbook, HomeVersionSwitch } from "@/components/home/home-versions";
import { Page } from "@/components/ui/page";

export const metadata: Metadata = { robots: { index: false }, title: "Home V3 Lookbook" };

export default function HomeV3Page() {
  return (
    <Page className="pt-0">
      <HomeLookbook />
      <HomeVersionSwitch current="/v3" />
    </Page>
  );
}
