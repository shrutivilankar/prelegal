import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchTemplate, getApiBaseUrl } from "@/lib/api";

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
