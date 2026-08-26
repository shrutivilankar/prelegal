import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MarkdownView from "@/components/MarkdownView";
import { SLA_MARKDOWN } from "../fixtures/templates";

describe("MarkdownView", () => {
  it("renders the template title as a heading from real markdown", () => {
    render(<MarkdownView content={SLA_MARKDOWN} />);

    expect(
      screen.getByRole("heading", { name: "Service Level Agreement" }),
    ).toBeInTheDocument();
  });

  it("renders ordered list content from the real template body", () => {
    render(<MarkdownView content={SLA_MARKDOWN} />);

    const lists = screen.getAllByRole("list");
    expect(lists.length).toBeGreaterThan(0);
    expect(screen.getByText(/Target Uptime\./)).toBeInTheDocument();
  });

  it("renders bold segments as strong elements", () => {
    render(<MarkdownView content={SLA_MARKDOWN} />);

    expect(screen.getAllByRole("strong").length).toBeGreaterThan(0);
  });

  it("does not leak raw html span tags into the output", () => {
    const { container } = render(<MarkdownView content={SLA_MARKDOWN} />);

    expect(container.textContent).not.toContain("<span");
  });
});
