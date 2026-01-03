# WBS・EVM管理ツール 仕様書

**バージョン:** 1.0
**最終更新日:** 2026年1月3日

---

## 目次

1. [概要](#1-概要)
2. [システム構成](#2-システム構成)
3. [機能一覧](#3-機能一覧)
4. [データベース設計](#4-データベース設計)
5. [API仕様](#5-api仕様)
6. [画面仕様](#6-画面仕様)
7. [EVM計算ロジック](#7-evm計算ロジック)
8. [認証・認可](#8-認証認可)
9. [非機能要件](#9-非機能要件)

---

## 1. 概要

### 1.1 システム名
WBS・EVM管理ツール

### 1.2 目的
WBS（Work Breakdown Structure：作業分解構成図）とEVM（Earned Value Management：アーンドバリューマネジメント）によるプロジェクト進捗・コスト管理を行うWebアプリケーション。

### 1.3 対象ユーザー
- プロジェクトマネージャー
- プロジェクトメンバー
- 管理者

### 1.4 主要機能
- プロジェクト管理（作成・編集・削除）
- WBS（タスク階層構造）管理
- EVM指標の自動計算・分析
- メンバー管理・稼働率分析
- 休日カレンダー管理
- ガントチャート表示
- ダッシュボードによる可視化

---

## 2. システム構成

### 2.1 技術スタック

| 層 | 技術 | バージョン |
|----|------|-----------|
| **バックエンド** | Python | 3.11+ |
| | FastAPI | - |
| | SQLAlchemy | - |
| | Pydantic | - |
| **データベース** | SQLite | - |
| **フロントエンド** | React | 19 |
| | TypeScript | - |
| | Vite | 7.x |
| | TailwindCSS | - |
| **状態管理** | React Query | @tanstack/react-query |
| **可視化** | Recharts | - |
| **ルーティング** | React Router | v6 |
| **認証** | Supabase Auth | - |
| **API通信** | Axios | - |
| **アイコン** | Lucide Icons | - |

### 2.2 アーキテクチャ

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   フロントエンド   │────▶│   バックエンド    │────▶│  データベース    │
│   (React/TS)    │◀────│   (FastAPI)     │◀────│   (SQLite)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Supabase Auth  │     │  EVM Calculator │
│   (認証基盤)     │     │  (計算エンジン)   │
└─────────────────┘     └─────────────────┘
```

### 2.3 ディレクトリ構成

```
プロジェクト管理ツール/
├── backend/
│   ├── app/
│   │   ├── api/           # APIルーター
│   │   │   ├── auth.py
│   │   │   ├── projects.py
│   │   │   ├── tasks.py
│   │   │   ├── evm.py
│   │   │   ├── members.py
│   │   │   └── holidays.py
│   │   ├── models/        # SQLAlchemyモデル
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   ├── member.py
│   │   │   ├── holiday.py
│   │   │   ├── cost.py
│   │   │   ├── evm_snapshot.py
│   │   │   ├── member_skill.py
│   │   │   └── allowlist.py
│   │   ├── schemas/       # Pydanticスキーマ
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   ├── evm.py
│   │   │   ├── member.py
│   │   │   ├── holiday.py
│   │   │   └── auth.py
│   │   ├── services/      # ビジネスロジック
│   │   │   ├── evm_calculator.py
│   │   │   ├── reschedule.py
│   │   │   ├── auto_schedule.py
│   │   │   └── wbs_import.py
│   │   ├── core/          # 設定・DB接続
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── auth.py
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── pages/         # ページコンポーネント
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── Projects.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── Members.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Login.tsx
│   │   │   └── AuthCallback.tsx
│   │   ├── components/    # 共通コンポーネント
│   │   │   ├── Layout.tsx
│   │   │   ├── EVMChart.tsx
│   │   │   ├── KPICard.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   ├── HolidayCalendar.tsx
│   │   │   ├── WBSImportModal.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── api/
│   │   │   └── client.ts  # APIクライアント
│   │   ├── types/
│   │   │   └── index.ts   # 型定義
│   │   ├── contexts/      # コンテキスト
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ProjectContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── lib/
│   │   │   └── supabase.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── docs/
    └── SPECIFICATION.md   # 本ドキュメント
```

---

## 3. 機能一覧

### 3.1 プロジェクト管理

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| PRJ-001 | プロジェクト一覧表示 | 登録済みプロジェクトの一覧を表示 |
| PRJ-002 | プロジェクト作成 | 新規プロジェクトを作成 |
| PRJ-003 | プロジェクト編集 | プロジェクト情報を編集 |
| PRJ-004 | プロジェクト削除 | プロジェクトを削除（関連データも削除） |
| PRJ-005 | ステータス管理 | プロジェクトの進行状態を管理 |
| PRJ-006 | 日付・予算自動計算 | タスクから開始日・終了日・予算を自動計算 |

**プロジェクトステータス:**
- `planning` - 計画中
- `in_progress` - 進行中
- `on_hold` - 保留
- `completed` - 完了
- `cancelled` - 中止

### 3.2 タスク（WBS）管理

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| TSK-001 | タスク一覧表示 | プロジェクトのタスク一覧を表示 |
| TSK-002 | タスク作成 | 新規タスクを作成 |
| TSK-003 | タスク編集 | タスク情報を編集 |
| TSK-004 | タスク削除 | タスクを削除 |
| TSK-005 | 階層構造管理 | 親子関係による階層構造を管理 |
| TSK-006 | 先行タスク設定 | タスク間の依存関係を設定 |
| TSK-007 | マイルストーン設定 | 固定日付タスクを設定 |
| TSK-008 | 進捗率更新 | タスクの進捗率を更新 |
| TSK-009 | リスケジュール | 基準タスクから後続タスクの日程を一括変更 |
| TSK-010 | 自動スケジュール | スキルと稼働率に基づく担当者・日程の自動設定 |
| TSK-011 | WBSインポート | Excelファイルからタスクを一括登録 |
| TSK-012 | ソート機能 | 種別順・担当者順・日付順でソート |

**タスク種別（フェーズ）:**

| キー | 表示名 | 順序 |
|------|--------|------|
| `requirements` | 要件定義 | 1 |
| `external_design` | 外部設計 | 2 |
| `basic_design` | 基本設計 | 3 |
| `detailed_design` | 詳細設計 | 4 |
| `pg` | PG | 5 |
| `ci` | CI | 6 |
| `ut` | UT | 7 |
| `it` | IT | 8 |
| `st` | ST | 9 |
| `release` | 本番化 | 10 |

### 3.3 EVM管理

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| EVM-001 | EVM指標計算 | 現在のEVM指標を計算 |
| EVM-002 | スナップショット作成 | EVM指標の履歴を保存 |
| EVM-003 | 履歴表示 | スナップショット履歴を表示 |
| EVM-004 | 分析レポート | EVM分析結果とレコメンドを表示 |
| EVM-005 | チャート表示 | PV/EV/ACの時系列グラフを表示 |
| EVM-006 | データエクスポート | 分析データをJSON/YAML/Markdown形式で出力 |

### 3.4 メンバー管理

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| MBR-001 | メンバー一覧表示 | プロジェクトメンバーの一覧を表示 |
| MBR-002 | メンバー作成 | 新規メンバーを登録 |
| MBR-003 | メンバー編集 | メンバー情報を編集 |
| MBR-004 | メンバー削除 | メンバーを削除 |
| MBR-005 | スキル管理 | メンバーの担当可能タスク種別を管理 |
| MBR-006 | 稼働率分析 | 日毎・週毎の稼働率を分析 |
| MBR-007 | メンバー別EVM | メンバー単位のEVM指標を表示 |

### 3.5 休日カレンダー管理

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| HLD-001 | 休日一覧表示 | プロジェクトの休日一覧を表示 |
| HLD-002 | 休日登録 | 休日を個別登録 |
| HLD-003 | 休日編集 | 休日情報を編集 |
| HLD-004 | 休日削除 | 休日を削除 |
| HLD-005 | 一括削除 | 休日を一括削除 |
| HLD-006 | 自動生成 | 週末・祝日を自動生成（2024-2026年対応） |
| HLD-007 | CSVインポート | CSVファイルから休日を一括登録 |
| HLD-008 | 稼働日数計算 | 指定期間の稼働日数を計算 |

**休日種別:**
- `weekend` - 週末（土日）
- `national` - 国民の祝日
- `company` - 会社休日
- `custom` - カスタム

### 3.6 認証・ユーザー管理

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| AUTH-001 | Magic Linkログイン | メールアドレスによるパスワードレス認証 |
| AUTH-002 | ログアウト | セッションを終了 |
| AUTH-003 | 許可リスト管理 | ログイン可能なメールアドレスを管理 |
| AUTH-004 | セッション管理 | JWTトークンによるセッション管理 |

---

## 4. データベース設計

### 4.1 ER図

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │  projects   │       │   tasks     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◀──────│ manager_id  │       │ id (PK)     │
│ email       │       │ id (PK)     │◀──────│ project_id  │
│ supabase_uid│       │ name        │       │ parent_id   │──┐
│ name        │       │ description │       │ predecessor │──┤ (self-ref)
│ is_active   │       │ start_date  │       │ name        │◀─┘
└─────────────┘       │ end_date    │       │ task_type   │
                      │ budget      │       │ planned_*   │
                      │ status      │       │ actual_*    │
                      └─────────────┘       │ progress    │
                             │              │ member_id   │──┐
                             │              └─────────────┘  │
                             │                               │
              ┌──────────────┼──────────────┐               │
              │              │              │               │
              ▼              ▼              ▼               ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │  holidays   │ │evm_snapshots│ │   costs     │ │  members    │
      ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤
      │ id (PK)     │ │ id (PK)     │ │ id (PK)     │ │ id (PK)     │
      │ project_id  │ │ project_id  │ │ project_id  │ │ project_id  │
      │ date        │ │ date        │ │ task_id     │ │ name        │
      │ name        │ │ pv,ev,ac    │ │ cost_type   │ │ hours/week  │
      │ type        │ │ sv,cv,spi.. │ │ amounts     │ └─────────────┘
      └─────────────┘ └─────────────┘ └─────────────┘        │
                                                              │
                                                              ▼
                                                      ┌─────────────┐
                                                      │member_skills│
                                                      ├─────────────┤
                                                      │ id (PK)     │
                                                      │ member_id   │
                                                      │ task_type   │
                                                      └─────────────┘
```

### 4.2 テーブル定義

#### 4.2.1 users（ユーザー）

| カラム名 | データ型 | NULL | 制約 | 説明 |
|----------|----------|------|------|------|
| id | INTEGER | NO | PK, AUTO | ユーザーID |
| email | VARCHAR | NO | UNIQUE | メールアドレス |
| supabase_uid | VARCHAR | YES | | Supabase UID |
| hashed_password | VARCHAR | YES | | パスワードハッシュ（非使用） |
| name | VARCHAR | YES | | 表示名 |
| is_active | BOOLEAN | NO | DEFAULT TRUE | アクティブフラグ |
| created_at | DATETIME | NO | DEFAULT NOW | 作成日時 |
| updated_at | DATETIME | YES | | 更新日時 |

#### 4.2.2 projects（プロジェクト）

| カラム名 | データ型 | NULL | 制約 | 説明 |
|----------|----------|------|------|------|
| id | INTEGER | NO | PK, AUTO | プロジェクトID |
| name | VARCHAR | NO | | プロジェクト名 |
| description | TEXT | YES | | 説明 |
| start_date | DATE | YES | | 開始日（自動計算） |
| end_date | DATE | YES | | 終了日（自動計算） |
| budget | FLOAT | YES | DEFAULT 0 | 予算（自動計算） |
| status | VARCHAR | NO | DEFAULT 'planning' | ステータス |
| manager_id | INTEGER | YES | FK→users | 管理者ID |
| created_at | DATETIME | NO | DEFAULT NOW | 作成日時 |
| updated_at | DATETIME | YES | | 更新日時 |

#### 4.2.3 tasks（タスク）

| カラム名 | データ型 | NULL | 制約 | 説明 |
|----------|----------|------|------|------|
| id | INTEGER | NO | PK, AUTO | タスクID |
| project_id | INTEGER | NO | FK→projects | プロジェクトID |
| parent_id | INTEGER | YES | FK→tasks | 親タスクID |
| predecessor_id | INTEGER | YES | FK→tasks | 先行タスクID |
| assigned_member_id | INTEGER | YES | FK→members | 担当者ID |
| name | VARCHAR | NO | | タスク名 |
| description | TEXT | YES | | 説明 |
| planned_hours | FLOAT | NO | DEFAULT 0 | 計画工数（時間） |
| actual_hours | FLOAT | NO | DEFAULT 0 | 実績工数（時間） |
| progress | INTEGER | NO | DEFAULT 0 | 進捗率（0-100%） |
| hourly_rate | FLOAT | NO | DEFAULT 5000 | 時間単価 |
| is_milestone | BOOLEAN | NO | DEFAULT FALSE | マイルストーンフラグ |
| task_type | VARCHAR | YES | | タスク種別 |
| planned_start_date | DATETIME | YES | | 予定開始日 |
| planned_end_date | DATETIME | YES | | 予定終了日 |
| actual_start_date | DATETIME | YES | | 実績開始日 |
| actual_end_date | DATETIME | YES | | 実績終了日 |
| created_at | DATETIME | NO | DEFAULT NOW | 作成日時 |
| updated_at | DATETIME | YES | | 更新日時 |

#### 4.2.4 members（メンバー）

| カラム名 | データ型 | NULL | 制約 | 説明 |
|----------|----------|------|------|------|
| id | INTEGER | NO | PK, AUTO | メンバーID |
| project_id | INTEGER | NO | FK→projects | プロジェクトID |
| name | VARCHAR | NO | | メンバー名 |
| available_hours_per_week | FLOAT | NO | DEFAULT 40 | 週あたり稼働時間 |
| created_at | DATETIME | NO | DEFAULT NOW | 作成日時 |
| updated_at | DATETIME | YES | | 更新日時 |

#### 4.2.5 member_skills（メンバースキル）

| カラム名 | データ型 | NULL | 制約 | 説明 |
|----------|----------|------|------|------|
| id | INTEGER | NO | PK, AUTO | ID |
| member_id | INTEGER | NO | FK→members | メンバーID |
| task_type | VARCHAR | NO | | タスク種別 |

**複合ユニーク制約:** (member_id, task_type)

#### 4.2.6 holidays（休日）

| カラム名 | データ型 | NULL | 制約 | 説明 |
|----------|----------|------|------|------|
| id | INTEGER | NO | PK, AUTO | 休日ID |
| project_id | INTEGER | NO | FK→projects | プロジェクトID |
| date | DATE | NO | | 日付 |
| name | VARCHAR | NO | | 休日名 |
| holiday_type | VARCHAR | NO | DEFAULT 'custom' | 休日種別 |

**複合ユニーク制約:** (project_id, date)

#### 4.2.7 evm_snapshots（EVMスナップショット）

| カラム名 | データ型 | NULL | 制約 | 説明 |
|----------|----------|------|------|------|
| id | INTEGER | NO | PK, AUTO | スナップショットID |
| project_id | INTEGER | NO | FK→projects | プロジェクトID |
| date | DATE | NO | | 記録日 |
| pv | FLOAT | NO | DEFAULT 0 | Planned Value |
| ev | FLOAT | NO | DEFAULT 0 | Earned Value |
| ac | FLOAT | NO | DEFAULT 0 | Actual Cost |
| sv | FLOAT | NO | DEFAULT 0 | Schedule Variance |
| cv | FLOAT | NO | DEFAULT 0 | Cost Variance |
| spi | FLOAT | NO | DEFAULT 0 | Schedule Performance Index |
| cpi | FLOAT | NO | DEFAULT 0 | Cost Performance Index |
| eac | FLOAT | YES | | Estimate at Completion |
| etc | FLOAT | YES | | Estimate to Complete |
| created_at | DATETIME | NO | DEFAULT NOW | 作成日時 |

#### 4.2.8 costs（コスト）

| カラム名 | データ型 | NULL | 制約 | 説明 |
|----------|----------|------|------|------|
| id | INTEGER | NO | PK, AUTO | コストID |
| project_id | INTEGER | NO | FK→projects | プロジェクトID |
| task_id | INTEGER | YES | FK→tasks | タスクID |
| cost_type | VARCHAR | NO | | コスト種別 |
| description | TEXT | YES | | 説明 |
| planned_amount | FLOAT | NO | DEFAULT 0 | 計画金額 |
| actual_amount | FLOAT | NO | DEFAULT 0 | 実績金額 |
| date | DATE | YES | | 発生日 |
| created_at | DATETIME | NO | DEFAULT NOW | 作成日時 |
| updated_at | DATETIME | YES | | 更新日時 |

**コスト種別:**
- `labor` - 人件費
- `material` - 材料費
- `equipment` - 設備費
- `other` - その他

#### 4.2.9 allowed_emails（許可リスト）

| カラム名 | データ型 | NULL | 制約 | 説明 |
|----------|----------|------|------|------|
| id | INTEGER | NO | PK, AUTO | ID |
| email | VARCHAR | NO | UNIQUE | メールアドレス |
| is_active | BOOLEAN | NO | DEFAULT TRUE | アクティブフラグ |
| created_at | DATETIME | NO | DEFAULT NOW | 作成日時 |
| created_by | VARCHAR | YES | | 登録者 |

---

## 5. API仕様

### 5.1 認証API

#### GET /api/auth/verify
トークンを検証し、ユーザー情報を返却。

**レスポンス:**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "ユーザー名",
    "is_active": true
  }
}
```

#### GET /api/auth/me
現在のユーザー情報を取得。

#### GET /api/auth/allowlist
許可リストを取得。

#### POST /api/auth/allowlist
許可リストにメールを追加。

**リクエスト:**
```json
{
  "email": "newuser@example.com"
}
```

#### DELETE /api/auth/allowlist/{email_id}
許可リストからメールを削除。

---

### 5.2 プロジェクトAPI

#### GET /api/projects/
プロジェクト一覧を取得。

**レスポンス:**
```json
[
  {
    "id": 1,
    "name": "プロジェクトA",
    "description": "説明",
    "start_date": "2026-01-01",
    "end_date": "2026-03-31",
    "budget": 1000,
    "status": "in_progress",
    "manager_id": 1,
    "created_at": "2026-01-01T00:00:00",
    "updated_at": "2026-01-02T00:00:00"
  }
]
```

#### GET /api/projects/{project_id}
プロジェクト詳細を取得。

#### POST /api/projects/
プロジェクトを作成。

**リクエスト:**
```json
{
  "name": "新規プロジェクト",
  "description": "説明（任意）",
  "status": "planning",
  "manager_id": 1
}
```

#### PUT /api/projects/{project_id}
プロジェクトを更新。

#### DELETE /api/projects/{project_id}
プロジェクトを削除。

#### POST /api/projects/{project_id}/refresh-status
プロジェクトのステータスを再計算。

#### POST /api/projects/refresh-all-status
全プロジェクトのステータスを再計算。

---

### 5.3 タスクAPI

#### GET /api/tasks/project/{project_id}
プロジェクトのタスク一覧を取得。

**レスポンス:**
```json
[
  {
    "id": 1,
    "project_id": 1,
    "parent_id": null,
    "predecessor_id": null,
    "assigned_member_id": 1,
    "name": "タスク1",
    "description": "説明",
    "planned_hours": 40,
    "actual_hours": 20,
    "progress": 50,
    "hourly_rate": 5000,
    "is_milestone": false,
    "task_type": "requirements",
    "planned_start_date": "2026-01-01T00:00:00",
    "planned_end_date": "2026-01-05T00:00:00",
    "actual_start_date": "2026-01-01T00:00:00",
    "actual_end_date": null,
    "created_at": "2026-01-01T00:00:00",
    "updated_at": "2026-01-02T00:00:00"
  }
]
```

#### GET /api/tasks/{task_id}
タスク詳細を取得。

#### POST /api/tasks/
タスクを作成。

**リクエスト:**
```json
{
  "project_id": 1,
  "name": "新規タスク",
  "description": "説明",
  "planned_hours": 40,
  "hourly_rate": 5000,
  "task_type": "requirements",
  "planned_start_date": "2026-01-01",
  "planned_end_date": "2026-01-05",
  "assigned_member_id": 1,
  "is_milestone": false,
  "parent_id": null,
  "predecessor_id": null
}
```

#### PUT /api/tasks/{task_id}
タスクを更新。

#### PATCH /api/tasks/{task_id}/progress
進捗率のみを更新。

**クエリパラメータ:**
- `progress` (integer): 進捗率（0-100）

#### DELETE /api/tasks/{task_id}
タスクを削除。

#### POST /api/tasks/project/{project_id}/reschedule/preview
リスケジュールのプレビューを取得。

**クエリパラメータ:**
- `base_task_id` (integer): 基準タスクID
- `shift_days` (integer): ずらす稼働日数

**レスポンス:**
```json
{
  "base_task_name": "タスク1",
  "shift_days": 5,
  "affected_tasks": [
    {
      "id": 2,
      "name": "タスク2",
      "current_start": "2026-01-10",
      "current_end": "2026-01-15",
      "new_start": "2026-01-17",
      "new_end": "2026-01-22",
      "is_child": false,
      "parent_id": null
    }
  ],
  "total_count": 1
}
```

#### POST /api/tasks/project/{project_id}/reschedule
リスケジュールを実行。

#### POST /api/tasks/project/{project_id}/auto-schedule/preview
自動スケジュールのプレビューを取得。

**リクエスト:**
```json
{
  "task_ids": [1, 2, 3],
  "start_date": "2026-01-01"
}
```

#### POST /api/tasks/project/{project_id}/auto-schedule
自動スケジュールを実行。

#### GET /api/tasks/project/{project_id}/template
WBSインポート用Excelテンプレートをダウンロード。

#### POST /api/tasks/project/{project_id}/import-excel/preview
WBSインポートのプレビューを取得。

**リクエスト:** multipart/form-data
- `file`: Excelファイル

#### POST /api/tasks/project/{project_id}/import-excel
WBSインポートを実行。

---

### 5.4 EVM API

#### GET /api/evm/projects/{project_id}/metrics
現在のEVM指標を計算して取得。

**クエリパラメータ:**
- `date` (string, optional): 計算基準日（デフォルト: 今日）

**レスポンス:**
```json
{
  "date": "2026-01-03",
  "pv": 120.0,
  "ev": 100.0,
  "ac": 110.0,
  "sv": -20.0,
  "cv": -10.0,
  "spi": 0.83,
  "cpi": 0.91,
  "bac": 500.0,
  "etc": 440.0,
  "eac": 550.0
}
```

#### POST /api/evm/projects/{project_id}/snapshots
EVMスナップショットを作成。

#### GET /api/evm/projects/{project_id}/snapshots
スナップショット履歴を取得。

#### GET /api/evm/projects/{project_id}/analysis
EVM分析結果を取得。

**レスポンス:**
```json
{
  "metrics": { ... },
  "schedule_status": {
    "status": "warning",
    "message": "スケジュールが遅延しています（SPI: 0.83）"
  },
  "cost_status": {
    "status": "warning",
    "message": "コストが超過しています（CPI: 0.91）"
  },
  "recommendations": [
    "スケジュール遅延の原因を特定してください",
    "リソースの追加を検討してください"
  ]
}
```

#### GET /api/evm/projects/{project_id}/export
EVM分析データをエクスポート。

**クエリパラメータ:**
- `format` (string): 出力形式（json/yaml/markdown）

---

### 5.5 メンバーAPI

#### GET /api/members/project/{project_id}
メンバー一覧を取得（稼働率付き）。

**レスポンス:**
```json
[
  {
    "id": 1,
    "project_id": 1,
    "name": "メンバーA",
    "available_hours_per_week": 40,
    "assigned_hours": 80,
    "total_available_hours": 160,
    "utilization_rate": 50.0,
    "created_at": "2026-01-01T00:00:00",
    "updated_at": null
  }
]
```

#### GET /api/members/{member_id}
メンバー詳細を取得。

#### POST /api/members/
メンバーを作成。

**リクエスト:**
```json
{
  "project_id": 1,
  "name": "新規メンバー",
  "available_hours_per_week": 40
}
```

#### PUT /api/members/{member_id}
メンバーを更新。

#### DELETE /api/members/{member_id}
メンバーを削除。

#### GET /api/members/{member_id}/skills
メンバーのスキルを取得。

#### PUT /api/members/{member_id}/skills
メンバーのスキルを更新。

**リクエスト:**
```json
{
  "skills": ["requirements", "external_design", "basic_design"]
}
```

#### GET /api/members/project/{project_id}/with-skills
メンバー一覧を取得（スキル付き）。

#### GET /api/members/project/{project_id}/utilization
稼働率詳細を取得（日毎・週毎）。

**レスポンス:**
```json
[
  {
    "member_id": 1,
    "member_name": "メンバーA",
    "available_hours_per_week": 40,
    "available_hours_per_day": 8,
    "daily": [
      {
        "date": "2026-01-06",
        "hours": 8,
        "utilization_rate": 100.0
      }
    ],
    "weekly": [
      {
        "week_start": "2026-01-06",
        "week_end": "2026-01-12",
        "hours": 40,
        "available_hours": 40,
        "utilization_rate": 100.0
      }
    ]
  }
]
```

#### GET /api/members/project/{project_id}/evm
メンバー別EVM指標を取得。

---

### 5.6 休日API

#### GET /api/holidays/project/{project_id}
休日一覧を取得。

**レスポンス:**
```json
[
  {
    "id": 1,
    "project_id": 1,
    "date": "2026-01-01",
    "name": "元日",
    "holiday_type": "national"
  }
]
```

#### GET /api/holidays/{holiday_id}
休日詳細を取得。

#### POST /api/holidays/
休日を作成。

**リクエスト:**
```json
{
  "project_id": 1,
  "date": "2026-01-01",
  "name": "元日",
  "holiday_type": "national"
}
```

#### PUT /api/holidays/{holiday_id}
休日を更新。

#### DELETE /api/holidays/{holiday_id}
休日を削除。

#### DELETE /api/holidays/project/{project_id}/all
プロジェクトの全休日を削除。

#### POST /api/holidays/project/{project_id}/import
休日を一括インポート。

**リクエスト:**
```json
{
  "holidays": [
    {
      "date": "2026-01-01",
      "name": "元日",
      "holiday_type": "national"
    }
  ]
}
```

#### POST /api/holidays/project/{project_id}/import-csv
CSVから休日をインポート。

**リクエスト:** multipart/form-data
- `file`: CSVファイル

#### POST /api/holidays/project/{project_id}/generate
週末・祝日を自動生成。

**リクエスト:**
```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "include_weekends": true,
  "include_national_holidays": true
}
```

#### GET /api/holidays/project/{project_id}/working-days
稼働日数を計算。

**クエリパラメータ:**
- `start_date` (string): 開始日
- `end_date` (string): 終了日

**レスポンス:**
```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "total_days": 31,
  "holiday_count": 9,
  "working_days": 22
}
```

#### GET /api/holidays/project/{project_id}/dates
休日の日付リストを取得。

---

## 6. 画面仕様

### 6.1 ログイン画面（Login.tsx）

**URL:** `/login`

**機能:**
- Supabase Magic Linkによるパスワードレス認証
- メールアドレス入力
- 認証メール送信

**画面要素:**
- メールアドレス入力フィールド
- 「Magic Linkを送信」ボタン
- 送信成功メッセージ

---

### 6.2 ダッシュボード（Dashboard.tsx）

**URL:** `/` または `/dashboard`

**機能:**
- プロジェクト一覧表示
- 選択プロジェクトのEVM分析
- EVMチャート表示

**画面要素:**
- プロジェクト選択ドロップダウン
- KPIカード（PV, EV, AC, SPI, CPI, EAC）
- EVMチャート（PV/EV/AC時系列）
- スケジュール・コストステータス表示
- レコメンデーション表示

---

### 6.3 プロジェクト一覧（Projects.tsx）

**URL:** `/projects`

**機能:**
- プロジェクト一覧表示
- プロジェクト作成・編集・削除

**画面要素:**
- プロジェクト一覧テーブル
  - プロジェクト名
  - ステータス
  - 開始日〜終了日
  - 予算
  - 操作ボタン（編集・削除）
- 新規作成ボタン
- 作成・編集モーダル

---

### 6.4 プロジェクト詳細（ProjectDetail.tsx）

**URL:** `/projects/{id}`

**機能:**
- プロジェクト情報表示・編集
- EVM分析結果表示
- スナップショット管理

**画面要素:**
- プロジェクト基本情報
- EVM指標カード
- EVMチャート
- スナップショット履歴
- スナップショット作成ボタン

---

### 6.5 WBS（タスク管理）（Tasks.tsx）

**URL:** `/tasks`

**機能:**
- タスク一覧表示
- タスク作成・編集・削除
- リスケジュール
- 自動スケジュール
- WBSインポート
- ソート機能

**画面要素:**
- プロジェクト選択ドロップダウン
- ソート選択（デフォルト/担当者順/日付順）
- フェーズサマリーテーブル
- タスク一覧テーブル
  - タスク名
  - 説明
  - 種別
  - 担当者
  - 予定期間
  - 実績期間
  - 予定工数
  - 実績工数
  - 進捗率
  - 操作ボタン
- タスク追加ボタン
- リスケジュールボタン
- 自動割り当てボタン
- Excelインポートボタン
- タスク追加・編集フォーム
- リスケジュールパネル
- 自動スケジュールパネル
- プレビューモーダル

---

### 6.6 メンバー管理（Members.tsx）

**URL:** `/members`

**機能:**
- メンバー一覧表示
- メンバー作成・編集・削除
- スキル管理
- 稼働率分析
- メンバー別EVM表示

**画面要素:**
- プロジェクト選択ドロップダウン
- メンバー一覧テーブル
  - メンバー名
  - 週あたり稼働時間
  - アサイン時間
  - 稼働率
  - スキル
  - 操作ボタン
- メンバー追加ボタン
- 稼働率詳細表示
- メンバー別EVM表示

---

### 6.7 レポート（Reports.tsx）

**URL:** `/reports`

**機能:**
- EVM分析レポート表示
- データエクスポート

**画面要素:**
- プロジェクト選択
- EVM分析結果
- エクスポートボタン

---

## 7. EVM計算ロジック

### 7.1 基本概念

EVM（Earned Value Management）は、プロジェクトの進捗とコストを統合的に管理する手法。本システムでは**工数ベース**でEVMを計算する。

### 7.2 EVM指標

| 指標 | 正式名称 | 計算式 | 説明 |
|------|----------|--------|------|
| **PV** | Planned Value | 計画工数（日割り） | 予定されていた作業の価値 |
| **EV** | Earned Value | Σ(計画工数 × 進捗率) | 実際に完了した作業の価値 |
| **AC** | Actual Cost | Σ(実績工数) | 実際に消費した工数 |
| **SV** | Schedule Variance | EV - PV | スケジュール差異 |
| **CV** | Cost Variance | EV - AC | コスト差異 |
| **SPI** | Schedule Performance Index | EV / PV | スケジュール効率 |
| **CPI** | Cost Performance Index | EV / AC | コスト効率 |
| **BAC** | Budget at Completion | Σ(計画工数) | 完成時総予算 |
| **ETC** | Estimate to Complete | (BAC - EV) / CPI | 残作業コスト見積 |
| **EAC** | Estimate at Completion | AC + ETC | 完成時総コスト見積 |

### 7.3 PV計算ロジック

PV（Planned Value）は、計画工数を稼働日で日割りし、基準日までの累積値を計算する。

```
PV = Σ (タスクごとのPV)

タスクごとのPV計算:
1. タスクの予定期間内の稼働日数を計算（休日を除外）
2. 1日あたりの計画工数 = 計画工数 / 稼働日数
3. 基準日までの稼働日数をカウント
4. タスクPV = 1日あたり計画工数 × 基準日までの稼働日数
```

**計算例:**
- タスクA: 計画工数 40h, 予定期間 1/6〜1/10（稼働日5日）
- 基準日: 1/8
- 基準日までの稼働日数: 3日
- タスクAのPV = 40h × (3/5) = 24h

### 7.4 EV計算ロジック

EV（Earned Value）は、計画工数に進捗率を掛けた値の合計。

```
EV = Σ (計画工数 × 進捗率 / 100)
```

**計算例:**
- タスクA: 計画工数 40h, 進捗率 50% → EV = 20h
- タスクB: 計画工数 20h, 進捗率 100% → EV = 20h
- 合計 EV = 40h

### 7.5 AC計算ロジック

AC（Actual Cost）は、実績工数の合計。

```
AC = Σ (実績工数)
```

### 7.6 ステータス判定

| 指標 | on_track | warning | critical |
|------|----------|---------|----------|
| SPI | ≥ 0.95 | 0.8 ≤ x < 0.95 | < 0.8 |
| CPI | ≥ 0.95 | 0.8 ≤ x < 0.95 | < 0.8 |

### 7.7 稼働日計算

休日カレンダーを考慮して稼働日を計算する。

```python
def calculate_working_days(start_date, end_date, holidays):
    working_days = 0
    current = start_date
    while current <= end_date:
        if current not in holidays:
            working_days += 1
        current += timedelta(days=1)
    return working_days
```

---

## 8. 認証・認可

### 8.1 認証方式

**Supabase Auth Magic Link認証**を使用。

1. ユーザーがメールアドレスを入力
2. Supabaseが認証用URLを含むメールを送信
3. ユーザーがリンクをクリック
4. `/auth/callback`でセッションを確立
5. JWTトークンをAuthorizationヘッダーに付与

### 8.2 許可リスト

ログイン可能なユーザーは許可リスト（`allowed_emails`テーブル）で管理。

- 許可リストに登録されていないメールアドレスはログイン不可
- 管理者のみが許可リストを編集可能

### 8.3 API認証

すべてのAPIリクエストにJWTトークンが必要。

```
Authorization: Bearer <jwt_token>
```

バックエンドで以下を検証:
1. トークンの有効期限
2. トークンの署名（SUPABASE_JWT_SECRET）
3. ユーザーの存在と有効性
4. 許可リストへの登録状況

---

## 9. 非機能要件

### 9.1 パフォーマンス

| 項目 | 要件 |
|------|------|
| API応答時間 | 通常リクエスト: 500ms以内 |
| | EVM計算: 2秒以内 |
| 同時接続数 | 10ユーザー以上 |
| データ量 | プロジェクト: 100件以上 |
| | タスク: 1プロジェクトあたり1,000件以上 |

### 9.2 可用性

| 項目 | 要件 |
|------|------|
| 稼働時間 | 24時間365日（Fly.io自動スケール） |
| バックアップ | SQLiteファイルをボリュームに永続化 |
| 障害復旧 | データはFly.ioボリュームで永続化 |

### 9.3 セキュリティ

| 項目 | 対策 |
|------|------|
| 認証 | Supabase Auth (JWT) |
| 認可 | 許可リスト方式 |
| 通信 | HTTPS必須 |
| パスワード | 使用しない（Magic Link認証） |
| CORS | 許可されたオリジンのみ |

### 9.4 保守性

| 項目 | 方針 |
|------|------|
| コード品質 | TypeScript厳密型チェック |
| | ESLintによる静的解析 |
| テスト | pytest（バックエンド） |
| ドキュメント | CLAUDE.md, README.md, 本仕様書 |
| バージョン管理 | Git (GitHub) |

### 9.5 デプロイ

| 環境 | 構成 |
|------|------|
| 本番環境 | Fly.io |
| | フロントエンド: nginx + 静的ファイル |
| | バックエンド: uvicorn + FastAPI |
| | データベース: SQLite (ボリューム永続化) |
| 開発環境 | ローカル |
| | フロントエンド: Vite dev server |
| | バックエンド: uvicorn --reload |

---

## 改訂履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| 1.0 | 2026-01-03 | 初版作成 |
