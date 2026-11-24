import type { Metadata } from "next";

import { HomeStage, HomeVersionSwitch } from "@/components/home/home-versions";
import { Page } from "@/components/ui/page";

export const metadata: Metadata = { robots: { index: false }, title: "Home V1 Stage" };

export default function HomeV1Page() {
  return (
    <Page className="pt-0">
      <HomeStage />
      <HomeVersionSwitch current="/v1" />
    </Page>
  );
}
