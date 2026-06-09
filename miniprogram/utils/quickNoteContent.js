const { apiBaseUrl } = require("../config");

const IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

/** Quick note reading sizes — two steps above default body (28rpx → 36rpx). */
const FONT = {
  body: "18px",
  h1: "22px",
  h2: "20px",
  h3: "18px",
  code: "16px",
};

const STYLES = {
  p: `margin:0 0 8px;line-height:1.65;font-size:${FONT.body};color:#374151;`,
  h1: `margin:12px 0 8px;font-size:${FONT.h1};font-weight:600;color:#1f2937;`,
  h2: `margin:12px 0 8px;font-size:${FONT.h2};font-weight:600;color:#1f2937;`,
  h3: `margin:10px 0 6px;font-size:${FONT.h3};font-weight:600;color:#1f2937;`,
  hr: "margin:12px 0;border:none;border-top:1px solid #e5e7eb;height:0;",
  ul: "margin:0 0 8px;padding-left:20px;",
  ol: "margin:0 0 8px;padding-left:20px;",
  li: `margin:4px 0;line-height:1.65;font-size:${FONT.body};color:#374151;`,
  code: `background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:${FONT.code};color:#1f2937;`,
  pre: `background:#f9fafb;border:1px solid #e5e7eb;padding:12px;border-radius:8px;overflow-x:auto;font-size:${FONT.code};line-height:1.55;margin:8px 0;white-space:pre-wrap;word-break:break-word;`,
  strong: "font-weight:600;color:#1f2937;",
  em: "font-style:italic;",
  blockquote: `border-left:3px solid #e5e7eb;padding-left:12px;margin:8px 0;color:#6b7280;font-style:italic;font-size:${FONT.body};`,
  highlight: "background-color:#fef08a;color:inherit;border-radius:2px;padding:0 2px;",
};

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightHtmlTextNodes(html, query) {
  const q = (query || "").trim();
  if (!q || !html) return html;

  const needle = escapeHtml(q);
  if (!needle) return html;

  const re = new RegExp(escapeRegExp(needle), "gi");
  return html
    .split(/(<[^>]+>)/g)
    .map((part) => {
      if (!part || part.startsWith("<")) return part;
      return part.replace(re, (match) => `<span style="${STYLES.highlight}">${match}</span>`);
    })
    .join("");
}

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

function inlineMarkdownPlain(text) {
  let s = String(text || "");
  s = s.replace(/\*\*(.+?)\*\*/g, "$1");
  s = s.replace(/__(.+?)__/g, "$1");
  s = s.replace(/\*([^*\n]+)\*/g, "$1");
  s = s.replace(/`([^`\n]+)`/g, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  return s;
}

function markdownToPlainText(md) {
  const lines = (md || "").split("\n");
  const out = [];
  let inCode = false;
  let codeLines = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");

    if (line.trim().startsWith("```")) {
      if (inCode) {
        out.push(codeLines.join("\n"));
        codeLines = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (/^-{3,}$|^\*{3,}$|^_{3,}$/.test(line.trim())) {
      out.push("");
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      out.push(inlineMarkdownPlain(heading[1]));
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      out.push(inlineMarkdownPlain(quote[1]));
      continue;
    }

    const ul = line.match(/^[-*+]\s+(.+)$/);
    if (ul) {
      out.push(`• ${inlineMarkdownPlain(ul[1])}`);
      continue;
    }

    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      out.push(inlineMarkdownPlain(ol[1]));
      continue;
    }

    if (!line.trim()) {
      out.push("");
      continue;
    }

    out.push(inlineMarkdownPlain(line));
  }

  if (inCode && codeLines.length) {
    out.push(codeLines.join("\n"));
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function pushMarkdownSegment(segments, md, highlightQuery) {
  const plain = markdownToPlainText(md);
  const html = markdownToHtml(md, highlightQuery);
  if (!plain && !html) return;
  segments.push({
    type: "markdown",
    html,
    plain: plain || md.trim(),
  });
}

function markdownToHtml(md, highlightQuery) {
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

  return highlightHtmlTextNodes(html.join(""), highlightQuery);
}

function parseQuickNoteContent(content, highlightQuery) {
  const text = content || "";
  const segments = [];
  let lastIndex = 0;
  let match;

  IMAGE_RE.lastIndex = 0;
  while ((match = IMAGE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushMarkdownSegment(segments, text.slice(lastIndex, match.index), highlightQuery);
    }
    segments.push({
      type: "image",
      alt: match[1] || "图片",
      src: resolveMediaUrl(match[2]),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    pushMarkdownSegment(segments, text.slice(lastIndex), highlightQuery);
  }

  if (!segments.length && text.trim()) {
    pushMarkdownSegment(segments, text, highlightQuery);
  }

  return segments;
}

function decorateQuickNote(note, highlightQuery) {
  const segments = parseQuickNoteContent(note.content, highlightQuery);
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
