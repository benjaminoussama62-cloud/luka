import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { VercelMetrics } from "@/components/monitoring/VercelMetrics";
import { SearchFromUrlGate } from "@/components/search/SearchFromUrlGate";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { AyebaProvider } from "@/lib/store";
import { MarketProvider } from "@/lib/market-context";
import "./globals.css";

const brand = Inter({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const display = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Ayeba",
  description: "Ayeba — recherche mondiale, priorité locale silencieuse.",
  applicationName: "Ayeba",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/ayeba-mark.svg", apple: "/brand/ayeba-mark.svg" },
  other: {
    "msapplication-TileColor": "#000000",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${brand.variable} ${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title="AYEBA"
          href="/opensearch.xml"
        />
      </head>
      <body className="ayeba-shell min-h-full">
        <AuthProvider>
          <I18nProvider>
            <AyebaProvider>
              <MarketProvider>
                <SearchFromUrlGate />
                {children}
                <PwaRegister />
                <VercelMetrics />
              </MarketProvider>
            </AyebaProvider>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
