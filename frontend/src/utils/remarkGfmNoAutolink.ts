import { combineExtensions } from "micromark-util-combine-extensions";
import { gfmFootnote } from "micromark-extension-gfm-footnote";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";
import { gfmFootnoteFromMarkdown } from "mdast-util-gfm-footnote";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { gfmTaskListItemFromMarkdown } from "mdast-util-gfm-task-list-item";
import type { Pluggable } from "unified";

/** GFM tables/strikethrough/task lists without autolink literals (avoids `file.py` false links). */
export const remarkGfmNoAutolink: Pluggable = function remarkGfmNoAutolink() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = this.data() as Record<string, any>;

  const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = []);
  const fromMarkdownExtensions =
    data.fromMarkdownExtensions || (data.fromMarkdownExtensions = []);

  micromarkExtensions.push(
    combineExtensions([gfmFootnote(), gfmStrikethrough(), gfmTable(), gfmTaskListItem()]),
  );
  fromMarkdownExtensions.push(
    gfmFootnoteFromMarkdown(),
    gfmStrikethroughFromMarkdown(),
    gfmTableFromMarkdown(),
    gfmTaskListItemFromMarkdown(),
  );
};
