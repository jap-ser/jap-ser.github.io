# ジャパンサービス Instagram / Facebook 投稿の仕組み（売却ガイド記事の焼き直し）

目的: 売主（売りたい人・仲介を頼みたい人）からの相談を増やす。買主向けは副次的。相場サイト（https://jap-ser.github.io ）のガイド記事（/guide/）を1本ずつ「投稿」に焼き直して、Instagram と Facebook に同時投稿する。追加費用ゼロ。
golfprime-lp/sns と同じ仕組み。

※ 同じリポジトリの `scripts/social/`（run-social.bat）は「町名別の相場カード」を Graph API で自動投稿する別の仕組み。こちら（sns/）は記事ベースの投稿を Meta Business Suite から手で行う用。混ぜないこと。

## 2026-10-05 から「予約投稿」方式（康太さん指示「まとめて予約投稿にして」）
- 毎日1件ずつ公開する方式は、PC・アプリが動いていない日／Fableの利用枠切れ／自動モードの安全判定で公開が止まる日に抜けた（9/18〜10/4 の17日で7件）。そこで Meta Business Suite の「日時を設定」で先の日付の 20:00 にまとめて予約する方式に変えた。予約済みの投稿は Meta 側が時間どおりに出すので、PCが止まっていても出る
- posts.json の status: draft（未予約）→ scheduled（予約済み。scheduled_for に "YYYY-MM-DD HH:MM"）→ posted（公開確認済み）
- 予約を記録する: `python sns/mark_scheduled.py <id> "YYYY-MM-DD 20:00"`、一覧: `python sns/mark_scheduled.py --list`
- 2026-10-05 に 21件を 10/5〜10/25 の毎日 20:00 に予約済み（予約一覧で21件・重複なし・本文末尾まで入っていることを確認）
- 予約済みの確認: https://business.facebook.com/latest/posts/scheduled_posts?asset_id=474278865778411 （「日時指定済み」タブ。下までスクロールすると全件出る）
- 予約済み投稿の本文を直す: 一覧の行の「…」→ 右矢印キーでサブメニュー → 「投稿の編集」（Enter）→ 直して「日時を指定」。サブメニューに「投稿を削除」もあるので座標クリックはしない
- 毎日20時の japanservice-sns-post は「公開されたかの確認・数字の記録・予約の補充（残り3件以下になったら最大7件）」だけを行う。**scheduled の投稿をもう一度投稿しない**
- 予約の操作手順と、はまりどころ（本文は貼り付けで入れる／日時はTabキーで順に入れる／Edgeが他の窓の裏に完全に隠れると操作が止まる）は下の「予約投稿の操作メモ」

## アカウント（2026-09-17 時点）
- Facebookページ「金沢市の不動産会社 ジャパンサービス」（ページID 61572478978322）
- Instagram「japan_service_fudosan」（**ページと未連携**。2026-09-24確認: アカウントセンターには今のFB「ナカハシ コウタ」・IG・ページが同居していて整理済み。IGはビジネスアカウント。それでもBusiness Suiteの「Instagramをリンク」とFacebookページ設定の「リンク済みのアカウント→アカウントをリンク」の両方で「現在、Instagramプロフィールをページにリンクできません」と出る。次の手: iPhoneのInstagramアプリ 設定→ビジネスツールと管理→Facebookページに接続 で試す。別ページに接続済みなら先に解除。それでも駄目なら数日おいて再試行）
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
- 2026-09-25 康太さん指示「毎回自動にして」: 定期タスク japanservice-sns-post は公開・posts.json更新・git push まで確認なしで自動実行する。宣伝（有料）だけは押さない
- 2026-09-30: 「ローン返済中でも売れます」（2026-09-24-loan）は、画像と本文まで入れたが「公開する」のクリックが自動モードの安全判定で止められ、未公開。Meta Business Suite の「下書き」に保存してある（posts.json は draft のまま）。康太さんが下書きから公開した場合は、posts.json を posted に直してから次の投稿へ進むこと（公開済み一覧に同じ本文があれば二重投稿しない。残った下書きは康太さんに確認）
- 2026-10-04: 上記の下書きを「下書き」タブ →「投稿の編集」→「公開する」で公開できた（画像・本文は下書きのまま使えるので再アップロード不要）。Business Suite の下書きは0件に戻り、posts.json も posted に更新済み。下書き編集画面には「宣伝」スイッチ自体が出ない

