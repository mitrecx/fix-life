import { useCallback, useEffect, useRef, useState } from "react";
import { DatePicker, Input, message } from "antd";
import { RotateCcw, Search, Send } from "lucide-react";
import { type Dayjs } from "dayjs";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import QuickNoteMarkdown from "@/components/QuickNoteMarkdown";
import { quickNoteService } from "@/services/quickNoteService";
import type { QuickNote, QuickNoteListFilters } from "@/types/quickNote";

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasActiveFilters(filters: QuickNoteListFilters) {
  return !!(filters.q?.trim() || filters.dateFrom || filters.dateTo);
}

export default function QuickNotesPage() {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [appliedFilters, setAppliedFilters] = useState<QuickNoteListFilters>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!loading && notes.length > 0 && !hasActiveFilters(appliedFilters)) {
      scrollToBottom("auto");
    }
  }, [loading, notes.length, appliedFilters, scrollToBottom]);

  const handleSearch = () => {
    setAppliedFilters({
      q: queryInput.trim() || undefined,
      dateFrom: dateRange[0]?.format("YYYY-MM-DD"),
      dateTo: dateRange[1]?.format("YYYY-MM-DD"),
    });
  };

  const handleReset = () => {
    setQueryInput("");
    setDateRange([null, null]);
    setAppliedFilters({});
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) {
      return;
    }

    try {
      setSending(true);
      const created = await quickNoteService.createNote({ content });
      setDraft("");

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const filtering = hasActiveFilters(appliedFilters);

  return (
    <div className="w-full h-[calc(100dvh-5rem)] flex flex-col">
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {loading ? (
            <div className="py-16">
              <LoadingSpinner size="large" block />
            </div>
          ) : notes.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              {filtering ? "没有匹配的记录" : "还没有记录，在下方输入第一条吧"}
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gray-50 text-gray-800 border border-gray-200/80 px-4 py-2.5">
                  <div className="text-sm break-words">
                    <QuickNoteMarkdown content={note.content} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5 text-right">
                    {formatMessageTime(note.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <div className="flex items-end gap-2">
            <Input.TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入想记录的内容…（Enter 发送，Shift+Enter 换行）"
              autoSize={{ minRows: 1, maxRows: 6 }}
              disabled={sending}
              className="!rounded-xl"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !draft.trim()}
              className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="发送"
            >
              {sending ? <LoadingSpinner size="small" inline /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
