# 飞书群发消息调研文档

## 概述

本文档调研了在应用中给飞书群发送消息的主要方法，包括两种主流方案及其实现细节。

---

## 方案一：群机器人 Webhook（推荐用于简单场景）

### 适用场景
- 简单的消息推送需求
- 不需要复杂交互
- 快速集成，无需创建企业应用

### 实现步骤

#### 1. 在飞书群中添加自定义机器人
1. 打开目标飞书群聊
2. 点击群设置 → 群机器人 → 添加机器人
3. 选择"自定义机器人"
4. 设置机器人名称和头像
5. **重要**：复制生成的 Webhook URL，格式如：
   ```
   https://open.feishu.cn/open-apis/bot/hook/xxxxxxxxxxxxxxxx
   ```

#### 2. 发送消息
- 使用 HTTP POST 请求发送消息
- Content-Type: `application/json`
- 请求体格式：

```json
{
  "msg_type": "text",
  "content": {
    "text": "要发送的文本消息"
  }
}
```

#### 3. 支持的消息类型

| 消息类型 | msg_type | 说明 |
|---------|----------|------|
| 文本 | `text` | 纯文本消息 |
| 富文本 | `post` | 支持富文本格式 |
| 卡片 | `interactive` | 交互式卡片消息 |
| 图片 | `image` | 图片消息（需提供 image_key） |

#### 4. 富文本消息示例

```json
{
  "msg_type": "post",
  "content": {
    "post": {
      "zh_cn": {
        "title": "标题",
        "content": [
          [{
            "tag": "text",
            "text": "文本内容"
          }],
          [{
            "tag": "a",
            "text": "链接文字",
            "href": "https://example.com"
          }]
        ]
      }
    }
  }
}
```

### 优点
- ✅ 配置简单，无需创建应用
- ✅ 无需企业管理员审批
- ✅ 快速集成，代码量少
- ✅ 适合单向消息推送

### 缺点
- ❌ 无法主动获取群列表
- ❌ 无法接收用户回复
- ❌ 消息类型有限（不支持文件）
- ❌ Webhook URL 泄露风险
- ❌ 无法区分不同消息源

### 安全建议
- 在 Webhook URL 后添加签名验证参数
- 飞书支持设置 IP 白名单
- 不要在代码中硬编码 Webhook URL

---

## 方案二：飞书开放平台 API（推荐用于复杂场景）

### 适用场景
- 需要发送文件、图片等复杂消息
- 需要管理多个群组
- 需要双向交互（接收消息）
- 企业级应用集成

### 实现步骤

#### 1. 创建企业自建应用

