import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { fetchTemplate, fetchTemplates } from "@/lib/api";
import TemplatesPage from "@/app/templates/page";
import {
  CATALOG_TEMPLATES,
  SLA_MARKDOWN,
} from "../../fixtures/templates";

vi.mock("@/lib/api", () => ({
  fetchTemplates: vi.fn(async () => CATALOG_TEMPLATES),
  fetchTemplate: vi.fn(async (filename: string) => ({
    name: "Service Level Agreement",
    description: "",
    filename,
    content: SLA_MARKDOWN,
  })),
}));

async function setup() {
  const user = userEvent.setup();
  render(<TemplatesPage />);
  const firstTemplateButton = await screen.findByRole("button", {
    name: /Service Level Agreement/i,
  });
  return { user, firstTemplateButton };
}

describe("Template catalog page", () => {
  it("lists templates served by the backend with names and descriptions", async () => {
    await setup();

    expect(screen.getByText("Business Associate Agreement")).toBeInTheDocument();
    expect(
      screen.getByText(/for HIPAA-covered arrangements\./i),
    ).toBeInTheDocument();
    expect(screen.getByText("Prelegal")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /NDA Creator/i }),
    ).toHaveAttribute("href", "/");
  });

  it("prompts to select a template before one is chosen", async () => {
    await setup();

    expect(
      screen.getByText(/Select a template from the list to preview it\./),
    ).toBeInTheDocument();
  });

  it("loads and renders markdown for the selected template", async () => {
    const { user } = await setup();

    await user.click(
      screen.getByRole("button", { name: /Service Level Agreement/i }),
    );

    const article = await screen.findByRole("article");
    expect(
      within(article).getByRole("heading", { name: "Service Level Agreement" }),
    ).toBeInTheDocument();
    expect(fetchTemplate).toHaveBeenCalledWith("sla.md");
  });

  it("marks the selected template as current and shows a loading state while fetching", async () => {
    let resolveFetch: (value: Awaited<ReturnType<typeof fetchTemplate>>) => void =
      () => {};
    vi.mocked(fetchTemplate).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const { user } = await setup();

    await user.click(
      screen.getByRole("button", { name: /Service Level Agreement/i }),
    );

    expect(screen.getByText("Loading template…")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Service Level Agreement/i }),
    ).toHaveAttribute("aria-current", "true");

    resolveFetch({
      name: "Service Level Agreement",
      description: "",
      filename: "sla.md",
      content: SLA_MARKDOWN,
    });
    expect(await screen.findByRole("article")).toBeInTheDocument();
  });

  it("shows a catalog error state with retry when listing fails", async () => {
    vi.mocked(fetchTemplates).mockRejectedValueOnce(new Error("backend down"));

    render(<TemplatesPage />);

    expect(
      await screen.findByText(/Unable to load the template catalog\./),
    ).toBeInTheDocument();

    vi.mocked(fetchTemplates).mockRejectedValueOnce(new Error("still down"));
    await userEvent.click(screen.getByRole("button", { name: /Retry/i }));

    expect(
      await screen.findByText(/Unable to load the template catalog\./),
    ).toBeInTheDocument();
  });

  it("shows a per-template error state with retry when detail loading fails", async () => {
    vi.mocked(fetchTemplate).mockRejectedValueOnce(new Error("missing file"));
    const { user } = await setup();

    await user.click(
      screen.getByRole("button", { name: /Service Level Agreement/i }),
    );

    expect(
      await screen.findByText(/Unable to load this template\./),
    ).toBeInTheDocument();
  });
});
