import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export interface QuickNoteEditorHandle {
  clear: () => void;
  getMarkdown: () => string;
  insertImage: (url: string) => void;
  isEmpty: () => boolean;
}

interface QuickNoteEditorProps {
  disabled?: boolean;
  onEmptyChange?: (empty: boolean) => void;
  onSubmit?: () => void;
  onUploadImage?: (file: File) => void;
  placeholder?: string;
}

const QuickNoteEditor = forwardRef<QuickNoteEditorHandle, QuickNoteEditorProps>(
  (
    {
      disabled = false,
      onEmptyChange,
      onSubmit,
      onUploadImage,
      placeholder = "输入想记录的内容…（Enter 发送，Shift+Enter 换行，可直接粘贴图片或富文本）",
    },
    ref,
  ) => {
    const onSubmitRef = useRef(onSubmit);
    const onUploadImageRef = useRef(onUploadImage);

    useEffect(() => {
      onSubmitRef.current = onSubmit;
    }, [onSubmit]);

    useEffect(() => {
      onUploadImageRef.current = onUploadImage;
    }, [onUploadImage]);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Link.configure({
          openOnClick: false,
          autolink: false,
        }),
        Image.configure({
          inline: false,
          allowBase64: false,
        }),
        Placeholder.configure({ placeholder }),
        Markdown,
      ],
      content: "",
      contentType: "markdown",
      editable: !disabled,
      editorProps: {
        attributes: {
          class:
            "quick-note-editor px-3 pt-3 pb-11 min-h-[2.75rem] max-h-48 overflow-y-auto outline-none text-sm text-gray-800",
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmitRef.current?.();
            return true;
          }
          return false;
        },
        handlePaste: (_view, event) => {
          const items = event.clipboardData?.items;
          if (!items || !onUploadImageRef.current) {
            return false;
          }

          for (const item of items) {
            if (item.kind !== "file" || !item.type.startsWith("image/")) {
              continue;
            }
            const file = item.getAsFile();
            if (!file) {
              continue;
            }
            event.preventDefault();
            onUploadImageRef.current(file);
            return true;
          }

          return false;
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        onEmptyChange?.(currentEditor.isEmpty);
      },
    });

    useEffect(() => {
      editor?.setEditable(!disabled);
    }, [disabled, editor]);

    useImperativeHandle(
      ref,
      () => ({
        clear: () => {
          editor?.commands.clearContent(true);
          onEmptyChange?.(true);
        },
        getMarkdown: () => editor?.getMarkdown().trim() ?? "",
        insertImage: (url: string) => {
          if (!editor) {
            return;
          }
          editor.chain().focus().setImage({ src: url, alt: "图片" }).run();
          onEmptyChange?.(false);
        },
        isEmpty: () => editor?.isEmpty ?? true,
      }),
      [editor, onEmptyChange],
    );

    return <EditorContent editor={editor} />;
  },
);

QuickNoteEditor.displayName = "QuickNoteEditor";

export default QuickNoteEditor;
