"use client";

import { useEffect, useState } from "react";
import DocumentPreview from "@/components/DocumentPreview";
import NdaForm from "@/components/NdaForm";
import type { NdaFormData, StandardTermsSection } from "@/lib/mnda";
import {
  MNDA_COVERPAGE_FILENAME,
  MNDA_STANDARD_TERMS_FILENAME,
  defaultNdaFormData,
} from "@/lib/mnda";
import { fetchTemplate } from "@/lib/api";
import { parseCoverPageIntro, parseStandardTerms } from "@/lib/template-parser";

interface MndaContent {
  coverPageIntro: string;
  standardTerms: StandardTermsSection[];
}

async function loadMndaContent(): Promise<MndaContent> {
  const [coverpage, standardTerms] = await Promise.all([
    fetchTemplate(MNDA_COVERPAGE_FILENAME),
    fetchTemplate(MNDA_STANDARD_TERMS_FILENAME),
  ]);
  return {
    coverPageIntro: parseCoverPageIntro(coverpage.content),
    standardTerms: parseStandardTerms(standardTerms.content),
  };
}

export default function Home() {
  const [formData, setFormData] = useState<NdaFormData>(defaultNdaFormData);
  const [mndaContent, setMndaContent] = useState<MndaContent | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadAttempt, setReloadAttempt] = useState(0);

  const updateForm = (patch: Partial<NdaFormData>) => {
    setFormData((previous) => ({ ...previous, ...patch }));
  };

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(false);
    loadMndaContent()
      .then((content) => {
        if (!cancelled) setMndaContent(content);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadAttempt]);

  return (
    <div className="flex h-dvh flex-col print:h-auto">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4 print:hidden">
        <div>
          <p className="text-lg font-semibold text-neutral-900">Prelegal</p>
          <p className="text-xs text-neutral-500">Mutual NDA Creator</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Download PDF
        </button>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[420px_1fr] print:block">
        <aside className="min-h-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50 p-6 lg:p-8 print:hidden">
          <NdaForm data={formData} onChange={updateForm} />
        </aside>

        <section className="min-h-0 overflow-y-auto bg-neutral-300 p-6 lg:p-10 print:overflow-visible print:p-0">
          {loadFailed ? (
            <div className="mx-auto max-w-md rounded-md bg-white p-6 text-center shadow-lg">
              <p className="text-sm font-medium text-neutral-900">
                Unable to load template content.
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Make sure the backend is running, then try again.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMndaContent(null);
                  setReloadAttempt((attempt) => attempt + 1);
                }}
                className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          ) : mndaContent ? (
            <DocumentPreview data={formData} {...mndaContent} />
          ) : (
            <p className="mt-10 text-center text-sm text-neutral-700">
              Loading template content…
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
