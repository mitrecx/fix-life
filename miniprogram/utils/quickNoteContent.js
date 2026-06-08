const { apiBaseUrl } = require("../config");

const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

const STYLES = {
  p: "margin:0 0 8px;line-height:1.6;font-size:14px;color:#374151;",
  h1: "margin:12px 0 8px;font-size:16px;font-weight:600;color:#1f2937;",
  h2: "margin:12px 0 8px;font-size:15px;font-weight:600;color:#1f2937;",
  h3: "margin:10px 0 6px;font-size:14px;font-weight:600;color:#1f2937;",
  hr: "margin:12px 0;border:none;border-top:1px solid #e5e7eb;height:0;",
  ul: "margin:0 0 8px;padding-left:20px;",
  ol: "margin:0 0 8px;padding-left:20px;",
  li: "margin:4px 0;line-height:1.6;font-size:14px;color:#374151;",
  code: "background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px;color:#1f2937;",
  pre: "background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;line-height:1.5;margin:8px 0;white-space:pre-wrap;word-break:break-word;",
  strong: "font-weight:600;color:#1f2937;",
  em: "font-style:italic;",
  blockquote:
    "border-left:3px solid #e5e7eb;padding-left:12px;margin:8px 0;color:#6b7280;font-style:italic;",
};

function resolveMediaUrl(url) {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
  return trimmed.startsWith("/") ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, `<strong style="${STYLES.strong}">$1</strong>`);
  s = s.replace(/__(.+?)__/g, `<strong style="${STYLES.strong}">$1</strong>`);
  s = s.replace(/\*([^*\n]+)\*/g, `<em style="${STYLES.em}">$1</em>`);
  s = s.replace(/`([^`\n]+)`/g, `<code style="${STYLES.code}">$1</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const url = escapeHtml(resolveMediaUrl(href));
    return `<a href="${url}" style="color:#4f46e5;text-decoration:underline;">${label}</a>`;
  });
  return s;
}

function markdownToHtml(md) {
  const lines = (md || "").split("\n");
  const html = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeLines = [];

  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");

    if (line.trim().startsWith("```")) {
      if (inCode) {
        html.push(`<pre style="${STYLES.pre}"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeLists();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (/^-{3,}$|^\*{3,}$|^_{3,}$/.test(line.trim())) {
      closeLists();
      html.push(`<hr style="${STYLES.hr}" />`);
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      closeLists();
      html.push(`<h3 style="${STYLES.h3}">${inlineMarkdown(h3[1])}</h3>`);
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      closeLists();
      html.push(`<h2 style="${STYLES.h2}">${inlineMarkdown(h2[1])}</h2>`);
      continue;
    }

    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      closeLists();
      html.push(`<h1 style="${STYLES.h1}">${inlineMarkdown(h1[1])}</h1>`);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeLists();
      html.push(`<blockquote style="${STYLES.blockquote}">${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    const ul = line.match(/^[-*+]\s+(.+)$/);
    if (ul) {
      if (inOl) {
        html.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        html.push(`<ul style="${STYLES.ul}">`);
        inUl = true;
      }
      html.push(`<li style="${STYLES.li}">${inlineMarkdown(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      if (inUl) {
        html.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        html.push(`<ol style="${STYLES.ol}">`);
        inOl = true;
      }
      html.push(`<li style="${STYLES.li}">${inlineMarkdown(ol[1])}</li>`);
      continue;
    }

    closeLists();

    if (!line.trim()) {
      continue;
    }

    html.push(`<p style="${STYLES.p}">${inlineMarkdown(line)}</p>`);
  }

  closeLists();

  if (inCode && codeLines.length) {
    html.push(`<pre style="${STYLES.pre}"><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }

  return html.join("");
}

function parseQuickNoteContent(content) {
  const text = content || "";
  const segments = [];
  let lastIndex = 0;
  let match;

  IMAGE_RE.lastIndex = 0;
  while ((match = IMAGE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const html = markdownToHtml(text.slice(lastIndex, match.index));
      if (html) segments.push({ type: "markdown", html });
    }
    segments.push({
      type: "image",
      alt: match[1] || "图片",
      src: resolveMediaUrl(match[2]),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const html = markdownToHtml(text.slice(lastIndex));
    if (html) segments.push({ type: "markdown", html });
  }

  if (!segments.length && text.trim()) {
    const html = markdownToHtml(text);
    if (html) segments.push({ type: "markdown", html });
  }

  return segments;
}

function decorateQuickNote(note) {
  const segments = parseQuickNoteContent(note.content);
  const imageUrls = segments.filter((s) => s.type === "image").map((s) => s.src);
  return {
    ...note,
    segments,
    imageUrls,
  };
}

module.exports = {
  decorateQuickNote,
  parseQuickNoteContent,
  resolveMediaUrl,
};
