import type { Metadata, Viewport } from "next";
import { MoneyApp } from "@/components/money/MoneyApp";
import "./money.css";

export const metadata: Metadata = {
  title: "Ayeba Money — votre portefeuille",
  description:
    "Portefeuille Ayeba : soldes USD & CDF, transferts internes instantanés et gratuits, dépôts et retraits Mobile Money.",
  manifest: "/manifest-money.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Ayeba Money",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function MoneyPage() {
  return <MoneyApp />;
}
