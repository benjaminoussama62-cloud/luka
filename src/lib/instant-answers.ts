import { lookupDefinition } from "./definitions";
import { FUEL_INDICATIVE_FC, FUEL_BY_CITY } from "./market";
import { populationAnswer } from "./population-data";
import type { InstantAnswer } from "./types";

type FxRates = {
  cdf: number;
  eur: number;
  gbp: number;
  zar: number;
  cny: number;
  xaf: number;
  ngn: number;
  cad: number;
  chf: number;
};

async function fetchFxRates(): Promise<FxRates | null> {
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      { signal: AbortSignal.timeout(4000), next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { usd?: Record<string, number> };
    if (!data.usd?.cdf) return null;
    return {
      cdf: data.usd.cdf,
      eur: data.usd.eur ?? 0,
      gbp: data.usd.gbp ?? 0,
      zar: data.usd.zar ?? 0,
      cny: data.usd.cny ?? 0,
      xaf: data.usd.xaf ?? 0,
      ngn: data.usd.ngn ?? 0,
      cad: data.usd.cad ?? 0,
      chf: data.usd.chf ?? 0,
    };
  } catch {
    return null;
  }
}

async function fetchWeather(city: string): Promise<InstantAnswer | null> {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      signal: AbortSignal.timeout(3500),
      headers: { "User-Agent": "Ayeba/1.0" },
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      nearest_area?: { areaName?: { value?: string }[] }[];
      current_condition?: {
        temp_C?: string;
        weatherDesc?: { value?: string }[];
        humidity?: string;
        windspeedKmph?: string;
      }[];
    };
    const cur = data.current_condition?.[0];
    const name = data.nearest_area?.[0]?.areaName?.[0]?.value ?? city;
    if (!cur?.temp_C) return null;
    return {
      kind: "weather",
      title: `Météo · ${name}`,
      lines: [
        { label: "Température", value: `${cur.temp_C} °C` },
        { label: "Conditions", value: cur.weatherDesc?.[0]?.value ?? "—" },
        { label: "Humidité", value: cur.humidity ? `${cur.humidity} %` : "—" },
        { label: "Vent", value: cur.windspeedKmph ? `${cur.windspeedKmph} km/h` : "—" },
      ],
      footnote: "Source wttr.in · actualisé à la requête",
    };
  } catch {
    return null;
  }
}

function parseAmount(q: string): number | null {
  const m = q.match(/(\d[\d\s.,]*)/);
  if (!m) return null;
  const n = Number(m[1].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number, d = 2) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: d });
}

