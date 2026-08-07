export type MarketQuoteKind = "fx" | "fuel" | "crypto" | "commodity";

export type MarketQuoteMeta = {
  /** Valeur numérique principale (taux, prix unitaire…) */
  base: number;
  unitLabel?: string;
  /** fx: devise source → cible */
  from?: string;
  to?: string;
  /** fuel: type carburant */
  fuelType?: "essence" | "gasoil" | "gaz";
};

export type MarketQuote = {
  id: string;
  label: string;
  value: string;
  changePct: number | null;
  unit?: string;
  kind: MarketQuoteKind;
  meta?: MarketQuoteMeta;
};

export type MarketPayload = {
  updatedAt: string;
  source: string;
  quotes: MarketQuote[];
  cdfPerUsd: number | null;
};

export type FuelPrices = {
  essence: number;
  gasoil: number;
  gaz12kg: number;
};

/** Indicatifs pump (FC) — varient par ville et station */
export const FUEL_INDICATIVE_FC: FuelPrices = {
  essence: 3280,
  gasoil: 3220,
  gaz12kg: 18600,
};

export const FUEL_BY_CITY: Record<string, FuelPrices> = {
  Kinshasa: { essence: 3280, gasoil: 3220, gaz12kg: 18600 },
  Lubumbashi: { essence: 3310, gasoil: 3250, gaz12kg: 18800 },
  Goma: { essence: 3350, gasoil: 3280, gaz12kg: 19000 },
  Kisangani: { essence: 3400, gasoil: 3320, gaz12kg: 19200 },
};

/** Indicatif local — toujours utilisable même sans API live */
const INDICATIVE_USD_CDF = 2850;

export const MARKET_FALLBACK: MarketPayload = {
  updatedAt: new Date().toISOString(),
  source: "indicatif local",
  cdfPerUsd: INDICATIVE_USD_CDF,
  quotes: [
    {
      id: "usd-cdf",
      label: "USD/CDF",
      value: `${INDICATIVE_USD_CDF.toLocaleString("fr-FR")} FC`,
      changePct: null,
      unit: "FC",
      kind: "fx",
      meta: { base: INDICATIVE_USD_CDF, from: "USD", to: "CDF" },
    },
    {
      id: "eur-cdf",
      label: "EUR/CDF",
      value: `${Math.round(INDICATIVE_USD_CDF / 0.92).toLocaleString("fr-FR")} FC`,
      changePct: null,
      unit: "FC",
      kind: "fx",
      meta: { base: INDICATIVE_USD_CDF / 0.92, from: "EUR", to: "CDF" },
    },
    {
      id: "essence",
      label: "Essence KIN",
      value: `${FUEL_INDICATIVE_FC.essence.toLocaleString("fr-FR")} FC/L`,
      changePct: null,
      unit: "FC/L",
      kind: "fuel",
      meta: { base: FUEL_INDICATIVE_FC.essence, fuelType: "essence", unitLabel: "litre" },
    },
    {
      id: "gasoil",
      label: "Gasoil KIN",
      value: `${FUEL_INDICATIVE_FC.gasoil.toLocaleString("fr-FR")} FC/L`,
      changePct: null,
      unit: "FC/L",
      kind: "fuel",
      meta: { base: FUEL_INDICATIVE_FC.gasoil, fuelType: "gasoil", unitLabel: "litre" },
    },
    {
      id: "gaz",
      label: "Gaz 12 kg",
      value: `${FUEL_INDICATIVE_FC.gaz12kg.toLocaleString("fr-FR")} FC`,
      changePct: null,
      unit: "FC",
      kind: "fuel",
      meta: { base: FUEL_INDICATIVE_FC.gaz12kg, fuelType: "gaz", unitLabel: "bouteille" },
    },
  ],
};

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function pctChange(now: number, prev: number | null): number | null {
  if (!prev || prev === 0) return null;
  return ((now - prev) / prev) * 100;
}

async function fetchJson<T>(url: string, ms = 4500): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function fetchUsdRates() {
  const data = await fetchJson<{ usd?: Record<string, number> }>(
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
  );
  if (!data.usd?.cdf) throw new Error("CDF missing");
  return data.usd;
}

async function fetchUsdRatesPrev() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const date = d.toISOString().slice(0, 10);
  try {
    const data = await fetchJson<{ usd?: Record<string, number> }>(
      `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/usd.json`,
      3000,
    );
    return data.usd ?? null;
  } catch {
    return null;
  }
}

