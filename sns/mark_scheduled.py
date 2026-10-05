# -*- coding: utf-8 -*-
"""
Business Suite で予約投稿した投稿を posts.json に記録する。
  python sns/mark_scheduled.py <id> "2026-10-06 20:00"   … status を scheduled にし scheduled_for を書く
  python sns/mark_scheduled.py --list                    … draft / scheduled の一覧
"""
import json, io, os, sys
sys.stdout.reconfigure(encoding='utf-8')
PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'posts.json')
posts = json.load(io.open(PATH, encoding='utf-8'))
if sys.argv[1] == '--list':
    for p in posts:
        if p.get('status') in ('draft', 'scheduled'):
            print(p['id'], p['status'], p.get('scheduled_for', ''), p['title'])
    sys.exit(0)
pid, when = sys.argv[1], sys.argv[2]
hit = [p for p in posts if p['id'] == pid]
assert len(hit) == 1, 'id not found: ' + pid
assert hit[0].get('status') == 'draft', 'not a draft: ' + str(hit[0].get('status'))
hit[0]['status'] = 'scheduled'
hit[0]['scheduled_for'] = when
with io.open(PATH, 'w', encoding='utf-8', newline='\n') as f:
    json.dump(posts, f, ensure_ascii=False, indent=2)
    f.write('\n')
print('scheduled', pid, when)
