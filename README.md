# WBS・EVM管理ツール

WBS（作業分解構成図）とEVM（アーンドバリューマネジメント）によるプロジェクト進捗・コスト管理システム

## 機能

- プロジェクト管理（作成・編集・削除）
- WBS（タスク階層構造）管理
- EVM指標の自動計算（PV, EV, AC, SV, CV, SPI, CPI, EAC, ETC）
- メンバー管理・稼働率分析
- 休日カレンダー管理
- ガントチャート表示
- ダッシュボードによる可視化

## クイックスタート（Docker）

### 必要要件

- Docker
- Docker Compose

### 起動方法

```bash
# リポジトリをクローン
git clone https://github.com/ragayama123/EVM-PM-Tool.git
cd EVM-PM-Tool

# 起動
docker compose up -d

# ブラウザでアクセス
open http://localhost
```

### 停止方法

```bash
docker compose down
```

### データの永続化

データは Docker Volume `evm_data` に保存されます。`docker compose down` しても削除されません。

データを完全に削除する場合:
```bash
docker compose down -v
```

## ローカル開発

### バックエンド

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API: http://localhost:8000
Swagger UI: http://localhost:8000/docs

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

開発サーバー: http://localhost:5173

## 技術スタック

### バックエンド
- Python 3.11+
- FastAPI
- SQLAlchemy（SQLite）
- Pydantic

### フロントエンド
- React 19 / TypeScript
- Vite
- TailwindCSS
- React Query
- Recharts

## EVM指標

| 指標 | 正式名称 | 説明 |
|------|----------|------|
| PV | Planned Value | 計画価値（計画工数の日割り） |
| EV | Earned Value | 出来高（計画工数 × 進捗率） |
| AC | Actual Cost | 実コスト（実績工数） |
| SV | Schedule Variance | スケジュール差異（EV - PV） |
| CV | Cost Variance | コスト差異（EV - AC） |
| SPI | Schedule Performance Index | スケジュール効率（EV / PV） |
| CPI | Cost Performance Index | コスト効率（EV / AC） |
| BAC | Budget at Completion | 完成時総予算 |
| EAC | Estimate at Completion | 完成時総コスト見積り |
| ETC | Estimate to Complete | 残作業コスト見積り |

## ライセンス

MIT
