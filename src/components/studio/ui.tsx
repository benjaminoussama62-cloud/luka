"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* ---------- Module sub-navigation (Search Console style) ---------- */

export function ModuleNav({
  siteId,
  module,
  items,
}: {
  siteId: string;
  module: string;
  items: Array<{ slug: string; label: string }>;
}) {
  const pathname = usePathname();
  const base = `/studio/app/${siteId}/${module}`;
  return (
    <nav className="mb-8 flex flex-wrap gap-1 border-b border-[var(--line)] pb-3" aria-label="Sections">
      {items.map((item) => {
        const href = item.slug ? `${base}/${item.slug}` : base;
        const active = item.slug ? pathname === href : pathname === base;
        return (
          <Link
            key={item.slug || "index"}
            href={href}
            className={`px-3 py-1.5 text-xs transition ${
              active ? "text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
            style={active ? { boxShadow: "inset 0 -2px 0 var(--accent)" } : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/* ---------- Primitives ---------- */

export function SectionTitle({ kicker, title, aside }: { kicker?: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {kicker ? <p className="ayeba-kicker ayeba-kicker-accent">{kicker}</p> : null}
        <h2 className="mt-1 font-[family-name:var(--font-brand)] text-xl text-[var(--ink)]">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="ayeba-panel px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-brand)] text-2xl tracking-[-0.03em] text-[var(--ink)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</section>;
}

export function EmptyState({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return (
    <div className="ayeba-panel px-6 py-10 text-center">
      <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
      {detail ? <p className="mt-2 text-sm text-[var(--muted)]">{detail}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-[10px] uppercase tracking-[0.12em] text-[var(--faint)]">
          <tr>
            {columns.map((c) => (
              <th key={c} className="pb-3 pr-4 font-normal">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="border-t border-[var(--line)]">
              {cells.map((cell, j) => (
                <td key={j} className="py-3 pr-4 text-[var(--muted)] first:text-[var(--ink)]">{cell}</td>
              ))}
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-[var(--muted)]">{empty}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Score gauge (Lighthouse style) ---------- */

function scoreColor(score: number | null) {
  if (score == null) return "var(--faint)";
  if (score >= 90) return "#0cce6b";
  if (score >= 50) return "#ffa400";
  return "#ff4e42";
}

export function ScoreGauge({ score, label }: { score: number | null; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  const color = scoreColor(score);
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
          <circle cx="42" cy="42" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
          <circle
            cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-semibold" style={{ color }}>
          {score == null ? "—" : score}
        </span>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

/* ---------- Simple bar chart (real data, pure SVG) ---------- */

export function BarChart({
  points,
  height = 120,
}: {
  points: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  if (!points.length) return null;
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {points.map((p, i) => (
        <div key={i} className="group relative flex-1">
          <div
            className="w-full rounded-t-sm bg-[var(--accent)] opacity-70 transition group-hover:opacity-100"
            style={{ height: Math.max(2, (p.value / max) * (height - 20)) }}
          />
          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[var(--ink)] px-1.5 py-0.5 text-[10px] text-[var(--bg)] group-hover:block">
            {p.label}: {p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Courbe SVG (tendance multi-séries) ---------- */

export function LineChart({
  series,
  height = 140,
  colors = ["var(--accent)", "#93c5fd", "#34d399", "#fbbf24"],
}: {
  series: Array<{ name: string; points: Array<{ x: string; y: number | null }> }>;
  height?: number;
  colors?: string[];
}) {
  const W = 720;
  const pad = 10;
  const all = series.flatMap((s) => s.points.map((p) => p.y).filter((v): v is number => v != null));
  if (!all.length) return null;
  const n = Math.max(...series.map((s) => s.points.length));
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const sx = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - pad * 2);
  const sy = (v: number) => height - 8 - ((v - min) / (max - min)) * (height - 20);
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Tendance">
      {series.map((s, si) => {
        const path = s.points
          .map((p, i) => (p.y == null ? null : `${i === 0 || s.points[i - 1].y == null ? "M" : "L"}${sx(i)},${sy(p.y)}`))
          .filter(Boolean)
          .join(" ");
        return (
          <g key={s.name}>
            <path d={path} fill="none" stroke={colors[si % colors.length]} strokeWidth="2" strokeLinejoin="round" />
            {s.points.map((p, i) =>
              p.y == null ? null : (
                <circle key={i} cx={sx(i)} cy={sy(p.y)} r="2.4" fill={colors[si % colors.length]}>
                  <title>{`${s.name} — ${p.x} : ${p.y}`}</title>
                </circle>
              ),
            )}
          </g>
        );
      })}
      <line x1={pad} y1={height - 8} x2={W - pad} y2={height - 8} stroke="var(--line)" />
    </svg>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const colors = {
    neutral: "text-[var(--muted)] border-[var(--line)]",
    good: "text-[#0cce6b] border-[#0cce6b44]",
    warn: "text-[#ffa400] border-[#ffa40044]",
    bad: "text-[#ff4e42] border-[#ff4e4244]",
  } as const;
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${colors[tone]}`}>
      {children}
    </span>
  );
}
