# Letter

ブラウザで動くデジタル手紙サービスの MVP プロトタイプです。

## セットアップ

1. `Supabase` の SQL Editor で [supabase/schema.sql](/Users/matsumotorina/Documents/letter/supabase/schema.sql) を実行
2. [.env.local](/Users/matsumotorina/Documents/letter/.env.local) の `VITE_SUPABASE_URL` と `VITE_SUPABASE_PUBLISHABLE_KEY` を実際の値に置き換え
3. `npm run dev` で起動

## Supabase の値の場所

`Supabase Dashboard > Project Settings > API`

- `Project URL` → `VITE_SUPABASE_URL`
- `Project API Keys` の `Publishable key` → `VITE_SUPABASE_PUBLISHABLE_KEY`
