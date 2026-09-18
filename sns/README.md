# ジャパンサービス Instagram / Facebook 投稿の仕組み（売却ガイド記事の焼き直し）

目的: 売主（売りたい人・仲介を頼みたい人）からの相談を増やす。買主向けは副次的。相場サイト（https://jap-ser.github.io ）のガイド記事（/guide/）を1本ずつ「投稿」に焼き直して、Instagram と Facebook に同時投稿する。追加費用ゼロ。
golfprime-lp/sns と同じ仕組み。

※ 同じリポジトリの `scripts/social/`（run-social.bat）は「町名別の相場カード」を Graph API で自動投稿する別の仕組み。こちら（sns/）は記事ベースの投稿を Meta Business Suite から手で行う用。混ぜないこと。

## アカウント（2026-09-17 時点）
- Facebookページ「金沢市の不動産会社 ジャパンサービス」（ページID 61572478978322）
- Instagram「japan_service_fudosan」（2026-09-18時点で**ページと未連携**。IG側のアカウントセンターが停止中の旧FBアカウント「シゲヨシ コウタ」に紐付いているのが原因。康太さんがIGアプリのアカウントセンターで旧FBを削除→ページを持つ今のFBを追加すれば連携できる見込み）
- どちらも康太さんのFacebookアカウントで Meta Business Suite（https://business.facebook.com/latest/composer ）から投稿できる。開いたら左上でこのページが選ばれていることを確認する

## 会社情報（これ以外の事実は書かない。src/config/site.ts と HANDOVER.md 4章より）
- 有限会社ジャパンサービス / 代表 中橋康太 / 石川県金沢市西都2丁目162番地 / TEL 076-267-8552 / 石川県知事（9）第2427号
- 公式LINE https://lin.ee/kzL45s6 / 相場サイト https://jap-ser.github.io / 買取LP https://jap-ser.github.io/kaitori-lp/
- 事業: 売買仲介・買取再販

## ファイル
- `posts.json` … 投稿の予定表。1件= id（日付-テーマ）/ photo（元写真。空なら写真なしのテーマ文字パネル）/ focus（縦長写真の切り出し位置 0〜1。人物は0.12、建物・街並みは0.5）/ badge（写真なし版で大きく出すテーマ）/ title・lines（画像カードの文字）/ caption（本文）/ article（記事パス、例 /guide/souzoku/）/ hashtags / reason（この記事を選んだ理由）/ status（draft → posted）
- `make_card.py` … 写真+文字の1080x1080画像カードを作る（Pillow、Windows標準フォント BIZ UDゴシック）。ブランド色はサイトと同じ緑 #2f6f5e
- `render_posts.py` … posts.json から `out/<id>/card.jpg`・`instagram.txt`・`facebook.txt` を生成
- `photos/` … カードに使う写真。今は `street-houses.jpg`（Pexels の住宅街写真、商用可・クレジット不要）の1枚だけ
- `out/` … 生成物（gitには入れない。.gitignore 済み）

### 写真について
- `public/img/*.jpg`（サイトのAI生成写真）は全部 328x400 で、1080px幅のカードには小さすぎるので使っていない
- 写真は幅800px以上のものだけ使う。写真を増やすときは `sns/photos/` に入れて posts.json の photo に書く。連続する投稿で同じ写真を使わないように回す
- 写真を使う投稿は、カードの右下に小さく「写真はイメージです」が自動で入り、Facebook本文の末尾にも「※写真はイメージです」が付く

## 投稿の手順
1. `python sns/render_posts.py` で当日分を生成（baikyaku-site のフォルダで実行。`python sns/render_posts.py 2026-09-18-souzoku` のようにidを付けると1件だけ）
2. Meta Business Suite の「投稿を作成」を開く（上のURL）。投稿先に Facebookページ と Instagram の両方が選ばれていることを確認
3. 「写真・動画を追加」→ `out/<id>/card.jpg` をアップロード
4. 本文: Instagram/Facebook 別々に設定できるので、それぞれ `instagram.txt` / `facebook.txt` を貼る（Instagramは本文にURLを貼れないため「プロフィールのリンク、または公式LINEから」表現。Instagramのプロフィールのリンクは公式LINEか相場サイトにしておく）
5. 「公開する」
6. posts.json の status を posted に変え、投稿URLがあれば `posted_url` に記録

## ネタの作り方（1日1本）
- ガイド記事（src/content/guide/*.md、16本・reviewed: true）の結論を3行にまとめてカードの lines にする。本文は 結論 → 理由2〜4行 → 「当社は仲介と買取の両方を扱い、査定・物件確認のうえでご提案します」 → 「無料査定・ご相談はプロフィールのリンク、または公式LINEから。」の順で300〜450字
- title は12字以内、lines は各20字以内（それ以上だとカードの文字が折り返してフッターに重なる。はみ出すと render 時に WARNING が出る）
- 記事URLは `https://jap-ser.github.io/guide/<slug>/`（末尾スラッシュあり。dist/guide/<slug>/index.html の canonical で確認済み）
- 最初の7本は 相続 / 空き家 / 古家付き土地 / 費用と税金 / 査定書の見方 / 住み替え / 住宅ローンが残っている家。残りの記事（遠方・離婚・施設入所・分筆共有・オーナーチェンジ・農地・空き店舗・任意売却・境界測量）を次のローテーションに使う
- 季節ネタ（雪の前の空き家点検、年末の相続の話し合い、年度替わりの住み替え）も同じ型で書ける
- ハッシュタグは必ず #金沢不動産 #不動産売却 #金沢市 #ジャパンサービス を入れ、テーマのタグを4〜6個足す

## 表現ルール（HANDOVER.md 5章。必ず守る）
- 根拠のない数字・保証を書かない（「必ず買い取ります」「最短◯日で現金化」「相場の◯%で買取」禁止）。買取は「査定・物件確認のうえで判断」
- 架空の口コミ・実績を書かない。「金沢で一番」「No.1」禁止。ジャパンオークションに触れない
- 個別物件の写真・価格・所在を出さない（宅建業法の広告表示を避けるため、お役立ち情報のみ）。「仲介手数料なし」と書かない（当社買取でも手数料はかかる）
- 相場の数字を書くときは出典「国土交通省 不動産情報ライブラリ」を添える（数字を使わない投稿でよい）
- 絵文字なし。です・ます調
- 写真を使うときは「写真はイメージです」を必ず入れる

## 注意
- Chromeの拡張機能経由でのファイルアップロードは、環境によってブロックされることがある。その場合はカードを生成したうえで、康太さんにアップロードだけ頼む
- Chromeのウィンドウが最小化されていると操作できない（画面サイズ0になる）
- 画像アップロードのコツ(2026-09-17に成功した方法): 「写真・動画を追加」ボタンをクリックすると
  Windowsのファイル選択ダイアログが開いてChromeが固まる。クリックせず、javascript_tool で
  `HTMLInputElement.prototype.click` を一時的に差し替えて file input を捕まえ、`document.body` に
  appendChild してから mcp__claude-in-chrome__file_upload でアップロードする。
  固まったら、そのタブを閉じて新しいタブで開き直す
- 「FacebookとInstagram用の投稿をカスタマイズ」をオンにすると Facebook / Instagram のタブが出る。
  各タブのテキスト欄にそれぞれ facebook.txt / instagram.txt を入れる
- 公開後は「他に公開したい投稿はありますか？」ダイアログが出る=公開成功。「後で」で閉じる
- 投稿は必ず人が確認してから公開する（自動公開しない）。git への commit / push も康太さんの確認後に行う
