'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchBlocks, fetchBookStructure, type Block, type BookStructure } from '@/lib/realApi';

// ── Constants ─────────────────────────────────────────────────────────────────
const GTSAWIE_BOOK_ID = '6a9e555a1bb1f932d6b8f3f9';

const MONTHS = [
  'መስከረም','ጥቅምት','ኅዳር','ታኅሣሥ','ጥር','የካቲት',
  'መጋቢት','ሚያዝያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጰጉሜ',
];

const DAYS_PER_MONTH: Record<string, number> = {
  'መስከረም':30,'ጥቅምት':30,'ኅዳር':30,'ታኅሣሥ':30,'ጥር':30,'የካቲት':30,
  'መጋቢት':30,'ሚያዝያ':30,'ግንቦት':30,'ሰኔ':30,'ሐምሌ':30,'ነሐሴ':30,'ጰጉሜ':5,
};

const GEZ_NUMS = [
  '፩','፪','፫','፬','፭','፮','፯','፰','፱','፲',
  '፲፩','፲፪','፲፫','፲፬','፲፭','፲፮','፲፯','፲፰','፲፱','፳',
  '፳፩','፳፪','፳፫','፳፬','፳፭','፳፮','፳፯','፳፰','፳፱','፴',
];

// Slot definitions — order 1..9
const SLOT_DEFS: Record<number, { label: string; labelEn: string; color: string; icon: string }> = {
  1: { label: 'ዝካረ / ተዝካር',        labelEn: 'Commemoration',      color: 'border-purple-500 bg-purple-50', icon: '✝️' },
  2: { label: 'ዘነግህ ምስባክ',          labelEn: 'Morning Psalm',       color: 'border-amber-500 bg-amber-50',   icon: '🎵' },
  3: { label: 'ዘነግህ ወንጌል',           labelEn: 'Morning Gospel',      color: 'border-blue-500 bg-blue-50',     icon: '📖' },
  4: { label: 'ዘቅዳሴ — ጳውሎስ',        labelEn: 'Epistle of Paul',     color: 'border-green-600 bg-green-50',   icon: '📜' },
  5: { label: 'ዘቅዳሴ — ሐዋርያት',       labelEn: 'Apostles',            color: 'border-teal-500 bg-teal-50',     icon: '📜' },
  6: { label: 'ዘቅዳሴ — ግብረ ሐዋርያት',  labelEn: 'Acts',                color: 'border-cyan-500 bg-cyan-50',     icon: '📜' },
  7: { label: 'ቅዳሴ ምስባክ',           labelEn: 'Liturgy Psalm',       color: 'border-orange-500 bg-orange-50', icon: '🎵' },
  8: { label: 'ዘቅዳሴ ወንጌል',           labelEn: 'Liturgy Gospel',      color: 'border-red-600 bg-red-50',       icon: '📖' },
  9: { label: 'ቅዳሴ',                 labelEn: 'Anaphora',            color: 'border-yellow-600 bg-yellow-50', icon: '⛪' },
};

