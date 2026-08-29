export function daysAgoIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export function domainClause(alias = "domain") {
  return `(${alias} = ? OR ${alias} LIKE ?)`;
}

export function domainParams(domain: string): [string, string] {
  return [domain, `%.${domain}`];
}

export function urlHostMatchesDomain(url: string, domain: string): boolean {
  try {
    const host = new URL(url.includes("://") ? url : `https://${url}`).hostname.replace(/^www\./, "");
    return host === domain || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}
