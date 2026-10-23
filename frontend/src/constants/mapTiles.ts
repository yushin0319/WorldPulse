// ラベルなしダークタイル (CARTO)
const TILE_BASE_URL =
  "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png";

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// CARTO の basemap は無料キーが必須になった (キー無しは「API KEY REQUIRED」の透かし画像が返る)。
// キーは https://carto.com/basemaps/apikey で取得し、ビルド時に VITE_CARTO_KEY で渡す。
export function buildTileUrl(key: string | undefined): string {
  return key
    ? `${TILE_BASE_URL}?key=${encodeURIComponent(key)}`
    : TILE_BASE_URL;
}
