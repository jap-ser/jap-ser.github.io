// AI検索（ChatGPT・Perplexity・GoogleのAI概要など）向けのサイト案内 /llms.txt。
// 会社情報・ページ一覧は site.ts とガイド記事から自動で作る（手で数字や会社情報を書かない）
import { getCollection } from 'astro:content';
import { SITE, COMPANY, CITIES, DATA_SOURCE } from '../config/site';

export async function GET() {
  const guides = (await getCollection('guide'))
    .filter((g) => g.data.reviewed)
    .sort((a, b) => a.data.order - b.data.order);
  const u = (p: string) => new URL(p, SITE.url).href;
  const lines = [
    `# ${SITE.siteName}`,
    '',
    `> ${SITE.description}`,
    '',
    `運営: ${COMPANY.name}（代表 ${COMPANY.rep}）／${COMPANY.address}／TEL ${COMPANY.tel}（${COMPANY.hours}）／宅地建物取引業 ${COMPANY.license}`,
    `事業: ${COMPANY.business}`,
    `相場データ: ${DATA_SOURCE}を当社で町名別に集計し、毎月更新。`,
    '当社買取は査定・物件確認のうえで判断します。買取の場合も仲介手数料が発生する取引があります。',
    '',
    '## 市町別の相場',
    ...CITIES.map((c) => `- [${c.name}の不動産相場](${u(`/${c.key}/`)}): ${c.name}の町名別の土地・戸建・マンションの取引価格`),
    '',
    '## 売却ガイド',
    ...guides.map((g) => `- [${g.data.title}](${u(`/guide/${g.id}/`)}): ${g.data.description}`),
    '',
    '## ご相談',
    `- [買取について](${u('/kaitori/')})`,
    `- [よくあるご質問](${u('/faq/')})`,
    `- [ご相談・査定フォーム](${u('/contact/')})`,
    `- [会社概要](${u('/company/')})`,
    `- [公式LINE](${COMPANY.line})`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
