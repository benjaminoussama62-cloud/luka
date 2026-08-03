const res = await fetch(
  "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
);
const g = await res.json();
const f = g.features.find(
  (x) => x.properties?.["ISO3166-1-Alpha-2"] === "CD",
);
if (!f) throw new Error("DRC not found");

const coords =
  f.geometry.type === "Polygon"
    ? f.geometry.coordinates[0]
    : f.geometry.coordinates[0][0];

let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
for (const [x, y] of coords) {
  minX = Math.min(minX, x);
  minY = Math.min(minY, y);
  maxX = Math.max(maxX, x);
  maxY = Math.max(maxY, y);
}

const w = maxX - minX;
const h = maxY - minY;
const scale = 400;
const step = Math.max(1, Math.floor(coords.length / 55));
const pts = [];
for (let i = 0; i < coords.length; i += step) pts.push(coords[i]);

const d =
  `M ${pts
    .map(([x, y]) => {
      const px = (((x - minX) / w) * scale).toFixed(1);
      const py = ((1 - (y - minY) / h) * scale).toFixed(1);
      return `${px},${py}`;
    })
    .join(" L ")} Z`;

const out = `export const DRC_VIEWBOX = "0 0 ${scale} ${scale}";\nexport const DRC_PATH = "${d}";\n`;
await import("node:fs/promises").then((fs) =>
  fs.writeFile("src/components/effects/drc-path.ts", out),
);
console.log("Written", pts.length, "points,", d.length, "chars");
