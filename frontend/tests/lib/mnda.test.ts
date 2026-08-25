import { describe, expect, it } from "vitest";

import {
  CC_BY_40_URL,
  CONFIDENTIALITY_PERPETUITY_LABEL,
  MNDA_COVERPAGE_FILENAME,
  MNDA_STANDARD_TERMS_FILENAME,
  MNDA_TERM_UNTIL_TERMINATED_LABEL,
  MNDA_VERSION,
  MNDA_VERSION_URL,
  defaultNdaFormData,
  displayValue,
  formatConfidentialityTerm,
  formatDate,
  formatMndaTerm,
  yearsPhrase,
} from "@/lib/mnda";

describe("formatDate", () => {
  it.each([
    ["2026-08-25", "August 25, 2026"],
    ["2024-02-29", "February 29, 2024"],
    ["2026-01-01", "January 1, 2026"],
    ["1999-12-31", "December 31, 1999"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatDate(input)).toBe(expected);
  });

  it.each([
    ["", "empty string"],
    ["2026-13-05", "month out of range"],
    ["2026-00-05", "month zero"],
    ["2026-08-32", "day out of range"],
    ["2026-08-00", "day zero"],
    ["2026-08", "missing day"],
    ["2026", "year only"],
    ["not-a-date", "non-numeric"],
  ])("returns empty string for %s (%s)", (input) => {
    expect(formatDate(input)).toBe("");
  });
});

describe("yearsPhrase", () => {
  it.each([
    ["1", "1 year"],
    ["2", "2 years"],
    ["12", "12 years"],
    ["100", "100 years"],
  ])("pluralizes %s correctly", (input, expected) => {
    expect(yearsPhrase(input)).toBe(expected);
  });

  it.each([
    ["0"],
    ["-1"],
    ["-10"],
    ["1.5"],
    ["2.5"],
    ["abc"],
    ["3 years"],
    [""],
    ["NaN"],
    ["Infinity"],
  ])("returns [fill in] for invalid input %s", (input) => {
    expect(yearsPhrase(input)).toBe("[fill in]");
  });
});

describe("displayValue", () => {
  it("returns the trimmed value when non-empty", () => {
    expect(displayValue("  Acme Corp  ", "fallback")).toBe("Acme Corp");
  });

  it("trims surrounding whitespace from the value", () => {
    expect(displayValue("\tDelaware\n", "fallback")).toBe("Delaware");
  });

  it.each(["", "   ", "\n\t "])(
    "returns the fallback for blank value %j",
    (value) => {
      expect(displayValue(value, "[fallback]")).toBe("[fallback]");
    },
  );

  it("returns an empty-string fallback verbatim", () => {
    expect(displayValue("  ", "")).toBe("");
  });
});

describe("defaultNdaFormData", () => {
  it("uses a one-year fixed MNDA term by default", () => {
    expect(defaultNdaFormData.mndaTerm).toBe("fixed");
    expect(defaultNdaFormData.mndaTermYears).toBe("1");
  });

  it("uses a one-year fixed confidentiality term by default", () => {
    expect(defaultNdaFormData.confidentialityTerm).toBe("fixed");
    expect(defaultNdaFormData.confidentialityYears).toBe("1");
  });

  it("leaves all free-text fields empty", () => {
    const textFields = [
      "party1Name",
      "party2Name",
      "purpose",
      "effectiveDate",
      "governingLaw",
      "jurisdiction",
      "modifications",
    ] as const;
    for (const field of textFields) {
      expect(defaultNdaFormData[field]).toBe("");
    }
  });

  it("exposes every field the components read", () => {
    expect(Object.keys(defaultNdaFormData).sort()).toEqual(
      [
        "confidentialityTerm",
        "confidentialityYears",
        "effectiveDate",
        "governingLaw",
        "jurisdiction",
        "modifications",
        "mndaTerm",
        "mndaTermYears",
        "party1Name",
        "party2Name",
        "purpose",
      ].sort(),
    );
  });
});

describe("formatMndaTerm", () => {
  it("describes a fixed term with singular year", () => {
    expect(formatMndaTerm("fixed", "1")).toBe(
      "Expires 1 year from Effective Date.",
    );
  });

  it("describes a fixed term with plural years", () => {
    expect(formatMndaTerm("fixed", "5")).toBe(
      "Expires 5 years from Effective Date.",
    );
  });

  it("flags missing years on a fixed term instead of rendering nonsense", () => {
    expect(formatMndaTerm("fixed", "abc")).toBe(
      "Expires [fill in] from Effective Date.",
    );
  });

  it("returns the until-terminated language unchanged", () => {
    expect(formatMndaTerm("until-terminated", "")).toBe(
      MNDA_TERM_UNTIL_TERMINATED_LABEL,
    );
  });
});

describe("formatConfidentialityTerm", () => {
  it("includes the trade-secret carve-out for fixed terms", () => {
    const result = formatConfidentialityTerm("fixed", "3");
    expect(result).toContain("3 years from Effective Date");
    expect(result).toContain("trade secret");
  });

  it("returns the perpetuity language unchanged", () => {
    expect(formatConfidentialityTerm("perpetuity", "99")).toBe(
      CONFIDENTIALITY_PERPETUITY_LABEL,
    );
  });

  it("never leaks raw year strings when they are invalid", () => {
    const result = formatConfidentialityTerm("fixed", "not-a-number");
    expect(result).toContain("[fill in]");
    expect(result).not.toContain("not-a-number");
  });
});

describe("document constants", () => {
  it("derives the Common Paper standards URL from the version", () => {
    expect(MNDA_VERSION_URL).toBe(
      `https://commonpaper.com/standards/mutual-nda/${MNDA_VERSION}/`,
    );
  });

  it("links the CC BY 4.0 license", () => {
    expect(CC_BY_40_URL).toBe(
      "https://creativecommons.org/licenses/by/4.0/",
    );
  });

  it("names the backend template files the MNDA is assembled from", () => {
    expect(MNDA_COVERPAGE_FILENAME).toBe("Mutual-NDA-coverpage.md");
    expect(MNDA_STANDARD_TERMS_FILENAME).toBe("Mutual-NDA.md");
  });
});
