'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE     = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const BOOK_ID      = '6a9e555a1bb1f932d6b8f3f9';

const MONTHS = [
  'መስከረም','ጥቅምት','ኅዳር','ታኅሣሥ','ጥር','የካቲት',
  'መጋቢት','ሚያዝያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጰጉሜ',
];

const DAYS_PER_MONTH: Record<string, number> = {
  'መስከረም':30,'ጥቅምት':30,'ኅዳር':30,'ታኅሣሥ':30,'ጥር':30,'የካቲት':30,
  'መጋቢት':30,'ሚያዝያ':30,'ግንቦት':30,'ሰኔ':30,'ሐምሌ':30,'ነሐሴ':30,'ጰጉሜ':5,
};

const GEZ = [
  '፩','፪','፫','፬','፭','፮','፯','፰','፱','፲',
  '፲፩','፲፪','፲፫','፲፬','፲፭','፲፮','፲፯','፲፰','፲፱','፳',
  '፳፩','፳፪','፳፫','፳፬','፳፭','፳፮','፳፯','፳፰','፳፱','፴',
];

// Each slot: colour bar on left, icon, bilingual label
const SLOTS: Record<number, { bar: string; icon: string; label: string; sub: string }> = {
  1: { bar:'bg-purple-500', icon:'✝',  label:'ዝካረ / ተዝካር',          sub:'Commemoration'      },
  2: { bar:'bg-amber-500',  icon:'♪',  label:'ዘነግህ ምስባክ',            sub:'Morning Psalm'       },
  3: { bar:'bg-blue-500',   icon:'⊕',  label:'ዘነግህ ወንጌል',             sub:'Morning Gospel'      },
  4: { bar:'bg-green-600',  icon:'✉',  label:'ዘቅዳሴ — ጳውሎስ',          sub:'Epistle of Paul'     },
  5: { bar:'bg-teal-500',   icon:'✉',  label:'ዘቅዳሴ — ሐዋርያት',         sub:'Apostles'            },
  6: { bar:'bg-cyan-600',   icon:'✉',  label:'ዘቅዳሴ — ግብረ ሐዋርያት',    sub:'Acts'                },
  7: { bar:'bg-orange-500', icon:'♪',  label:'ቅዳሴ ምስባክ',             sub:'Liturgy Psalm'       },
  8: { bar:'bg-red-600',    icon:'⊕',  label:'ዘቅዳሴ ወንጌል',             sub:'Liturgy Gospel'      },
  9: { bar:'bg-yellow-600', icon:'⛪', label:'ቅዳሴ',                   sub:'Anaphora'            },
};

interface DayBlock { order: number; role: string; gez: string; ti: string; en: string; }

