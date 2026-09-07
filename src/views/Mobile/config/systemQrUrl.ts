import baseURLApi from "@/api/baseURLApi";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "") + "/";
}

/** Lấy path API từ QR (absolute hoặc relative), luôn bắt đầu từ segment `s/...` nếu có. */
function extractQrApiPath(qrText: string): string | null {
  const normalizedText = qrText.trim();

  if (!normalizedText) {
    return null;
  }

  let pathText = normalizedText;

  try {
    const absoluteUrl = new URL(normalizedText);
    const protocol = absoluteUrl.protocol.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:") {
      return null;
    }

    // Bỏ host trên QR — luôn gắn lại với baseURLApi
    pathText = absoluteUrl.pathname;
  } catch {
    // QR dạng relative: s/mgm/01/134247485277723923
  }

  const parts = pathText
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  const scanIndex = parts.findIndex((part) => part.toLowerCase() === "s");
  const apiParts = scanIndex >= 0 ? parts.slice(scanIndex) : parts;

  return apiParts.join("/") || null;
}

/** Segment sau `s/` trên QR: lc | llc | mgm | sg | nsg ... */
export function getGlueQrCode(qrText: string): string | null {
  const relativePath = extractQrApiPath(qrText);
  if (!relativePath) {
    return null;
  }

  const parts = relativePath
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  const scanIndex = parts.findIndex((part) => part.toLowerCase() === "s");
  const codeIndex = scanIndex >= 0 ? scanIndex + 1 : 0;
  const code = (parts[codeIndex] || "").toLowerCase();
  return code || null;
}

export function buildSystemQrUrl(qrText: string) {
  const relativePath = extractQrApiPath(qrText);

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