1. 访问 [飞书开放平台](https://open-sg.feishu.cn/?lang=zh-CN)
2. 登录并进入"开发者后台"
3. 点击"创建应用" → 选择"企业自建应用"
4. 填写应用信息：
   - 应用名称
   - 应用图标
   - 应用描述

#### 2. 获取应用凭证

在应用概览页面获取：
- **App ID**：应用唯一标识（格式如 `cli_xxx`）
- **App Secret**：应用密钥

#### 3. 配置权限

在"开发配置" → "权限管理"中申请以下权限：

| 权限名称 | 权限ID | 说明 |
|---------|--------|------|
| 发送消息 | `im:message` | 基础消息发送权限 |
| 机器人发消息 | `im:message:send_as_bot` | 以机器人身份发送 |
| 获取群组信息 | `im:chat` | 获取和操作群组 |
| 发送文件消息 | `im:file` | 发送文件类型消息 |

⚠️ **注意**：部分敏感权限需要企业管理员审批

#### 4. 添加机器人能力

1. 在应用中启用"机器人"功能
2. 将机器人添加到目标群组
3. 记录群组 ID（open_chat_id）

#### 5. API 调用流程

```
1. 使用 App ID 和 App Secret 获取 tenant_access_token
   ↓
2. 调用消息发送 API，传入 token 和消息内容
   ↓
3. 飞书服务器返回发送结果
```

#### 6. 获取访问令牌（API: auth/v3/tenant_access_token/internal）

**请求**：
```http
POST https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal
Content-Type: application/json

{
  "app_id": "cli_xxxxxxxxxxxxx",
  "app_secret": "xxxxxxxxxxxxxxxxxxxx"
}
```

**响应**：
```json
{
  "code": 0,
  "tenant_access_token": "t-xxxxxxxxxxxxxxxx",
  "expire": 7200
}
```

#### 7. 发送文本消息（API: im/v1/messages）

**请求**：
```http
POST https://open.feishu.cn/open-apis/im/v1/messages
Authorization: Bearer t-xxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "receive_id_type": "chat_id",
  "receive_id": "oc_xxxxxxxxxxxxxxxx",
  "msg_type": "text",
  "content": "{\"text\":\"要发送的消息\"}"
}
```

**响应**：
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "msg_id": "om_xxxxxxxxxxxxxxxx"
  }
}
```

#### 8. 发送卡片消息示例

```json
{
  "receive_id_type": "chat_id",
  "receive_id": "oc_xxxxxxxxxxxxxxxx",
  "msg_type": "interactive",
  "content": "{\"config\":{\"wide_screen_mode\":true},\"elements\":[{\"tag\":\"div\",\"text\":{\"content\":\"今日任务完成\",\"tag\":\"lark_md\"}},{\"tag\":\"action\",\"actions\":[{\"tag\":\"button\",\"text\":{\"tag\":\"plain_text\",\"content\":\"查看详情\"},\"type\":\"primary\",\"url\":\"https://example.com\"}]}]}"
}
```

### 优点
- ✅ 支持所有消息类型（文本、图片、文件、卡片等）
- ✅ 可以管理多个群组
- ✅ 支持双向交互（接收用户消息）
- ✅ 更丰富的 API 功能
- ✅ 可以获取群组信息、成员列表等
- ✅ 支持消息撤回、更新等操作

### 缺点
- ❌ 需要创建企业应用
- ❌ 需要企业管理员审批权限
- ❌ 实现相对复杂
- ❌ 需要处理 token 过期问题

---

## 技术实现示例

### Python 实现

#### Webhook 方式
```python
import requests
import json

webhook_url = "https://open.feishu.cn/open-apis/bot/hook/xxxxxxxxxxxx"

data = {
    "msg_type": "text",
    "content": {
        "text": "Hello, 飞书!"
    }
}

response = requests.post(webhook_url, json=data)
print(response.json())
```

#### API 方式
```python
import requests
import json

# 1. 获取 access_token
app_id = "cli_xxxxxxxxxxxxx"
app_secret = "xxxxxxxxxxxxxxxxxxxx"

auth_response = requests.post(
    "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
    json={
        "app_id": app_id,
        "app_secret": app_secret
    }
)
token = auth_response.json()["tenant_access_token"]

# 2. 发送消息
message_response = requests.post(
    "https://open.feishu.cn/open-apis/im/v1/messages",
    headers={
        "Authorization": f"Bearer {token}"
    },
    json={
        "receive_id_type": "chat_id",
        "receive_id": "oc_xxxxxxxxxxxxxxxx",
        "msg_type": "text",
        "content": json.dumps({"text": "Hello, API!"})
    }
)
print(message_response.json())
```

### Node.js 实现

#### Webhook 方式
```javascript
const axios = require('axios');

const webhookUrl = 'https://open.feishu.cn/open-apis/bot/hook/xxxxxxxxxxxx';

const data = {
  msg_type: 'text',
  content: {
    text: 'Hello, 飞书!'
  }
};

axios.post(webhookUrl, data)
  .then(response => console.log(response.data))
  .catch(error => console.error(error));
```

#### API 方式
```javascript
const axios = require('axios');

const appId = 'cli_xxxxxxxxxxxxx';
const appSecret = 'xxxxxxxxxxxxxxxxxxxx';

// 1. 获取 access_token
async function getToken() {
  const response = await axios.post(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      app_id: appId,
      app_secret: appSecret
    }
  );
  return response.data.tenant_access_token;
}

// 2. 发送消息
async function sendMessage(token, chatId, text) {
  const response = await axios.post(
    'https://open.feishu.cn/open-apis/im/v1/messages',
    {
      receive_id_type: 'chat_id',
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text })
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.data;
}

