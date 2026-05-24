import { useCallback, useEffect, useState } from "react";
import { Button, Card, Empty, Popconfirm, Tag, Typography, message } from "antd";
import { RefreshCw, ShieldBan } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { listIpBans, unbanIp, IpBanForbiddenError } from "@/services/ipBanService";
import type { BannedIpItem } from "@/types/ipBan";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const SCOPE_LABELS: Record<string, string> = {
  auth_login: "登录",
};

function formatDuration(seconds: number) {
  if (seconds >= 3600) {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} 小时`;
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} 分钟`;
}

export default function IpBanManagementPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BannedIpItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [unbanningKey, setUnbanningKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await listIpBans();
      setItems(res.items);
    } catch (e) {
      if (e instanceof IpBanForbiddenError) {
        message.error("无权查看 IP 封禁");
        navigate("/settings/display", { replace: true });
        return;
      }
      message.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
      setFetching(false);
    }
  }, [navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnban = async (item: BannedIpItem) => {
    const key = `${item.scope}:${item.ip}`;
    setUnbanningKey(key);
    try {
      await unbanIp(item.ip, item.scope);
      message.success(`已解除 ${item.ip} 的封禁`);
      await load();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "解除封禁失败");
    } finally {
      setUnbanningKey(null);
    }
  };

  if (loading) {
    return <LoadingSpinner size="large" block className="py-16" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-gray-700">
          <ShieldBan size={18} />
          <span className="font-medium">被封禁的 IP</span>
          <Text type="secondary" className="text-sm">
            登录超过频率限制后自动封禁，可在此手动解除
          </Text>
        </div>
        <Button icon={<RefreshCw size={16} />} onClick={() => load()} loading={fetching}>
          刷新
        </Button>
      </div>

      {items.length === 0 ? (
        <Card className="shadow-sm">
          <Empty description="当前没有被封禁的 IP" />
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const rowKey = `${item.scope}:${item.ip}`;
            return (
              <Card key={rowKey} size="small" className="shadow-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-medium text-gray-900">{item.ip}</span>
                      <Tag color="red">封禁中</Tag>
                      <Tag>{SCOPE_LABELS[item.scope] ?? item.scope}</Tag>
                    </div>
                    <Text type="secondary" className="text-sm">
                      剩余 {formatDuration(item.ttl_seconds)} · 本窗口已尝试 {item.request_count} 次
                    </Text>
                  </div>
                  <Popconfirm
                    title="解除封禁"
                    description={`确定解除 ${item.ip} 的封禁吗？`}
                    okText="解除"
                    cancelText="取消"
                    onConfirm={() => handleUnban(item)}
                  >
                    <Button
                      size="small"
                      loading={unbanningKey === rowKey}
                      disabled={unbanningKey !== null && unbanningKey !== rowKey}
                    >
                      解除封禁
                    </Button>
                  </Popconfirm>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
