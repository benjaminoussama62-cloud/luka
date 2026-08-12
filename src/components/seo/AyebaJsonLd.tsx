/** Structured data for Google (site name, search box, brand). */
export function AyebaJsonLd() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://ayeba.app";

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: origin,
        name: "AYEBA",
        alternateName: ["Ayeba", "ayeba.app"],
        description:
          "Moteur de recherche mondial — web, Ayebi, marchés et navigateur. Le monde entier, une requête.",
        inLanguage: "fr-FR",
        publisher: { "@id": `${origin}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${origin}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "AYEBA",
        url: origin,
        logo: {
          "@type": "ImageObject",
          url: `${origin}/brand/ayeba-mark-192.png`,
          width: 192,
          height: 192,
        },
        sameAs: [],
        description:
          "AYEBA — moteur de recherche et plateforme web (ayeba.app). Distinct de toute société de conseil homonyme.",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
