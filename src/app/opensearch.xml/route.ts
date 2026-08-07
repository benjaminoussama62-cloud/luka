import { NextResponse } from "next/server";

function siteOrigin(req: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  try {
    return new URL(req.url).origin;
  } catch {
    return "https://ayeba.app";
  }
}

export async function GET(req: Request) {
  const origin = siteOrigin(req);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>AYEBA</ShortName>
  <LongName>AYEBA — Recherche mondiale</LongName>
  <Description>Moteur de recherche AYEBA · priorité RDC · zéro pub · résultats rapides</Description>
  <Tags>search congo rdc kinshasa ayebi</Tags>
  <Contact>contact@ayeba.app</Contact>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
  <Language>fr</Language>
  <Image height="64" width="64" type="image/svg+xml">${origin}/brand/ayeba-mark.svg</Image>
  <Image height="16" width="16" type="image/svg+xml">${origin}/brand/ayeba-mark.svg</Image>
  <Url type="text/html" method="get" template="${origin}/?q={searchTerms}"/>
  <Url type="application/x-suggestions+json" method="get" template="${origin}/api/suggest?q={searchTerms}&amp;format=opensearch"/>
  <moz:SearchForm>${origin}/</moz:SearchForm>
  <Query role="example" searchTerms="Kinshasa" />
  <Query role="example" searchTerms="actualité RDC" />
  <AdultContent>false</AdultContent>
  <SyndicationRight>open</SyndicationRight>
</OpenSearchDescription>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/opensearchdescription+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
