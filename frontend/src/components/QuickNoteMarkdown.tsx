import { useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { Image } from "antd";
import { remarkGfmNoAutolink } from "@/utils/remarkGfmNoAutolink";
import { highlightChildren } from "@/utils/highlightSearchText";

const markdownComponents: Components = {
  p: ({ children }) => <p className="text-sm mb-2 last:mb-0 leading-relaxed">{children}</p>,
  h1: ({ children }) => (
    <h1 className="text-base font-semibold mb-2 mt-1 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-semibold mb-2 mt-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-medium mb-1.5 mt-2 first:mt-0">{children}</h3>
  ),
  ul: ({ children }) => <ul className="text-sm mb-2 pl-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="text-sm mb-2 pl-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-gray-200 pl-3 my-2 text-gray-600 italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-700 underline underline-offset-2 hover:text-gray-900"
    >
      {children}
    </a>
  ),
  img: ({ src, alt }) => (
    <Image
      src={src}
      alt={alt ?? "图片"}
      preview={{ mask: false }}
      className="!rounded-lg my-2 border border-gray-200/80 object-contain cursor-pointer"
      style={{ maxWidth: "100%", maxHeight: 270, width: "auto", height: "auto" }}
    />
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  pre: ({ children }) => (
    <pre className="max-w-full overflow-x-hidden whitespace-pre-wrap break-words rounded-md bg-gray-50 border border-gray-200 p-3 my-2 text-xs font-mono leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={`${className ?? ""} break-words whitespace-pre-wrap`}>{children}</code>;
    }
    return (
      <code className="rounded bg-gray-100 border border-gray-200/80 px-1 py-0.5 text-xs font-mono text-gray-800 break-all">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-2 max-w-full overflow-x-hidden">
      <table className="w-full max-w-full table-fixed text-xs border-collapse break-words">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-slate-200 bg-white/60 px-2 py-1 text-left font-medium break-words">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-200 px-2 py-1 align-top break-words">{children}</td>
  ),
};

function withSearchHighlight(components: Components, query: string): Components {
  const hl = (children: ReactNode) => highlightChildren(children, query);

  return {
    ...components,
    p: ({ children }) => <p className="text-sm mb-2 last:mb-0 leading-relaxed">{hl(children)}</p>,
    h1: ({ children }) => (
      <h1 className="text-base font-semibold mb-2 mt-1 first:mt-0">{hl(children)}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-sm font-semibold mb-2 mt-2 first:mt-0">{hl(children)}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-medium mb-1.5 mt-2 first:mt-0">{hl(children)}</h3>
    ),
    li: ({ children }) => <li className="leading-relaxed">{hl(children)}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-gray-200 pl-3 my-2 text-gray-600 italic">
        {hl(children)}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-700 underline underline-offset-2 hover:text-gray-900"
      >
        {hl(children)}
      </a>
    ),
    strong: ({ children }) => <strong className="font-semibold">{hl(children)}</strong>,
    td: ({ children }) => (
      <td className="border border-slate-200 px-2 py-1 align-top break-words">{hl(children)}</td>
    ),
    th: ({ children }) => (
      <th className="border border-slate-200 bg-white/60 px-2 py-1 text-left font-medium break-words">
        {hl(children)}
      </th>
    ),
    code: ({ className, children }) => {
      const isBlock = Boolean(className);
      if (isBlock) {
        return (
          <code className={`${className ?? ""} break-words whitespace-pre-wrap`}>{hl(children)}</code>
        );
      }
      return (
        <code className="rounded bg-gray-100 border border-gray-200/80 px-1 py-0.5 text-xs font-mono text-gray-800 break-all">
          {hl(children)}
        </code>
      );
    },
  };
}

export default function QuickNoteMarkdown({
  content,
  highlightQuery,
}: {
  content: string;
  highlightQuery?: string;
}) {
  const query = highlightQuery?.trim() ?? "";
  const components = useMemo(
    () => (query ? withSearchHighlight(markdownComponents, query) : markdownComponents),
    [query],
  );

  return (
    <Image.PreviewGroup>
      <div className="max-w-full overflow-x-hidden break-words [&>*+*]:mt-4">
        <ReactMarkdown remarkPlugins={[remarkGfmNoAutolink]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </Image.PreviewGroup>
  );
}
