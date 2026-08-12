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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://ayeba.app"),
  title: {
    default: "AYEBA — Recherche mondiale",
    template: "%s · AYEBA",
  },
  description:
    "AYEBA est le moteur de recherche mondial : résultats web, priorité Afrique & RDC, encyclopédie Ayebi, marchés et navigateur. Pas une société de conseil.",
  applicationName: "AYEBA",
  manifest: "/manifest.webmanifest",
  keywords: [
    "AYEBA",
    "moteur de recherche",
    "recherche web",
    "Congo",
    "RDC",
    "Ayebi",
    "ayeba.app",
  ],
  authors: [{ name: "Ayeba", url: "https://ayeba.app" }],
  creator: "Ayeba",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://ayeba.app",
    siteName: "AYEBA",
    title: "AYEBA — Recherche mondiale",
    description:
      "Moteur de recherche mondial · Ayebi · marchés · navigateur Windows. ayeba.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "AYEBA — Recherche mondiale",
    description: "Le monde entier, une requête.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
      { url: "/brand/ayeba-mark.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "msapplication-TileColor": "#050507",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-icon" />
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