function tryFx(query: string, rates: FxRates | null): InstantAnswer | null {
  const q = query.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const amount = parseAmount(query) ?? 1;

  const pairs: { re: RegExp; from: string; to: string; id: string; rate: (r: FxRates) => number }[] = [
    {
      re: /\b(usd|dollar|dollars?)\b.*\b(cdf|fc|franc)\b|\b(cdf|fc)\b.*\b(usd|dollar)\b|\btaux\s+(du\s+)?dollar\b|\bdollar\s+congolais\b|\busd\s*\/?\s*cdf\b/,
      from: "USD",
      to: "CDF",
      id: "usd-cdf",
      rate: (r) => r.cdf,
    },
    {
      re: /\b(eur|euro)\b.*\b(cdf|fc|franc)\b|\b(cdf|fc)\b.*\b(eur|euro)\b|\beur\s*\/?\s*cdf\b|\btaux\s+euro\b/,
      from: "EUR",
      to: "CDF",
      id: "eur-cdf",
      rate: (r) => (r.eur ? r.cdf / r.eur : 0),
    },
    {
      re: /\b(gbp|livre)\b.*\b(cdf|fc)\b|\bgbp\s*\/?\s*cdf\b/,
      from: "GBP",
      to: "CDF",
      id: "gbp-cdf",
      rate: (r) => (r.gbp ? r.cdf / r.gbp : 0),
    },
    {
      re: /\b(zar|rand)\b.*\b(cdf|fc)\b|\bcdf\b.*\b(zar|rand)\b/,
      from: "ZAR",
      to: "CDF",
      id: "zar-cdf",
      rate: (r) => (r.zar ? r.cdf / r.zar : 0),
    },
    {
      re: /\b(cny|yuan|chinois)\b.*\b(cdf|fc)\b|\bcny\s*\/?\s*cdf\b/,
      from: "CNY",
      to: "CDF",
      id: "cny-cdf",
      rate: (r) => (r.cny ? r.cdf / r.cny : 0),
    },
    {
      re: /\b(xaf|cfa|franc cfa)\b.*\b(cdf|fc)\b/,
      from: "XAF",
      to: "CDF",
      id: "xaf-cdf",
      rate: (r) => (r.xaf ? r.cdf / r.xaf : 0),
    },
    {
      re: /\b(ngn|naira)\b.*\b(cdf|fc)\b/,
      from: "NGN",
      to: "CDF",
      id: "ngn-cdf",
      rate: (r) => (r.ngn ? r.cdf / r.ngn : 0),
    },
    {
      re: /\beur\s*\/?\s*usd\b|\beuro\s+dollar\b/,
      from: "EUR",
      to: "USD",
      id: "eur-usd",
      rate: (r) => (r.eur ? 1 / r.eur : 0),
    },
  ];

  if (!rates) return null;

  for (const p of pairs) {
    if (!p.re.test(q)) continue;
    const base = p.rate(rates);
    if (!base) continue;
    const reverse = /\b(cdf|fc|franc)\b.*\b(usd|eur|gbp|zar|dollar|euro)\b/.test(q) && !/\b(usd|eur|gbp|zar)\b.*\b(cdf|fc)\b/.test(q);
    const out = reverse ? amount / base : amount * base;
    const outCur = reverse ? p.from : p.to;
    return {
      kind: "fx",
      title: `${fmt(amount, amount % 1 ? 2 : 0)} ${reverse ? p.to : p.from} → ${p.from}/${p.to}`,
      lines: [
        { label: "Résultat", value: `${fmt(out, outCur === "CDF" ? 0 : 4)} ${outCur}` },
        { label: "Taux", value: `1 ${p.from} = ${fmt(base, outCur === "CDF" ? 2 : 4)} ${p.to}` },
      ],
      footnote: "Taux live · banques et bureaux peuvent appliquer un spread",
      marketQuoteId: p.id,
      defaultAmount: String(amount),
    };
  }
  return null;
}

function tryFuel(query: string): InstantAnswer | null {
  const q = query.toLowerCase();
  const amount = parseAmount(query);

  let city = "Kinshasa";
  if (/\b(lubumbashi|likasi)\b/.test(q)) city = "Lubumbashi";
  else if (/\b(goma|bukavu|kivu)\b/.test(q)) city = "Goma";
  else if (/\b(kisangani)\b/.test(q)) city = "Kisangani";

  const prices = FUEL_BY_CITY[city] ?? FUEL_INDICATIVE_FC;

  type FuelDef = { re: RegExp; label: string; price: number; unit: string; id: string; type: "essence" | "gasoil" | "gaz" };
  const fuels: FuelDef[] = [
    { re: /\b(essence|super|sp95|carburant|pompe)\b/, label: "Essence", price: prices.essence, unit: "FC/L", id: "essence", type: "essence" },
    { re: /\b(gasoil|diesel|gazole)\b/, label: "Gasoil", price: prices.gasoil, unit: "FC/L", id: "gasoil", type: "gasoil" },
    { re: /\b(gaz|bouteille|lpg|butane|propane)\b/, label: "Gaz 12 kg", price: prices.gaz12kg, unit: "FC/bouteille", id: "gaz", type: "gaz" },
  ];

  for (const f of fuels) {
    if (!f.re.test(q)) continue;
    const qty = amount ?? (f.type === "gaz" ? 1 : 10);
    const total = qty * f.price;
    return {
      kind: "fuel",
      title: `Prix ${f.label} · ${city}`,
      lines: [
        { label: "Prix unitaire", value: `${fmt(f.price, 0)} ${f.unit}` },
        { label: f.type === "gaz" ? `${fmt(qty, 0)} bouteille(s)` : `${fmt(qty, 1)} L`, value: `${fmt(total, 0)} FC` },
        { label: "Ville", value: city },
      ],
      footnote: "Indicatif station · vérifiez sur place avant de sortir",
      marketQuoteId: f.id,
      defaultAmount: String(qty),
    };
  }
  return null;
}

