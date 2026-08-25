import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Home from "@/app/page";

function setup() {
  const user = userEvent.setup();
  const view = render(<Home />);
  return { user, ...view };
}

describe("Mutual NDA creator page", () => {
  it("renders the app header and download action", () => {
    setup();

    expect(screen.getByText("Prelegal")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Download PDF/i }),
    ).toBeInTheDocument();
  });

  it("renders the form and preview side by side", () => {
    setup();

    expect(
      screen.getByLabelText(/Party 1 Company Name/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mutual Non-Disclosure Agreement"),
    ).toBeInTheDocument();
  });

  it("triggers the browser print dialog for PDF download", async () => {
    const printSpy = vi.fn();
    window.print = printSpy;
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /Download PDF/i }));

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("reflects typed party names into the document signature block", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText(/Party 1 Company Name/i), "Acme Corp");
    await user.type(screen.getByLabelText(/Party 2 Company Name/i), "Globex LLC");

    const table = screen.getByRole("table");
    const companyRow = within(table)
      .getAllByRole("row")
      .find((row) => within(row).queryByText("Company") !== null);

    expect(companyRow).toBeDefined();
    expect(within(companyRow!).getByText("Acme Corp")).toBeInTheDocument();
    expect(within(companyRow!).getByText("Globex LLC")).toBeInTheDocument();
    expect(within(companyRow!).queryByText("[Party 1]")).toBeNull();
    expect(within(companyRow!).queryByText("[Party 2]")).toBeNull();
  });

  it("updates the MNDA term in the preview when the radio changes", async () => {
    const { user } = setup();
    const preview = screen.getByRole("article");

    expect(within(preview).getByText(/Expires 1 year from Effective Date\./))
      .toBeInTheDocument();

    await user.click(
      screen.getByRole("radio", { name: /Continues until terminated/i }),
    );

    expect(
      within(preview).getByText(
        /Continues until terminated in accordance with the terms of the MNDA\./,
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("MNDA term in years")).toBeDisabled();
  });

  it("updates confidentiality language when perpetuity is selected", async () => {
    const { user } = setup();
    const preview = screen.getByRole("article");

    await user.click(screen.getByRole("radio", { name: /In perpetuity/i }));

    const heading = within(preview).getByRole("heading", {
      name: "Term of Confidentiality",
    });
    expect(heading.nextElementSibling?.textContent).toContain("In perpetuity");
  });

  it("formats the effective date live as the user picks one", async () => {
    const { user } = setup();
    const preview = screen.getByRole("article");

    expect(within(preview).getByText("[Today's date]")).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/Effective Date/i),
      "2026-12-01",
    );

    expect(within(preview).getByText(/December \d+, 2026/)).toBeInTheDocument();
  });

  it("keeps placeholders visible until fields are filled", () => {
    setup();
    const preview = screen.getByRole("article");

    expect(within(preview).getByText("[Party 1]")).toBeInTheDocument();
    expect(
      within(preview).getByText("[Purpose not specified]"),
    ).toBeInTheDocument();
  });
});
