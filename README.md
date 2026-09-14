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

## 設定を変える場所

- 会社情報・LINE・フォームID・GA4：`src/config/site.ts`
- 公開URL：`src/config/site.ts` の `SITE.url`、`astro.config.mjs` の `site`、`public/robots.txt`。独自ドメイン化するときは `public/CNAME` に `baikyaku.jap-ser.com` を1行書く
- 町名ページを作る最低件数（既定3件/3年）：`scripts/aggregate.mjs` の `MIN_TOWN_3Y`
- ガイド記事：`src/content/guide/*.md`。本人が目視したら frontmatter の `reviewed: true` にする（それまで noindex）

## データの現状（2026-09-14）

- 国交省サイトのCSV（石川県・2021Q1〜2026Q1、取引価格＋成約価格・全種別）を `data/csv/` に取得し取り込み済み（13,171件、町名ページ567件、最新期 2026年第1四半期）
- APIキーが届いたら `npm run data:fetch` に切り替える（CSV取り込みはつなぎ）
- 解説文（data/text）は **未生成**。Claude Code CLI のログインが切れていたため（karteclaude-login.bat で再ログイン後に `npm run data:text`）
- git 初期化・初回コミット済み。GitHub 組織 jap-ser ができたら remote を追加して push するだけ

## 康太さんにやってもらうこと（進捗）

- [ ] **karteclaude-login.bat をダブルクリックして Claude Code に再ログイン**（解説文生成と、カルテのAI抽出の両方に必要）

- [ ] 国交省 不動産情報ライブラリ API 利用申請（5営業日目安）→ 届いたら `karte\.env` に `MLIT_API_KEY=...`
- [ ] GitHub 組織 `jap-ser` を作成（golfprime-nishiinter アカウントで）→ リポジトリ `jap-ser.github.io`（Public）
- [ ] Formspree アカウント作成 → フォームIDを `src/config/site.ts` の `formspreeId` に
- [ ] jap-ser.com のDNS管理者を確認 → CNAME `baikyaku` → `jap-ser.github.io`
- [ ] Search Console / GA4（任意）
- [ ] 実績記録の初期データ（あれば）
