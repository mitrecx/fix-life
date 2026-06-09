import { Children, cloneElement, isValidElement, type ReactNode } from "react";

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightSearchText(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) {
    return text;
  }

  const regex = new RegExp(escapeRegExp(q), "gi");
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    nodes.push(
      <mark
        key={index}
        className="bg-amber-200/90 text-inherit rounded px-0.5 box-decoration-clone"
      >
        {match[0]}
      </mark>,
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  if (!nodes.length) {
    return text;
  }

  return nodes.length === 1 ? nodes[0] : nodes;
}

export function highlightChildren(children: ReactNode, query: string): ReactNode {
  if (!query.trim()) {
    return children;
  }

  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return highlightSearchText(child, query);
    }
    if (isValidElement(child)) {
      const props = child.props as { children?: ReactNode };
      if (props.children != null) {
        return cloneElement(child, {}, highlightChildren(props.children, query));
      }
    }
    return child;
  });
}
