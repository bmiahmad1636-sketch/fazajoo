/**
 * DS-03 — Deterministic, presentation-only illustrations for wanted OTHER spaces.
 * This module NEVER changes the user's title, listing attributes, matchmaking,
 * persisted data, or finances. Unknown labels keep the original general artwork.
 */
export const OTHER_DEMAND_ART_GROUPS = Object.freeze([
  {
    id: 'aquaculture', label: 'آبزی‌پروری',
    keywords: [
      'استخر پرورش ماهی', 'استخر ماهی', 'پرورش ماهی', 'مزرعه ماهی',
      'آبزی پروری', 'آبزیان', 'پرورش میگو', 'استخر میگو', 'تکثیر ماهی', 'شیلات',
    ],
  },
  {
    id: 'livestock', label: 'دامداری و پرورش',
    keywords: [
      'گاوداری', 'گاو داری', 'دامداری', 'دام پروری', 'دامپروری', 'مرغداری',
      'مرغ داری', 'گوسفندداری', 'گوسفند داری', 'پرورش دام', 'پرورش طیور',
      'شترمرغ', 'اصطبل', 'آغل', 'پرورش گاو', 'پرورش گوسفند',
    ],
  },
  {
    id: 'greenhouse', label: 'گلخانه و کشت',
    keywords: [
      'گلخانه', 'گل خانه', 'نهالستان', 'هیدروپونیک', 'کشت بدون خاک',
      'کشت گلخانه', 'پرورش گل', 'خزانه گل', 'پرورش گیاه',
    ],
  },
  {
    id: 'sports', label: 'ورزشی و تفریحی',
    keywords: [
      'باشگاه بدنسازی', 'باشگاه ورزشی', 'سالن ورزشی', 'سالن فوتسال',
      'زمین بازی', 'پیست کارتینگ', 'کارتینگ', 'پینت بال', 'پینتبال',
      'استخر شنا', 'مجموعه ورزشی', 'باشگاه یوگا', 'زمین تنیس', 'سالن بولینگ',
    ],
  },
  {
    id: 'workshop', label: 'خدماتی و کارگاهی',
    keywords: [
      'قالیشویی', 'قالی شویی', 'کارگاه', 'تعمیرگاه', 'کارواش', 'خشکشویی',
      'چاپخانه', 'سنگبری', 'نجاری', 'صافکاری', 'تولیدی', 'آشپزخانه صنعتی',
    ],
  },
  {
    id: 'events', label: 'فرهنگی و رویدادی',
    keywords: [
      'سالن همایش', 'سالن مراسم', 'سالن کنفرانس', 'تالار', 'آمفی تئاتر',
      'نمایشگاه', 'بازارچه', 'سالن اجتماعات', 'گالری هنری', 'فضای رویداد',
    ],
  },
  {
    id: 'care', label: 'نگهداری و مراقبت',
    keywords: [
      'پانسیون حیوانات', 'نگهداری حیوانات', 'مهد کودک', 'مهدکودک',
      'خانه سالمندان', 'مرکز توانبخشی', 'درمانگاه', 'کلینیک', 'مرکز مراقبت',
    ],
  },
  {
    id: 'logistics', label: 'لجستیک و محوطه',
    keywords: [
      'بارانداز', 'پایانه بار', 'ترمینال بار', 'محوطه دپو', 'دپوی کانتینر',
      'پارکینگ ناوگان', 'انبار روباز', 'توقفگاه کامیون', 'توقفگاه تریلی',
    ],
  },
]);

const GENERAL = Object.freeze({id:'general', label:'سایر فضاها', src:'/images/fj-demand-other.svg'});
const normalize = value => String(value ?? '')
  .normalize('NFKC')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/ۀ/g,'ه')
  .replace(/[\u200c\u200d\u0640]/g,' ')
  .replace(/[ًٌٍَُِّْ]/g,'')
  .replace(/[^\p{L}\p{N}]+/gu,' ')
  .replace(/\s+/g,' ').trim().toLocaleLowerCase('fa-IR');

// Match whole words/phrases only. Avoid false positives (e.g. «استخر» alone
// may be a recreational swimming pool rather than a fish pond).
const containsPhrase = (source, phrase) => {
  if (!source || !phrase) return false;
  return (` ${source} `).includes(` ${phrase} `);
};

function classifyOne(text) {
  const source = normalize(text);
  if (!source) return null;
  // Prefer the longest, most specific hit within this one field.
  let best = null;
  for (const group of OTHER_DEMAND_ART_GROUPS) {
    for (const phrase of group.keywords) {
      const needle = normalize(phrase);
      if (containsPhrase(source,needle) && (!best || needle.length > best.length)) {
        best = { group, length: needle.length };
      }
    }
  }
  return best?.group || null;
}

/** Title first; user-entered request details second. No AI/network calls. */
export function resolveOtherDemandArt(listing = {}, request = null) {
  const group = classifyOne(listing.title)
    || classifyOne(listing.customCategory)
    || classifyOne(request?.requestText)
    || classifyOne(request?.requirements);
  if (!group) return GENERAL;
  return {id:group.id,label:group.label,src:`/images/fj-demand-other-${group.id}.svg`};
}
