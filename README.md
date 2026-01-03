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

## セットアップ

### 1. Supabaseプロジェクトの作成（必須）

このツールはSupabase AuthのMagic Link認証を使用しています。

1. [Supabase](https://supabase.com/)でアカウント作成・ログイン
2. 「New Project」でプロジェクトを作成
3. プロジェクト作成後、以下の情報を控えておく:
   - **Project URL**: `https://xxxxx.supabase.co`（Settings > API）
   - **Publishable key (anon key)**: `sb_publishable_xxx...`（Settings > API > API Keys）
   - **JWT Secret**: （Settings > API > JWT Settings）

4. **Redirect URLs設定**（Authentication > URL Configuration）:
   - Site URL: `http://localhost:5173`（ローカル開発用）
   - Redirect URLs に追加:
     - `http://localhost:5173/auth/callback`

### 2. リポジトリのクローン

```bash
git clone https://github.com/ragayama123/EVM-PM-Tool.git
cd EVM-PM-Tool
```

### 3. 環境変数の設定

**バックエンド** (`backend/.env`を作成):
```bash
cp backend/.env.example backend/.env
```

`backend/.env` を編集:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
```

**フロントエンド** (`frontend/.env`を作成):
```bash
cp frontend/.env.example frontend/.env
```

`frontend/.env` を編集:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx...
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

- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

- 開発サーバー: http://localhost:5173

### 許可リスト（Allowlist）へのユーザー登録

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

## Docker（ローカル環境）

### 必要要件

- Docker
- Docker Compose

### 起動方法

```bash
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

# アプリ作成（名前を聞かれたらユニークな名前を入力、例: my-evm-backend）
fly launch --no-deploy

# データ永続化用ボリューム作成
fly volumes create evm_data --region nrt --size 1

# Supabase認証用シークレット設定
fly secrets set SUPABASE_URL="https://xxxxx.supabase.co"
fly secrets set SUPABASE_JWT_SECRET="your-jwt-secret"

# デプロイ
fly deploy
```

#### 3. フロントエンドのデプロイ

```bash
cd frontend

# fly.toml を編集してバックエンドのURLを設定
# [env] セクションの API_URL を実際のバックエンドアプリ名に変更

# nginx.fly.conf のバックエンドURLも編集
# wbs-evm-backend.fly.dev → 実際のバックエンドアプリ名に変更

# アプリ作成
fly launch --no-deploy

# Supabase環境変数をビルド引数として渡してデプロイ
fly deploy \
  --build-arg VITE_SUPABASE_URL="https://xxxxx.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="sb_publishable_xxx..."
```

#### 4. SupabaseのRedirect URLs更新

Supabaseダッシュボード > Authentication > URL Configuration で以下を設定:

- **Site URL**: `https://your-frontend-app.fly.dev`
- **Redirect URLs** に追加: `https://your-frontend-app.fly.dev/auth/callback`

#### 5. 許可リストへのユーザー追加（本番環境）

Fly.ioにデプロイ後、SSHで接続してユーザーを追加:

```bash
cd backend
fly ssh console --command "python -c \"
from app.core.database import SessionLocal
from app.models.allowlist import AllowedEmail

db = SessionLocal()
allowed = AllowedEmail(email='your-email@example.com')
db.add(allowed)
db.commit()
print('Added to allowlist')
db.close()
\""
```

### トラブルシューティング

#### フロントエンドが真っ白になる（Supabase環境変数エラー）

ブラウザの開発者ツール（F12）で以下のエラーが表示される場合:
```
Uncaught Error: Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
```

**原因**: フロントエンドのビルド時にSupabase環境変数が渡されていない

**解決方法**: `frontend/fly.toml` に `[build.args]` セクションを追加:

```toml
[build]
  dockerfile = 'Dockerfile.fly'

[build.args]
  VITE_SUPABASE_URL = "https://xxxxx.supabase.co"
  VITE_SUPABASE_ANON_KEY = "your-anon-key"
```

その後、再デプロイ:
```bash
cd frontend
fly deploy
```

**補足**: `fly secrets` はランタイム環境変数のため、Viteのビルド時には使用できません。`[build.args]` または `--build-arg` でビルド時に渡す必要があります。

#### Depotビルダーのキャッシュで変更が反映されない

Fly.ioはDepotビルダーを使用しており、ビルドがキャッシュされることがあります。コード変更後にデプロイしても古いバージョンが表示される場合:

**解決方法1**: `--no-cache` オプションを使用
```bash
fly deploy --no-cache
```

**解決方法2**: ローカルでビルドしてデプロイ
```bash
# ローカルでビルド
npm run build

# Dockerfile.flyを一時的に変更してdistを直接コピー
# .dockerignoreからdist/を削除
fly deploy
```

#### ブラウザキャッシュで古いバージョンが表示される

デプロイ後も古いバージョンが表示される場合:

**解決方法**: ハードリロードを実行
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

または、ブラウザの開発者ツール > Network タブ > 「Disable cache」をチェックしてリロード

#### データベースマイグレーションエラー

既存のデータベースでSupabase認証関連のエラーが発生した場合、以下のマイグレーションを実行:

```bash
cd backend
fly ssh console --command "python -c \"
import sqlite3
conn = sqlite3.connect('/data/evm.db')
cursor = conn.cursor()

# supabase_uidカラムを追加（存在しない場合）
cursor.execute('PRAGMA table_info(users)')
columns = [col[1] for col in cursor.fetchall()]
if 'supabase_uid' not in columns:
    cursor.execute('ALTER TABLE users ADD COLUMN supabase_uid VARCHAR')
    print('Added supabase_uid column')

conn.commit()
conn.close()
\""
```

**hashed_passwordのNOT NULL制約エラーが発生する場合:**

Supabase認証ではパスワードを使用しないため、テーブルの再作成が必要です。
詳細は [docs/supabase-auth-implementation.md](docs/supabase-auth-implementation.md) を参照してください。

### 再デプロイ

コード変更後の再デプロイ:

```bash
# バックエンド
cd backend
fly deploy

# フロントエンド（Supabase環境変数が必要）
cd frontend
fly deploy \
  --build-arg VITE_SUPABASE_URL="https://xxxxx.supabase.co" \
  --build-arg VITE_SUPABASE_ANON_KEY="sb_publishable_xxx..."
```

### 注意事項

- 無料枠: 3つの共有CPU VM + 3GBボリューム
- 非アクティブ時は自動停止（初回アクセス時に数秒かかる）
- データはボリュームに永続化されるため、再デプロイしても消えない
- フロントエンドのSupabase環境変数はビルド時に埋め込まれるため、`fly secrets`ではなく`--build-arg`で渡す必要がある

## ライセンス

MIT
