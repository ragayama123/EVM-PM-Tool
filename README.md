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

開発サーバー: http://localhost:3000

## 認証（Supabase Auth）

このツールはSupabase AuthのMagic Link認証を使用しています。

### Supabase設定

1. [Supabase](https://supabase.com/)でプロジェクトを作成

2. **Redirect URLs設定**（Authentication > URL Configuration）:
   - `https://wbs-evm-frontend.fly.dev/auth/callback`
   - `http://localhost:3000/auth/callback`

3. **JWT Secret取得**（Settings > API > JWT Settings）

### 環境変数設定

**バックエンド** (`backend/.env`):
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
```

**フロントエンド** (`frontend/.env.local`):
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_BASE_URL=http://localhost:3000
```

### 許可リスト（Allowlist）

ログインできるユーザーは許可リストで管理されます。初期ユーザーの登録:

```bash
cd backend
source .venv/bin/activate
python -c "
from app.core.database import SessionLocal
from app.models.allowlist import AllowedEmail

db = SessionLocal()
allowed = AllowedEmail(email='your-email@example.com')
db.add(allowed)
db.commit()
print('Added to allowlist')
db.close()
"
```

### 本番URL変更時の注意

Flyアプリ名変更などでURLが変わる場合は、必ずSupabaseのRedirect URLsも更新してください。

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

## Fly.ioへのデプロイ（無料）

Fly.ioを使えば無料でインターネットに公開できます。

### 必要要件

- [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Fly.ioアカウント（クレジットカード登録必要、無料枠内なら課金なし）

### 手順

#### 1. Fly CLIのインストールとログイン

```bash
# macOS
brew install flyctl

# ログイン
fly auth login
```

#### 2. バックエンドのデプロイ

```bash
cd backend

# アプリ作成（名前を聞かれたらユニークな名前を入力）
fly launch --no-deploy

# データ永続化用ボリューム作成
fly volumes create evm_data --region nrt --size 1

# シークレット設定
fly secrets set SECRET_KEY="$(openssl rand -hex 32)"

# CORS設定（フロントエンドのURLを設定）
fly secrets set CORS_ORIGINS="https://your-frontend-app.fly.dev"

# デプロイ
fly deploy
```

#### 3. フロントエンドのデプロイ

```bash
cd frontend

# nginx.fly.conf のバックエンドURLを編集
# wbs-evm-backend.fly.dev → 実際のバックエンドアプリ名に変更

# アプリ作成
fly launch --no-deploy

# デプロイ
fly deploy
```

### 注意事項

- 無料枠: 3つの共有CPU VM + 3GBボリューム
- 非アクティブ時は自動停止（初回アクセス時に数秒かかる）
- データはボリュームに永続化されるため、再デプロイしても消えない

## ライセンス

MIT
