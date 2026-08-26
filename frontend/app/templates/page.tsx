"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import MarkdownView from "@/components/MarkdownView";
import {
  fetchTemplate,
  fetchTemplates,
} from "@/lib/api";
import type { TemplateDetail, TemplateSummary } from "@/lib/api";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [listFailed, setListFailed] = useState(false);
  const [listReloadAttempt, setListReloadAttempt] = useState(0);

  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [detailFailed, setDetailFailed] = useState(false);
  const [detailReloadAttempt, setDetailReloadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setListFailed(false);
    fetchTemplates()
      .then((rows) => {
        if (!cancelled) setTemplates(rows);
      })
      .catch(() => {
        if (!cancelled) setListFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [listReloadAttempt]);

  useEffect(() => {
    if (!selectedFilename) return;
    let cancelled = false;
    setDetail(null);
    setDetailFailed(false);
    fetchTemplate(selectedFilename)
      .then((row) => {
        if (!cancelled) setDetail(row);
      })
      .catch(() => {
        if (!cancelled) setDetailFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedFilename, detailReloadAttempt]);

  const selectedTemplate = templates.find(
    (template) => template.filename === selectedFilename,
  );

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
        <div>
          <p className="text-lg font-semibold text-neutral-900">Prelegal</p>
          <p className="text-xs text-neutral-500">Template Catalog</p>
        </div>
        <Link
          href="/"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          NDA Creator
        </Link>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[380px_1fr]">
        <aside className="min-h-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50 p-6 lg:p-8">
          {listFailed ? (
            <div className="rounded-md bg-white p-4 text-center shadow">
              <p className="text-sm font-medium text-neutral-900">
                Unable to load the template catalog.
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Make sure the backend is running, then try again.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTemplates([]);
                  setListReloadAttempt((attempt) => attempt + 1);
                }}
                className="mt-3 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-neutral-700">Loading templates…</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((template) => (
                <li key={template.filename}>
                  <button
                    type="button"
                    onClick={() => setSelectedFilename(template.filename)}
                    aria-current={
                      selectedFilename === template.filename ? "true" : undefined
                    }
                    className={`w-full rounded-md border p-3 text-left transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      selectedFilename === template.filename
                        ? "border-blue-600 bg-white shadow-sm"
                        : "border-transparent bg-neutral-100/60"
                    }`}
                  >
                    <span className="block text-sm font-medium text-neutral-900">
                      {template.name}
                    </span>
                    <span className="mt-1 block text-xs leading-snug text-neutral-600">
                      {template.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="min-h-0 overflow-y-auto bg-neutral-300 p-6 lg:p-10">
          {!selectedFilename ? (
            <div className="mx-auto mt-16 max-w-md rounded-md bg-white p-6 text-center shadow-lg">
              <p className="text-sm font-medium text-neutral-900">
                Select a template from the list to preview it.
              </p>
            </div>
          ) : detailFailed ? (
            <div className="mx-auto max-w-md rounded-md bg-white p-6 text-center shadow-lg">
              <p className="text-sm font-medium text-neutral-900">
                Unable to load this template.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDetail(null);
                  setDetailReloadAttempt((attempt) => attempt + 1);
                }}
                className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <h1 className="mb-6 text-center text-xl font-semibold text-neutral-900">
                {detail ? detail.name : selectedTemplate?.name ?? selectedFilename}
              </h1>
              {detail ? (
                <MarkdownView content={detail.content} />
              ) : (
                <p className="mt-10 text-center text-sm text-neutral-700">
                  Loading template…
                </p>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
