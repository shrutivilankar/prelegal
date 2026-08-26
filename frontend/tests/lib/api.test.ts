import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchTemplate, fetchTemplates, getApiBaseUrl, sendChatMessage } from "@/lib/api";

const API_BASE_ENV_VAR = "NEXT_PUBLIC_API_BASE_URL";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  delete process.env[API_BASE_ENV_VAR];
  vi.unstubAllGlobals();
});

describe("getApiBaseUrl", () => {
  it("defaults to the local backend", () => {
    expect(getApiBaseUrl()).toBe("http://localhost:8000");
  });

  it.each([
    ["http://127.0.0.1:9000", "http://127.0.0.1:9000"],
    ["https://api.example.com/", "https://api.example.com"],
    ["  http://api.example.com/// ", "http://api.example.com"],
  ])(
    "normalizes %s from NEXT_PUBLIC_API_BASE_URL",
    (envValue, expected) => {
      process.env[API_BASE_ENV_VAR] = envValue;
      expect(getApiBaseUrl()).toBe(expected);
    },
  );

  it("falls back to the default when the variable is blank", () => {
    process.env[API_BASE_ENV_VAR] = "   ";
    expect(getApiBaseUrl()).toBe("http://localhost:8000");
  });
});

describe("fetchTemplate", () => {
  it("requests the template detail endpoint and returns the parsed body", async () => {
    const detail = {
      name: "Mutual NDA Standard Terms",
      description: "Standard terms",
      filename: "Mutual-NDA.md",
      content: "# Standard Terms\n",
    };
    const fetchMock = vi.fn(async () => jsonResponse(detail));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTemplate("Mutual-NDA.md")).resolves.toEqual(detail);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/templates/Mutual-NDA.md",
    );
  });

  it("encodes the filename into the request URL", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await fetchTemplate("Mutual-NDA-coverpage.md");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/templates/Mutual-NDA-coverpage.md",
    );
  });

  it("uses the configured base URL", async () => {
    process.env[API_BASE_ENV_VAR] = "https://api.example.com";
    const fetchMock = vi.fn(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await fetchTemplate("sla.md");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/api/templates/sla.md",
    );
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 404)));

    await expect(fetchTemplate("nope.md")).rejects.toThrow(/404.*nope\.md/);
  });
});

describe("fetchTemplates", () => {
  const listResponse = {
    templates: [
      { name: "Service Level Agreement", description: "SLA terms", filename: "sla.md" },
      { name: "Business Associate Agreement", description: "BAA terms", filename: "BAA.md" },
    ],
  };

  it("requests the template list endpoint and returns the parsed templates", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(listResponse));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTemplates()).resolves.toEqual(listResponse.templates);

    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8000/api/templates");
  });

  it("uses the configured base URL", async () => {
    process.env[API_BASE_ENV_VAR] = "https://api.example.com";
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(listResponse)));

    await fetchTemplates();

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://api.example.com/api/templates",
    );
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 500)));

    await expect(fetchTemplates()).rejects.toThrow(/status 500/);
  });

  it("returns an empty array when the catalog is empty", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ templates: [] })));

    await expect(fetchTemplates()).resolves.toEqual([]);
  });
});

describe("sendChatMessage", () => {
  it("posts the conversation to the chat endpoint and returns the parsed body", async () => {
    const body = { reply: "Got it.", nda_fields: { party1Name: "Acme Corp" } };
    let capturedInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      capturedInit = init;
      return jsonResponse(body);
    });
    vi.stubGlobal("fetch", fetchMock);
    const messages = [
      { role: "assistant", content: "Hello" },
      { role: "user", content: "Acme Corp" },
    ] as const;

    await expect(sendChatMessage([...messages])).resolves.toEqual(body);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(JSON.parse(String(capturedInit?.body))).toEqual({ messages });
  });

  it("uses the configured base URL", async () => {
    process.env[API_BASE_ENV_VAR] = "https://api.example.com";
    let capturedUrl = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        capturedUrl = url;
        return jsonResponse({ reply: "", nda_fields: {} });
      }),
    );

    await sendChatMessage([{ role: "user", content: "hi" }]);

    expect(capturedUrl).toBe("https://api.example.com/api/chat");
  });

  it.each([
    [503, /status 503/],
    [502, /status 502/],
  ])("throws when the response is not ok (%i)", async (status, pattern) => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, status)));

    await expect(sendChatMessage([{ role: "user", content: "hi" }])).rejects.toThrow(
      pattern,
    );
  });
});
