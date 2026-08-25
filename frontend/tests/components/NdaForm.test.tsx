import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import NdaForm from "@/components/NdaForm";
import { defaultNdaFormData } from "@/lib/mnda";

function ControlledNdaForm({ onChange }: { onChange?: (patch: unknown) => void }) {
  const [data, setData] = useState(defaultNdaFormData);
  return (
    <NdaForm
      data={data}
      onChange={(patch) => {
        onChange?.(patch);
        setData((previous) => ({ ...previous, ...patch }));
      }}
    />
  );
}

function setup() {
  const onChange = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <NdaForm data={defaultNdaFormData} onChange={onChange} />,
  );
  return { onChange, user, ...view };
}

describe("NdaForm", () => {
  it("renders every labeled field", () => {
    setup();

    expect(screen.getByLabelText(/Party 1 Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Party 2 Company Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Purpose$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Effective Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Governing Law/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Jurisdiction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/MNDA Modifications/i)).toBeInTheDocument();
  });

  it("marks exactly the three required fields with an asterisk", () => {
    setup();

    const requiredIds = ["party1Name", "party2Name", "effectiveDate"];
    const optionalIds = [
      "purpose",
      "governingLaw",
      "jurisdiction",
      "modifications",
    ];

    for (const id of requiredIds) {
      expect(document.querySelector(`label[for="${id}"]`)?.textContent)
        .toContain("*");
    }
    for (const id of optionalIds) {
      expect(document.querySelector(`label[for="${id}"]`)?.textContent)
        .not.toContain("*");
    }
  });

  it.each([
    ["party1Name", /Party 1 Company Name/i],
    ["party2Name", /Party 2 Company Name/i],
  ] as const)("emits a patch when %s changes", async (field, label) => {
    const { onChange, user } = setup();

    await user.type(screen.getByLabelText(label), "A");

    expect(onChange).toHaveBeenCalledWith({ [field]: "A" });
  });

  it("emits a patch when the purpose changes", async () => {
    const { onChange, user } = setup();

    await user.type(screen.getByLabelText(/^Purpose$/i), "Due diligence");

    expect(onChange).toHaveBeenLastCalledWith({ purpose: "e" });
    expect(onChange.mock.calls.some((c) => c[0].purpose === "D")).toBe(true);
  });

  it("emits a patch when the governing law changes", async () => {
    const { onChange, user } = setup();

    await user.type(screen.getByLabelText(/Governing Law/i), "Delaware");

    expect(onChange).toHaveBeenCalledWith({ governingLaw: "D" });
  });

  it("emits a patch when the jurisdiction changes", async () => {
    const { onChange, user } = setup();

    await user.type(screen.getByLabelText(/Jurisdiction/i), "New Castle");

    expect(onChange).toHaveBeenCalledWith({ jurisdiction: "N" });
  });

  it("emits a patch when the effective date changes", async () => {
    const { onChange, user } = setup();

    await user.type(
      screen.getByLabelText(/Effective Date/i),
      "2026-08-25",
    );

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls.at(-1)![0]).toHaveProperty("effectiveDate");
  });

  describe("MNDA term", () => {
    it("defaults to a fixed term with editable years", () => {
      setup();

      expect(
        screen.getByRole("radio", { name: /^Expires/ }),
      ).toBeChecked();
      expect(screen.getByLabelText("MNDA term in years")).toBeEnabled();
      expect(screen.getByLabelText("MNDA term in years")).toHaveValue(1);
    });

    it("switches to until-terminated on radio selection", async () => {
      const { onChange, user } = setup();

      await user.click(
        screen.getByRole("radio", {
          name: /Continues until terminated/i,
        }),
      );

      expect(onChange).toHaveBeenCalledWith({
        mndaTerm: "until-terminated",
      });
    });

    it("disables the years input while until-terminated is selected", () => {
      render(
        <NdaForm
          data={{ ...defaultNdaFormData, mndaTerm: "until-terminated" }}
          onChange={() => {}}
        />,
      );

      expect(screen.getByLabelText("MNDA term in years")).toBeDisabled();
    });

    it("emits the typed number of years", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ControlledNdaForm onChange={onChange} />);

      const years = screen.getByLabelText("MNDA term in years");
      await user.clear(years);
      await user.type(years, "3");

      expect(onChange).toHaveBeenCalledWith({ mndaTermYears: "3" });
      expect(years).toHaveValue(3);
    });
  });

  describe("Term of Confidentiality", () => {
    it("defaults to a fixed term with editable years", () => {
      setup();

      expect(
        screen.getByRole("radio", { name: /^Protected for/ }),
      ).toBeChecked();
      expect(
        screen.getByLabelText("Confidentiality term in years"),
      ).toBeEnabled();
    });

    it("switches to perpetuity on radio selection", async () => {
      const { onChange, user } = setup();

      await user.click(
        screen.getByRole("radio", { name: /In perpetuity/i }),
      );

      expect(onChange).toHaveBeenCalledWith({
        confidentialityTerm: "perpetuity",
      });
    });

    it("disables the years input while perpetuity is selected", () => {
      render(
        <NdaForm
          data={{
            ...defaultNdaFormData,
            confidentialityTerm: "perpetuity",
          }}
          onChange={() => {}}
        />,
      );

      expect(
        screen.getByLabelText("Confidentiality term in years"),
      ).toBeDisabled();
    });

    it("emits the typed confidentiality years", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<ControlledNdaForm onChange={onChange} />);

      const years = screen.getByLabelText("Confidentiality term in years");
      await user.clear(years);
      await user.type(years, "7");

      expect(onChange).toHaveBeenCalledWith({ confidentialityYears: "7" });
      expect(years).toHaveValue(7);
    });
  });

  it("prevents default on form submission so the page never reloads", () => {
    setup();

    const form = document.querySelector("form")!;
    let submittedEvent: Event | undefined;
    form.addEventListener("submit", (event) => {
      submittedEvent = event;
    });

    fireEvent.submit(form);

    expect(submittedEvent).toBeDefined();
    // React's onSubmit handler runs during bubbling; by the end of
    // dispatch the default action must already be cancelled.
    expect(submittedEvent!.defaultPrevented).toBe(true);
  });
});
