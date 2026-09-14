// サイト全体の設定。会社情報は HANDOVER.md 4章の記載をそのまま使う（改変しない）
export const SITE = {
  // 公開URL。独自ドメイン(baikyaku.jap-ser.com)に切り替えるときはここと public/CNAME を変える
  url: 'https://jap-ser.github.io',
  name: '金沢の不動産相場と売却・買取 | ジャパンサービス',
  shortName: '金沢 不動産相場・売却',
  description:
    '金沢市・野々市市・白山市・津幡町・かほく市・能美市・小松市・羽咋市の町名別の不動産相場を、国土交通省の取引データから毎月更新。仲介と自社買取の両方をご提案します。',
  locale: 'ja_JP',
};

export const COMPANY = {
  name: '有限会社ジャパンサービス',
  rep: '中橋康太',
  address: '石川県金沢市西都2丁目162番地',
  tel: '076-267-8552',
  telLink: 'tel:0762678552',
  hours: '月〜金 9:00〜18:00',
  founded: '平成元年1月25日',
  license: '石川県知事（9）第2427号',
  website: 'https://www.jap-ser.com/',
  line: 'https://lin.ee/kzL45s6',
  business: '売買仲介・買取再販・賃貸管理・民泊運営（Weskii）',
};

// 問い合わせフォームの送信先。買取LP（karte\kaitori-lp）と同じ Google Apps Script「買取LP 査定フォーム受付」。
// 受信内容はスプレッドシート「買取LP 査定依頼」に1行追記され、kota0206h7@gmail.com と jap-ser@outlook.jp にメール通知が届く。
// 空にするとフォームは「入力内容をコピーしてLINEへ」の動きになる
export const FORM = {
  endpoint: 'https://script.google.com/macros/s/AKfycbze4WUc7JxkAOtDUk3HdGSvBujfpt23zY3w5bjJCJ1-vm5B3Nbeaxu_fnj4wW87HB1y/exec',
};

// 解析タグ。空なら出力しない
export const ANALYTICS = {
  ga4Id: '', // 例: 'G-XXXXXXXXXX'
  searchConsoleMeta: '', // HTMLタグ方式の所有権確認コード（content属性の値）
};

export const DATA_SOURCE = '出典：国土交通省 不動産情報ライブラリ（不動産取引価格情報）';

export type CityKey =
  | 'kanazawa' | 'nonoichi' | 'hakusan' | 'tsubata'
  | 'kahoku' | 'nomi' | 'komatsu' | 'hakui';

export const CITIES: { key: CityKey; name: string; code: string; reading: string }[] = [
  { key: 'kanazawa', name: '金沢市', code: '17201', reading: 'かなざわし' },
  { key: 'nonoichi', name: '野々市市', code: '17212', reading: 'ののいちし' },
  { key: 'hakusan', name: '白山市', code: '17210', reading: 'はくさんし' },
  { key: 'tsubata', name: '津幡町', code: '17361', reading: 'つばたまち' },
  { key: 'kahoku', name: 'かほく市', code: '17209', reading: 'かほくし' },
  { key: 'nomi', name: '能美市', code: '17211', reading: 'のみし' },
  { key: 'komatsu', name: '小松市', code: '17203', reading: 'こまつし' },
  { key: 'hakui', name: '羽咋市', code: '17207', reading: 'はくいし' },
];

export const TYPE_LABEL = { land: '土地', house: '戸建（土地と建物）', condo: 'マンション' } as const;
export type TypeKey = keyof typeof TYPE_LABEL;
