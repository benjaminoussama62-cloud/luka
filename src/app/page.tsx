import type { Metadata } from "next";
import { AyebaApp } from "@/components/search/AyebaApp";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <AyebaApp />;
}
