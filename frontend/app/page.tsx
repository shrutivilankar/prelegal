"use client";

import { useState } from "react";
import DocumentPreview from "@/components/DocumentPreview";
import NdaForm from "@/components/NdaForm";
import type { NdaFormData } from "@/lib/mnda";
import { defaultNdaFormData } from "@/lib/mnda";

export default function Home() {
  const [formData, setFormData] = useState<NdaFormData>(defaultNdaFormData);

  const updateForm = (patch: Partial<NdaFormData>) => {
    setFormData((previous) => ({ ...previous, ...patch }));
  };

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
          <DocumentPreview data={formData} />
        </section>
      </main>
    </div>
  );
}
