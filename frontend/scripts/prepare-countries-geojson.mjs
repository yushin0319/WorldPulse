/**
 * Natural Earth 110m GeoJSON を前処理して軽量化する
 * 実行: node frontend/scripts/prepare-countries-geojson.mjs
 * 出力: frontend/public/countries-110m.geojson
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";
const OUTPUT_PATH = join(__dirname, "..", "public", "countries-110m.geojson");

// ISO_A2_EH が欠損する国のフォールバック
const NAME_TO_ISO = {
  France: "FR",
  Norway: "NO",
  "N. Cyprus": "CY",
  Somaliland: "SO",
  Kosovo: "XK",
};

// 座標を小数点4桁に丸める（サイズ削減）
function roundCoords(coords) {
  if (typeof coords[0] === "number") {
    return coords.map((n) => Math.round(n * 10000) / 10000);
  }
  return coords.map(roundCoords);
}

async function main() {
  console.log("Downloading Natural Earth 110m GeoJSON...");
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  console.log(`Processing ${data.features.length} features...`);

  const features = data.features
    .map((f) => {
      let iso = f.properties.ISO_A2_EH;
      if (!iso || iso === "-99" || iso === "-1") {
        iso = NAME_TO_ISO[f.properties.NAME] ?? null;
      }
      if (!iso) return null;

      return {
        type: "Feature",
        properties: { iso_a2: iso, name: f.properties.NAME },
        geometry: {
          type: f.geometry.type,
          coordinates: roundCoords(f.geometry.coordinates),
        },
      };
    })
    .filter(Boolean);

  const output = { type: "FeatureCollection", features };
  const json = JSON.stringify(output);

  writeFileSync(OUTPUT_PATH, json, "utf-8");
  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`Done: ${features.length} countries, ${sizeKB} KB → ${OUTPUT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
