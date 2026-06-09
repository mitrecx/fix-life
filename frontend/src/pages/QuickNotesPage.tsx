import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DatePicker, Input, Modal, message } from "antd";
import { CheckSquare, Copy, GitMerge, ImagePlus, RotateCcw, Search, Send, Trash2, X } from "lucide-react";
import { type Dayjs } from "dayjs";
import dayjs from "dayjs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import QuickNoteEditor, { type QuickNoteEditorHandle } from "@/components/QuickNoteEditor";
import QuickNoteMarkdown from "@/components/QuickNoteMarkdown";
import { quickNoteService } from "@/services/quickNoteService";
import type { QuickNote, QuickNoteListFilters } from "@/types/quickNote";
import { copyQuickNoteContent } from "@/utils/copyQuickNoteContent";
import { readQuickNoteFilters, writeQuickNoteFilters } from "@/utils/listFiltersStorage";

function readInitialQuickNoteFilters() {
  const stored = readQuickNoteFilters({});
  return {
    queryInput: stored.q ?? "",
    dateRange: [
      stored.dateFrom ? dayjs(stored.dateFrom) : null,
      stored.dateTo ? dayjs(stored.dateTo) : null,
    ] as [Dayjs | null, Dayjs | null],
    appliedFilters: {
      q: stored.q,
      dateFrom: stored.dateFrom,
      dateTo: stored.dateTo,
    } satisfies QuickNoteListFilters,
  };
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateDivider(iso: string) {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function isSameCalendarDay(a: string, b: string) {
  return dayjs(a).format("YYYY-MM-DD") === dayjs(b).format("YYYY-MM-DD");
}

function DateDivider({ iso }: { iso: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs text-gray-400 shrink-0">{formatDateDivider(iso)}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

function hasActiveFilters(filters: QuickNoteListFilters) {
  return !!(filters.q?.trim() || filters.dateFrom || filters.dateTo);
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function normalizePastedImageFile(file: File): File | null {
  let type = file.type;
  if (!type || type === "application/octet-stream") {
    type = "image/png";
  }
  if (!ALLOWED_IMAGE_TYPES.has(type)) {
    return null;
  }
  if (type === file.type) {
    return file;
  }
  const extension = type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1];
  return new File([file], file.name || `pasted-image.${extension}`, { type });
}

export default function QuickNotesPage() {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draftEmpty, setDraftEmpty] = useState(true);
  const [queryInput, setQueryInput] = useState(() => readInitialQuickNoteFilters().queryInput);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>(
    () => readInitialQuickNoteFilters().dateRange,
  );
  const [appliedFilters, setAppliedFilters] = useState<QuickNoteListFilters>(
    () => readInitialQuickNoteFilters().appliedFilters,
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [merging, setMerging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<QuickNoteEditorHandle>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const loadNotes = useCallback(async (filters: QuickNoteListFilters) => {
    try {
      setLoading(true);
      const res = await quickNoteService.listNotes(filters);
      setNotes(res.notes);
    } catch (error) {
      console.error("Failed to load quick notes:", error);
      message.error("加载随手记失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes(appliedFilters);
  }, [appliedFilters, loadNotes]);

  useEffect(() => {
    writeQuickNoteFilters(appliedFilters);
  }, [appliedFilters]);

  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }, [appliedFilters]);

  useEffect(() => {
    if (!loading && notes.length > 0 && !hasActiveFilters(appliedFilters)) {
      scrollToBottom("auto");
    }
  }, [loading, notes.length, appliedFilters, scrollToBottom]);

  const handleSearch = () => {
    const next: QuickNoteListFilters = {
      q: queryInput.trim() || undefined,
      dateFrom: dateRange[0]?.format("YYYY-MM-DD"),
      dateTo: dateRange[1]?.format("YYYY-MM-DD"),
    };
    setAppliedFilters(next);
    void loadNotes(next);
  };

  const handleReset = () => {
    setQueryInput("");
    setDateRange([null, null]);
    setAppliedFilters({});
  };

  const handleSend = async () => {
    const content = editorRef.current?.getMarkdown() ?? "";
    if (!content || sending) {
      return;
    }

    try {
      setSending(true);
      const created = await quickNoteService.createNote({ content });
      editorRef.current?.clear();
      setDraftEmpty(true);

      if (hasActiveFilters(appliedFilters)) {
        await loadNotes(appliedFilters);
      } else {
        setNotes((prev) => [...prev, created]);
        requestAnimationFrame(() => scrollToBottom());
      }
    } catch (error) {
      console.error("Failed to send quick note:", error);
      message.error("发送失败");
    } finally {
      setSending(false);
    }
  };

  const uploadImageFile = async (file: File) => {
    if (uploadingImage || sending) {
      return;
    }

    const normalized = normalizePastedImageFile(file);
    if (!normalized) {
      message.error("请粘贴 JPG、PNG、GIF 或 WEBP 格式的图片");
      return;
    }
    if (normalized.size > MAX_IMAGE_SIZE) {
      message.error("图片大小不能超过 5MB");
      return;
    }

    try {
      setUploadingImage(true);
      const { url } = await quickNoteService.uploadImage(normalized);
      editorRef.current?.insertImage(url);
      message.success("图片已添加，点击发送即可保存");
    } catch (error) {
      console.error("Failed to upload quick note image:", error);
      message.error(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    await uploadImageFile(file);
  };

  const filtering = hasActiveFilters(appliedFilters);
  const selectedCount = selectedIds.size;
  const allVisibleSelected = useMemo(
    () => notes.length > 0 && notes.every((note) => selectedIds.has(note.id)),
    [notes, selectedIds],
  );

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(notes.map((note) => note.id)));
  };

  const removeNotesFromList = (noteIds: string[]) => {
    const idSet = new Set(noteIds);
    setNotes((prev) => prev.filter((note) => !idSet.has(note.id)));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      noteIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleCopyNote = async (note: QuickNote) => {
    try {
      await copyQuickNoteContent(note.content);
      message.success("已复制");
    } catch (error) {
      console.error("Failed to copy quick note:", error);
      message.error("复制失败");
    }
  };

  const handleDeleteNote = (note: QuickNote) => {
    Modal.confirm({
      title: "删除消息",
      content: "确定要删除这条随手记吗？此操作不可撤销。",
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        removeNotesFromList([note.id]);
        try {
          await quickNoteService.deleteNote(note.id);
          message.success("已删除");
        } catch (error) {
          console.error("Failed to delete quick note:", error);
          await loadNotes(appliedFilters);
          message.error("删除失败");
        }
      },
    });
  };

  const handleBatchMerge = () => {
    if (selectedCount < 2 || merging || deleting) {
      return;
    }
    const ids = [...selectedIds];
    Modal.confirm({
      title: "批量合并",
      content: `确定将选中的 ${ids.length} 条随手记合并为一条吗？内容将按时间顺序拼接，并保留最早一条的时间。`,
      okText: "合并",
      cancelText: "取消",
      onOk: async () => {
        setMerging(true);
        try {
          const result = await quickNoteService.mergeNotes(ids);
          const idSet = new Set(ids);
          setNotes((prev) => {
            const remaining = prev.filter((note) => !idSet.has(note.id));
            return [...remaining, result.note].sort(
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime() ||
                a.id.localeCompare(b.id),
            );
          });
          exitSelectionMode();
          message.success(`已合并 ${result.merged} 条`);
        } catch (error) {
          console.error("Failed to batch merge quick notes:", error);
          await loadNotes(appliedFilters);
          message.error(error instanceof Error ? error.message : "批量合并失败");
        } finally {
          setMerging(false);
        }
      },
    });
  };

  const handleBatchDelete = () => {
    if (selectedCount === 0 || deleting) {
      return;
    }
    const ids = [...selectedIds];
    Modal.confirm({
      title: "批量删除",
      content: `确定要删除选中的 ${ids.length} 条随手记吗？此操作不可撤销。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        setDeleting(true);
        removeNotesFromList(ids);
        exitSelectionMode();
        try {
          const result = await quickNoteService.deleteNotes(ids);
          if (result.deleted === ids.length) {
            message.success(`已删除 ${result.deleted} 条`);
          } else {
            await loadNotes(appliedFilters);
            message.warning(`删除完成：成功 ${result.deleted} 条，未找到 ${ids.length - result.deleted} 条`);
          }
        } catch (error) {
          console.error("Failed to batch delete quick notes:", error);
          await loadNotes(appliedFilters);
          message.error("批量删除失败");
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 p-3 bg-gray-50 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onPressEnter={handleSearch}
              placeholder="搜索内容"
              allowClear
              prefix={<Search size={16} className="text-gray-400" />}
              className="!rounded-lg flex-1 min-w-[180px]"
            />
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(values) => setDateRange(values ?? [null, null])}
              allowClear
              format="YYYY-MM-DD"
              placeholder={["开始日期", "结束日期"]}
              className="!rounded-lg"
            />
            <button
              type="button"
              onClick={handleSearch}
              className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors"
            >
              <Search size={14} />
              搜索
            </button>
            {(queryInput || dateRange[0] || dateRange[1] || filtering) && (
              <button
                type="button"
                onClick={handleReset}
                className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-100 transition-colors"
              >
                <RotateCcw size={14} />
                重置
              </button>
            )}
            {notes.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectionMode) {
                    exitSelectionMode();
                  } else {
                    setSelectionMode(true);
                  }
                }}
                className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-sm transition-colors ${
                  selectionMode
                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                    : "border border-gray-300 text-gray-600 hover:bg-gray-100"
                }`}
              >
                <CheckSquare size={14} />
                {selectionMode ? "多选中" : "多选"}
              </button>
            )}
          </div>
          {selectionMode && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
              <CheckSquare size={16} className="text-indigo-600 shrink-0" />
              <span className="text-sm text-indigo-900">
                已选 <span className="font-semibold tabular-nums">{selectedCount}</span> 项
              </span>
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-100 transition-all"
              >
                {allVisibleSelected ? "取消全选" : "全选当前结果"}
              </button>
              <span className="flex-1" />
              <button
                type="button"
                disabled={selectedCount < 2 || merging || deleting}
                onClick={handleBatchMerge}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-md hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <GitMerge size={13} />
                {merging ? "合并中…" : "批量合并"}
              </button>
              <button
                type="button"
                disabled={selectedCount === 0 || deleting || merging}
                onClick={handleBatchDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 size={13} />
                {deleting ? "删除中…" : "批量删除"}
              </button>
              <button
                type="button"
                onClick={exitSelectionMode}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-all"
              >
                <X size={13} />
                取消
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-x-none p-4 bg-white">
          {loading ? (
            <div className="py-16">
              <LoadingSpinner size="large" block />
            </div>
          ) : notes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {filtering ? "没有匹配的记录" : "还没有记录，在下方输入第一条吧"}
            </div>
          ) : (
            <div className="space-y-6">
            {notes.map((note, index) => {
              const selected = selectedIds.has(note.id);
              const prevNote = index > 0 ? notes[index - 1] : null;
              const showDateDivider =
                index === 0 ||
                (prevNote !== null && !isSameCalendarDay(prevNote.created_at, note.created_at));

              return (
                <Fragment key={note.id}>
                  {showDateDivider && <DateDivider iso={note.created_at} />}
                  <div className="flex justify-start items-start gap-2">
                  {selectionMode && (
                    <label className="mt-5 inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleNoteSelection(note.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  )}
                  <div
                    className={`w-full min-w-0 ${selectionMode ? "cursor-pointer" : ""}`}
                    onClick={selectionMode ? () => toggleNoteSelection(note.id) : undefined}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] text-gray-400 shrink-0">
                        {formatMessageTime(note.created_at)}
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                    <div
                      className={`relative text-gray-800 ${
                        selected ? "rounded-md bg-indigo-50/40 ring-1 ring-indigo-200 px-1 -mx-1" : ""
                      } ${selectionMode ? "" : "group"}`}
                    >
                      {!selectionMode && (
                        <div className="absolute -top-1 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            type="button"
                            onClick={() => void handleCopyNote(note)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
                            title="复制"
                          >
                            <Copy size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 shadow-sm"
                            title="删除"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                      <div className="text-sm break-words overflow-x-hidden max-w-full pr-16">
                        <QuickNoteMarkdown content={note.content} />
                      </div>
                    </div>
                  </div>
                </div>
                </Fragment>
              );
            })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 border-t border-gray-200 px-3 pt-2 pb-3 bg-gray-50">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(event) => void handleImageSelect(event)}
          />
          <div className="relative rounded-xl border border-gray-300 bg-white transition-colors focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <QuickNoteEditor
              ref={editorRef}
              disabled={sending || uploadingImage}
              onEmptyChange={setDraftEmpty}
              onSubmit={() => void handleSend()}
              onUploadImage={(file) => void uploadImageFile(file)}
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage || sending}
                className="pointer-events-auto h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="上传图片"
              >
                {uploadingImage ? <LoadingSpinner size="small" inline /> : <ImagePlus size={18} />}
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || uploadingImage || draftEmpty}
                className="pointer-events-auto h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="发送"
              >
                {sending ? <LoadingSpinner size="small" inline /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
