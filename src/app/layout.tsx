import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { MobileAppBootstrap } from "@/components/MobileAppBootstrap";
import { PwaRegister } from "@/components/PwaRegister";
import { VercelMetrics } from "@/components/monitoring/VercelMetrics";
import { SearchFromUrlGate } from "@/components/search/SearchFromUrlGate";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { AyebaProvider } from "@/lib/store";
import { MarketProvider } from "@/lib/market-context";
import { AyebaJsonLd } from "@/components/seo/AyebaJsonLd";
import { siteMetadataBase } from "@/lib/site-url";
import "./globals.css";

// Polices auto-hébergées — plus aucun fetch Google Fonts au build,
// ce qui faisait échouer les déploiements Vercel de façon aléatoire.
const brand = localFont({
  src: "../../public/fonts/inter-var.woff2",
  variable: "--font-brand",
  weight: "100 900",
});

const display = localFont({
  src: "../../public/fonts/inter-var.woff2",
  variable: "--font-display",
  weight: "100 900",
});

const body = localFont({
  src: "../../public/fonts/inter-var.woff2",
  variable: "--font-body",
  weight: "100 900",
});

const mono = localFont({
  src: "../../public/fonts/jetbrains-mono-var.woff2",
  variable: "--font-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: siteMetadataBase(),
  title: {
    default: "AYEBA — Recherche mondiale",
    template: "%s · AYEBA",
  },
  description:
    "AYEBA trouve tout sur le web : pages, actualités, Ayebi, marchés. Recherche mondiale — le monde entier, une requête. ayeba.app",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://ayeba.app/#org",
                  name: "AYEBA",
                  url: "https://ayeba.app",
                  logo: {
                    "@type": "ImageObject",
                    url: "https://ayeba.app/brand/ayeba-mark-192.png",
                    width: 192,
                    height: 192,
                  },
                  sameAs: ["https://ayeba.app"],
                },
                {
                  "@type": "WebSite",
                  "@id": "https://ayeba.app/#website",
                  url: "https://ayeba.app",
                  name: "AYEBA",
                  publisher: { "@id": "https://ayeba.app/#org" },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: {
                      "@type": "EntryPoint",
                      urlTemplate: "https://ayeba.app/?q={search_term_string}",
                    },
                    "query-input": "required name=search_term_string",
                  },
                  inLanguage: ["fr", "en"],
                },
              ],
            }),
          }}
        />
      </head>
      <body className="ayeba-shell min-h-full">
        <AyebaJsonLd />
        <AuthProvider>
          <I18nProvider>
            <AyebaProvider>
              <MarketProvider>
                <MobileAppBootstrap />
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
