import type { Metadata } from "next";
import { AssessExperience } from "@/components/AssessExperience";

export const metadata: Metadata = {
  title: "Try Compass",
  description:
    "Describe a situation in plain language and watch Compass assemble a grounded, ready-to-file plan of local aid.",
};

export default function TryPage() {
  return <AssessExperience guest />;
}
