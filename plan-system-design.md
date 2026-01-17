# 生活计划管理系统设计方案

## 一、项目概述

一个个人计划管理应用，帮助用户制定、追踪和展示年度、月度、每日计划，通过可视化的方式激励用户坚持完成目标。

---

## 二、核心功能模块

### 2.1 计划层级体系

```
年度目标 (12个月)
    ↓
月度计划 (4周/30天)
    ↓
每日任务 (当天待办)
```

**层级关系：**
- 年度目标：大方向、长期愿景
- 月度计划：将年度目标拆解为可执行的月度里程碑
- 每日任务：具体的行动项，完成后推动月度计划进展

---

### 2.2 数据结构设计

#### 年度目标 (YearlyGoal)
```javascript
{
  id: string,
  year: number,
  title: string,              // 目标标题
  description: string,        // 详细描述
  category: string,           // 分类：健康/事业/学习/财务/人际关系/娱乐
  color: string,              // 展示颜色
  targetValue: number,        // 目标数值（如：读50本书）
  currentValue: number,       // 当前进度
  unit: string,               // 单位：本/次/元/小时
  status: 'pending' | 'in-progress' | 'completed' | 'paused',
  startDate: Date,
  endDate: Date,
  monthlyMilestones: [        // 月度里程碑
    {
      month: number,
      targetValue: number,
      achievedValue: number,
      note: string
    }
  ],
  habits: [string]            // 关联的习惯ID
}
```

#### 月度计划 (MonthlyPlan)
```javascript
{
  id: string,
  year: number,
  month: number,
  title: string,
  yearlyGoalId: string,       // 关联的年度目标
  focusArea: [string],        // 本月重点领域
  tasks: [                    // 月度任务列表
    {
      id: string,
      title: string,
      priority: 'high' | 'medium' | 'low',
      status: 'todo' | 'in-progress' | 'done' | 'cancelled',
      dueDate: Date,
      estimatedHours: number
    }
  ],
  review: {                   // 月末复盘
    achievements: [string],
    challenges: [string],
    lessons: [string],
    nextMonthAdjustment: string
  },
  metrics: {                  // 月度指标
    completionRate: number,
    totalFocusHours: number,
    streakDays: number
  }
}
```

#### 每日计划 (DailyPlan)
```javascript
{
  id: string,
  date: Date,
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible',
  energyLevel: number,        // 1-10
  tasks: [
    {
      id: string,
      title: string,
      monthlyPlanId: string,   // 关联月度任务
      timeBlock: {             // 时间块
        start: string,         // "09:00"
        end: string,           // "10:00"
      },
      category: string,
      priority: 'high' | 'medium' | 'low',
      status: 'todo' | 'in-progress' | 'done' | 'skipped',
      estimatedMinutes: number,
      actualMinutes: number,
      difficulty: number       // 完成难度 1-5
    }
  ],
  habits: [                   // 每日习惯打卡
    {
      habitId: string,
      completed: boolean,
      note: string
    }
  ],
  reflection: {               // 每日反思
    highlight: string,        // 今日亮点
    gratitude: [string],      // 感恩事项
    improvement: string       // 改进点
  },
  summary: {
    totalTasks: number,
    completedTasks: number,
    completionRate: number,
    focusHours: number
  }
}
```

#### 习惯追踪 (Habit)
```javascript
{
  id: string,
  name: string,
  description: string,
  icon: string,
  color: string,
  frequency: 'daily' | 'weekly' | 'custom',
  targetCount: number,
  reminderTime: string,
  streak: number,             // 连续打卡天数
  bestStreak: number,         // 最佳连续天数
  totalDays: number,          // 累计打卡天数
  history: [                  // 打卡历史
    {
      date: Date,
      completed: boolean,
      note: string
    }
  ]
}
```

---

## 三、可视化展示方案

### 3.1 年度目标看板

#### 🎯 目标进度环形图
```
           ┌─────────────┐
           │  2024年度   │
           │   目标概览   │
           └─────────────┘

    ┌─────┬─────┬─────┬─────┬─────┐
    │ 阅读│ 运动 │ 学习 │ 储蓄 │ 旅行 │
    │  75%│  60%│  45%│  80%│  30%│
    └─────┴─────┴─────┴─────┴─────┘

    每个类别用不同颜色的环形进度条展示
```

#### 📊 年度目标甘特图
```
月份:  1月  2月  3月  4月  5月  6月  7月  8月  9月 10月 11月 12月
阅读: ██████████░░░░░░░░░░░░░░░░░░░░░  30/50本
运动: ████████████████████░░░░░░░░░░░  150/200天
学习: ████████████████████████████░░░  80/100小时
```

