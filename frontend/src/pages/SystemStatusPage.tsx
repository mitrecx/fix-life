import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Spin, Tag, Typography, message } from "antd";
import { RefreshCw } from "lucide-react";
import { getSystemStatus, SystemStatusForbiddenError } from "@/services/systemService";
import type { SystemStatusResponse } from "@/types/systemStatus";

const { Title, Text } = Typography;

const CHECK_LABELS: Record<string, string> = {
  postgres: "PostgreSQL",
  redis_broker: "Redis（Celery Broker）",
  redis_result_backend: "Redis（Celery Result）",
  celery_worker: "Celery Worker",
  celery_beat: "Celery Beat（定时调度）",
};

function checkTitle(name: string) {
  return CHECK_LABELS[name] ?? name.replace(/_/g, " ");
}

export default function SystemStatusPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSystemStatus();
      setData(res);
    } catch (e) {
      if (e instanceof SystemStatusForbiddenError) {
        message.error("无权查看系统状态");
        navigate("/daily-plans", { replace: true });
        return;
      }
      const msg = e instanceof Error ? e.message : "加载失败";
      message.error(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Title level={3} className="!mb-1">
            系统状态
          </Title>
          <Text type="secondary">
            应用依赖健康检查（数据库、Redis、Celery Worker / Beat），仅管理员可见。
          </Text>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={() => load()} loading={loading}>
          刷新
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : data ? (
        <>
          {data.all_ok ? (
            <Alert type="success" showIcon message="所有检查项正常" className="mb-4" />
          ) : (
            <Alert type="warning" showIcon message="部分检查项异常，请查看下方详情" className="mb-4" />
          )}
          <Text type="secondary" className="block mb-3">
            检测时间：{new Date(data.checked_at).toLocaleString()}
          </Text>
          <div className="space-y-3">
            {data.checks.map((c) => (
              <Card key={c.name} size="small" className="shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium">{checkTitle(c.name)}</span>
                  <Tag color={c.ok ? "success" : "error"}>{c.ok ? "正常" : "异常"}</Tag>
                </div>
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
              </Card>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
