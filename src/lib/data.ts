// 集計データと生成文章の読み込み・整形ヘルパー
import aggRaw from '../../data/aggregated.json';
import { CITIES, type CityKey, type TypeKey } from '../config/site';

export type Stats = {
  count: number; medianPrice?: number | null; medianTsubo?: number | null;
  p25Tsubo?: number | null; p75Tsubo?: number | null; medianArea?: number | null; medianBuildingYear?: number | null;
};
export type TypeSummary = { y1: Stats; y3: Stats; trend: { pct: number; curCount: number; prevCount: number } | null };
export type Summary = { land: TypeSummary; house: TypeSummary; condo: TypeSummary; total3y: number; total1y: number };
export type QuarterRow = { period: string; label: string } & Record<TypeKey, { count: number; medianTsubo: number | null; medianPrice: number | null }>;
export type Town = { name: string; slug: string; hasPage: boolean; summary: Summary; quarterly?: QuarterRow[] };
export type City = { key: CityKey; name: string; code: string; records: number; summary: Summary; quarterly: QuarterRow[]; towns: Record<string, Town>; townCount: number; pageCount: number };
export type Aggregated = { generatedAt: string; latestPeriod: string; latestPeriodLabel: string; windowY1: string; windowY3: string; sample: boolean; totalRecords: number; cities: Record<CityKey, City> };

export const agg = aggRaw as unknown as Aggregated;
export const isSample = !!agg.sample;

export function cityList(): City[] {
  return CITIES.map((c) => agg.cities[c.key]).filter(Boolean);
}
export function cityMeta(key: string) { return CITIES.find((c) => c.key === key)!; }

export function townsWithPage(city: City): Town[] {
  return Object.values(city.towns).filter((t) => t.hasPage).sort((a, b) => b.summary.total3y - a.summary.total3y || a.name.localeCompare(b.name, 'ja'));
}
export function townsWithoutPage(city: City): Town[] {
  return Object.values(city.towns).filter((t) => !t.hasPage).sort((a, b) => b.summary.total3y - a.summary.total3y || a.name.localeCompare(b.name, 'ja'));
}

// 生成文章（data/text/*.json）。無ければ null
const textFiles = import.meta.glob('../../data/text/*.json', { eager: true, import: 'default' }) as Record<string, { paragraphs: string[]; summary: string; generatedAt: string }>;
export function textFor(id: string) {
  const hit = Object.entries(textFiles).find(([p]) => p.endsWith(`/${id}.json`));
  return hit ? hit[1] : null;
}

// 実績記録（data/results.json）
import resultsRaw from '../../data/results.json';
export type ResultItem = { date: string; city: string; type: string; kind: '買取' | '仲介'; note: string };
export const results = (resultsRaw as { items: ResultItem[] }).items ?? [];

// 表示用フォーマット
export const yen = (man?: number | null) => (man == null ? '—' : man >= 10000 ? `${(man / 10000).toFixed(man % 10000 === 0 ? 0 : 1)}億円` : `${man.toLocaleString('ja-JP')}万円`);
export const tsubo = (v?: number | null) => (v == null ? '—' : `${v.toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}万円/坪`);
export const sqm = (v?: number | null) => (v == null ? '—' : `${v.toLocaleString('ja-JP')}㎡（約${Math.round(v / 3.30579)}坪）`);
export const pct = (v?: number | null) => (v == null ? null : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);
export const nendo = (y?: number | null) => (y == null ? '—' : `${y}年頃`);

// 町名ページの「近くの町名」: 同じ市町で件数が多い順に n 件（自分を除く）
export function relatedTowns(city: City, self: Town, n = 8): Town[] {
  return townsWithPage(city).filter((t) => t.slug !== self.slug).slice(0, n);
}
