import { describe, expect, it } from "vitest";
import { COUNTRY_DATA, getCountryFlagUrl, getCountryInfo } from "../countries";

describe("getCountryFlagUrl", () => {
  it("JPから正しい国旗画像URLを生成する", () => {
    expect(getCountryFlagUrl("JP")).toBe("https://flagcdn.com/24x18/jp.png");
  });

  it("USから正しい国旗画像URLを生成する", () => {
    expect(getCountryFlagUrl("US")).toBe("https://flagcdn.com/24x18/us.png");
  });
});

describe("getCountryInfo", () => {
  it("登録済みの国コードで正しい情報を返す", () => {
    const info = getCountryInfo("JP");
    expect(info.nameJa).toBe("日本");
    expect(info.capitalJa).toBe("東京");
  });

  it("未登録の国コードではコードをそのまま返す", () => {
    const info = getCountryInfo("ZZ");
    expect(info.nameJa).toBe("ZZ");
    expect(info.capitalJa).toBe("---");
  });
});

describe("COUNTRY_DATA", () => {
  it("70か国以上が登録されている", () => {
    expect(Object.keys(COUNTRY_DATA).length).toBeGreaterThanOrEqual(70);
  });
});
