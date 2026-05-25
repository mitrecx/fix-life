import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Image } from "antd";

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
      preview={{ mask: "预览" }}
      className="!rounded-lg my-2 border border-gray-200/80 object-contain cursor-zoom-in"
      style={{ maxWidth: 220, maxHeight: 160, width: "auto", height: "auto" }}
    />
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-md bg-gray-50 border border-gray-200 p-3 my-2 text-xs font-mono leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-gray-100 border border-gray-200/80 px-1 py-0.5 text-xs font-mono text-gray-800">
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full text-xs border-collapse">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-slate-200 bg-white/60 px-2 py-1 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-200 px-2 py-1 align-top">{children}</td>
  ),
};

export default function QuickNoteMarkdown({ content }: { content: string }) {
  return (
    <Image.PreviewGroup>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </Image.PreviewGroup>
  );
}
