# 町名別相場サイト（baikyaku.jap-ser.com 予定）

金沢・石川8市町の町名別不動産相場を国交省データから毎月自動更新し、仲介と自社買取の両方を提示して仕入れ案件を集めるサイト。
設計の背景・ルールは [HANDOVER.md](HANDOVER.md)。**表現ルール（5章）は必ず守る。**

## 決定事項（2026-09-14 康太さん回答）

| 項目 | 決定 |
|---|---|
| 公開先 | GitHub Pages（GitHub組織 **jap-ser** → https://jap-ser.github.io。`japanservice` は取得済みで使えなかった） |
| 独自ドメイン | **baikyaku.jap-ser.com**（DNS管理者が不明のため、まずは github.io で公開し、後からCNAME追加） |
| フォーム | Formspree 無料枠（月50件）。通知先: kota0206h7@gmail.com と jap-ser@outlook.jp |
| 文章生成 | **Claude Code サブスク枠**（このPCで月次実行。Anthropic API は使わない＝追加費用ゼロ） |
| 相場データ | 国交省 不動産情報ライブラリ API（申請中→キーが届いたら `.env` に `MLIT_API_KEY=`） |

## 仕組み

```
[このPC / 毎月2日 04:00]  run-monthly.bat → scripts/monthly.mjs
   fetch.mjs      国交省API → data/raw/*.json（ローカルのみ・gitignore）
   aggregate.mjs  町名×種別で集計 → data/aggregated.json
   generate-text.mjs  Claude Code で解説文 → data/text/*.json（数字が変わった町だけ再生成）
   git commit & push
[GitHub Actions]  .github/workflows/deploy.yml → astro build → GitHub Pages 公開
```

- AIには数字を書かせない。生成文は `generate-text.mjs` がデータ外の数字を含んでいないか検査し、NGなら捨てる
- `data/aggregated.json` に `sample:true` が付いている間は、サイトに赤い帯が出て、GitHub Actions は公開を拒否する

## よく使うコマンド（フォルダ: karte\baikyaku-site）

| やること | コマンド / 操作 |
|---|---|
| ローカルで見る | `preview.bat` をダブルクリック → http://localhost:4321 |
| サンプルデータで見る（開発用） | `npm run data:sample` |
| サンプルを消す | `npm run data:clear-sample` |
| 実データ取得（APIキー必要） | `npm run data:fetch` → `npm run data:aggregate` |
| CSVから取り込み（APIキー待ちのつなぎ） | `node scripts/import-csv.mjs <CSVファイル>` → `npm run data:aggregate` |
| 解説文を生成 | `npm run data:text`（`-- --city kanazawa --limit 20` で絞れる） |
| 月次処理を手動で回す | `run-monthly.bat` |
| 月次タスクを登録 | `setup-monthly-task.bat`（1回だけ） |
| 実績を追加 | `data/results.json` の items に追記して push |

## SNS自動投稿（Facebook・Instagram）

- `scripts/social/make-cards.mjs`：aggregated.json から 1080×1080 の相場カード画像（JPEG）と投稿文を生成。数字はデータからのみ。出力 `public/social/cards/`、投稿文 `data/social/captions.json`
- `scripts/social/post.mjs`：未投稿の町名を1件選ぶ → カード生成 → push（GitHub Pages で画像を公開）→ Facebookページに写真投稿 → Instagram に投稿 → `data/social/log.json` に記録。`--dry-run` で投稿せずに確認
- `run-social.bat`：1回分の投稿。`setup-social-task.bat`：月・水・金 11:30 に自動実行を登録
- 必要な設定（karte\.env）：`FB_PAGE_ID`（ページID 61572478978322 = 「金沢市の不動産会社 ジャパンサービス」）、`FB_PAGE_TOKEN`（ページの長期アクセストークン）、`IG_USER_ID`（InstagramビジネスアカウントのID。無ければFacebookのみ）
- トークンの取り方：Meta for Developers に登録 → アプリ作成（ビジネス）→ Facebookログイン／Instagram Graph API を追加 → グラフAPIエクスプローラで pages_manage_posts, pages_read_engagement, instagram_basic, instagram_content_publish を付けてユーザートークン → 長期化 → /me/accounts でページトークン取得
- 同じ期（latestPeriod）では同じ町名を2回投稿しない。データが更新されると再投稿対象になる

