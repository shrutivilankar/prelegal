import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Vitest runs from frontend/, so the repo root is one level up.
const templatesDir = resolve(process.cwd(), "..", "templates");

export const MNDA_COVERPAGE_MARKDOWN = readFileSync(
  join(templatesDir, "Mutual-NDA-coverpage.md"),
  "utf-8",
);

export const MNDA_STANDARD_TERMS_MARKDOWN = readFileSync(
  join(templatesDir, "Mutual-NDA.md"),
  "utf-8",
);

export const SLA_MARKDOWN = readFileSync(
  join(templatesDir, "sla.md"),
  "utf-8",
);

export const CATALOG_TEMPLATES = [
  {
    name: "Service Level Agreement",
    description: "Common Paper Service Level Agreement defining target uptime.",
    filename: "sla.md",
  },
  {
    name: "Business Associate Agreement",
    description:
      "Common Paper standard Business Associate Agreement for HIPAA-covered arrangements.",
    filename: "BAA.md",
  },
];
