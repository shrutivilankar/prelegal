"use client";

import type { NdaFormData } from "@/lib/mnda";
import {
  CONFIDENTIALITY_PERPETUITY_LABEL,
  MNDA_TERM_UNTIL_TERMINATED_LABEL,
} from "@/lib/mnda";

interface NdaFormProps {
  data: NdaFormData;
  onChange: (patch: Partial<NdaFormData>) => void;
}

const inputClasses =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const labelClasses = "block text-sm font-medium text-neutral-700 mb-1";
const hintClasses = "text-xs text-neutral-500";

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  const hintId = `${htmlFor}-hint`;
  return (
    <div>
      <label className={labelClasses} htmlFor={htmlFor}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && (
        <p id={hintId} className={`mt-1 ${hintClasses}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function YearsInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <input
      aria-label={label}
      type="number"
      min={1}
      step={1}
      className="w-20 rounded-md border border-neutral-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-neutral-100"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    />
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <legend className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
      {children}
    </legend>
  );
}

function RadioGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  const hintId = `${title.toLowerCase().replace(/[^a-z]+/g, "-")}-hint`;
  return (
    <fieldset className="mt-4 first:mt-0" aria-describedby={hintId}>
      <legend className={labelClasses}>{title}</legend>
      <p id={hintId} className={`mb-2 ${hintClasses}`}>
        {hint}
      </p>
      {children}
    </fieldset>
  );
}

export default function NdaForm({ data, onChange }: NdaFormProps) {
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <fieldset className="space-y-4">
        <SectionTitle>Parties</SectionTitle>
        <Field label="Party 1 Company Name" htmlFor="party1Name" required>
          <input
            id="party1Name"
            className={inputClasses}
            value={data.party1Name}
            onChange={(e) => onChange({ party1Name: e.target.value })}
            placeholder="Acme Corp"
          />
        </Field>
        <Field label="Party 2 Company Name" htmlFor="party2Name" required>
          <input
            id="party2Name"
            className={inputClasses}
            value={data.party2Name}
            onChange={(e) => onChange({ party2Name: e.target.value })}
            placeholder="Globex LLC"
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-neutral-200 pt-6">
        <SectionTitle>Key Terms</SectionTitle>
        <Field
          label="Purpose"
          htmlFor="purpose"
          hint="How Confidential Information may be used."
        >
          <textarea
            id="purpose"
            className={`${inputClasses} min-h-[72px]`}
            value={data.purpose}
            onChange={(e) => onChange({ purpose: e.target.value })}
            placeholder="Evaluating whether to enter into a business relationship with the other party."
          />
        </Field>
        <Field label="Effective Date" htmlFor="effectiveDate" required>
          <input
            id="effectiveDate"
            type="date"
            className={inputClasses}
            value={data.effectiveDate}
            onChange={(e) => onChange({ effectiveDate: e.target.value })}
          />
        </Field>

        <RadioGroup title="MNDA Term" hint="The length of this MNDA.">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="mnda-term-fixed"
                type="radio"
                name="mndaTerm"
                checked={data.mndaTerm === "fixed"}
                onChange={() => onChange({ mndaTerm: "fixed" })}
              />
              <label className="text-sm" htmlFor="mnda-term-fixed">
                Expires
              </label>
              <YearsInput
                label="MNDA term in years"
                value={data.mndaTermYears}
                onChange={(value) => onChange({ mndaTermYears: value })}
                disabled={data.mndaTerm !== "fixed"}
              />
              <span className="text-sm">year(s) from Effective Date.</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="mnda-term-until-terminated"
                type="radio"
                name="mndaTerm"
                checked={data.mndaTerm === "until-terminated"}
                onChange={() => onChange({ mndaTerm: "until-terminated" })}
              />
              <label
                className="text-sm"
                htmlFor="mnda-term-until-terminated"
              >
                {MNDA_TERM_UNTIL_TERMINATED_LABEL}
              </label>
            </div>
          </div>
        </RadioGroup>

        <RadioGroup
          title="Term of Confidentiality"
          hint="How long Confidential Information is protected."
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <input
                id="confidentiality-term-fixed"
                type="radio"
                name="confidentialityTerm"
                className="mt-1"
                checked={data.confidentialityTerm === "fixed"}
                onChange={() => onChange({ confidentialityTerm: "fixed" })}
              />
              <label className="text-sm" htmlFor="confidentiality-term-fixed">
                Protected for
              </label>
              <YearsInput
                label="Confidentiality term in years"
                value={data.confidentialityYears}
                onChange={(value) => onChange({ confidentialityYears: value })}
                disabled={data.confidentialityTerm !== "fixed"}
              />
              <span className="text-sm">
                year(s) from Effective Date, but in the case of trade secrets
                until no longer considered a trade secret under applicable laws.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="confidentiality-term-perpetuity"
                type="radio"
                name="confidentialityTerm"
                checked={data.confidentialityTerm === "perpetuity"}
                onChange={() => onChange({ confidentialityTerm: "perpetuity" })}
              />
              <label
                className="text-sm"
                htmlFor="confidentiality-term-perpetuity"
              >
                {CONFIDENTIALITY_PERPETUITY_LABEL}
              </label>
            </div>
          </div>
        </RadioGroup>
      </fieldset>

      <fieldset className="space-y-4 border-t border-neutral-200 pt-6">
        <SectionTitle>Governing Law &amp; Jurisdiction</SectionTitle>
        <Field label="Governing Law" htmlFor="governingLaw">
          <input
            id="governingLaw"
            className={inputClasses}
            value={data.governingLaw}
            onChange={(e) => onChange({ governingLaw: e.target.value })}
            placeholder="Delaware"
          />
        </Field>
        <Field
          label="Jurisdiction"
          htmlFor="jurisdiction"
          hint='City or county and state, i.e. \u201Ccourts located in New Castle, DE\u201D'
        >
          <input
            id="jurisdiction"
            className={inputClasses}
            value={data.jurisdiction}
            onChange={(e) => onChange({ jurisdiction: e.target.value })}
            placeholder="courts located in New Castle, DE"
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-neutral-200 pt-6">
        <SectionTitle>Modifications</SectionTitle>
        <Field
          label="MNDA Modifications"
          htmlFor="modifications"
          hint="Optional. List any modifications to the MNDA."
        >
          <textarea
            id="modifications"
            className={`${inputClasses} min-h-[72px]`}
            value={data.modifications}
            onChange={(e) => onChange({ modifications: e.target.value })}
          />
        </Field>
      </fieldset>
    </form>
  );
}