const CITY_ALIASES: Record<string, string> = {
  kinshasa: "Kinshasa",
  lubumbashi: "Lubumbashi",
  goma: "Goma",
  bukavu: "Bukavu",
  kisangani: "Kisangani",
  matadi: "Matadi",
  paris: "Paris",
  london: "London",
  "new york": "New York",
  bruxelles: "Brussels",
  dakar: "Dakar",
  nairobi: "Nairobi",
  johannesburg: "Johannesburg",
  lagos: "Lagos",
  cairo: "Cairo",
  dubai: "Dubai",
  montreal: "Montreal",
  geneve: "Geneva",
};

function tryTime(query: string): InstantAnswer | null {
  const q = query.toLowerCase();
  if (!/\b(heure|time|quelle heure|timezone|fuseau)\b/.test(q)) return null;

  let city = "Kinshasa";
  for (const [alias, name] of Object.entries(CITY_ALIASES)) {
    if (q.includes(alias)) {
      city = name;
      break;
    }
  }

  const zones: Record<string, string> = {
    Kinshasa: "Africa/Kinshasa",
    Lubumbashi: "Africa/Lubumbashi",
    Goma: "Africa/Lubumbashi",
    Paris: "Europe/Paris",
    London: "Europe/London",
    "New York": "America/New_York",
    Brussels: "Europe/Brussels",
    Dakar: "Africa/Dakar",
    Nairobi: "Africa/Nairobi",
    Johannesburg: "Africa/Johannesburg",
  };

  const tz = zones[city] ?? "Africa/Kinshasa";
  const now = new Date();
  const time = now.toLocaleString("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleString("fr-FR", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return {
    kind: "time",
    title: `Heure · ${city}`,
    lines: [
      { label: "Maintenant", value: time },
      { label: "Date", value: date },
      { label: "Fuseau", value: tz },
    ],
    footnote: "Heure locale calculée côté serveur",
  };
}

function tryWeatherQuery(query: string): string | null {
  const q = query.toLowerCase();
  if (!/\b(meteo|météo|weather|pluie|temperature|température|climat)\b/.test(q)) return null;

  for (const [alias, name] of Object.entries(CITY_ALIASES)) {
    if (q.includes(alias)) return name;
  }
  if (/\b(rdc|congo|kinshasa)\b/.test(q)) return "Kinshasa";
  const m = q.match(/\b(?:meteo|météo|weather)\s+(?:a|à|at|in|de|du)?\s*([a-zàâäéèêëïîôùûüç\s-]{3,})/i);
  if (m?.[1]) return m[1].trim();
  return "Kinshasa";
}

function tryUnit(query: string): InstantAnswer | null {
  const q = query.toLowerCase().replace(",", ".");
  const m = q.match(/(\d+(?:\.\d+)?)\s*(km|mi|miles?|kg|lb|lbs|l|litre|litres|gal|celsius|fahrenheit|°c|°f)\s*(?:en|to|vers|in|=|->)?\s*(km|mi|miles?|kg|lb|lbs|l|litre|litres|gal|celsius|fahrenheit|°c|°f)?/i);
  if (!m) return null;

  const val = Number(m[1]);
  const from = m[2].replace("°", "").toLowerCase();
  const to = (m[3] ?? "").replace("°", "").toLowerCase();
  if (!to) return null;

  const conv: Record<string, Record<string, (v: number) => number>> = {
    km: { mi: (v) => v * 0.621371, miles: (v) => v * 0.621371 },
    mi: { km: (v) => v * 1.60934 },
    miles: { km: (v) => v * 1.60934 },
    kg: { lb: (v) => v * 2.20462, lbs: (v) => v * 2.20462 },
    lb: { kg: (v) => v / 2.20462 },
    lbs: { kg: (v) => v / 2.20462 },
    l: { gal: (v) => v * 0.264172 },
    litre: { gal: (v) => v * 0.264172 },
    litres: { gal: (v) => v * 0.264172 },
    gal: { l: (v) => v / 0.264172 },
    celsius: { fahrenheit: (v) => (v * 9) / 5 + 32 },
    fahrenheit: { celsius: (v) => ((v - 32) * 5) / 9 },
  };

  const fn = conv[from]?.[to];
  if (!fn) return null;
  const out = fn(val);

  return {
    kind: "unit",
    title: "Conversion",
    lines: [
      { label: "Entrée", value: `${fmt(val, 4)} ${from}` },
      { label: "Résultat", value: `${fmt(out, 4)} ${to}` },
    ],
    footnote: "Conversion standard",
  };
}

