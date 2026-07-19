import type { Metadata } from "next";

import { BatteryShowcasePage } from "@/components/showcase/BatteryShowcasePage";

export const metadata: Metadata = {
  title: "Battery Project Showcase",
  description: "A dedicated presentation frontend for the industrial battery monitoring project.",
};

export default function BatteryShowcaseRoute() {
  return <BatteryShowcasePage />;
}
