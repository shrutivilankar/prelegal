import type { NdaFormData, StandardTermsSection } from "@/lib/mnda";
import {
  CC_BY_40_URL,
  MNDA_VERSION,
  MNDA_VERSION_URL,
  displayValue,
  formatConfidentialityTerm,
  formatMndaTerm,
  formatDate,
} from "@/lib/mnda";

export interface DocumentPreviewProps {
  data: NdaFormData;
  coverPageIntro?: string;
  standardTerms?: StandardTermsSection[];
}

function RichText({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={index}>{part}</strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-5 font-bold">{children}</h3>;
}

function Attribution({ linkVersion }: { linkVersion?: boolean }) {
  return (
    <p className="mt-6 text-xs text-neutral-600">
      Common Paper Mutual Non-Disclosure Agreement{" "}
      {linkVersion ? (
        <a
          href={MNDA_VERSION_URL}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Version {MNDA_VERSION}
        </a>
      ) : (
        `(Version ${MNDA_VERSION})`
      )}{" "}
      free to use under{" "}
      <a
        href={CC_BY_40_URL}
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        CC BY 4.0
      </a>
      .
    </p>
  );
}

export default function DocumentPreview({
  data,
  coverPageIntro = "",
  standardTerms = [],
}: DocumentPreviewProps) {
  const party1 = displayValue(data.party1Name, "[Party 1]");
  const party2 = displayValue(data.party2Name, "[Party 2]");

  const signatureRows = [
    { label: "Signature", value1: "", value2: "" },
    { label: "Print Name", value1: "", value2: "" },
    { label: "Title", value1: "", value2: "" },
    { label: "Company", value1: party1, value2: party2 },
    { label: "Notice Address", value1: "", value2: "" },
    { label: "Date", value1: "", value2: "" },
  ];

  return (
    <article className="mx-auto max-w-[8.5in] bg-white p-10 font-serif text-sm leading-relaxed text-black shadow-lg print:max-w-none print:p-0 print:shadow-none">
      <h1 className="text-center text-2xl font-bold">
        Mutual Non-Disclosure Agreement
      </h1>

      <h2 className="mt-6 text-center text-base font-bold uppercase">
        Using this Mutual Non-Disclosure Agreement
      </h2>
      <p className="mt-3">
        <RichText text={coverPageIntro} />
      </p>

      <SectionHeading>Purpose</SectionHeading>
      <p>{displayValue(data.purpose, "[Purpose not specified]")}</p>

      <SectionHeading>Effective Date</SectionHeading>
      <p>{displayValue(formatDate(data.effectiveDate), "[Today's date]")}</p>

      <SectionHeading>MNDA Term</SectionHeading>
      <p>{formatMndaTerm(data.mndaTerm, data.mndaTermYears)}</p>

      <SectionHeading>Term of Confidentiality</SectionHeading>
      <p>
        {formatConfidentialityTerm(
          data.confidentialityTerm,
          data.confidentialityYears,
        )}
      </p>

      <SectionHeading>Governing Law &amp; Jurisdiction</SectionHeading>
      <p>
        Governing Law:{" "}
        {displayValue(data.governingLaw, "[Fill in state]")}
        <br />
        Jurisdiction: {displayValue(data.jurisdiction, "[Fill in location]")}
      </p>

      <SectionHeading>MNDA Modifications</SectionHeading>
      <p>{displayValue(data.modifications, "None.")}</p>

      <p className="mt-5">
        By signing this Cover Page, each party agrees to enter into this MNDA as
        of the Effective Date.
      </p>

      <table className="mt-4 w-full border-collapse text-center">
        <thead>
          <tr>
            <th aria-label="Field" />
            <th className="border border-black p-2">PARTY 1</th>
            <th className="border border-black p-2">PARTY 2</th>
          </tr>
        </thead>
        <tbody>
          {signatureRows.map((row) => (
            <tr key={row.label}>
              <td className="border border-black p-2 text-left font-semibold">
                {row.label}
              </td>
              <td className="border border-black p-2">{row.value1}</td>
              <td className="border border-black p-2">{row.value2}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Attribution />

      <section className="print:break-before-page">
        <h2 className="mt-8 text-center text-xl font-bold">Standard Terms</h2>
        <ol className="mt-4 list-decimal space-y-4 pl-6">
          {standardTerms.map((section) => (
            <li key={section.heading} className="pl-2">
              <span className="font-bold">{section.heading}</span>.{" "}
              <RichText text={section.body} />
            </li>
          ))}
        </ol>
        <Attribution linkVersion />
      </section>
    </article>
  );
}