export async function resolveInstantAnswers(query: string): Promise<InstantAnswer[]> {
  const q = query.trim();
  if (!q) return [];
  const out: InstantAnswer[] = [];

  const def = lookupDefinition(q);
  if (def) {
    out.push({
      kind: "definition",
      title: def.term,
      lines: [{ label: "Définition", value: def.def }],
      footnote: "Ayebi · dictionnaire AYEBA",
    });
  }

  const pop = populationAnswer(q);
  if (pop) {
    out.push({
      kind: "population",
      title: pop.title,
      lines: [{ label: "Population", value: pop.value }],
      footnote: pop.footnote,
    });
  }

  const time = tryTime(q);
  if (time) out.push(time);

  const unit = tryUnit(q);
  if (unit) out.push(unit);

  const fuel = tryFuel(q);
  if (fuel) out.push(fuel);

  const weatherCity = tryWeatherQuery(q);
  if (weatherCity) {
    const w = await fetchWeather(weatherCity);
    if (w) out.push(w);
  }

  const wantsFx =
    /\b(change|devise|taux|exchange|franc congolais|cdf|usd|eur|dollar|euro|gbp|bureau de change)\b/i.test(q) ||
    /\b\d+[\s,]*(usd|eur|cdf|fc|\$|€)\b/i.test(q);
  if (wantsFx) {
    const rates = await fetchFxRates();
    const fx = tryFx(q, rates);
    if (fx) out.push(fx);

    if (/\b(change|devise|taux|exchange|franc congolais|cdf|bureau de change)\b/i.test(q) && rates && !fx) {
      out.push({
        kind: "fx",
        title: "Tableau de change · RDC",
        lines: [
          { label: "1 USD", value: `${fmt(rates.cdf, 2)} FC` },
          { label: "1 EUR", value: rates.eur ? `${fmt(rates.cdf / rates.eur, 2)} FC` : "—" },
          { label: "1 GBP", value: rates.gbp ? `${fmt(rates.cdf / rates.gbp, 2)} FC` : "—" },
          { label: "1 ZAR", value: rates.zar ? `${fmt(rates.cdf / rates.zar, 2)} FC` : "—" },
          { label: "1 CNY", value: rates.cny ? `${fmt(rates.cdf / rates.cny, 2)} FC` : "—" },
        ],
        footnote: "Taux live · clic pour convertir un montant",
        marketQuoteId: "usd-cdf",
        defaultAmount: "100",
      });
    }
  }

  if (/\b(prix|carburant|essence|gasoil|station)\b/i.test(q) && !fuel) {
    out.push({
      kind: "fuel",
      title: "Carburants · indicatifs RDC",
      lines: [
        { label: "Essence KIN", value: `${fmt(FUEL_INDICATIVE_FC.essence, 0)} FC/L` },
        { label: "Gasoil KIN", value: `${fmt(FUEL_INDICATIVE_FC.gasoil, 0)} FC/L` },
        { label: "Gaz 12 kg", value: `${fmt(FUEL_INDICATIVE_FC.gaz12kg, 0)} FC` },
        { label: "Essence L'shi", value: `${fmt(FUEL_BY_CITY.Lubumbashi.essence, 0)} FC/L` },
      ],
      footnote: "Vérifiez sur place · prix varient par station",
      marketQuoteId: "essence",
      defaultAmount: "20",
    });
  }

  return out.slice(0, 4);
}

/** @deprecated use resolveInstantAnswers */
export async function resolveInstantAnswer(query: string): Promise<InstantAnswer | null> {
  const all = await resolveInstantAnswers(query);
  return all[0] ?? null;
}
