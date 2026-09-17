# -*- coding: utf-8 -*-
"""
Instagram / Facebook 投稿用の画像カード（1080x1080）を作る。追加費用ゼロ（Pillow + Windows標準フォント）。
有限会社ジャパンサービス（金沢市）用。golfprime-lp/sns/make_card.py をブランド差し替えしたもの。

使い方:
  python sns/make_card.py --photo sns/photos/street-houses.jpg --title "相続した家、何から順に" --lines "まず相続人全員で売ると決める" "相続登記は義務、原則3年以内" --out sns/out/test.jpg
  python sns/make_card.py --badge "空き家" --title "空き家、置いたままの負担" --lines ... --out sns/out/test2.jpg   （写真なし版）
  python sns/make_card.py --photo ... --footer "有限会社ジャパンサービス｜金沢市西都2丁目162｜石川県知事(9)第2427号"

写真がある場合: 上半分に写真を敷き、右下に小さく「写真はイメージです」を入れる。
写真がない場合: 上半分をサイトと同じ薄いミスト色のパネルにして、テーマの大きな文字（--badge）を置く。
下半分はブランド色（HPと同じ緑 #2f6f5e）のグラデーション帯と文字。
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont

FONT_B = r'C:\Windows\Fonts\BIZ-UDGothicB.ttc'
FONT_R = r'C:\Windows\Fonts\BIZ-UDGothicR.ttc'
BRAND = (47, 111, 94)        # #2f6f5e サイトの --brand
BRAND_DEEP = (35, 84, 72)    # #235448 サイトの --brand-deep
BRAND_LIGHT = (72, 142, 121) # 帯の下端に向けて少し明るく
MIST = (238, 244, 241)       # 写真なし版の上パネル
INK = (29, 51, 72)           # #1d3348 サイトの --ink
W = H = 1080
PHOTO_H = 600

def font(path, size):
    return ImageFont.truetype(path, size)

def fit_lines(draw, text, f, max_w):
    """日本語は単語区切りが無いので1文字ずつ折り返す"""
    lines, cur = [], ''
    for ch in text:
        if draw.textlength(cur + ch, font=f) > max_w and cur:
            lines.append(cur); cur = ch
        else:
            cur += ch
    if cur:
        lines.append(cur)
    return lines

def fit_font(draw, text, path, size, max_w, min_size=18):
    """max_w に収まるまでフォントを小さくする（フッターの1行用）"""
    while size > min_size:
        f = font(path, size)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 1
    return font(path, min_size)

def cover(im, w, h, focus=0.12):
    """focus: 縦長写真をどの高さで切り出すか（0=上端、0.5=中央、1=下端）。人物は0.12前後、建物や街並みは0.5前後"""
    r = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)
    x = (im.width - w) // 2; y = int((im.height - h) * focus)
    return im.crop((x, y, x + w, y + h))

def draw_photo_top(canvas, photo_path, focus):
    photo = cover(Image.open(photo_path).convert('RGB'), W, PHOTO_H, focus)
    canvas.paste(photo, (0, 0))
    d = ImageDraw.Draw(canvas, 'RGBA')
    # 右下に小さく「写真はイメージです」（半透明の黒帯で読めるように）
    nf = font(FONT_R, 22)
    note = '写真はイメージです'
    tw = d.textlength(note, font=nf)
    x1, y1 = W - 30, PHOTO_H - 150
    d.rounded_rectangle((x1 - tw - 28, y1 - 34, x1, y1), radius=8, fill=(0, 0, 0, 120))
    d.text((x1 - tw - 14, y1 - 30), note, font=nf, fill=(255, 255, 255, 235))

def draw_panel_top(canvas, badge, kicker):
    """写真なし版: ミスト色パネル + 薄い緑の円 + テーマの大きな文字"""
    d = ImageDraw.Draw(canvas, 'RGBA')
    d.rectangle((0, 0, W, PHOTO_H), fill=MIST)
    d.ellipse((700, -220, 1300, 380), fill=(47, 111, 94, 26))
    d.ellipse((-160, 300, 360, 820), fill=(47, 111, 94, 22))
    d.ellipse((880, 380, 1180, 680), fill=(200, 134, 44, 22))  # サイトの --amber を薄く
    kf = font(FONT_B, 30)
    d.text((60, 180), kicker, font=kf, fill=BRAND)
    d.line([(60, 228), (60 + int(d.textlength(kicker, font=kf)), 228)], fill=BRAND, width=3)
    # テーマ文字。長いときは小さくする（最大 W-120 に収める）
    bf = fit_font(d, badge, FONT_B, 150, W - 120, min_size=80)
    d.text((56, 250), badge, font=bf, fill=INK)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--photo', default='', help='上半分に敷く写真（省略可。省略時はテーマ文字のパネルになる）')
    ap.add_argument('--focus', type=float, default=0.12, help='縦長写真の切り出し位置 0〜1（0.12=上寄せ・人物向き、0.5=中央・建物向き）')
    ap.add_argument('--badge', default='', help='写真なし版で上半分に大きく出すテーマ（例: 相続）')
    ap.add_argument('--kicker', default='金沢の不動産売却ガイド')
    ap.add_argument('--title', required=True)
    ap.add_argument('--lines', nargs='*', default=[])
    ap.add_argument('--footer', default='有限会社ジャパンサービス｜金沢市西都2丁目162｜石川県知事(9)第2427号')
    ap.add_argument('--out', required=True)
    a = ap.parse_args()

    canvas = Image.new('RGB', (W, H), (255, 255, 255))
    if a.photo:
        draw_photo_top(canvas, a.photo, a.focus)
    else:
        draw_panel_top(canvas, a.badge or a.title, a.kicker)

    # 上半分の下端をグラデーションで帯につなぐ
    grad = Image.new('L', (1, 140))
    for i in range(140):
        grad.putpixel((0, i), int(255 * i / 139))
    band = Image.new('RGB', (W, 140), BRAND_DEEP)
    canvas.paste(band, (0, PHOTO_H - 140), grad.resize((W, 140)))

    # 下半分の帯（ブランドの緑のグラデーション）
    for y in range(PHOTO_H, H):
        t = (y - PHOTO_H) / (H - PHOTO_H)
        c = tuple(round(BRAND_DEEP[i] + (BRAND_LIGHT[i] - BRAND_DEEP[i]) * t) for i in range(3))
        ImageDraw.Draw(canvas).line([(0, y), (W, y)], fill=c)

    d = ImageDraw.Draw(canvas)
    # ロゴ（白い角丸の箱に社名）
    logo_f = font(FONT_B, 40)
    logo = 'ジャパンサービス'
    lw = int(d.textlength(logo, font=logo_f))
    d.rounded_rectangle((40, 40, 40 + lw + 40, 112), radius=18, fill=(255, 255, 255))
    d.text((60, 52), logo, font=logo_f, fill=INK)

    y = 640
    tf = font(FONT_B, 72)
    for ln in fit_lines(d, a.title, tf, W - 120):
        d.text((60, y), ln, font=tf, fill=(255, 255, 255))
        y += 86
    y += 14
    lf = font(FONT_R, 44)
    for line in a.lines:
        for ln in fit_lines(d, '・' + line, lf, W - 120):
            d.text((60, y), ln, font=lf, fill=(255, 255, 255))
            y += 58
    if y > H - 118:
        print('WARNING: text reaches footer box (y=%d). Shorten title/lines.' % y)

    # フッター（白い箱に社名・所在地・免許番号。長ければ自動で縮める）
    d.rounded_rectangle((40, H - 110, W - 40, H - 40), radius=20, fill=(255, 255, 255))
    ff = fit_font(d, a.footer, FONT_B, 34, W - 140)
    bbox = d.textbbox((0, 0), a.footer, font=ff)
    th = bbox[3] - bbox[1]
    d.text((70, H - 75 - th // 2 - bbox[1]), a.footer, font=ff, fill=INK)

    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
    canvas.save(a.out, quality=90)
    print('saved', a.out)

if __name__ == '__main__':
    main()
