import { describe, it, expect } from "vitest";
import { getCountryFlag, getCountryInfo, COUNTRY_DATA } from "../countries";

describe("getCountryFlag", () => {
  it("JPから日本国旗絵文字を生成する", () => {
    expect(getCountryFlag("JP")).toBe("\u{1F1EF}\u{1F1F5}");
  });

  it("USからアメリカ国旗絵文字を生成する", () => {
    expect(getCountryFlag("US")).toBe("\u{1F1FA}\u{1F1F8}");
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