#### 🏆 目标完成里程碑
```
📖 阅读 50本书
   ├── 1月: 4本 ✅
   ├── 2月: 3本 ✅
   ├── 3月: 5本 ✅
   ├── 4月: 4本 ✅
   └── 5月: 3本 🔄 (进行中)
```

### 3.2 月度计划仪表盘

#### 📅 月度日历热力图
```
      五月 2024
  日 一 二 三 四 五 六
          1  2  3  4
  5  6  7  8  9 10 11
 12 13 14 15 16 17 18
 19 20 21 22 23 24 25
 26 27 28 29 30 31

  图例:
  🟢 完成率 >80%
  🟡 完成率 50-80%
  🔴 完成率 <50%
  ⚪ 无计划
```

#### 📈 月度趋势图
```
完成率趋势
100% │     ╱──╲
 80% │    ╱    ╲    ╱──
 60% │   ╱      ╲  ╱
 40% │  ╱        ╲╱
 20% │ ╱
  0% │─┴─────────────
     1 2 3 4 5 6 7 8 9 10 11 12 13 14
```

#### 🎯 本月重点
```
┌─────────────────────────────────┐
│ 🔥 优先级 High                  │
│ • 完成前端架构设计              │
│ • 减重 5kg                      │
│ • 读完《原则》                  │
├─────────────────────────────────┤
│ ⚡ 优先级 Medium                │
│ • 每周运动 4次                  │
│ • 学习 TypeScript 进阶          │
├─────────────────────────────────┤
│ ☕ 优先级 Low                    │
│ • 整理书架                      │
│ • 更新简历                      │
└─────────────────────────────────┘
```

### 3.3 每日任务看板

#### ⏰ 时间轴视图
```
🌅 早晨 (6:00-9:)
  07:00 🧘 冥想 15分钟 ✅
  07:30 📖 阅读 30分钟 ✅
  08:00 🏃 晨跑 5公里 ✅

☀️ 上午 (9:00-12:00)
  09:00 💼 深度工作: 项目开发 🔄
  10:30 ☕ 休息
  11:00 💼 深度工作: 项目开发
  ...

🌙 晚上 (18:00-22:00)
  ...
```

#### 📋 今日任务看板 (Kanban)
```
┌─────────┬─────────────┬─────────┐
│ 待办    │ 进行中      │ 已完成  │
├─────────┼─────────────┼─────────┤
│ │代码review │ │写文档   │ │晨跑   │
│ │周报      │ │项目开发 │ │阅读   │
│ │          │ │         │ │冥想   │
└─────────┴─────────────┴─────────┘
```

#### 📊 今日统计卡片
```
┌──────────────────────────────┐
│      📅 2024年5月15日         │
│      星期三 晴天              │
├──────────────────────────────┤
│ ✅ 已完成: 8 / 12 任务        │
│ ⏱️ 专注时长: 5h 23min         │
│ 🔥 连续打卡: 23 天            │
│ 😊 今日心情: 😊 Good          │
└──────────────────────────────┘
```

### 3.4 习惯追踪可视化

#### 🔄 习惯打卡热力图 (GitHub风格)
```
习惯: 晨跑
5月: ▓▓▓▓▓░░▓▓▓▓░▓▓▓░░▓▓▓▓▓▓░░▓
     连续: 12天  最佳: 45天
```

#### ⭕ 习惯完成环形图
```
    ┌───────────────┐
    │   本周习惯    │
    │   完成率      │
    │               │
    │    85%        │
    │  ╱──────╲    │
    └───────────────┘

  🏃 晨跑    ████████░  80%
  📖 阅读    ██████████ 100%
  🧘 冥想    ██████░░░░  60%
  💧 喝水    ████████░  75%
```

---

## 四、界面布局设计

