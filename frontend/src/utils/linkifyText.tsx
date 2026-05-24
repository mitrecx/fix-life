import type { ReactNode } from "react";

const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>"'`]+[^\s<>"'`.,;:!?)\]}>]/gi;

function normalizeHref(raw: string): string {
  return raw.startsWith("www.") ? `https://${raw}` : raw;
}

export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);

  while ((match = pattern.exec(text)) !== null) {
    const url = match[0];
    const start = match.index;

    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }

    nodes.push(
      <a
        key={`${start}-${url}`}
        href={normalizeHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );

    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}
