const IMAGE_MARKDOWN_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const TOKEN_KEY = "auth_token";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(resolveAbsoluteUrl(url), {
    headers,
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) {
    throw new Error("Invalid image response");
  }
  return blob;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = src;
  });
}

function canvasToPngBlob(img: HTMLImageElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Failed to create canvas"));
      return;
    }
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode PNG"))),
      "image/png",
    );
  });
}

async function ensurePngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === "image/png") {
    return blob;
  }
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImage(objectUrl);
    return await canvasToPngBlob(img);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function fetchPngBlob(url: string): Promise<Blob> {
  return fetchImageBlob(url).then(ensurePngBlob);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function stripImageMarkdown(content: string): string {
  return content.replace(IMAGE_MARKDOWN_RE, (_, alt: string) => alt || "").trim();
}

function buildMixedHtml(content: string, matches: RegExpMatchArray[], dataUrls: string[]): string {
  let html = "";
  let lastIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const [full, alt] = match;
    const index = match.index ?? 0;
    const textBefore = content.slice(lastIndex, index);
    if (textBefore) {
      html += `<p>${escapeHtml(textBefore).replace(/\n/g, "<br/>")}</p>`;
    }
    html += `<p><img src="${dataUrls[i]}" alt="${escapeHtml(alt || "图片")}" /></p>`;
    lastIndex = index + full.length;
  }

  const textAfter = content.slice(lastIndex);
  if (textAfter) {
    html += `<p>${escapeHtml(textAfter).replace(/\n/g, "<br/>")}</p>`;
  }

  return html;
}

function buildMixedClipboardItem(
  content: string,
  matches: RegExpMatchArray[],
): ClipboardItem {
  const plainText = stripImageMarkdown(content);
  const imageUrls = matches.map((match) => match[2]);

  const htmlPromise = Promise.all(imageUrls.map((url) => fetchPngBlob(url).then(blobToDataUrl))).then(
    (dataUrls) => buildMixedHtml(content, matches, dataUrls),
  );

  const payload: Record<string, Blob | Promise<Blob>> = {
    "text/html": htmlPromise.then((html) => new Blob([html], { type: "text/html" })),
    "text/plain": Promise.resolve(new Blob([plainText], { type: "text/plain" })),
  };

  if (matches.length === 1) {
    payload["image/png"] = fetchPngBlob(imageUrls[0]);
  }

  return new ClipboardItem(payload);
}

export async function copyQuickNoteContent(content: string): Promise<void> {
  const matches = [...content.matchAll(IMAGE_MARKDOWN_RE)];

  if (matches.length === 0) {
    await navigator.clipboard.writeText(content);
    return;
  }

  const trimmed = content.trim();
  const isSingleImageOnly = matches.length === 1 && trimmed === matches[0][0].trim();

  if (isSingleImageOnly) {
    // Pass a Promise so clipboard.write runs in the click handler (keeps user activation).
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": fetchPngBlob(matches[0][2]),
      }),
    ]);
    return;
  }

  await navigator.clipboard.write([buildMixedClipboardItem(content, matches)]);
}