### 4.1 主导航结构
```
┌─────────────────────────────────────────────┐
│  🏠 首页  |  📅 计划  |  📊 统计  |  ⚙️ 设置  │
├─────────────────────────────────────────────┤
│                                             │
│              主内容区域                      │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

### 4.2 首页仪表盘
```
┌─────────────────────────────────────────────┐
│  👋 你好，开始新的一天！                     │
├─────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │ 今日进度  │ │ 本周概览  │ │ 年度目标  │ │
│  │    75%    │ │   5/7天   │ │   3/12月  │ │
│  └───────────┘ └───────────┘ └───────────┘ │
├─────────────────────────────────────────────┤
│  📋 今日任务 (3/12)                         │
│  ┌───────────────────────────────────────┐  │
│  │ ☑️ 07:00 晨跑 5公里                    │  │
│  │ ☑️ 08:00 阅读《原则》                  │  │
│  │ ☐ 09:00 深度工作: 项目开发             │  │
│  │ ☐ 14:00 团队会议                       │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│  🎯 习惯打卡                                │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐              │
│  │ 🏃 │ │ 📖 │ │ 🧘 │ │ 💧 │              │
│  │✅ 23│ │✅ 45│ │⬜ 12│ │✅ 8│              │
│  └────┘ └────┘ └────┘ └────┘              │
└─────────────────────────────────────────────┘
```

### 4.3 计划页面
```
┌─────────────────────────────────────────────┐
│  [📅 年度] [📆 月度] [📋 每日]               │
├─────────────────────────────────────────────┤
│                                             │
│  年度目标 2024                              │
│  ┌─────────────────────────────────────┐   │
│  │ 📖 学习成长                         │   │
│  │ ████████████████░░░░  30/50本       │   │
│  │                                     │   │
│  │ 🏃 健康运动                         │   │
│  │ ████████████████████░░  150/200天   │   │
│  │                                     │   │
│  │ 💰 财务储蓄                         │   │
│  │ ████████████████████████  80/100k   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [+ 添加新目标]                              │
└─────────────────────────────────────────────┘
```

---

## 五、核心功能详情

### 5.1 目标管理功能

**创建目标**
- 选择目标类别（健康/事业/学习/财务/人际关系/娱乐）
- 设定目标值和单位
- 选择截止日期
- 设置里程碑（自动按月分解或手动设置）
- 关联相关习惯

**目标分解**
- 自动将年度目标分解为12个月度里程碑
- 支持手动调整每月目标
- 智能建议每日行动量

**进度追踪**
- 手动更新进度值
- 关联每日任务自动计算
- 可视化进度展示

### 5.2 计划制定功能

**月度计划**
- 从年度目标生成月度任务
- 手动添加自定义月度任务
- 设置任务优先级和预计工时
- 分配任务到具体日期

**每日计划**
- 从月度任务拆分每日行动
- 时间块管理（番茄钟集成）
- 任务依赖关系设置
- 能量水平匹配（高能量→高难度任务）

### 5.3 打卡与记录

**习惯打卡**
- 一键打卡
- 添加备注/照片
- 连续打卡天数统计
- 打卡日历热力图

**每日总结**
- 快速记录今日亮点
- 感恩日记
- 明日待办预览

### 5.4 复盘功能

**每日复盘**
- 任务完成情况
- 时间分配分析
- 心情/能量记录

**每周复盘**
- 本周成就
- 遇到的挑战
- 下周重点

**每月复盘**
- 目标达成情况
- 月度数据统计
- 下月计划调整

**年度复盘**
- 年度目标完成度
- 各领域数据汇总
- 年度高光时刻
- 明年规划

---

## 六、技术栈

### 6.1 前端技术栈

```
框架: React 18
构建工具: Vite
UI库: Ant Design / Material-UI
状态管理: Zustand / Redux Toolkit
数据可视化: Recharts / ECharts / D3.js
日期处理: dayjs / date-fns
HTTP客户端: axios
路由: React Router
表单: React Hook Form
类型检查: TypeScript
```

### 6.2 后端技术栈

```
框架: FastAPI (Python 3.11+)
数据库: PostgreSQL 15+
数据库连接: postgresql://josie:bills_password_2024@localhost:5432/fix_life_db
ORM: SQLAlchemy 2.0
数据验证: Pydantic V2
认证: JWT (python-jose)
跨域: fastapi-cors-utils
测试: pytest + httpx
文档: FastAPI自动生成 OpenAPI (Swagger/ReDoc)
```

### 6.3 项目结构

```
fix-life/
├── frontend/                 # React 前端
│   ├── src/
│   │   ├── components/      # 通用组件
│   │   ├── pages/          # 页面组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── services/       # API 调用
│   │   ├── store/          # 状态管理
│   │   ├── utils/          # 工具函数
│   │   ├── types/          # TypeScript 类型
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                  # FastAPI 后端
│   ├── app/
│   │   ├── api/            # API 路由
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── yearly_goals.py
│   │   │   │   │   ├── monthly_plans.py
│   │   │   │   │   ├── daily_plans.py
│   │   │   │   │   ├── habits.py
│   │   │   │   │   └── analytics.py
│   │   │   │   └── api.py
│   │   ├── core/           # 核心配置
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── deps.py
│   │   ├── models/         # SQLAlchemy 模型
│   │   │   ├── yearly_goal.py
│   │   │   ├── monthly_plan.py
│   │   │   ├── daily_plan.py
│   │   │   ├── habit.py
│   │   │   └── user.py
│   │   ├── schemas/        # Pydantic schemas
│   │   │   ├── yearly_goal.py
│   │   │   ├── monthly_plan.py
│   │   │   ├── daily_plan.py
│   │   │   ├── habit.py
│   │   │   └── user.py
│   │   ├── services/       # 业务逻辑
│   │   │   ├── yearly_goal_service.py
│   │   │   ├── monthly_plan_service.py
│   │   │   ├── daily_plan_service.py
│   │   │   └── habit_service.py
│   │   ├── db/             # 数据库相关
│   │   │   ├── base.py
│   │   │   ├── session.py
│   │   │   └── init_db.py
│   │   ├── main.py
│   │   └── __init__.py
│   ├── tests/
│   ├── alembic/            # 数据库迁移
│   ├── requirements.txt
│   └── pyproject.toml
│
└── README.md
```

### 6.4 数据可视化库

| 用途 | 推荐库 |
|------|--------|
| 进度环/饼图 | Recharts, ECharts |
| 日历热力图 | @uiw/react-heat-map, react-calendar-heatmap |
| 甘特图 | @worktile/gantt, react-gantt-chart |
| 时间轴 | vis-timeline, react-calendar-timeline |
| 趋势图 | Recharts, ECharts |
| 看板 | @dnd-kit/core, react-beautiful-dnd |

### 6.5 数据库配置

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # 数据库配置
    DATABASE_URL: str = "postgresql://josie:bills_password_2024@localhost:5432/fix_life_db"

    # JWT配置
    SECRET_KEY: str = "your-secret-key-here"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7天

    # CORS配置
    CORS_ORIGINS: list = ["http://localhost:5173"]

    class Config:
        env_file = ".env"

settings = Settings()
```