// 使用
getToken().then(token => {
  sendMessage(token, 'oc_xxxxxxxxxxxxxxxx', 'Hello, API!')
    .then(result => console.log(result));
});
```

---

## 本项目推荐方案

根据项目特点（FastAPI 后端 + React 前端），推荐使用 **群机器人 Webhook** 方案：

### 推荐理由

1. **快速集成**：无需创建企业应用，无需审批流程
2. **适合场景**：周总结等定期消息推送，无需复杂交互
3. **实现简单**：后端代码量少，易于维护
4. **成本低**：无企业限制，个人即可使用

### 实现建议

1. 在飞书群中添加自定义机器人，获取 Webhook URL
2. 将 Webhook URL 存储在 `SystemSettings` 表中
3. 在后端创建定时任务（使用 Celery），每周发送消息
4. 消息内容使用富文本或卡片格式，展示周总结数据

### 配置示例

**环境变量**：
```env
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/hook/xxxxxxxxxxxx
```

**数据库配置**：
```python
# app/models/system_settings.py
class SystemSettings(Base):
    feishu_webhook_url = Column(String, nullable=True)  # 飞书 Webhook URL
    feishu_enabled = Column(Boolean, default=False)  # 是否启用飞书通知
```

---

## 扩展阅读

### 官方文档
- [飞书开放平台](https://open-sg.feishu.cn/?lang=zh-CN)
- [通过飞书机器人发消息](https://www.feishu.cn/hc/zh-cn/articles/360040553973-)
- [手把手教你通过飞书Webhook打造一个消息推送Bot](https://www.feishu.cn/content/7271149634339422210)

### 技术教程
- [Python实现飞书机器人定时发送文本、图片等群消息](https://m.blog.csdn.net/tyh_keephunger/article/details/129346297)
- [Python对接飞书API发送自定义消息到指定群组](https://m.blog.csdn.net/weixin_40186428/article/details/141372016)
- [Node.js+飞书Api实现应用消息发送服务](https://m.blog.csdn.net/apowers/article/details/143761085)
- [.NET 8+ 飞书API实战：自动化群组管理与消息推送](https://www.cnblogs.com/mudtools/articles/19275871.html)
- [零成本搭建飞书机器人：手把手教你用Webhook实现高效消息推送](https://m.blog.csdn.net/weixin_29198045/article/details/157796146)

---

## 附录：消息卡片 JSON 示例

### 简单卡片
```json
{
  "msg_type": "interactive",
  "content": {
    "config": {
      "wide_screen_mode": true
    },
    "elements": [
      {
        "tag": "div",
        "text": {
          "content": "**周总结已生成**\n本周完成了 5 个任务",
          "tag": "lark_md"
        }
      },
      {
        "tag": "action",
        "actions": [
          {
            "tag": "button",
            "text": {
              "tag": "plain_text",
              "content": "查看详情"
            },
            "type": "primary",
            "url": "https://your-app.com/summary"
          }
        ]
      }
    ]
  }
}
```

### 数据统计卡片
```json
{
  "msg_type": "interactive",
  "content": {
    "config": {
      "wide_screen_mode": true
    },
    "header": {
      "title": {
        "content": "📊 本周数据统计",
        "tag": "plain_text"
      },
      "template": "blue"
    },
    "elements": [
      {
        "tag": "div",
        "fields": [
          {
            "is_short": true,
            "text": {
              "content": "**完成任务**\n12",
              "tag": "lark_md"
            }
          },
          {
            "is_short": true,
            "text": {
              "content": "**完成率**\n85%",
              "tag": "lark_md"
            }
          }
        ]
      },
      {
        "tag": "hr"
      },
      {
        "tag": "div",
        "text": {
          "content": "点击查看完整周总结",
          "tag": "lark_md"
        }
      }
    ]
  }
}
```

---

## 总结

| 特性 | Webhook 机器人 | 开放平台 API |
|-----|---------------|-------------|
| **集成难度** | ⭐ 简单 | ⭐⭐⭐ 复杂 |
| **功能丰富度** | ⭐⭐ 基础 | ⭐⭐⭐⭐⭐ 完整 |
| **企业限制** | 无限制 | 需要企业 |
| **消息类型** | 文本/富文本/卡片 | 全部类型 |
| **双向交互** | ❌ 不支持 | ✅ 支持 |
| **适用场景** | 简单推送 | 复杂应用 |

**对于本项目**，推荐使用 **Webhook 机器人** 方案，简单高效，满足需求。
