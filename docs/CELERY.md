# Celery 定时任务使用指南

## 概述

本项目使用 Celery 实现每周一早上 5:00（北京时间）自动生成用户的周总结报告。

## 服务说明

### Celery Worker

负责执行异步任务：

- 为每个用户生成周总结
- 发送邮件通知
- 数据聚合和统计

### Celery Beat

定时任务调度器：

- 每周一早上 5:00 触发周总结生成任务
- 使用 crontab 调度：`crontab(hour=5, minute=0, day_of_week=1)`

## 使用方法

### 本地开发环境

#### 1. 启动 Redis

```bash
# macOS
brew services start redis

# Linux
sudo systemctl start redis
redis-server

# 验证
redis-cli ping  # 应返回 PONG
```

#### 2. 启动 Celery 服务

```bash
cd backend

# 启动 Worker 和 Beat
./celery.sh start

# 查看服务状态
./celery.sh status

# 或者手动启动（开发调试）
# 终端 1: 启动 Worker
uv run celery -A app.core.celery worker --loglevel=info

# 终端 2: 启动 Beat
uv run celery -A app.core.celery beat --loglevel=info
```

#### 3. 停止服务

```bash
cd backend
./celery.sh stop
```

#### 4. 查看日志

```bash
cd backend
./celery.sh logs

# 或直接查看日志文件
tail -f logs/celery_worker.log
tail -f logs/celery_beat.log
```

#### 5. 重启服务

```bash
cd backend
./celery.sh restart
```

### 生产环境部署

#### 1. 在服务器上启动 Redis

```bash
ssh josie@jo.mitrecx.top

# 确保 Redis 运行
sudo systemctl start redis
sudo systemctl enable redis

# 验证
redis-cli ping
```

#### 2. 部署并启动 Celery（systemd）

生产环境使用 **`fix-life-celery-worker.service`** 与 **`fix-life-celery-beat.service`**。单元文件在仓库 **`deploy/`** 目录，**`deploy.sh deploy`** 或 **`deploy.sh backend`** 会：

1. 将 `deploy/fix-life-celery-*.service` 同步到服务器并安装到 `/etc/systemd/system/`
2. **`daemon-reload`**、`enable`、**`restart`**
3. **首次**从 `./celery.sh` 迁到 systemd 前，若单元尚未加载，会先执行 **`./celery.sh stop`**，避免重复进程

```bash
# 本地：全量或仅后端部署（均会同步并重启 Celery systemd 服务）
bash deploy.sh deploy
# 或
bash deploy.sh backend
```

日志：`journalctl -u fix-life-celery-worker -f`、`journalctl -u fix-life-celery-beat -f`

#### 3. 手动安装 / 调整单元（可选）

若需在不跑完整部署的情况下更新单元文件，可将仓库中的文件拷到服务器后：

```bash
sudo cp fix-life-celery-worker.service fix-life-celery-beat.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable fix-life-celery-worker fix-life-celery-beat
sudo systemctl restart fix-life-celery-worker fix-life-celery-beat
sudo systemctl status fix-life-celery-worker fix-life-celery-beat
```

单元正文以仓库 **`deploy/fix-life-celery-worker.service`**、**`deploy/fix-life-celery-beat.service`** 为准。

## 任务说明

### 已实现的定时任务

1. **generate-all-weekly-summaries**
  - **触发时间**: 每周一早上 5:00（北京时间）
  - **功能**: 扫描所有活跃用户，为每个用户派发周总结生成任务
2. **generate-user-weekly-summary**
  - **类型**: 子任务
  - **功能**: 为单个用户生成周总结，并发送邮件通知
3. **regenerate-weekly-summary**
  - **类型**: 手动触发任务
  - **功能**: 重新生成指定的周总结（补救机制）

### 手动触发任务

#### 通过 API 手动生成周总结

```bash
# 获取 token
TOKEN=$(curl -s -X POST "https://fixlife.mitrecx.top/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"login_identifier":"your_username","password":"your_password"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

# 生成上周总结
curl -X POST "https://fixlife.mitrecx.top/api/v1/weekly-summaries/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'
```

#### 通过 Celery 手动触发

```python
from app.tasks.weekly_summary_tasks import generate_all_weekly_summaries

# 立即执行周总结生成任务
result = generate_all_weekly_summaries.delay()
print(f"Task ID: {result.id}")
```

## 监控和调试

### 查看任务状态

```bash
# 使用 Flower（需要安装）
pip install flower
celery -A app.core.celery flower

# 访问 http://localhost:5555
```

### 查看日志

```bash
# Worker 日志
tail -f backend/logs/celery_worker.log

# Beat 日志
tail -f backend/logs/celery_beat.log

# 或使用管理脚本
./celery.sh logs
```

### 测试定时任务

临时修改 Beat schedule 为每分钟测试：

```python
# app/core/celery.py
celery_app.conf.beat_schedule = {
    "test-weekly-summaries": {
        "task": "app.tasks.weekly_summary_tasks.generate_all_weekly_summaries",
        "schedule": crontab(),  # 每分钟
    },
}
```

测试完成后恢复为正常调度：

```python
celery_app.conf.beat_schedule = {
    "generate-weekly-summaries": {
        "task": "app.tasks.weekly_summary_tasks.generate_all_weekly_summaries",
        "schedule": crontab(hour=5, minute=0, day_of_week=1),
    },
}
```

## 故障排查

### 常见问题

#### 1. Worker 无法启动

```bash
# 检查 Redis 是否运行
redis-cli ping

# 检查端口占用
lsof -i :6379

# 查看 Worker 日志
tail -50 logs/celery_worker.log
```

#### 2. Beat 无法启动

```bash
# 检查是否有其他 Beat 进程
ps aux | grep celery

# 查看 Beat 日志
tail -50 logs/celery_beat.log
```

#### 3. 任务不执行

```bash
# 检查 Beat 日志，确认调度器正常运行
grep "Scheduler" logs/celery_beat.log

# 检查 Worker 日志，确认接收到任务
grep "generate-weekly-summaries" logs/celery_worker.log

# 检查数据库连接
```

#### 4. 邮件发送失败

```bash
# 检查邮件配置
grep SMTP backend/app/core/config.py

# 查看错误日志
grep "email" logs/celery_worker.log
```

## 环境变量

确保在 `.env` 文件中配置：

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_RESULT_DB=1

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Email Configuration (for notifications)
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_USER=your_email@163.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=your_email@163.com
SMTP_USE_SSL=True
```

## 生产环境注意事项

1. **使用 systemd 管理服务**：确保服务崩溃时自动重启
2. **日志轮转**：配置 logrotate 防止日志文件过大
3. **监控**：使用 Flower 或其他工具监控任务执行
4. **备份**：定期备份数据库和重要配置文件
5. **时区**：确保服务器时区设置正确（Asia/Shanghai）