## 予約投稿の操作メモ（2026-10-05 に21件予約して分かったこと）
1件ごとの流れ: composer を開く → 画像アップロード → 本文 → 「日時を設定」オン → 日付・時刻 → 「日時を指定」。
- **本文は type（1文字ずつ入力）で入れない**。URLの行のあたりで末尾が欠けることがある（10/5 20時分は電話番号が欠け、あとで編集して直した）。javascript_tool で貼り付けイベントを送ると全文が一度に入る:
  `const e=document.querySelector('[contenteditable=true]'); e.focus(); const dt=new DataTransfer(); dt.setData('text/plain', text); e.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));`
  入れたあと `e.textContent.length`（改行を除いた文字数）と `e.querySelectorAll('[data-block=true]').length`（行数）を facebook.txt と照合する。貼り付けは「追記」になるので、入れ直すときは本文欄をクリック → Ctrl+A → Delete で空にしてから
- 「日時を設定」スイッチは `document.querySelector('input[aria-label="日時を設定"]').click()` でオンにできる
- **日時はキーボードで順に入れる**: 日付欄（placeholder が yyyy/mm/dd）を実クリック → Ctrl+A → `2026/10/12` → Tab（日付が確定し「時間」欄へ）→ `20` → Tab（「分」欄へ）→ `00`。JS の focus() だけではキー入力が届かないので、最初の1回は実クリックが必要
- 日付欄の位置はスクロールで動く。クリック前に、日付欄の祖先のスクロール領域を全部いちばん下まで送ってから（`scrollTop = scrollHeight`）、getBoundingClientRect で位置を取ってクリックする。ref 指定のクリックや scroll_to 直後のクリックは外れることがある
- クリックやキー入力は取りこぼされることがあるので、「いま日付欄にフォーカスがあるか」「日付・20:0・本文の文字数と行数・画像あり・宣伝オフ」を javascript_tool で確かめ、違っていたら `throw` する（browser_batch は最初のエラーで止まるので、確認に通ったときだけ「日時を指定」が押される）
- 「日時を指定」を押したあとは、「投稿の日時が指定されました」のダイアログが出るか、カレンダー（content_calendar）に移動すれば成功。ダイアログには有料の宣伝（¥500など）の案内が付くことがあるので「宣伝」は押さない（閉じなくても、次の composer を開けばよい）
- javascript_tool の中で `await setTimeout` を使わない（裏に回ったタブではタイマーが遅くなり45秒で時間切れになる）
- **Edge が他のウィンドウ（Claudeアプリなど）の裏に完全に隠れる、または自分のタブが前面でないと、document.visibilityState が hidden になり、クリック・キー入力・スクリーンショットが止まったり取りこぼされたりする**。対策: (1) 自分のタブに目印のタイトルを付け、Windows の UI Automation（TabItem を名前で探して SelectionItemPattern.Select()）で前面のタブにする（キー送信でのタブ切替はClaudeアプリにキーが飛ぶのでやらない）。(2) Edge のウィンドウを SetWindowPos（最前面・フォーカスは奪わない）で画面の右端に 70px だけ見える位置に置く。終わったら元の位置・最大化に戻す
- 他のセッションが同じ Edge を使っていると、タブの前面を取り合う。重い作業は他のブラウザ作業と時間をずらす
- composer に入力途中の内容があるままタブを閉じたり移動したりすると「このサイトを離れますか？」で止まる
