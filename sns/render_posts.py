# -*- coding: utf-8 -*-
"""
sns/posts.json の各投稿について、画像カード(1080x1080)と本文テキストを sns/out/<id>/ に書き出す。
  python sns/render_posts.py            … status が draft/ready の投稿を全部
  python sns/render_posts.py <id>       … 指定した投稿だけ
出力:
  sns/out/<id>/card.jpg        … Instagram/Facebook に添付する画像
  sns/out/<id>/instagram.txt   … Instagram 用本文（ハッシュタグ付き。リンクは貼れないので「プロフィールのリンク、または公式LINE」）
  sns/out/<id>/facebook.txt    … Facebook 用本文（記事URL・LINE・電話付き。写真がある投稿は「※写真はイメージです」を付ける）
"""
import json, os, subprocess, sys, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HP = 'https://jap-ser.github.io'          # 相場サイト（記事は HP + article、例: /guide/souzoku/）
LINE = 'https://lin.ee/kzL45s6'
TEL = '076-267-8552（平日9:00〜18:00）'
posts = json.load(io.open(os.path.join(ROOT, 'sns', 'posts.json'), encoding='utf-8'))
only = sys.argv[1] if len(sys.argv) > 1 else None

for p in posts:
    if only and p['id'] != only:
        continue
    if not only and p.get('status') not in (None, 'draft', 'ready'):
        continue
    d = os.path.join(ROOT, 'sns', 'out', p['id'])
    os.makedirs(d, exist_ok=True)
    cmd = [sys.executable, os.path.join(ROOT, 'sns', 'make_card.py'),
           '--title', p['title'], '--lines', *p['lines'], '--out', os.path.join(d, 'card.jpg')]
    if p.get('photo'):
        cmd += ['--photo', os.path.join(ROOT, p['photo'])]
        if p.get('focus') is not None:
            cmd += ['--focus', str(p['focus'])]
    if p.get('badge'):
        cmd += ['--badge', p['badge']]
    subprocess.check_call(cmd)

    ig = p['caption'] + '\n\n' + p['hashtags']
    fb = (p['caption'].replace('プロフィールのリンク、または公式LINEから', '下のリンク（LINE）または電話から')
          + '\n\n▶ 記事: ' + HP + p['article']
          + '\n▶ 無料査定・ご相談（LINE）: ' + LINE
          + '\n▶ 電話: ' + TEL)
    if p.get('photo'):
        fb += '\n\n※写真はイメージです'
    io.open(os.path.join(d, 'instagram.txt'), 'w', encoding='utf-8', newline='\n').write(ig)
    io.open(os.path.join(d, 'facebook.txt'), 'w', encoding='utf-8', newline='\n').write(fb)
    print('rendered', p['id'], '(caption %d chars)' % len(p['caption']))