## 設定を変える場所

- 会社情報・LINE・フォームID・GA4・検索結果に出すサイト名（`SITE.siteName`）：`src/config/site.ts`
- ロゴ／ファビコン：`public/logo-source.png`（またはSVG）を置いて `node scripts/make-icons.mjs`
- 公開URL：`src/config/site.ts` の `SITE.url`、`astro.config.mjs` の `site`、`public/robots.txt`。独自ドメイン化するときは `public/CNAME` に `baikyaku.jap-ser.com` を1行書く
- 町名ページを作る最低件数（既定3件/3年）：`scripts/aggregate.mjs` の `MIN_TOWN_3Y`
- ガイド記事：`src/content/guide/*.md`。本人が目視したら frontmatter の `reviewed: true` にする（それまで noindex）

## 検索結果の見た目（サイト名・アイコン）

Google検索で「GitHub」＋GitHubのアイコンと表示されていた件（2026-09-18 対応）。原因は、
`jap-ser.github.io` というURLからGoogleがサイト名を `github.io` のブランド名で推測していたこと。
サイト側からは次の手を入れてある。

- サイト名の申告：トップページだけに `WebSite` 構造化データを出力（`name: ジャパンサービス` /
  `alternateName: 有限会社ジャパンサービス`）。`og:site_name` も `ジャパンサービス` にそろえた
- 会社情報：`RealEstateAgent` 構造化データに `logo`（`/logo.png`）と `@id` を追加
- アイコン：マーク画像から `node scripts/make-icons.mjs` で
  `favicon.ico`（16/32/48px）・`icon-192.png`・`icon-512.png`・`apple-touch-icon.png`・`logo.png` を生成。
  GoogleはまずサイトルートのICOを取りに来るので48px入りの本物のICOにしてある
- ヘッダー左にも同じマークを表示

反映はGoogleの再クロール待ち（数日〜数週間）。Search Console のURL検査でトップページを
「インデックス登録をリクエスト」しておくと早い。**サイト名が確実に変わるわけではない**（Googleの判断）。
確実にしたいなら独自ドメイン `baikyaku.jap-ser.com` への切替が本命。下の「やってもらうこと」のDNS作業。

### ロゴの差し替え（正式ロゴ待ち）

いま入っているマークは**仮**。サイトのブランドカラー（#2f6f5e）で作った家＋Jのマークで、
会社の正式ロゴではない。正式ロゴの画像を受け取ったら：

1. その画像を `public/logo-source.png`（SVGなら `logo-source.svg`）として置く
2. `node scripts/make-icons.mjs` を実行 → favicon.ico / favicon.svg / icon-192 / icon-512 /
   apple-touch-icon / logo.png が全部作り直される
3. HTML側の参照URLは変わらないので、他に直す場所はない。`npm run build` して push

白地のロゴで余白が透明になるのが困るときや、枠いっぱいで窮屈なときはオプションを付ける：

```
node scripts/make-icons.mjs --bg=#ffffff --pad=8
```

**もらいたいデータ**（優先順）：

- SVG / AI / EPS（ベクター）。一番きれい。名刺や看板を作った業者が持っていることが多い
- PNG（背景透過、512px角以上）
- それも無ければ JPG でも可。ただし小さい画像を引き伸ばすとぼやける

**横長のロゴ（社名が横に長く入っているタイプ）はファビコンには向かない**。16pxまで縮むと
文字が読めなくなるため、正方形に収まるマーク部分だけのデータも一緒にもらえると良い。
マーク部分が無い場合は、正式ロゴは `logo.png`（構造化データ・SNS用）に使い、
ファビコンは頭文字だけを抜き出して作る形になる。