const LANG_LABELS: Record<string, string> = { gez: "Ge'ez", ti: 'Tigrinya', en: 'English' };

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GtsawiePage() {
  const [month, setMonth]       = useState(MONTHS[0]);
  const [day, setDay]           = useState(1);
  const [blocks, setBlocks]     = useState<Block[]>([]);
  const [structure, setStructure] = useState<BookStructure[]>([]);
  const [loading, setLoading]   = useState(true);
  const [lang, setLang]         = useState<'gez' | 'ti' | 'en'>('gez');
  const [hasData, setHasData]   = useState<Record<string, boolean>>({});  // month → has data

  // Load structure once to know which months have data
  useEffect(() => {
    fetchBookStructure(GTSAWIE_BOOK_ID).then(struct => {
      setStructure(struct);
      const map: Record<string, boolean> = {};
      struct.forEach(s => { map[s.sectionId] = true; });
      setHasData(map);
    });
  }, []);

  // Load blocks whenever month or day changes
  const loadDay = useCallback(async (m: string, d: number) => {
    setLoading(true);
    setBlocks([]);
    const subtitle = GEZ_NUMS[d - 1];
    if (!subtitle) { setLoading(false); return; }
    const data = await fetchBlocks(GTSAWIE_BOOK_ID, m);
    // Filter to just the requested day
    const dayBlocks = data
      .filter(b => b.subtitle === subtitle)
      .sort((a, b) => a.order - b.order);
    setBlocks(dayBlocks);
    setLoading(false);
  }, []);

  useEffect(() => { loadDay(month, day); }, [month, day, loadDay]);

  // ── Navigation helpers ───────────────────────────────────────────────────
  const maxDay = DAYS_PER_MONTH[month] ?? 30;

  const goNextDay = () => {
    if (day < maxDay) { setDay(d => d + 1); }
    else {
      const mi = MONTHS.indexOf(month);
      if (mi < MONTHS.length - 1) { setMonth(MONTHS[mi + 1]); setDay(1); }
    }
  };

  const goPrevDay = () => {
    if (day > 1) { setDay(d => d - 1); }
    else {
      const mi = MONTHS.indexOf(month);
      if (mi > 0) {
        const prevMonth = MONTHS[mi - 1];
        setMonth(prevMonth);
        setDay(DAYS_PER_MONTH[prevMonth] ?? 30);
      }
    }
  };

  const monthIdx = MONTHS.indexOf(month);
  const isFirst  = monthIdx === 0 && day === 1;
  const isLast   = monthIdx === MONTHS.length - 1 && day === maxDay;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Home</Link>
        <div className="flex items-center justify-between mt-2 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-amber-900">ግጻዌ</h1>
            <p className="text-sm text-gray-500">Daily Lectionary — Eritrean Orthodox Tewahdo</p>
          </div>
          {/* Language selector */}
          <div className="flex gap-1">
            {(['gez', 'ti', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  lang === l
                    ? 'bg-amber-700 text-white'
                    : 'bg-white border border-gray-300 text-gray-600 hover:border-amber-400'
                }`}>
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Month tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {MONTHS.map(m => {
          const active  = m === month;
          const hasIt   = hasData[m];
          return (
            <button key={m} onClick={() => { setMonth(m); setDay(1); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                active
                  ? 'bg-amber-700 text-white shadow-sm'
                  : hasIt
                    ? 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-50'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}>
              {m}
              {!hasIt && <span className="ml-1 opacity-50">○</span>}
            </button>
          );
        })}
      </div>

      {/* ── Day picker ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-amber-200 p-3 mb-5 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={goPrevDay} disabled={isFirst}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 text-sm">
            ‹ Prev
          </button>
          <span className="text-sm font-semibold text-gray-700 flex-1 text-center">
            {month} {GEZ_NUMS[day - 1]} ({day})
          </span>
          <button onClick={goNextDay} disabled={isLast}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 text-sm">
            Next ›
          </button>
        </div>

        {/* Day grid */}
        <div className="flex flex-wrap gap-1 justify-center">
          {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
            <button key={d} onClick={() => setDay(d)}
              className={`w-8 h-8 text-xs rounded-lg font-medium transition-all ${
                d === day
                  ? 'bg-amber-700 text-white shadow'
                  : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-800'
              }`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Day content ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 animate-pulse">
          <p className="text-3xl mb-3">📖</p>
          <p>Loading {month} {GEZ_NUMS[day - 1]}...</p>
        </div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-3">📭</p>
          <p className="font-medium">No data yet for {month} {GEZ_NUMS[day - 1]}</p>
          <p className="text-sm mt-2">This month&apos;s content will be added soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Day title */}
          <div className="text-center py-3 border-b border-amber-200 mb-4">
            <h2 className="text-2xl font-bold text-amber-900">
              {month} {GEZ_NUMS[day - 1]}
            </h2>
            <p className="text-sm text-gray-400">{month} {day}</p>
          </div>

          {/* All 9 slots */}
          {blocks.map(block => {
            const t      = block.translations as Record<string, string>;
            const text   = t?.[lang] || '';
            const def    = SLOT_DEFS[block.order] ?? SLOT_DEFS[1];
            const isRef  = block.role === 'gospel-negah' || block.role === 'pauline' ||
                           block.role === 'apostles' || block.role === 'acts' ||
                           block.role === 'gospel-qidat';

            return (
              <div key={block._id}
                className={`rounded-xl border-l-4 p-4 ${def.color} shadow-sm`}>

                {/* Slot header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{def.icon}</span>
                  <div>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      {def.label}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">— {def.labelEn}</span>
                  </div>
                </div>

                {/* Text content */}
                {text ? (
                  <p className={`leading-relaxed ${isRef ? 'text-sm text-gray-600' : 'text-base text-gray-900'}`}>
                    {text}
                  </p>
                ) : (
                  /* Show Ge'ez as fallback even when viewing ti/en if translation missing */
                  <div>
                    {lang !== 'gez' && t?.gez && (
                      <p className="text-base text-gray-900 leading-relaxed mb-1">{t.gez}</p>
                    )}
                    {!t?.gez && (
                      <p className="text-gray-300 italic text-sm">
                        No {LANG_LABELS[lang]} translation yet
                      </p>
                    )}
                    {lang !== 'gez' && !t?.gez && (
                      <p className="text-gray-300 italic text-sm">No content yet</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-4">
            <button onClick={goPrevDay} disabled={isFirst}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-30">
              ‹ {day > 1 ? `${month} ${day - 1}` : `${MONTHS[monthIdx - 1] ?? ''} ${DAYS_PER_MONTH[MONTHS[monthIdx - 1] ?? ''] ?? ''}`}
            </button>
            <span className="text-xs text-gray-400">{blocks.length} slots</span>
            <button onClick={goNextDay} disabled={isLast}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-30">
              {day < maxDay ? `${month} ${day + 1}` : `${MONTHS[monthIdx + 1] ?? ''} 1`} ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
