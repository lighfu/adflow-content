# AdRay Content

AdRay 広告プラットフォームの**配信元**リポジトリ。広告の画像とメタデータを置くだけで、
GitHub Pages 経由の静的 CDN として `manifest.json` と画像が配信されます。

- 配信 URL（manifest）: `https://lighfu.github.io/adray-content/manifest.json`
- 画像 URL 例: `https://lighfu.github.io/adray-content/ads/<id>/<file>`

SDK（`adray-sdk`）がこの `manifest.json` を取得し、スロット戦略に従って広告を選択・表示・計測します。

## 広告を追加する（画像＋メタデータを置くだけ）

1. `ads/<ad-id>/` ディレクトリを作る（`<ad-id>` は英小文字・数字・ハイフン。`manifest` 内の一意キー）。
2. そこに画像（`banner.svg` / `.png` / `.jpg` 等）と `ad.json` を置く。
3. `node tools/generate-manifest.mjs` を実行して `manifest.json` を再生成する。
4. commit & push する。CI が検証し GitHub Pages へ反映する。

> 管理ダッシュボード（`adray-dashboard`）を使うと 1〜4 を GUI から `gh`/git 自動操作で行えます。

## `ad.json` の書式

`schema/ad.schema.json` が正式なスキーマです。主なフィールド:

| フィールド | 意味 |
|---|---|
| `id` | 広告 ID（ディレクトリ名と一致） |
| `type` | 広告フォーマット種別: `banner` / `square` / `text` / `native` |
| `enabled` | 配信有効フラグ |
| `weight` | `rotate`/`weighted` スロットでの重み |
| `creative.image` | 画像ファイル名（相対）。`manifest` 生成時に `ads/<id>/<file>` へ正規化 |
| `creative.width/height/alt/text/cta` | 表示メタ（`text`/`native` は `text`/`cta` を使用） |
| `clickUrl` | クリック遷移先 URL |
| `analytics.ga.impressionEvent/clickEvent/params` | GA4 に送るイベント名とパラメータ |

## `manifest.json`（生成物）

`tools/generate-manifest.mjs` が `ads/*/ad.json` を走査して生成します。手編集しないでください。

- `slots`: どのスロットにどの広告をどの戦略（`single`/`rotate`/`weighted`）で出すか。
  既存 `manifest.json` の `slots` は再生成でも維持されます（スロット割当はここを編集）。
- `ads`: 各広告の正規化済みメタデータ。

## GA4 計測について

イベント名・パラメータは `ad.json` 側で自由に変更できます（アプリ更新不要）。
GA4 の `measurement_id` / `api_secret` は**このリポジトリには置かず**、広告を表示するホスト
アプリ（WinRay 等）の設定で保持します。

## ライセンス

このリポジトリのコード（スキーマ・生成スクリプト）は MIT。広告クリエイティブ（画像）の
権利は各出稿者に帰属します。
