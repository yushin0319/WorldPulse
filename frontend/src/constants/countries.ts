export interface CountryInfo {
  nameJa: string;
  capitalJa: string;
}

// ニュース頻出国 約80か国
export const COUNTRY_DATA: Record<string, CountryInfo> = {
  // ── Asia（アジア）──
  JP: { nameJa: "日本", capitalJa: "東京" },
  CN: { nameJa: "中国", capitalJa: "北京" },
  KR: { nameJa: "韓国", capitalJa: "ソウル" },
  IN: { nameJa: "インド", capitalJa: "ニューデリー" },
  ID: { nameJa: "インドネシア", capitalJa: "ジャカルタ" },
  TH: { nameJa: "タイ", capitalJa: "バンコク" },
  VN: { nameJa: "ベトナム", capitalJa: "ハノイ" },
  PH: { nameJa: "フィリピン", capitalJa: "マニラ" },
  MM: { nameJa: "ミャンマー", capitalJa: "ネーピードー" },
  BD: { nameJa: "バングラデシュ", capitalJa: "ダッカ" },
  PK: { nameJa: "パキスタン", capitalJa: "イスラマバード" },
  AF: { nameJa: "アフガニスタン", capitalJa: "カブール" },
  IQ: { nameJa: "イラク", capitalJa: "バグダッド" },
  IR: { nameJa: "イラン", capitalJa: "テヘラン" },
  IL: { nameJa: "イスラエル", capitalJa: "エルサレム" },
  PS: { nameJa: "パレスチナ", capitalJa: "ラマッラー" },
  SY: { nameJa: "シリア", capitalJa: "ダマスカス" },
  SA: { nameJa: "サウジアラビア", capitalJa: "リヤド" },
  AE: { nameJa: "アラブ首長国連邦", capitalJa: "アブダビ" },
  TR: { nameJa: "トルコ", capitalJa: "アンカラ" },
  KZ: { nameJa: "カザフスタン", capitalJa: "アスタナ" },
  KH: { nameJa: "カンボジア", capitalJa: "プノンペン" },
  MY: { nameJa: "マレーシア", capitalJa: "クアラルンプール" },
  SG: { nameJa: "シンガポール", capitalJa: "シンガポール" },
  LK: { nameJa: "スリランカ", capitalJa: "スリジャヤワルダナプラコッテ" },
  NP: { nameJa: "ネパール", capitalJa: "カトマンズ" },
  TW: { nameJa: "台湾", capitalJa: "台北" },

  // ── Europe（ヨーロッパ）──
  GB: { nameJa: "イギリス", capitalJa: "ロンドン" },
  DE: { nameJa: "ドイツ", capitalJa: "ベルリン" },
  FR: { nameJa: "フランス", capitalJa: "パリ" },
  IT: { nameJa: "イタリア", capitalJa: "ローマ" },
  ES: { nameJa: "スペイン", capitalJa: "マドリード" },
  NL: { nameJa: "オランダ", capitalJa: "アムステルダム" },
  BE: { nameJa: "ベルギー", capitalJa: "ブリュッセル" },
  PL: { nameJa: "ポーランド", capitalJa: "ワルシャワ" },
  UA: { nameJa: "ウクライナ", capitalJa: "キーウ" },
  RU: { nameJa: "ロシア", capitalJa: "モスクワ" },
  SE: { nameJa: "スウェーデン", capitalJa: "ストックホルム" },
  NO: { nameJa: "ノルウェー", capitalJa: "オスロ" },
  FI: { nameJa: "フィンランド", capitalJa: "ヘルシンキ" },
  DK: { nameJa: "デンマーク", capitalJa: "コペンハーゲン" },
  CH: { nameJa: "スイス", capitalJa: "ベルン" },
  AT: { nameJa: "オーストリア", capitalJa: "ウィーン" },
  GR: { nameJa: "ギリシャ", capitalJa: "アテネ" },
  PT: { nameJa: "ポルトガル", capitalJa: "リスボン" },
  IE: { nameJa: "アイルランド", capitalJa: "ダブリン" },
  CZ: { nameJa: "チェコ", capitalJa: "プラハ" },
  RO: { nameJa: "ルーマニア", capitalJa: "ブカレスト" },
  HU: { nameJa: "ハンガリー", capitalJa: "ブダペスト" },

  // ── Americas（南北アメリカ）──
  US: { nameJa: "アメリカ", capitalJa: "ワシントンD.C." },
  CA: { nameJa: "カナダ", capitalJa: "オタワ" },
  MX: { nameJa: "メキシコ", capitalJa: "メキシコシティ" },
  BR: { nameJa: "ブラジル", capitalJa: "ブラジリア" },
  AR: { nameJa: "アルゼンチン", capitalJa: "ブエノスアイレス" },
  CO: { nameJa: "コロンビア", capitalJa: "ボゴタ" },
  CL: { nameJa: "チリ", capitalJa: "サンティアゴ" },
  VE: { nameJa: "ベネズエラ", capitalJa: "カラカス" },
  PE: { nameJa: "ペルー", capitalJa: "リマ" },
  CU: { nameJa: "キューバ", capitalJa: "ハバナ" },
  EC: { nameJa: "エクアドル", capitalJa: "キト" },

  // ── Africa（アフリカ）──
  ZA: { nameJa: "南アフリカ", capitalJa: "プレトリア" },
  NG: { nameJa: "ナイジェリア", capitalJa: "アブジャ" },
  EG: { nameJa: "エジプト", capitalJa: "カイロ" },
  ET: { nameJa: "エチオピア", capitalJa: "アディスアベバ" },
  KE: { nameJa: "ケニア", capitalJa: "ナイロビ" },
  SD: { nameJa: "スーダン", capitalJa: "ハルツーム" },
  CD: { nameJa: "コンゴ民主共和国", capitalJa: "キンシャサ" },
  GH: { nameJa: "ガーナ", capitalJa: "アクラ" },
  TZ: { nameJa: "タンザニア", capitalJa: "ドドマ" },
  MA: { nameJa: "モロッコ", capitalJa: "ラバト" },
  DZ: { nameJa: "アルジェリア", capitalJa: "アルジェ" },
  TN: { nameJa: "チュニジア", capitalJa: "チュニス" },
  LY: { nameJa: "リビア", capitalJa: "トリポリ" },

  // ── Oceania（オセアニア）──
  AU: { nameJa: "オーストラリア", capitalJa: "キャンベラ" },
  NZ: { nameJa: "ニュージーランド", capitalJa: "ウェリントン" },
  FJ: { nameJa: "フィジー", capitalJa: "スバ" },

  // ── Others（その他）──
  GL: { nameJa: "グリーンランド", capitalJa: "ヌーク" },
};

// 国旗絵文字を国コードから生成
export function getCountryFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

// 安全に国情報を取得（未登録の場合はコードをそのまま表示）
export function getCountryInfo(countryCode: string): CountryInfo {
  return COUNTRY_DATA[countryCode] ?? {
    nameJa: countryCode,
    capitalJa: "---",
  };
}
