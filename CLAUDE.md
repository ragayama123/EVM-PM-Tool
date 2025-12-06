# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## 言語設定

すべての回答は日本語で行うこと。

## 開発環境

開発環境は仮想環境上に構築すること（venvなど）。

## プロジェクト概要

EVMプロジェクト管理ツール - アーンドバリューマネジメントによるプロジェクト進捗・コスト管理システム

## リポジトリ構成

```
.
├── backend/                    # FastAPI バックエンド
│   ├── .venv/                  # Python仮想環境
│   ├── app/
│   │   ├── api/                # APIエンドポイント
│   │   │   ├── projects.py     # プロジェクトCRUD API
│   │   │   ├── tasks.py        # タスクCRUD API
│   │   │   └── evm.py          # EVM指標API
│   │   ├── core/               # 設定・DB接続
│   │   │   ├── config.py       # アプリケーション設定
│   │   │   └── database.py     # SQLAlchemy設定
│   │   ├── models/             # SQLAlchemyモデル
│   │   │   ├── project.py
│   │   │   ├── task.py
│   │   │   ├── cost.py
│   │   │   ├── evm_snapshot.py
│   │   │   └── user.py
│   │   ├── schemas/            # Pydanticスキーマ
│   │   ├── services/           # ビジネスロジック
│   │   │   └── evm_calculator.py  # EVM計算エンジン
│   │   └── main.py             # FastAPIアプリケーション
│   └── requirements.txt
├── frontend/                   # React フロントエンド（未実装）
├── TASKS.md                    # タスク管理
├── CLAUDE.md                   # 本ファイル
└── evm-architecture.*          # アーキテクチャ設計図
```

## 開発コマンド

### バックエンド起動
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

### APIドキュメント
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 技術スタック

**バックエンド:**
- Python 3.11+
- FastAPI
- SQLAlchemy（SQLite）
- Pydantic

**フロントエンド（予定）:**
- React 18+ / TypeScript
- Vite
- TailwindCSS
- Recharts

## EVM指標

| 指標 | 正式名称 | 計算式 |
|------|----------|--------|
| PV | Planned Value（計画価値） | 計画工数 × 単価 |
| EV | Earned Value（出来高） | 完了タスクの計画価値合計 × 進捗率 |
| AC | Actual Cost（実コスト） | 実績工数 × 単価 |
| SV | Schedule Variance | EV - PV |
| CV | Cost Variance | EV - AC |
| SPI | Schedule Performance Index | EV / PV |
| CPI | Cost Performance Index | EV / AC |
| BAC | Budget at Completion | 計画総予算 |
| EAC | Estimate at Completion | AC + ETC |
| ETC | Estimate to Complete | (BAC - EV) / CPI |

## データベーステーブル

- `users` - ユーザー（認証用）
- `projects` - プロジェクト（名前、期間、予算、ステータス）
- `tasks` - タスク（階層構造、計画/実績工数、進捗率）
- `costs` - コスト（種別、計画/実績金額）
- `evm_snapshots` - EVM指標スナップショット（履歴）