## データの現状（2026-09-14）

- 国交省サイトのCSV（石川県・2021Q1〜2026Q1、取引価格＋成約価格・全種別）を `data/csv/` に取得し取り込み済み（13,171件、町名ページ567件、最新期 2026年第1四半期）
- APIキーが届いたら `npm run data:fetch` に切り替える（CSV取り込みはつなぎ）
- 解説文（data/text）は全575件生成済み（Claude Code、数値検査済み）。Claude Code CLI のログインが切れたら karte\claude-login.bat で再ログイン
- git 初期化済み。remote は https://github.com/jap-ser/jap-ser.github.io

## 公開状況（2026-09-14 夜）

- **公開中: https://jap-ser.github.io**（GitHub組織 jap-ser / リポジトリ jap-ser.github.io、Pagesのソースは GitHub Actions）
- 国交省 不動産情報ライブラリ API 利用申請を送信済み（法人・担当 中橋康太・通知先 jap-ser@outlook.jp・5営業日目安）。承認メールが届いたら `karte\.env` に `MLIT_API_KEY=...` を追記 → `setup-monthly-task.bat` で月次タスク登録
- 公式LINEは kzL45s6 に統一
- 問い合わせフォームは買取LPと同じ Google Apps Script（`src/config/site.ts` の `FORM.endpoint`）に送信。受信はスプレッドシート「買取LP 査定依頼」＋メール通知（kota0206h7@gmail.com / jap-ser@outlook.jp）。「ページ」列のURLで相場サイト発かLP発かが分かる。メール件名は Apps Script 側の固定文言（【買取LP】）
- 写真は買取LPに埋め込まれていたもの（AI生成のイメージ写真）を `public/img/` に再利用。各所に「写真はイメージです」を表示
- 当社買取でも仲介手数料はかかる（康太さん指示 2026-09-14）。「仲介手数料なし」とは書かない

## 康太さんにやってもらうこと（進捗）

- [x] Claude Code 再ログイン（2026-09-14 完了）
- [x] 国交省 API 利用申請（2026-09-14 送信済み）→ 承認メールが jap-ser@outlook.jp に届いたら `karte\.env` に `MLIT_API_KEY=...`
- [x] GitHub 組織 `jap-ser` とリポジトリ `jap-ser.github.io`（公開済み）
- [ ] Googleフォームの作成と埋め込み（Formspree は使わない）
- [x] Search Console 登録・所有権確認（HTMLファイル `public/google26c05ca144b0be6a.html`。消さない）、sitemap-index.xml 送信済み（2026-09-14）
- [x] Googleビジネスプロフィール「金沢市不動産売却相談ナビ」のウェブサイトを https://jap-ser.github.io/ に変更（審査待ち）。同プロフィールの郵便番号 920-0811 は 920-8202 が正しい（未修正）
- [ ] jap-ser.com のDNS（WADAX: wadax-sv.jp）に CNAME `baikyaku` → `jap-ser.github.io` を追加 → `public/CNAME` と `SITE.url`・`astro.config.mjs`・robots.txt を切替
- [x] GA4「ジャパンサービス 相場サイト」（プロパティID 554127940、測定ID G-29D3DP7W77、アカウント js）を作成し `src/config/site.ts` に設定（2026-09-15）
- [x] 日次分析タスク `baikyaku-daily-analysis`（毎日18:00、レポートは `karte\baikyaku-reports\`）
- [ ] **会社の正式ロゴの画像を共有**（ベクター＞背景透過PNG 512px角以上）。今のファビコンは仮マーク。
      受け取ったら `public/logo-source.png` に置いて `node scripts/make-icons.mjs` → 詳しくは上の「ロゴの差し替え」
- [ ] 実績記録の初期データ（あれば）
