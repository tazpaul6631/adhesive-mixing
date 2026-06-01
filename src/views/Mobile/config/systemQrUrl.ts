import baseURLApi from "@/api/baseURLApi";

function normalizeQrPath(qrText: string) {
  return qrText.trim().replace(/^\/+/, "");
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "") + "/";
}

export function buildSystemQrUrl(qrText: string) {
  const normalizedText = qrText.trim();

  if (!normalizedText) {
    return null;
  }

  try {
    const absoluteUrl = new URL(normalizedText);
    const protocol = absoluteUrl.protocol.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:") {
      return null;
    }

    return absoluteUrl;
  } catch {
    // QR code can return a relative API path, for example:
    // s/mgm/01/134247485277723923
  }

  const relativePath = normalizeQrPath(normalizedText);

  if (!relativePath) {
    return null;
  }

  try {
    return new URL(relativePath, normalizeBaseUrl(baseURLApi.url));
  } catch (error) {
    console.error("Invalid base API URL:", baseURLApi.url, error);
    return null;
  }
}