### 6.6 数据库Schema设计 (PostgreSQL)

#### users 表
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### yearly_goals 表
```sql
CREATE TABLE yearly_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    color VARCHAR(7),  -- 十六进制颜色值
    target_value DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year, title)
);

CREATE INDEX idx_yearly_goals_user_year ON yearly_goals(user_id, year);
CREATE INDEX idx_yearly_goals_category ON yearly_goals(category);
```

#### monthly_milestones 表
```sql
CREATE TABLE monthly_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    yearly_goal_id UUID NOT NULL REFERENCES yearly_goals(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    target_value DECIMAL(10,2) NOT NULL,
    achieved_value DECIMAL(10,2) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(yearly_goal_id, month)
);
```

#### monthly_plans 表
```sql
CREATE TABLE monthly_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    yearly_goal_id UUID REFERENCES yearly_goals(id) ON DELETE SET NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    title VARCHAR(200),
    focus_areas TEXT[],  -- PostgreSQL数组类型
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, year, month)
);
```

#### monthly_tasks 表
```sql
CREATE TABLE monthly_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_plan_id UUID NOT NULL REFERENCES monthly_plans(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'todo',
    due_date DATE,
    estimated_hours DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### daily_plans 表
```sql
CREATE TABLE daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    mood VARCHAR(20),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    focus_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_plans_user_date ON daily_plans(user_id, date);
```

#### daily_tasks 表
```sql
CREATE TABLE daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
    monthly_task_id UUID REFERENCES monthly_tasks(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    time_start TIME,
    time_end TIME,
    category VARCHAR(50),
    priority VARCHAR(10) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'todo',
    estimated_minutes INTEGER,
    actual_minutes INTEGER,
    difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### habits 表
```sql
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    frequency VARCHAR(20) DEFAULT 'daily',
    target_count INTEGER DEFAULT 1,
    reminder_time TIME,
    streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    total_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_habits_user ON habits(user_id);
```

#### habit_logs 表
```sql
CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(habit_id, date)
);

CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, date);
```

#### daily_reflections 表
```sql
CREATE TABLE daily_reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
    highlight TEXT,
    gratitude TEXT[],  -- PostgreSQL数组类型
    improvement TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### monthly_reviews 表
```sql
CREATE TABLE monthly_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_plan_id UUID NOT NULL REFERENCES monthly_plans(id) ON DELETE CASCADE,
    achievements TEXT[],
    challenges TEXT[],
    lessons TEXT[],
    next_month_adjustment TEXT,
    completion_rate DECIMAL(5,2),
    total_focus_hours DECIMAL(8,2),
    streak_days INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6.7 SQLAlchemy 模型示例

```python
# backend/app/models/yearly_goal.py
from sqlalchemy import Column, String, Numeric, Integer, Date, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid
import enum

from app.db.base_class import Base

class GoalStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    PAUSED = "paused"

class YearlyGoal(Base):
    __tablename__ = "yearly_goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    category = Column(String(50), nullable=False)
    color = Column(String(7))
    target_value = Column(Numeric(10, 2), nullable=False)
    current_value = Column(Numeric(10, 2), default=0)
    unit = Column(String(20))
    status = Column(Enum(GoalStatus), default=GoalStatus.PENDING)
    start_date = Column(Date)
    end_date = Column(Date)

    # 关系
    monthly_milestones = relationship("MonthlyMilestone", back_populates="yearly_goal", cascade="all, delete-orphan")
    monthly_plans = relationship("MonthlyPlan", back_populates="yearly_goal")

    def __repr__(self):
        return f"<YearlyGoal {self.year}: {self.title}>"
```

### 6.8 API 设计

#### RESTful API 端点

```
# 年度目标
GET    /api/v1/yearly-goals              # 获取所有年度目标
GET    /api/v1/yearly-goals/{id}         # 获取单个目标详情
POST   /api/v1/yearly-goals              # 创建新目标
PUT    /api/v1/yearly-goals/{id}         # 更新目标
PATCH  /api/v1/yearly-goals/{id}/progress # 更新进度
DELETE /api/v1/yearly-goals/{id}         # 删除目标
GET    /api/v1/yearly-goals/{id}/milestones  # 获取里程碑

# 月度计划
GET    /api/v1/monthly-plans             # 获取月度计划列表
GET    /api/v1/monthly-plans/{id}        # 获取月度计划详情
POST   /api/v1/monthly-plans             # 创建月度计划
PUT    /api/v1/monthly-plans/{id}        # 更新月度计划
DELETE /api/v1/monthly-plans/{id}        # 删除月度计划
GET    /api/v1/monthly-plans/{id}/tasks  # 获取月度任务
POST   /api/v1/monthly-plans/{id}/tasks  # 添加月度任务

# 每日计划
GET    /api/v1/daily-plans               # 获取每日计划
GET    /api/v1/daily-plans/{date}        # 获取指定日期的计划
POST   /api/v1/daily-plans               # 创建每日计划
PUT    /api/v1/daily-plans/{id}          # 更新每日计划
GET    /api/v1/daily-plans/{id}/tasks    # 获取每日任务
POST   /api/v1/daily-plans/{id}/tasks    # 添加每日任务
PATCH  /api/v1/daily-tasks/{id}/status   # 更新任务状态
POST   /api/v1/daily-plans/{id}/reflection  # 提交每日反思

# 习惯追踪
GET    /api/v1/habits                    # 获取所有习惯
GET    /api/v1/habits/{id}               # 获取习惯详情
POST   /api/v1/habits                    # 创建新习惯
PUT    /api/v1/habits/{id}               # 更新习惯
DELETE /api/v1/habits/{id}               # 删除习惯
POST   /api/v1/habits/{id}/check-in      # 打卡
GET    /api/v1/habits/{id}/history       # 获取打卡历史

# 数据统计与分析
GET    /api/v1/analytics/dashboard       # 仪表盘数据
GET    /api/v1/analytics/yearly/{year}   # 年度统计
GET    /api/v1/analytics/monthly/{year}/{month}  # 月度统计
GET    /api/v1/analytics/habit-heatmap   # 习惯热力图数据
GET    /api/v1/analytics/completion-rate # 完成率趋势
```

#### API 响应示例

```json
// GET /api/v1/yearly-goals
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "year": 2024,
      "title": "年度阅读50本书",
      "description": "培养阅读习惯，拓展知识面",
      "category": "learning",
      "color": "#3B82F6",
      "target_value": 50,
      "current_value": 18,
      "unit": "本",
      "status": "in-progress",
      "start_date": "2024-01-01",
      "end_date": "2024-12-31",
      "completion_rate": 36,
      "milestones": [
        {
          "month": 1,
          "target_value": 4,
          "achieved_value": 4
        },
        {
          "month": 2,
          "target_value": 4,
          "achieved_value": 3
        }
      ]
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "page_size": 10
  }
}
```

### 6.9 前后端交互流程

```
┌─────────┐                    ┌─────────┐                    ┌────────────┐
│ React   │                    │ FastAPI │                    │ PostgreSQL │
│ 前端    │                    │ 后端    │                    │  数据库    │
└────┬────┘                    └────┬────┘                    └─────┬──────┘
     │                              │                               │
     │  1. 获取年度目标              │                               │
     ├─────────────────────────────>│                               │
     │  GET /api/v1/yearly-goals    │                               │
     │                              │  2. 查询数据库                │
     │                              ├─────────────────────────────>│
     │                              │  3. 返回数据                  │
     │                              │<─────────────────────────────┤
     │  4. 返回JSON响应              │                               │
     │<─────────────────────────────┤                               │
     │                              │                               │
     │  5. 用户创建新目标            │                               │
     ├─────────────────────────────>│                               │
     │  POST /api/v1/yearly-goals   │                               │
     │  {title, target_value, ...}  │                               │
     │                              │  6. 数据验证                  │
     │                              │  7. 插入数据库                │
     │                              ├─────────────────────────────>│
     │                              │  8. 返回创建的目标            │
     │                              │<─────────────────────────────┤
     │  9. 更新UI显示                │                               │
     │<─────────────────────────────┤                               │
```

---

## 七、数据同步与备份

### 7.1 数据存储方案
- **PostgreSQL数据库**: 所有数据存储在PostgreSQL数据库
- **数据库连接**: `postgresql://josie:bills_password_2024@localhost:5432/fix_life_db`
- **数据备份**: 定期数据库备份
- **导入导出**: 支持JSON/CSV格式导出

### 7.2 数据备份
- 使用 `pg_dump` 定期备份数据库
- 支持 Cron 定时任务自动备份
- 手动触发备份功能

```bash
# 备份命令示例
pg_dump postgresql://josie:bills_password_2024@localhost:5432/fix_life_db > backup_$(date +%Y%m%d).sql
```

### 7.3 数据迁移

使用 Alembic 进行数据库版本管理和迁移：

```bash
# 初始化 alembic
alembic init alembic

# 创建迁移脚本
alembic revision --autogenerate -m "Initial migration"

# 执行迁移
alembic upgrade head

# 回滚迁移
alembic downgrade -1
```

---

## 八、FastAPI 后端实现示例

### 8.1 主应用入口

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.api import api_router
from app.core.config import settings

app = FastAPI(
    title="Fix Life API",
    description="生活计划管理系统 API",
    version="1.0.0",
    openapi_url=f"/api/v1/openapi.json"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 路由配置
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Welcome to Fix Life API",
        "docs": "/docs",
        "redoc": "/redoc"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

### 8.2 数据库连接

```python
# backend/app/db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 8.3 API 路由示例

```python
# backend/app/api/v1/endpoints/yearly_goals.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.schemas.yearly_goal import YearlyGoalCreate, YearlyGoalUpdate, YearlyGoalResponse
from app.services.yearly_goal_service import YearlyGoalService

router = APIRouter()

@router.get("/", response_model=List[YearlyGoalResponse])
def get_yearly_goals(
    year: int = None,
    category: str = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """获取当前用户的所有年度目标"""
    service = YearlyGoalService(db)
    goals = service.get_user_goals(current_user.id, year=year, category=category)
    return goals

@router.post("/", response_model=YearlyGoalResponse)
def create_yearly_goal(
    goal_in: YearlyGoalCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """创建新的年度目标"""
    service = YearlyGoalService(db)
    goal = service.create_goal(current_user.id, goal_in)
    return goal

@router.get("/{goal_id}", response_model=YearlyGoalResponse)
def get_yearly_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """获取单个年度目标详情"""
    service = YearlyGoalService(db)
    goal = service.get_goal(goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@router.patch("/{goal_id}/progress", response_model=YearlyGoalResponse)
def update_goal_progress(
    goal_id: str,
    progress: float,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """更新目标进度"""
    service = YearlyGoalService(db)
    goal = service.update_progress(goal_id, progress)
    return goal
```

### 8.4 Pydantic Schema 示例

```python
# backend/app/schemas/yearly_goal.py
from pydantic import BaseModel, Field
from datetime import date
from typing import Optional, List
from uuid import UUID

class GoalCategory(str):
    HEALTH = "health"
    CAREER = "career"
    LEARNING = "learning"
    FINANCE = "finance"
    RELATIONSHIP = "relationship"
    ENTERTAINMENT = "entertainment"

class GoalStatus(str):
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    PAUSED = "paused"

class MonthlyMilestoneBase(BaseModel):
    month: int = Field(..., ge=1, le=12)
    target_value: float
    achieved_value: float = 0
    note: Optional[str] = None

class YearlyGoalBase(BaseModel):
    year: int = Field(..., ge=2020, le=2100)
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: GoalCategory
    color: str = Field(default="#3B82F6", pattern=r"^#[0-9A-Fa-f]{6}$")
    target_value: float = Field(..., gt=0)
    unit: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

class YearlyGoalCreate(YearlyGoalBase):
    auto_generate_milestones: bool = True

class YearlyGoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    target_value: Optional[float] = Field(None, gt=0)
    status: Optional[GoalStatus] = None

class YearlyGoalResponse(YearlyGoalBase):
    id: UUID
    user_id: UUID
    current_value: float
    status: GoalStatus
    completion_rate: float
    milestones: List[MonthlyMilestoneBase]
    created_at: date
    updated_at: date

    class Config:
        from_attributes = True
```

---

## 九、前端实现示例

### 9.1 API Service

```typescript
// frontend/src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // 处理未授权
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 9.2 年度目标 Service

```typescript
// frontend/src/services/yearlyGoalService.ts
import api from './api';
import type { YearlyGoal, YearlyGoalCreate, YearlyGoalUpdate } from '@/types/yearlyGoal';

export const yearlyGoalService = {
  // 获取所有年度目标
  async getAll(year?: number, category?: string): Promise<YearlyGoal[]> {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (category) params.append('category', category);
    const response = await api.get(`/yearly-goals?${params}`);
    return response.data;
  },

  // 获取单个目标
  async getById(id: string): Promise<YearlyGoal> {
    const response = await api.get(`/yearly-goals/${id}`);
    return response.data;
  },

  // 创建新目标
  async create(goal: YearlyGoalCreate): Promise<YearlyGoal> {
    const response = await api.post('/yearly-goals', goal);
    return response.data;
  },

  // 更新目标
  async update(id: string, goal: YearlyGoalUpdate): Promise<YearlyGoal> {
    const response = await api.put(`/yearly-goals/${id}`, goal);
    return response.data;
  },

  // 更新进度
  async updateProgress(id: string, progress: number): Promise<YearlyGoal> {
    const response = await api.patch(`/yearly-goals/${id}/progress`, {
      progress
    });
    return response.data;
  },

  // 删除目标
  async delete(id: string): Promise<void> {
    await api.delete(`/yearly-goals/${id}`);
  }
};
```

### 9.3 Zustand Store

```typescript
// frontend/src/store/yearlyGoalStore.ts
import { create } from 'zustand';
import { yearlyGoalService } from '@/services/yearlyGoalService';
import type { YearlyGoal, YearlyGoalCreate } from '@/types/yearlyGoal';

interface YearlyGoalState {
  goals: YearlyGoal[];
  loading: boolean;
  error: string | null;
  fetchGoals: (year?: number, category?: string) => Promise<void>;
  createGoal: (goal: YearlyGoalCreate) => Promise<void>;
  updateGoal: (id: string, goal: Partial<YearlyGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const useYearlyGoalStore = create<YearlyGoalState>((set, get) => ({
  goals: [],
  loading: false,
  error: null,

  fetchGoals: async (year?, category?) => {
    set({ loading: true, error: null });
    try {
      const goals = await yearlyGoalService.getAll(year, category);
      set({ goals, loading: false });
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  createGoal: async (goal) => {
    set({ loading: true, error: null });
    try {
      const newGoal = await yearlyGoalService.create(goal);
      set(state => ({
        goals: [...state.goals, newGoal],
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  updateGoal: async (id, goal) => {
    set({ loading: true, error: null });
    try {
      const updatedGoal = await yearlyGoalService.update(id, goal);
      set(state => ({
        goals: state.goals.map(g => g.id === id ? updatedGoal : g),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  },

  deleteGoal: async (id) => {
    set({ loading: true, error: null });
    try {
      await yearlyGoalService.delete(id);
      set(state => ({
        goals: state.goals.filter(g => g.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, loading: false });
    }
  }
}));
```

---

## 十、高级功能（未来扩展）

### 10.1 AI 助手
- 智能目标分解建议
- 每日任务智能排程
- 复盘分析与建议
- 激励性文案生成

### 10.2 社交功能
- 目标分享
- 打卡朋友圈
- 一起打卡挑战
- 排行榜

### 10.3 数据分析
- 时间使用分析
- 习惯相关性分析
- 最佳表现时段分析
- 个人成长报告

### 10.4 番茄钟集成
- 任务内嵌番茄钟
- 番茄钟数据统计
- 专注时间分析

### 10.5 提醒通知
- 任务提醒
- 习惯打卡提醒
- 复盘提醒
- 目标进度里程碑提醒

---

## 十一、开发路线图

### Phase 1: MVP（最小可行产品）
- [x] 基础数据结构设计
- [ ] 年度目标创建与展示
- [ ] 月度计划基础功能
- [ ] 每日任务清单
- [ ] 简单的进度可视化

### Phase 2: 核心功能
- [ ] 习惯追踪系统
- [ ] 打卡热力图
- [ ] 时间块管理
- [ ] 每日/每周复盘
- [ ] 数据统计仪表盘

### Phase 3: 增强
- [ ] 甘特图视图
- [ ] 高级筛选与搜索
- [ ] 数据导入导出
- [ ] 主题自定义
- [ ] 提醒通知系统

### Phase 4: 完善
- [ ] AI 助手集成
- [ ] 数据分析报告
- [ ] 番茄钟集成
- [ ] 云同步功能

---

## 十二、界面风格建议

### 配色方案
```
主色调: 蓝绿色系 (代表成长、平静)
- Primary: #0D9488 (Teal 600)
- Secondary: #14B8A6 (Teal 500)
- Accent: #F59E0B (Amber 500)

功能色:
- 成功: #10B981 (Green 500)
- 警告: #F59E0B (Amber 500)
- 危险: #EF4444 (Red 500)
- 信息: #3B82F6 (Blue 500)

中性色:
- 文字: #1F2937 (Gray 800)
- 副标题: #6B7280 (Gray 500)
- 背景: #F9FAFB (Gray 50)
- 边框: #E5E7EB (Gray 200)
```

### 设计原则
1. **简洁优先**: 信息密度适中，避免过度设计
2. **数据可视化**: 能用图表的不用文字
3. **即时反馈**: 操作立即有视觉反馈
4. **渐进式披露**: 高级功能折叠，保持界面清爽
5. **移动友好**: 响应式设计，支持移动端

---

## 十三、图标建议

使用以下图标集之一：
- **Lucide Icons** (推荐，轻量现代)
- **Heroicons** (TailwindCSS 官方)
- **Tabler Icons** (开源丰富)

功能图标映射：
```
年度目标: 🎯 Target / Trophy
月度计划: 📅 Calendar / CalendarDays
每日任务: ✅ CheckSquare / ListTodo
习惯打卡: 🔥 Flame / Repeat
统计分析: 📊 BarChart / TrendingUp
设置: ⚙️ Settings / Gear
复盘: 💡 Lightbulb / ClipboardCheck
提醒: 🔔 Bell / Alarm
```

---

## 十四、示例数据结构

```javascript
// 示例：2024年阅读目标
const readingGoal = {
  id: "goal-2024-reading",
  year: 2024,
  title: "年度阅读50本书",
  description: "培养阅读习惯，拓展知识面",
  category: "learning",
  color: "#3B82F6",
  targetValue: 50,
  currentValue: 18,
  unit: "本",
  status: "in-progress",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  monthlyMilestones: [
    { month: 1, targetValue: 4, achievedValue: 4, note: "完成" },
    { month: 2, targetValue: 4, achievedValue: 3, note: "春节耽搁" },
    { month: 3, targetValue: 4, achievedValue: 5, note: "超额完成" },
    { month: 4, targetValue: 4, achievedValue: 4, note: "完成" },
    { month: 5, targetValue: 4, achievedValue: 2, note: "进行中" }
  ],
  habits: ["habit-daily-reading"]
}

// 示例：5月月度计划
const mayPlan = {
  id: "plan-2024-05",
  year: 2024,
  month: 5,
  title: "五月计划：专注前端技术提升",
  yearlyGoalId: "goal-2024-learning",
  focusArea: ["前端开发", "英语学习", "运动健身"],
  tasks: [
    {
      id: "task-may-001",
      title: "深入学习 TypeScript 高级类型",
      priority: "high",
      status: "in-progress",
      dueDate: "2024-05-20",
      estimatedHours: 20
    },
    {
      id: "task-may-002",
      title: "读完《Effective TypeScript》",
      priority: "high",
      status: "todo",
      dueDate: "2024-05-25",
      estimatedHours: 10
    }
  ]
}

// 示例：今日计划
const todayPlan = {
  id: "daily-2024-05-15",
  date: "2024-05-15",
  mood: "good",
  energyLevel: 7,
  tasks: [
    {
      id: "task-daily-001",
      title: "晨跑5公里",
      monthlyPlanId: "plan-2024-05",
      timeBlock: { start: "07:00", end: "07:45" },
      category: "health",
      priority: "high",
      status: "done",
      estimatedMinutes: 45,
      actualMinutes: 42,
      difficulty: 3
    },
    {
      id: "task-daily-002",
      title: "阅读《Effective TypeScript》第3章",
      monthlyPlanId: "plan-2024-05",
      timeBlock: { start: "08:00", end: "09:00" },
      category: "learning",
      priority: "medium",
      status: "in-progress",
      estimatedMinutes: 60,
      actualMinutes: 0,
      difficulty: 4
    }
  ],
  habits: [
    { habitId: "habit-morning-run", completed: true, note: "天气不错" },
    { habitId: "habit-reading", completed: false, note: "" }
  ],
  reflection: {
    highlight: "",
    gratitude: ["阳光明媚", "身体健康"],
    improvement: ""
  }
}
```

---

## 结语

这个设计方案提供了一个完整的计划管理框架，从数据结构到可视化展示都有详细说明。你可以根据实际需求选择性地实现功能，建议从 MVP 开始，逐步迭代完善。

需要我帮你开始实现某个具体模块吗？
