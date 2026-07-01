# Nihongo Diary — Claude Code Instructions

## Project overview

Japanese diary app with AI corrections. Users write diary entries in Japanese, receive AI corrections, and can browse a social feed.

**Stack:** Next.js 15.5 App Router · TypeScript · Tailwind CSS · Supabase (auth + DB) · OpenAI GPT-4.1-mini · Capacitor (iOS) · Deployed on Vercel

## Commands

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build — run before every push
npm run lint       # ESLint
```

---

## Communication rules

- 返答は日本語で。
- 1ステップずつ進める。一度に大量の変更をしない。
- 専門用語・略語には簡単な説明を添える。
- 作業の報告は必ず **(a)(b)(c) 形式**で：
  - **(a)** git コミットの確認（コミットハッシュ・push 有無）
  - **(b)** 何をどう変えたか
  - **(c)** 影響範囲・ビルド結果

---

## Safety rules — most critical

### Before making any code change
**必ずコードを変更する前に `git commit` で退避する**（いつでも `git checkout` で戻せる状態を保つ）。

### Hands-off logic — read OK, modify forbidden
以下のロジックは**絶対に変更しない**。読むのは可、書き換えは禁止：

- 課金・billing・Stripe 関連
- plan 判定（Free / Plus / Pro / Teacher）と `normalizePlan()`
- AI 添削の回数カウント（`correction_count` / `try_use_correction()`）
- 翻訳の回数カウント（`translation_count` / `try_use_translation()`）
- streak（連続記録）のロジック
- ふりがな描画（`buildRubyNotation`）

変更が必要な場合は**勝手に実装せず、先に提案して止まり、確認を取る**。

### Other hard rules
- **OPENAI_API_KEY** はサーバー側のみ。クライアントに漏らさない。
- **秘密鍵・APIキー・パスワード**は、コードに直書きしない。ユーザーにペーストさせない。
- **環境変数名**は変えない。
- **`git push --force`** はユーザーが明示的に指示した場合のみ。
- **`router.push()` + `router.refresh()`** を同時に使わない。
- **ボトムナビ**（Home / Feed / ✏️ / History / Support）のタブを増やさない。
- **iOS native** (`window.Capacitor?.isNative`)：アップグレード CTA を一切表示しない。
- 破壊的・有料につながる操作の前は必ず警告する。

---

## Database (Supabase)

- **DB スキーマ変更は自動実行しない**。変更が必要なら、べき等な SQL を提示して止まる。ユーザーが Supabase Dashboard で手動実行する。
- `profiles` テーブルを触る際は特に慎重に。plan 関連カラムに影響しないことを確認してから作業する。
- `correction_count` と `translation_count` は独立した列。RPC も別々（`try_use_correction` / `try_use_translation`）。絶対に混在させない。
- Flashcard / 単語帳はどちらのカウンターとも完全に独立。Stripe / billing / plan ロジックには触れない。

---

## Date & timezone

- 「今日」の判定は必ず既存の `todayInTZ(tz)` / `user_tz` cookie の仕組みを使う。
- UTC 固定やコンポーネントのマウント時固定にしない（過去に streak がズレた／全員リセットされた事故あり）。

---

## i18n

- 9 locales: `en es fr zh ko ja de it`（+ `pt` partial）。Default: `en`。
- `en.json` が source of truth — キーを追加するときは英語から先に。他言語は後で追加。
- `useT()` — Client Component 用。`getServerT()` — Server Component 用。
- 補間構文: `{variable}`、例: `t("key", { n: 5 })`。
- 日本語学習コンテンツ（例文・ルビ等）は日本語のまま翻訳しない。

---

## UI / Frontend

- 新しい UI 文字列は必ず i18n キーにする。ハードコードしない。
- ふりがなは既存の `buildRubyNotation` を使う。位置がズレないように。
- タップ翻訳（`WordTranslateText`）と範囲選択添削（`PeerCorrections`）のボタンは `display: inline`・padding なしで維持する（padding を付けるとトークン間に隙間ができる）。

---

## Directory structure

```
src/
  app/
    (app)/         # Authenticated pages (diary, feed, history, support, …)
    (auth)/        # Login / signup
    api/           # API routes (correction, translate, translate-text, …)
    page.tsx       # Landing page (Server Component)
  components/      # Shared UI components
  contexts/        # React contexts (locale, auth, …)
  lib/             # Utilities (i18n, plans, lessons, segmenter, …)
  messages/        # i18n JSON files (en, es, fr, zh, ko, ja, de, it)
public/            # Static assets
supabase/          # SQL migration scripts (run manually in Supabase Dashboard)
```

---

## Key components

| Component | Notes |
|---|---|
| `src/components/ui.tsx` | `Card` (`accent?: "pine"\|"apricot"\|"none"`), `Button`, `Badge`, `SectionLabel` |
| `src/components/WordTranslateText.tsx` | Tap-to-translate（TinySegmenter、inline ボタン、padding なし） |
| `src/components/PeerCorrections.tsx` | 範囲選択添削 UI（同じ inline ボタンパターン） |
| `src/components/LandingPageNew.tsx` | 現行ランディングページ |
| `src/components/LandingOriginal.tsx` | LP バックアップ — `page.tsx` で差し替えると元に戻る |
| `src/lib/segmenter.ts` | TinySegmenter ラッパー（`segmentJapanese()`） |

---

## Design tokens (Tailwind)

- Background: `bg-cream`（`--color-cream: #fafafa`）
- Primary: `pine`（濃い緑）、`moss`、`mint`（薄い緑）
- Warm accent: `apricot`
- Text: `ink`、`muted`
- Card accent ルール: pine = 情報系、apricot = streak / 進捗系、none = 濃い背景のカード

---

## iOS (Capacitor)

- `capacitor.config.ts` の `server.url` で `https://nihongodiary.app` を表示するライブサイト方式。
- Web を更新（`main` に push → Vercel デプロイ）すれば iOS にも反映される。
- ネイティブ判定: `window.Capacitor?.isNative` — true のときアップグレード CTA を非表示にする。

---

## Past incidents to avoid repeating

- `profiles.timezone` カラム不在で全ユーザーが Free 扱いになった事故あり → タイムゾーン処理は特に慎重に。
- SQL 文字列 `'pro\n'` の改行混入で plan 誤判定 → plan 文字列は必ず trim する。
- 翻訳 API のキャッシュヒット時にカウントを消費してしまった → キャッシュヒットはカウント対象外にする。