// ── Page ──────────────────────────────────────────────────────────────────────
export default function GtsawiePage() {
  const [month, setMonth] = useState(MONTHS[0]);
  const [day,   setDay]   = useState(1);
  const [slots, setSlots] = useState<DayBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang,  setLang]  = useState<'gez'|'ti'|'en'>('gez');
  const [seededMonths, setSeededMonths] = useState<Set<string>>(new Set());

  // Load which months have data (once)
  useEffect(() => {
    fetch(`${API_BASE}/api/orthodox-library/books/${BOOK_ID}/sections`)
      .then(r => r.json())
      .then(d => { if (d.success) setSeededMonths(new Set(d.data as string[])); })
      .catch(() => {});
  }, []);

  // Load exactly the 9 blocks for the selected day
  const loadDay = useCallback(async (m: string, d: number) => {
    setLoading(true);
    setSlots([]);
    const subtitle = GEZ[d - 1];
    if (!subtitle) { setLoading(false); return; }

    try {
      const url = `${API_BASE}/api/orthodox-library/books/${BOOK_ID}/blocks` +
                  `?sectionId=${encodeURIComponent(m)}&subtitle=${encodeURIComponent(subtitle)}`;
      const res  = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        const parsed: DayBlock[] = data.data
          .sort((a: any, b: any) => a.order - b.order)
          .map((b: any) => ({
            order: b.order,
            role:  b.role,
            gez:   b.translations?.gez ?? '',
            ti:    b.translations?.ti  ?? '',
            en:    b.translations?.en  ?? '',
          }));
        setSlots(parsed);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadDay(month, day); }, [month, day, loadDay]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const maxDay  = DAYS_PER_MONTH[month] ?? 30;
  const mi      = MONTHS.indexOf(month);
  const isFirst = mi === 0 && day === 1;
  const isLast  = mi === MONTHS.length - 1 && day === maxDay;

  const prev = () => {
    if (day > 1) setDay(d => d - 1);
    else if (mi > 0) { setMonth(MONTHS[mi-1]); setDay(DAYS_PER_MONTH[MONTHS[mi-1]] ?? 30); }
  };
  const next = () => {
    if (day < maxDay) setDay(d => d + 1);
    else if (mi < MONTHS.length - 1) { setMonth(MONTHS[mi+1]); setDay(1); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Sticky top bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-amber-900 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4">

          {/* Title + date */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-amber-300 hover:text-white text-sm flex-shrink-0">← Home</Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold leading-tight">ግጻዌ</h1>
              <p className="text-amber-200 text-xs truncate">{month} {GEZ[day-1]} ({day})</p>
            </div>
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={prev} disabled={isFirst}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 rounded text-sm disabled:opacity-30 transition">
              ‹
            </button>
            <button onClick={next} disabled={isLast}
              className="px-3 py-1.5 bg-amber-800 hover:bg-amber-700 rounded text-sm disabled:opacity-30 transition">
              ›
            </button>
          </div>

          {/* Language */}
          <div className="flex gap-1 flex-shrink-0">
            {(['gez','ti','en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  lang===l ? 'bg-white text-amber-900' : 'bg-amber-800 text-amber-200 hover:bg-amber-700'
                }`}>
                {l === 'gez' ? 'ግዕዝ' : l === 'ti' ? 'ትግርኛ' : 'EN'}
              </button>
            ))}
          </div>
        </div>

        {/* Month strip */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {MONTHS.map(m => (
            <button key={m} onClick={() => { setMonth(m); setDay(1); }}
              className={`flex-shrink-0 px-2.5 py-1 rounded text-xs transition ${
                m === month
                  ? 'bg-white text-amber-900 font-bold'
                  : seededMonths.has(m)
                    ? 'bg-amber-800 text-amber-100 hover:bg-amber-700'
                    : 'bg-amber-950 text-amber-500'
              }`}>
              {m}
            </button>
          ))}
        </div>

        {/* Day strip */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-hide">
          {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
            <button key={d} onClick={() => setDay(d)}
              className={`flex-shrink-0 w-7 h-7 rounded text-xs font-medium transition ${
                d === day
                  ? 'bg-white text-amber-900 font-bold shadow'
                  : 'bg-amber-800 text-amber-200 hover:bg-amber-700'
              }`}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ── Day content — all 9 slots at once ─────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 py-4">

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-amber-800 animate-pulse">
            <p className="text-4xl mb-3">📖</p>
            <p>Loading {month} {GEZ[day-1]}…</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium text-gray-600">{month} {GEZ[day-1]} — No data yet</p>
            <p className="text-sm mt-1">This month&apos;s content will be added soon.</p>
          </div>
        ) : (
          <>
            {/* Day heading */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-amber-200">
              <div className="w-12 h-12 rounded-full bg-amber-700 text-white flex flex-col items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold leading-none">{GEZ[day-1]}</span>
                <span className="text-xs opacity-75">{day}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-amber-900">{month} {GEZ[day-1]}</h2>
                <p className="text-sm text-gray-500">
                  {MONTHS.indexOf(month) + 1 < 10 ? '0' : ''}{MONTHS.indexOf(month)+1}/{String(day).padStart(2,'0')} · Ethiopian Calendar
                </p>
              </div>
            </div>

            {/* All 9 slots — compact, no scrolling needed */}
            <div className="space-y-2">
              {slots.map(slot => {
                const def  = SLOTS[slot.order] ?? SLOTS[1];
                const text = lang === 'gez' ? slot.gez
                           : lang === 'ti'  ? (slot.ti  || slot.gez)
                           :                  (slot.en  || slot.gez);
                const missing = lang !== 'gez' && !(lang === 'ti' ? slot.ti : slot.en);

                return (
                  <div key={slot.order}
                    className="flex gap-0 rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100">

                    {/* Colour bar + number */}
                    <div className={`${def.bar} flex flex-col items-center justify-center w-10 flex-shrink-0 py-2`}>
                      <span className="text-white text-xs font-bold">{slot.order}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-3 py-2.5 min-w-0">
                      {/* Label row */}
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          {def.label}
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{def.sub}</span>
                      </div>

                      {/* Text */}
                      <p className={`text-sm leading-relaxed break-words ${
                        missing ? 'text-gray-400 italic' : 'text-gray-900'
                      }`}>
                        {text || <span className="text-gray-300 italic">—</span>}
                        {missing && (
                          <span className="ml-2 text-xs text-gray-300 not-italic">(Ge&apos;ez shown)</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom nav */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <button onClick={prev} disabled={isFirst}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-30 transition">
                ‹ {day > 1 ? `${month} ${day-1}` : `${MONTHS[mi-1]??''} ${DAYS_PER_MONTH[MONTHS[mi-1]??'']??''}`}
              </button>
              <span className="text-xs text-gray-400">{slots.length} readings</span>
              <button onClick={next} disabled={isLast}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-amber-50 hover:border-amber-300 disabled:opacity-30 transition">
                {day < maxDay ? `${month} ${day+1}` : `${MONTHS[mi+1]??''} 1`} ›
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
