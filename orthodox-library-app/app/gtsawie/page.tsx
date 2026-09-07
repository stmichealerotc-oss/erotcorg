'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const BOOK_ID  = '6a9e555a1bb1f932d6b8f3f9';

const MONTHS = [
  'መስከረም','ጥቅምት','ኅዳር','ታኅሣሥ','ጥር','የካቲት',
  'መጋቢት','ሚያዝያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጰጉሜ',
];
const DAYS_PER_MONTH: Record<string,number> = {
  'መስከረም':30,'ጥቅምት':30,'ኅዳር':30,'ታኅሣሥ':30,'ጥር':30,'የካቲት':30,
  'መጋቢት':30,'ሚያዝያ':30,'ግንቦት':30,'ሰኔ':30,'ሐምሌ':30,'ነሐሴ':30,'ጰጉሜ':5,
};
const GEZ = [
  '፩','፪','፫','፬','፭','፮','፯','፰','፱','፲',
  '፲፩','፲፪','፲፫','፲፬','፲፭','፲፮','፲፯','፲፰','፲፱','፳',
  '፳፩','፳፪','፳፫','፳፬','፳፭','፳፮','፳፯','፳፰','፳፱','፴',
];

// 9 slot definitions — label + colour
const SLOT_LABELS: Record<string, { label: string; en: string; bar: string }> = {
  commemoration: { label:'ዝካረ / ተዝካር',        en:'Commemoration',    bar:'bg-purple-600' },
  misbak_negah:  { label:'ዘነግህ ምስባክ',          en:'Morning Psalm',    bar:'bg-amber-500'  },
  gospel_negah:  { label:'ዘነግህ ወንጌል',           en:'Morning Gospel',   bar:'bg-blue-600'   },
  pauline:       { label:'ዘቅዳሴ — ጳውሎስ',        en:'Epistle of Paul',  bar:'bg-green-700'  },
  apostles:      { label:'ዘቅዳሴ — ሐዋርያት',       en:'Apostles',         bar:'bg-teal-600'   },
  acts:          { label:'ዘቅዳሴ — ግብረ ሐዋርያት',  en:'Acts',             bar:'bg-cyan-700'   },
  misbak_qidat:  { label:'ቅዳሴ ምስባክ',           en:'Liturgy Psalm',    bar:'bg-orange-500' },
  gospel_qidat:  { label:'ዘቅዳሴ ወንጌል',           en:'Liturgy Gospel',   bar:'bg-red-600'    },
  anaphora:      { label:'ቅዳሴ',                 en:'Anaphora',         bar:'bg-yellow-600' },
};
const SLOT_ORDER = [
  'commemoration','misbak_negah','gospel_negah',
  'pauline','apostles','acts',
  'misbak_qidat','gospel_qidat','anaphora',
];

type DayData = Record<string, string>;

export default function GtsawiePage() {
  const [month, setMonth]   = useState(MONTHS[0]);
  const [day,   setDay]     = useState(1);
  const [data,  setData]    = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState<Set<string>>(new Set());

  // Fetch which months have data
  useEffect(() => {
    fetch(`${API_BASE}/api/orthodox-library/books/${BOOK_ID}/sections`)
      .then(r => r.json())
      .then(d => { if (d.success) setSeeded(new Set(d.data as string[])); })
      .catch(() => {});
  }, []);

  // Fetch the single block for this day
  const loadDay = useCallback(async (m: string, d: number) => {
    setLoading(true);
    setData(null);
    const sub = GEZ[d - 1];
    if (!sub) { setLoading(false); return; }
    try {
      const url = `${API_BASE}/api/orthodox-library/books/${BOOK_ID}/blocks` +
                  `?sectionId=${encodeURIComponent(m)}&subtitle=${encodeURIComponent(sub)}`;
      const res  = await fetch(url, { cache:'no-store' });
      const json = await res.json();
      if (json.success && json.data?.length > 0) {
        const raw = json.data[0].translations?.gez || '{}';
        setData(JSON.parse(raw) as DayData);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadDay(month, day); }, [month, day, loadDay]);

  const mi     = MONTHS.indexOf(month);
  const maxDay = DAYS_PER_MONTH[month] ?? 30;
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Back to books */}
      <Link href="/books" className="text-sm text-amber-700 hover:text-amber-900 mb-4 inline-block">
        ← Books
      </Link>

      {/* ── Month tabs ──────────────────────────────────────────────── */}
      <div className="flex gap-1 flex-wrap mb-3">
        {MONTHS.map(m => (
          <button key={m} onClick={() => { setMonth(m); setDay(1); }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              m === month
                ? 'bg-amber-700 text-white shadow'
                : seeded.has(m)
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}>
            {m}
          </button>
        ))}
      </div>

      {/* ── Day grid ────────────────────────────────────────────────── */}
      <div className="flex gap-1 flex-wrap mb-5 p-3 bg-amber-50 rounded-xl border border-amber-200">
        {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
          <button key={d} onClick={() => setDay(d)}
            className={`w-8 h-8 text-xs font-medium rounded-lg transition-all ${
              d === day
                ? 'bg-amber-700 text-white shadow font-bold'
                : 'bg-white text-gray-600 hover:bg-amber-100 border border-gray-200'
            }`}>
            {d}
          </button>
        ))}
      </div>

      {/* ── Day card ────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-20 text-amber-700 animate-pulse">
          <p className="text-3xl mb-2">📖</p>
          <p>Loading {month} {GEZ[day-1]}…</p>
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="font-medium text-gray-600">{month} {GEZ[day-1]}</p>
          <p className="text-sm mt-1">No data yet for this month.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-amber-200 overflow-hidden">

          {/* Day header */}
          <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between">
            <button onClick={prev} disabled={isFirst}
              className="text-amber-200 hover:text-white disabled:opacity-30 text-xl px-2">‹</button>

            <div className="text-center">
              <p className="text-2xl font-bold font-serif">{GEZ[day-1]}</p>
              <p className="text-amber-200 text-sm">{month} {day}</p>
            </div>

            <button onClick={next} disabled={isLast}
              className="text-amber-200 hover:text-white disabled:opacity-30 text-xl px-2">›</button>
          </div>

          {/* All 9 slots */}
          <div className="divide-y divide-gray-100">
            {SLOT_ORDER.map(key => {
              const def  = SLOT_LABELS[key];
              const text = data[key] || '';
              if (!def) return null;
              return (
                <div key={key} className="flex gap-0">
                  {/* Colour strip */}
                  <div className={`${def.bar} w-1.5 flex-shrink-0`} />
                  {/* Content */}
                  <div className="px-4 py-3 flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {def.label}
                      </span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{def.en}</span>
                    </div>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {text || <span className="text-gray-300 italic text-xs">—</span>}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer nav */}
          <div className="px-5 py-3 bg-gray-50 flex justify-between items-center border-t border-gray-100">
            <button onClick={prev} disabled={isFirst}
              className="text-xs text-gray-500 hover:text-amber-700 disabled:opacity-30">
              ‹ {day > 1 ? `${month} ${day-1}` : (MONTHS[mi-1] ? `${MONTHS[mi-1]} ${DAYS_PER_MONTH[MONTHS[mi-1]]}` : '')}
            </button>
            <span className="text-xs text-gray-300">ግጻዌ</span>
            <button onClick={next} disabled={isLast}
              className="text-xs text-gray-500 hover:text-amber-700 disabled:opacity-30">
              {day < maxDay ? `${month} ${day+1}` : (MONTHS[mi+1] ? `${MONTHS[mi+1]} 1` : '')} ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
