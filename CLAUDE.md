# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## 言語設定

すべての回答は日本語で行うこと。

## タイムゾーン

すべての日時は日本時間（JST / UTC+9）で定義・表示すること。
- フロントエンドでの日付表示はローカル時間（日本時間）を使用
- `toISOString()`はUTCに変換されるため、日付のみを扱う場合は使用しない
- 日付文字列の生成には`YYYY-MM-DD`形式でローカル日付を直接フォーマットする

## プロジェクト概要

WBS・EVM管理ツール - WBS（作業分解構成図）とEVM（アーンドバリューマネジメント）によるプロジェクト進捗・コスト管理システム

## 開発コマンド

### バックエンド
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload          # 開発サーバー起動
pytest                                   # テスト実行
pytest tests/test_evm.py -v             # 単体テスト実行例
```

### フロントエンド
```bash
cd frontend
npm run dev          # 開発サーバー（http://localhost:5173）
npm run build        # プロダクションビルド
npm run lint         # ESLintチェック
```

### APIドキュメント
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## アーキテクチャ

### バックエンド構成
- `app/api/` - FastAPIルーター（projects, tasks, evm, members, holidays）
- `app/models/` - SQLAlchemyモデル
- `app/schemas/` - Pydanticスキーマ（リクエスト/レスポンス検証）
- `app/services/evm_calculator.py` - EVM計算エンジン（コアビジネスロジック）
- `app/core/` - 設定・DB接続

### フロントエンド構成
- `src/api/client.ts` - 全APIクライアント（axios）
- `src/types/index.ts` - 全TypeScript型定義
- `src/pages/` - ページコンポーネント
- `src/components/` - 共通コンポーネント
- `src/contexts/ThemeContext.tsx` - ダークモード管理

### 重要な設計パターン

**タスク階層構造（WBS）**
- タスクは`parent_id`による自己参照で階層構造を形成
- 子タスクは`children`リレーションでアクセス

**プロジェクト日付・工数の自動計算**
- `start_date`, `end_date`, `budget`はタスクから自動計算される
- プロジェクト作成時は日付/予算の直接指定不要

**EVM計算（工数ベース）**
- PV: 計画工数を稼働日で日割り計算（休日を除外）
- EV: 計画工数 × 進捗率の合計
- AC: 実績工数の合計
- 休日カレンダーはプロジェクト単位で管理

## データベーステーブル

- `projects` - プロジェクト（名前、期間、予算、ステータス）
- `tasks` - タスク（階層構造、計画/実績工数、進捗率、担当者）
- `members` - プロジェクトメンバー（週あたり稼働時間）
- `holidays` - 休日カレンダー（週末、祝日、会社休日、カスタム）
- `users` - ユーザー（認証用）
- `costs` - コスト（種別、計画/実績金額）
- `evm_snapshots` - EVM指標スナップショット（履歴）

## EVM指標

| 指標 | 正式名称 | 計算式 |
|------|----------|--------|
| PV | Planned Value | 計画工数（日割り） |
| EV | Earned Value | 計画工数 × 進捗率 |
| AC | Actual Cost | 実績工数 |
| SV | Schedule Variance | EV - PV |
| CV | Cost Variance | EV - AC |
| SPI | Schedule Performance Index | EV / PV |
| CPI | Cost Performance Index | EV / AC |
| BAC | Budget at Completion | 計画総工数 |
| EAC | Estimate at Completion | AC + ETC |
| ETC | Estimate to Complete | (BAC - EV) / CPI |

## 技術スタック

**バックエンド:** Python 3.11+, FastAPI, SQLAlchemy（SQLite）, Pydantic

**フロントエンド:** React 19 / TypeScript, Vite, TailwindCSS, React Query, Recharts, React Router, Lucide Icons
