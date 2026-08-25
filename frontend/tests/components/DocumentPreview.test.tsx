import { render, screen, within } from "@testing-library/react";

import { beforeEach, describe, expect, it } from "vitest";

import DocumentPreview from "@/components/DocumentPreview";
import {
  CC_BY_40_URL,
  MNDA_VERSION_URL,
  defaultNdaFormData,
} from "@/lib/mnda";
import type { NdaFormData } from "@/lib/mnda";
import { parseCoverPageIntro, parseStandardTerms } from "@/lib/template-parser";
import {
  MNDA_COVERPAGE_MARKDOWN,
  MNDA_STANDARD_TERMS_MARKDOWN,
} from "../fixtures/templates";

const coverPageIntro = parseCoverPageIntro(MNDA_COVERPAGE_MARKDOWN);
const standardTerms = parseStandardTerms(MNDA_STANDARD_TERMS_MARKDOWN);

function renderPreview(data: NdaFormData = defaultNdaFormData) {
  return render(
    <DocumentPreview
      data={data}
      coverPageIntro={coverPageIntro}
      standardTerms={standardTerms}
    />,
  );
}

const filledData: NdaFormData = {
  party1Name: "Acme Corp",
  party2Name: "Globex LLC",
  purpose: "Evaluating a potential partnership",
  effectiveDate: "2026-08-25",
  mndaTerm: "fixed",
  mndaTermYears: "3",
  confidentialityTerm: "fixed",
  confidentialityYears: "5",
  governingLaw: "Delaware",
  jurisdiction: "courts located in New Castle, DE",
  modifications: "None beyond the Cover Page.",
};

describe("DocumentPreview", () => {
  it("renders the document title", () => {
    renderPreview();

    expect(
      screen.getByRole("heading", {
        name: "Mutual Non-Disclosure Agreement",
      }),
    ).toBeInTheDocument();
  });

  describe("with fully filled data", () => {
    beforeEach(() => {
      renderPreview(filledData);
    });

    it("shows both company names in the signature block", () => {
      const table = screen.getByRole("table");
      const companyRow = within(table)
        .getAllByRole("row")
        .find((row) => within(row).queryByText("Company") !== null);

      expect(companyRow).toBeDefined();
      expect(within(companyRow!).getByText("Acme Corp")).toBeInTheDocument();
      expect(within(companyRow!).getByText("Globex LLC")).toBeInTheDocument();
    });

    it("formats the effective date for the document", () => {
      expect(screen.getByText("August 25, 2026")).toBeInTheDocument();
    });

    it("states the MNDA term", () => {
      expect(
        screen.getByText(/Expires 3 years from Effective Date\./),
      ).toBeInTheDocument();
    });

    it("includes the trade-secret carve-out", () => {
      const heading = screen.getByRole("heading", {
        name: "Term of Confidentiality",
      });
      expect(heading.nextElementSibling?.textContent).toMatch(
        /5 years from Effective Date.*trade secret/i,
      );
    });

    it("shows governing law and jurisdiction", () => {
      const paragraph = screen
        .getByRole("heading", { name: "Governing Law & Jurisdiction" })
        .nextElementSibling?.textContent;

      expect(paragraph).toContain("Delaware");
      expect(paragraph).toContain("courts located in New Castle, DE");
    });

    it("shows the entered purpose", () => {
      expect(
        screen.getByText("Evaluating a potential partnership"),
      ).toBeInTheDocument();
    });

    it("lists every Standard Terms section as an ordered item", () => {
      const list = screen.getByRole("list");
      const items = within(list).getAllByRole("listitem");

      expect(items).toHaveLength(standardTerms.length);
      standardTerms.forEach((section, index) => {
        expect(
          within(items[index]).getByText(section.heading),
        ).toBeInTheDocument();
      });
    });

    it("renders the cover page intro fetched from the backend", () => {
      const intro = screen.getByText((_, element) =>
        Boolean(
          element?.tagName === "P" &&
            element.textContent?.startsWith("This Mutual Non-Disclosure Agreement"),
        ),
      );
      expect(intro.textContent).toContain("Standard Terms Version 1.0");
    });
  });

  describe("with empty defaults", () => {
    beforeEach(() => {
      renderPreview();
    });

    it.each([
      ["[Party 1]"],
      ["[Party 2]"],
      ["[Purpose not specified]"],
      ["[Today's date]"],
      ["None."],
    ])("shows placeholder %s", (placeholder) => {
      expect(screen.getByText(placeholder)).toBeInTheDocument();
    });

    it("shows fill-in placeholders for governing law and jurisdiction", () => {
      const paragraph = screen
        .getByRole("heading", { name: "Governing Law & Jurisdiction" })
        .nextElementSibling?.textContent;

      expect(paragraph).toContain("[Fill in state]");
      expect(paragraph).toContain("[Fill in location]");
    });

    it("falls back to [fill in] when term years are invalid", () => {
      const { container } = renderPreview({
        ...defaultNdaFormData,
        mndaTermYears: "not-a-number",
        confidentialityYears: "-2",
      });

      const headings = Array.from(container.querySelectorAll("h3"));
      const paragraphAfter = (name: string) =>
        headings.find((h) => h.textContent === name)?.nextElementSibling
          ?.textContent;

      expect(paragraphAfter("MNDA Term")).toContain("[fill in]");
      expect(paragraphAfter("Term of Confidentiality")).toContain(
        "[fill in]",
      );
      expect(container.textContent).not.toContain("not-a-number");
    });
  });

  describe("attribution", () => {
    it("links the Common Paper version and the CC BY 4.0 license twice", () => {
      renderPreview();

      const versionLinks = screen.getAllByRole("link", {
        name: new RegExp(`Version`, "i"),
      });
      const licenseLinks = screen.getAllByRole("link", { name: "CC BY 4.0" });

      expect(versionLinks[0]).toHaveAttribute("href", MNDA_VERSION_URL);
      expect(licenseLinks).toHaveLength(2);
      for (const link of licenseLinks) {
        expect(link).toHaveAttribute("href", CC_BY_40_URL);
      }
    });
  });

  describe("rich text rendering", () => {
    it("converts **bold** markers into strong elements", () => {
      const { container } = renderPreview();

      const strongs = Array.from(container.querySelectorAll("strong"));
      const strongTexts = strongs.map((el) => el.textContent);

      expect(strongTexts).toContain("Cover Page");
      expect(strongTexts).toContain("Standard Terms");
    });

    it("never leaks raw ** markers into the rendered text", () => {
      const { container } = renderPreview();

      expect(container.textContent).not.toContain("**");
    });
  });

  describe("signature block structure", () => {
    it("contains all six signature rows for both parties", () => {
      renderPreview();

      const table = screen.getByRole("table");
      const labels = [
        "Signature",
        "Print Name",
        "Title",
        "Company",
        "Notice Address",
        "Date",
      ];

      for (const label of labels) {
        expect(within(table).getAllByText(label)).toHaveLength(1);
      }

      const bodyRows = within(table)
        .getAllByRole("row")
        .slice(1);
      expect(bodyRows).toHaveLength(6);
    });
  });
});
