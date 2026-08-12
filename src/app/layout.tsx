import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import { VercelMetrics } from "@/components/monitoring/VercelMetrics";
import { SearchFromUrlGate } from "@/components/search/SearchFromUrlGate";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { AyebaProvider } from "@/lib/store";
import { MarketProvider } from "@/lib/market-context";
import { AyebaJsonLd } from "@/components/seo/AyebaJsonLd";
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
    "AYEBA trouve tout sur le web : pages, actualités, Ayebi, marchés. Recherche mondiale — le monde entier, une requête. ayeba.app",
  applicationName: "AYEBA",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "https://ayeba.app",
  },
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
      {
        url: "/brand/ayeba-mark-48.png",
        type: "image/png",
        sizes: "48x48",
      },
      {
        url: "/brand/ayeba-mark-96.png",
        type: "image/png",
        sizes: "96x96",
      },
      {
        url: "/brand/ayeba-mark-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: [{ url: "/brand/ayeba-mark-48.png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
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
        {/* Favicon Ayeba — 48px+ PNG first (Google Search / Search Console) */}
        <link
          rel="icon"
          href="/brand/ayeba-mark-48.png"
          type="image/png"
          sizes="48x48"
        />
        <link
          rel="icon"
          href="/brand/ayeba-mark-96.png"
          type="image/png"
          sizes="96x96"
        />
        <link
          rel="icon"
          href="/brand/ayeba-mark-192.png"
          type="image/png"
          sizes="192x192"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/brand/ayeba-mark-48.png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title="AYEBA"
          href="/opensearch.xml"
        />
      </head>
      <body className="ayeba-shell min-h-full">
        <AyebaJsonLd />
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
