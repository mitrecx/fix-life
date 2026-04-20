import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Spin, Tag, Typography, message } from "antd";
import { RefreshCw } from "lucide-react";
import { getSystemStatus, SystemStatusForbiddenError } from "@/services/systemService";
import type { StatusCheckItem } from "@/types/systemStatus";

const { Title, Text } = Typography;

const CHECK_LABELS: Record<string, string> = {
  postgres: "PostgreSQL",
  redis_broker: "Redis（Celery Broker）",
  redis_result_backend: "Redis（Celery Result）",
  celery_worker: "Celery Worker",
  celery_beat: "Celery Beat（定时调度）",
};

/** Shown immediately before the first API response; order matches typical single-Redis setup. */
const DEFAULT_CHECK_NAMES = [
  "postgres",
  "redis_broker",
  "celery_worker",
  "celery_beat",
] as const;

function checkTitle(name: string) {
  return CHECK_LABELS[name] ?? name.replace(/_/g, " ");
}

type RowState = {
  name: string;
  loading: boolean;
  ok?: boolean;
  latency_ms?: number;
  error?: string;
};

function initialRows(): RowState[] {
  return DEFAULT_CHECK_NAMES.map((name) => ({ name, loading: true }));
}

function rowsFromChecks(checks: StatusCheckItem[]): RowState[] {
  return checks.map((c) => ({
    name: c.name,
    loading: false,
    ok: c.ok,
    latency_ms: c.latency_ms,
    error: c.error,
  }));
}

/** First visit: no result yet; refresh: keep last ok / metrics while loading. */
function rowHasResult(r: RowState): boolean {
  return r.ok !== undefined || r.latency_ms != null || Boolean(r.error);
}

export default function SystemStatusPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RowState[]>(initialRows);
  const [fetching, setFetching] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    setRows((prev) =>
      prev.length > 0 ? prev.map((r) => ({ ...r, loading: true })) : initialRows()
    );
    try {
      const res = await getSystemStatus();
      setRows(rowsFromChecks(res.checks));
    } catch (e) {
      if (e instanceof SystemStatusForbiddenError) {
        message.error("无权查看系统状态");
        navigate("/daily-plans", { replace: true });
        return;
      }
      const msg = e instanceof Error ? e.message : "加载失败";
      message.error(msg);
      setRows((prev) =>
        prev.map((r) => ({
          ...r,
          loading: false,
          ok: r.ok,
        }))
      );
    } finally {
      setFetching(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Title level={3} className="!mb-0">
          系统状态
        </Title>
        <Button icon={<RefreshCw size={16} />} onClick={() => load()} loading={fetching}>
          刷新
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((c) => {
          const showStaleOverlay = c.loading && rowHasResult(c);
          const showInitialSpinner = c.loading && !rowHasResult(c);

          return (
            <Card key={c.name} size="small" className="shadow-sm relative overflow-hidden">
              {showStaleOverlay ? (
                <div
                  className="absolute inset-0 bg-white/55 z-10 flex items-center justify-center pointer-events-none"
                  aria-busy
                >
                  <Spin size="small" />
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium">{checkTitle(c.name)}</span>
                {showInitialSpinner ? (
                  <Tag color="processing">检查中</Tag>
                ) : c.ok === true ? (
                  <Tag color="success">正常</Tag>
                ) : c.ok === false ? (
                  <Tag color="error">异常</Tag>
                ) : (
                  <Tag color="default">未获取</Tag>
                )}
              </div>
              {showInitialSpinner ? (
                <div className="flex justify-center py-6">
                  <Spin size="small" />
                </div>
              ) : (
                <div className="min-h-[44px]">
                  {c.latency_ms != null && (
                    <Text type="secondary" className="text-sm block mt-2">
                      耗时 {c.latency_ms.toFixed(2)} ms
                    </Text>
                  )}
                  {c.error && (
                    <Text type="danger" className="text-sm block mt-2">
                      {c.error}
                    </Text>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
