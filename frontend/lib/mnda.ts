export type TermOption = "fixed" | "until-terminated";
export type ConfidentialityOption = "fixed" | "perpetuity";

export interface NdaFormData {
  party1Name: string;
  party2Name: string;
  purpose: string;
  effectiveDate: string;
  mndaTerm: TermOption;
  mndaTermYears: string;
  confidentialityTerm: ConfidentialityOption;
  confidentialityYears: string;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
}

export const defaultNdaFormData: NdaFormData = {
  party1Name: "",
  party2Name: "",
  purpose: "",
  effectiveDate: "",
  mndaTerm: "fixed",
  mndaTermYears: "1",
  confidentialityTerm: "fixed",
  confidentialityYears: "1",
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    !Number.isInteger(month) ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function yearsPhrase(years: string): string {
  const count = Number(years);
  if (!Number.isInteger(count) || count < 1) return "[fill in]";
  return `${count} ${count === 1 ? "year" : "years"}`;
}

export function displayValue(value: string, fallback: string): string {
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

export const MNDA_COVERPAGE_FILENAME = "Mutual-NDA-coverpage.md";
export const MNDA_STANDARD_TERMS_FILENAME = "Mutual-NDA.md";

export const MNDA_VERSION = "1.0";
export const MNDA_VERSION_URL = `https://commonpaper.com/standards/mutual-nda/${MNDA_VERSION}/`;
export const CC_BY_40_URL = "https://creativecommons.org/licenses/by/4.0/";

export const MNDA_TERM_UNTIL_TERMINATED_LABEL =
  "Continues until terminated in accordance with the terms of the MNDA.";
export const CONFIDENTIALITY_PERPETUITY_LABEL = "In perpetuity.";

export function formatMndaTerm(term: TermOption, years: string): string {
  return term === "fixed"
    ? `Expires ${yearsPhrase(years)} from Effective Date.`
    : MNDA_TERM_UNTIL_TERMINATED_LABEL;
}

export function formatConfidentialityTerm(
  term: ConfidentialityOption,
  years: string,
): string {
  return term === "fixed"
    ? `${yearsPhrase(years)} from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
    : CONFIDENTIALITY_PERPETUITY_LABEL;
}

export interface StandardTermsSection {
  heading: string;
  body: string;
}