async function fetchCrypto() {
  try {
    const data = await fetchJson<{
      bitcoin?: { usd?: number; usd_24h_change?: number };
      ethereum?: { usd?: number; usd_24h_change?: number };
      tether?: { usd?: number; usd_24h_change?: number };
    }>(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd&include_24hr_change=true",
      4000,
    );
    return data;
  } catch {
    return null;
  }
}

export async function getMarketData(): Promise<MarketPayload> {
  const quotes: MarketQuote[] = [];
  let source = "currency-api · coingecko · indicatifs RDC";
  let cdfPerUsd: number | null = null;

  try {
    const [usd, prev, crypto] = await Promise.all([fetchUsdRates(), fetchUsdRatesPrev(), fetchCrypto()]);
    cdfPerUsd = usd.cdf;
    const eurPerUsd = usd.eur;
    const gbpPerUsd = usd.gbp;
    const zarPerUsd = usd.zar;
    const cnyPerUsd = usd.cny;
    const xafPerUsd = usd.xaf;
    const ngnPerUsd = usd.ngn;

    quotes.push({
      id: "usd-cdf",
      label: "USD/CDF",
      value: fmt(cdfPerUsd, 2),
      changePct: pctChange(cdfPerUsd, prev?.cdf ?? null),
      unit: "FC",
      kind: "fx",
      meta: { base: cdfPerUsd, from: "USD", to: "CDF", unitLabel: "franc congolais" },
    });

    if (eurPerUsd) {
      const eurCdf = cdfPerUsd / eurPerUsd;
      quotes.push({
        id: "eur-cdf",
        label: "EUR/CDF",
        value: fmt(eurCdf, 2),
        changePct: pctChange(eurCdf, prev?.cdf && prev?.eur ? prev.cdf / prev.eur : null),
        unit: "FC",
        kind: "fx",
        meta: { base: eurCdf, from: "EUR", to: "CDF", unitLabel: "franc congolais" },
      });
      quotes.push({
        id: "eur-usd",
        label: "EUR/USD",
        value: fmt(1 / eurPerUsd, 4),
        changePct: pctChange(1 / eurPerUsd, prev?.eur ? 1 / prev.eur : null),
        kind: "fx",
        meta: { base: 1 / eurPerUsd, from: "EUR", to: "USD" },
      });
    }

    if (gbpPerUsd) {
      const gbpCdf = cdfPerUsd / gbpPerUsd;
      quotes.push({
        id: "gbp-cdf",
        label: "GBP/CDF",
        value: fmt(gbpCdf, 2),
        changePct: pctChange(gbpCdf, prev?.cdf && prev?.gbp ? prev.cdf / prev.gbp : null),
        unit: "FC",
        kind: "fx",
        meta: { base: gbpCdf, from: "GBP", to: "CDF", unitLabel: "franc congolais" },
      });
    }

    if (zarPerUsd) {
      const zarCdf = cdfPerUsd / zarPerUsd;
      quotes.push({
        id: "zar-cdf",
        label: "ZAR/CDF",
        value: fmt(zarCdf, 2),
        changePct: pctChange(zarCdf, prev?.cdf && prev?.zar ? prev.cdf / prev.zar : null),
        unit: "FC",
        kind: "fx",
        meta: { base: zarCdf, from: "ZAR", to: "CDF", unitLabel: "franc congolais" },
      });
    }

    if (ngnPerUsd) {
      const ngnCdf = cdfPerUsd / ngnPerUsd;
      quotes.push({
        id: "ngn-cdf",
        label: "NGN/CDF",
        value: fmt(ngnCdf, 2),
        changePct: pctChange(ngnCdf, prev?.cdf && prev?.ngn ? prev.cdf / prev.ngn : null),
        unit: "FC",
        kind: "fx",
        meta: { base: ngnCdf, from: "NGN", to: "CDF" },
      });
    }

    if (cnyPerUsd) {
      const cnyCdf = cdfPerUsd / cnyPerUsd;
      quotes.push({
        id: "cny-cdf",
        label: "CNY/CDF",
        value: fmt(cnyCdf, 2),
        changePct: null,
        unit: "FC",
        kind: "fx",
        meta: { base: cnyCdf, from: "CNY", to: "CDF" },
      });
    }

    if (xafPerUsd) {
      const xafCdf = cdfPerUsd / xafPerUsd;
      quotes.push({
        id: "xaf-cdf",
        label: "XAF/CDF",
        value: fmt(xafCdf, 2),
        changePct: null,
        unit: "FC",
        kind: "fx",
        meta: { base: xafCdf, from: "XAF", to: "CDF" },
      });
    }

    quotes.push({
      id: "essence",
      label: "Essence KIN",
      value: `${fmt(FUEL_INDICATIVE_FC.essence, 0)} FC/L`,
      changePct: null,
      unit: "FC/L",
      kind: "fuel",
      meta: {
        base: FUEL_INDICATIVE_FC.essence,
        unitLabel: "litre",
        fuelType: "essence",
      },
    });

    quotes.push({
      id: "gasoil",
      label: "Gasoil KIN",
      value: `${fmt(FUEL_INDICATIVE_FC.gasoil, 0)} FC/L`,
      changePct: null,
      unit: "FC/L",
      kind: "fuel",
      meta: {
        base: FUEL_INDICATIVE_FC.gasoil,
        unitLabel: "litre",
        fuelType: "gasoil",
      },
    });

    quotes.push({
      id: "gaz",
      label: "Gaz 12 kg",
      value: `${fmt(FUEL_INDICATIVE_FC.gaz12kg, 0)} FC`,
      changePct: null,
      unit: "FC",
      kind: "fuel",
      meta: {
        base: FUEL_INDICATIVE_FC.gaz12kg,
        unitLabel: "bouteille 12 kg",
        fuelType: "gaz",
      },
    });

    quotes.push(
      {
        id: "essence-lshi",
        label: "Essence L'shi",
        value: `${fmt(FUEL_BY_CITY.Lubumbashi.essence, 0)} FC/L`,
        changePct: null,
        unit: "FC/L",
        kind: "fuel",
        meta: { base: FUEL_BY_CITY.Lubumbashi.essence, unitLabel: "litre", fuelType: "essence" },
      },
      {
        id: "essence-goma",
        label: "Essence Goma",
        value: `${fmt(FUEL_BY_CITY.Goma.essence, 0)} FC/L`,
        changePct: null,
        unit: "FC/L",
        kind: "fuel",
        meta: { base: FUEL_BY_CITY.Goma.essence, unitLabel: "litre", fuelType: "essence" },
      },
    );

    const btc = crypto?.bitcoin;
    const eth = crypto?.ethereum;
    const usdt = crypto?.tether;

    if (btc?.usd) {
      quotes.push({
        id: "btc",
        label: "BTC",
        value: `$${fmt(btc.usd, 0)}`,
        changePct: btc.usd_24h_change ?? null,
        kind: "crypto",
        meta: { base: btc.usd, from: "BTC", to: "USD" },
      });
    }
    if (eth?.usd) {
      quotes.push({
        id: "eth",
        label: "ETH",
        value: `$${fmt(eth.usd, 0)}`,
        changePct: eth.usd_24h_change ?? null,
        kind: "crypto",
        meta: { base: eth.usd, from: "ETH", to: "USD" },
      });
    }
    if (usdt?.usd) {
      quotes.push({
        id: "usdt",
        label: "USDT",
        value: `$${fmt(usdt.usd, 4)}`,
        changePct: usdt.usd_24h_change ?? null,
        kind: "crypto",
        meta: { base: usdt.usd, from: "USDT", to: "USD" },
      });
    }

    quotes.push(
      {
        id: "gold",
        label: "Or",
        value: "$2 350/oz",
        changePct: null,
        kind: "commodity",
        meta: { base: 2350, unitLabel: "once", from: "USD" },
      },
      {
        id: "cobalt",
        label: "Cobalt",
        value: "$33/kg",
        changePct: null,
        kind: "commodity",
        meta: { base: 33, unitLabel: "kg", from: "USD" },
      },
      {
        id: "cuivre",
        label: "Cuivre",
        value: "$4,15/lb",
        changePct: null,
        kind: "commodity",
        meta: { base: 4.15, unitLabel: "lb", from: "USD" },
      },
      {
        id: "brent",
        label: "Pétrole Brent",
        value: "$82/bbl",
        changePct: null,
        kind: "commodity",
        meta: { base: 82, unitLabel: "baril", from: "USD" },
      },
    );
  } catch {
    source = "offline";
    return { ...MARKET_FALLBACK, updatedAt: new Date().toISOString(), source };
  }

  return { updatedAt: new Date().toISOString(), source, quotes, cdfPerUsd };
}
