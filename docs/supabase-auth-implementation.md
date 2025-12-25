# Supabase Auth（Magic Link）認証の実装記録

## 概要

WBS・EVM管理ツールにSupabase AuthのMagic Link認証を実装した際の記録。

## 実装した機能

- Magic Link（パスワードレス）認証
- 許可リスト（Allowlist）によるアクセス制御
- JWTトークン検証
- 全APIエンドポイントの保護

## 構成

```
フロントエンド                    バックエンド
    │                               │
    ├─ Login.tsx                    ├─ app/core/auth.py（JWT検証）
    ├─ AuthCallback.tsx             ├─ app/api/auth.py（認証API）
    ├─ AuthContext.tsx              ├─ app/models/allowlist.py
    ├─ ProtectedRoute.tsx           └─ 各APIに認証追加
    └─ lib/supabase.ts
```

## 詰まった点と解決策

### 1. JWTアルゴリズムの不一致（最大の問題）

**症状:**
```
無効なトークンです: The specified alg value is not allowed
```

**原因:**
- SupabaseのJWTトークンは**ES256**（ECDSA）アルゴリズムを使用
- 最初はHS256（対称鍵）で検証しようとしていた
- Supabaseダッシュボードの「JWT Secret」はHS256用だが、実際のトークンはES256で署名されている

**解決策:**
JWT Secretを使うのではなく、**JWKS（JSON Web Key Set）**から公開鍵を取得してES256で検証する。

```python
from jwt import PyJWKClient

def get_jwks_client() -> PyJWKClient:
    jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url)

def verify_supabase_token(token: str) -> dict:
    jwks_client = get_jwks_client()
    signing_key = jwks_client.get_signing_key_from_jwt(token)

    payload = jwt.decode(
        token,
        signing_key.key,
        algorithms=["ES256"],  # HS256ではなくES256
        audience="authenticated",
    )
    return payload
```

**教訓:**
- SupabaseのJWT Secretは「HS256で検証する場合」用
- 実際のトークンヘッダーを確認すると`"alg": "ES256"`になっている
- PyJWTのPyJWKClientを使えば自動的に正しい公開鍵を取得できる

### 2. PEMファイルエラー

**症状:**
```
ValueError: Unable to load PEM file. MalformedFraming
```

**原因:**
トークンヘッダーからアルゴリズム（ES256/RS256）を動的に取得して、HS256用のシークレットで検証しようとした。

**解決策:**
上記の通り、JWKSを使用する方法に切り替え。

### 3. セッションが見つからない

**症状:**
Magic Linkをクリック後、「セッションが見つかりません」エラー。

**原因:**
- Magic Linkの有効期限切れ
- Supabaseのレート制限（無料プランは1時間に2通まで）
- Redirect URLの設定ミス

**解決策:**
1. Supabaseダッシュボードで`http://localhost:3000/auth/callback`をRedirect URLsに追加
2. レート制限に達した場合は1時間待つか、別のメールアドレスを使用

### 4. データベースカラムの不足

**症状:**
```
sqlite3.OperationalError: no such column: users.supabase_uid
```

**原因:**
Userモデルに`supabase_uid`カラムを追加したが、既存のDBに反映されていなかった。

**解決策:**
```python
from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    conn.execute(text('ALTER TABLE users ADD COLUMN supabase_uid VARCHAR'))
    conn.commit()
```

### 5. NOT NULL制約エラー

**症状:**
```
sqlite3.IntegrityError: NOT NULL constraint failed: users.hashed_password
```

**原因:**
Supabase認証ではパスワードを使わないが、既存のusersテーブルは`hashed_password`がNOT NULL制約を持っていた。

**解決策:**
テーブルを再作成して`hashed_password`をNULLableに変更。

```python
conn.execute(text('''
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR NOT NULL UNIQUE,
        supabase_uid VARCHAR,
        hashed_password VARCHAR,  -- NULLable
        name VARCHAR,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME
    )
'''))
```

## 環境変数

### バックエンド（backend/.env）
```
SUPABASE_URL=https://xxxxx.supabase.co
# SUPABASE_JWT_SECRETは不要（JWKSを使用するため）
```

### フロントエンド（frontend/.env.local）
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_BASE_URL=http://localhost:3000
```

## Supabaseダッシュボード設定

1. **Authentication > URL Configuration**
   - Redirect URLs: `http://localhost:3000/auth/callback`（開発用）
   - Redirect URLs: `https://your-app.fly.dev/auth/callback`（本番用）

2. **Authentication > Rate Limits**
   - 無料プラン: 1時間に2通まで
   - カスタムSMTPを設定すると制限解除可能

## デバッグ方法

### トークンのアルゴリズム確認
```python
import jwt
header = jwt.get_unverified_header(token)
print(f"Algorithm: {header.get('alg')}")  # ES256が出るはず
```

### バックエンドログ確認
```bash
tail -f /tmp/claude/.../tasks/xxx.output
```

## 参考リンク

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)
- [JWKS (JSON Web Key Set) Specification](https://datatracker.ietf.org/doc/html/rfc7517)
