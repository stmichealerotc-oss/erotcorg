'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const BOOK_ID  = '6a9e555a1bb1f932d6b8f3f9';

// ── Ethiopian calendar constants ──────────────────────────────────────────────
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
  '፳፩','፳፪','፳፫','፳፬','፳፭','፳፮','፳፯','፳፨','፳፱','፴',
];

// ── Anaphora book map (name fragment → book id) ───────────────────────────────
const ANAPHORA_MAP: Record<string, string> = {
  'ዘወልደ ነጐድጓድ':   '69d5ea6f542fd2b88a06d554', // ሃዋርያት
  'ዘሐዋርያት':       '69d5ea6f542fd2b88a06d554',
  'ዘእግዚእነ':       '69d5ea6f542fd2b88a06d555',
  'ዘዮሐንስ አፈወርቅ': '69d5ea6f542fd2b88a06d55d',
  'ዘቄርሎስ':        '69d5ea6f542fd2b88a06d55e',
  'ዘያዕቆብ ዘሥሩግ':   '69d5ea6f542fd2b88a06d55f',
  'ዘዲዮስቆሮስ':      '69d5ea6f542fd2b88a06d560',
  'ዘእግዝእትነ ማርያም': '69d5ea6f542fd2b88a06d557',
  'ዘእግዝእትነ':      '69d5ea6f542fd2b88a06d557',
  'ዘኤጲፋንዮስ':      '69d5ea6f542fd2b88a06d55c',
  'ዘባስልዮስ':       '69d5ea6f542fd2b88a06d559',
  'ጐሥዐ':           '69d5ea6f542fd2b88a06d559', // Basil
  'ዘ፫፻ ግሩም':      '69d5ea6f542fd2b88a06d55b',
  'ዘ፫፻፲ወ፰ ግሩም':   '69d5ea6f542fd2b88a06d55b',
  'ዘሐዋ':          '69d5ea6f542fd2b88a06d554',
};

// Bible book id map (Ethiopic name → library book id)
const BIBLE_MAP: Record<string, string> = {
  'ማቴዎስ':    '69d5ea6f542fd2b88a06d575',
  'ማርቆስ':    '69d5ea6f542fd2b88a06d576',
  'ሉቃስ':     '69d5ea6f542fd2b88a06d577',
  'ዮሐንስ':    '69d5ea6f542fd2b88a06d578',
  'ግብረ ሐዋርያት':'69d5ea6f542fd2b88a06d579',
  'መዝሙር':    '69d5ea6f542fd2b88a06d57a',
};

// ── Parsers ───────────────────────────────────────────────────────────────────

/** Parse "ሉቃስ 4:16-23" → { book, ref, bookId? } */
function parseBibleRef(text: string) {
  // Match: BookName Chapter:Verse or Chapter:Verse-Verse
  const m = text.match(/^(.+?)\s+(\d+[:\d\-–]+.*)$/);
  if (!m) return null;
  const bookName = m[1].trim();
  const ref      = m[2].trim();
  const bookId   = Object.entries(BIBLE_MAP).find(([k]) => bookName.includes(k))?.[1];
  return { bookName, ref, bookId };
}

/** Extract psalm text and ref from a misbak string */
function parseMisbak(text: string) {
  // "ዘነግህ ምስባክ: መዝሙር 64:11-12 — actual text..."
  // or "ቅዳሴ ምስባክ: መዝሙር 30:15-16 — ..."
  const clean = text.replace(/^(ዘነግህ ምስባክ|ቅዳሴ ምስባክ):\s*/,'');
  const dashIdx = clean.indexOf(' — ');
  if (dashIdx === -1) return { ref: clean, verse: '' };
  const ref   = clean.slice(0, dashIdx).trim();   // "መዝሙር 64:11-12"
  const verse = clean.slice(dashIdx + 3).trim();  // the actual psalm text
  const psalmRef = parseBibleRef(ref.replace('መዝሙር ', ''));
  return { ref, verse, bookId: BIBLE_MAP['መዝሙር'], psalmRef: ref };
}

/** Extract reading label + reference from a reading string */
function parseReading(text: string) {
  // "ሉቃስ 4:16-23"  or  "ጳውሎስ: 1 ቆሮንቶስ 1:1-10"  or "ዘቅዳሴ ወንጌል: ማቴዎስ 14:1-12"
  const clean = text.replace(/^[^:]+:\s*/, '');  // strip prefix label
  return parseBibleRef(clean) || { bookName: clean, ref: '', bookId: undefined };
}

/** Parse anaphora name → book link */
function parseAnaphora(text: string) {
  const clean = text.replace(/^ቅዳሴ:\s*/, '');
  const bookId = Object.entries(ANAPHORA_MAP).find(([k]) => clean.includes(k))?.[1];
  return { name: clean, bookId };
}

/** Parse commemoration saint names → array */
function parseCommemoration(text: string) {
  const clean = text.replace(/^ዝካረ:\s*/, '');
  return clean.split(/[፤;]/).map(s => s.trim()).filter(Boolean);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BibleChip({ text, label }: { text: string; label?: string }) {
  const parsed = parseReading(text);
  const display = label || `${parsed.bookName} ${parsed.ref}`.trim();
  if (parsed.bookId) {
    return (
      <Link href={`/books/${parsed.bookId}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs hover:bg-blue-100 transition">
        📖 {display}
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-full text-xs">
      📖 {display}
    </span>
  );
}

function SaintChip({ name }: { name: string }) {
  // In future: link to Synaxar book by saint name
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs">
      ✝ {name}
    </span>
  );
}

function AnaphoraChip({ text }: { text: string }) {
  const { name, bookId } = parseAnaphora(text);
  if (bookId) {
    return (
      <Link href={`/books/${bookId}`}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-800 border border-yellow-300 rounded-full text-sm font-medium hover:bg-yellow-100 transition">
        ⛪ {name}
      </Link>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-full text-sm">
      ⛪ {name}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type DayData = Record<string, string>;

export default function GtsawiePage() {
  const [month,   setMonth]   = useState(MONTHS[0]);
  const [day,     setDay]     = useState(1);
  const [data,    setData]    = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeded,  setSeeded]  = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${API_BASE}/api/orthodox-library/books/${BOOK_ID}/sections`)
      .then(r => r.json())
      .then(d => { if (d.success) setSeeded(new Set(d.data as string[])); })
      .catch(() => {});
  }, []);

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
        setData(JSON.parse(json.data[0].translations?.gez || '{}') as DayData);
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
      <Link href="/books" className="text-sm text-amber-700 hover:text-amber-900 mb-4 inline-block">← Books</Link>

      {/* Month tabs */}
      <div className="flex gap-1 flex-wrap mb-3">
        {MONTHS.map(m => (
          <button key={m} onClick={() => { setMonth(m); setDay(1); }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              m === month ? 'bg-amber-700 text-white shadow'
              : seeded.has(m) ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
              : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
            {m}
          </button>
        ))}
      </div>

      {/* Day grid */}
      <div className="flex gap-1 flex-wrap mb-5 p-3 bg-amber-50 rounded-xl border border-amber-200">
        {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
          <button key={d} onClick={() => setDay(d)}
            className={`w-8 h-8 text-xs font-medium rounded-lg transition-all ${
              d === day ? 'bg-amber-700 text-white shadow font-bold'
              : 'bg-white text-gray-600 hover:bg-amber-100 border border-gray-200'}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Day card */}
      {loading ? (
        <div className="text-center py-20 text-amber-700 animate-pulse">
          <p className="text-3xl mb-2">📖</p>
          <p>Loading {month} {GEZ[day-1]}…</p>
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-3xl mb-2">📭</p>
          <p className="font-medium text-gray-600">{month} {GEZ[day-1]} — No data yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md border border-amber-200 overflow-hidden">

          {/* Header */}
          <div className="bg-amber-700 text-white px-5 py-4 flex items-center justify-between">
            <button onClick={prev} disabled={isFirst} className="text-amber-200 hover:text-white disabled:opacity-30 text-xl px-1">‹</button>
            <div className="text-center">
              <p className="text-2xl font-bold font-serif">{GEZ[day-1]}</p>
              <p className="text-amber-200 text-sm">{month} {day}</p>
            </div>
            <button onClick={next} disabled={isLast} className="text-amber-200 hover:text-white disabled:opacity-30 text-xl px-1">›</button>
          </div>

          {/* ── COMMEMORATION ─────────────────────────────────────────── */}
          {data.commemoration && (
            <div className="border-b border-gray-100">
              <div className="flex gap-0">
                <div className="bg-purple-600 w-1.5 flex-shrink-0" />
                <div className="px-4 py-3 flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    ✝ ዝካረ / ተዝካር <span className="font-normal normal-case text-gray-400">— Commemoration</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {parseCommemoration(data.commemoration).map((name, i) => (
                      <SaintChip key={i} name={name} />
                    ))}
                  </div>
                  <p className="text-xs text-purple-400 mt-2 italic">
                    Full biography available when Synaxar is added
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── MORNING PRAYER ────────────────────────────────────────── */}
          <div className="border-b border-gray-100">
            <div className="bg-amber-50 px-4 py-2 border-b border-amber-100">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">🌅 Morning Prayer — ጸሎተ ነግህ</p>
            </div>

            {/* Morning Psalm — show text inline */}
            {data.misbak_negah && (() => {
              const { ref, verse, bookId } = parseMisbak(data.misbak_negah);
              return (
                <div className="flex gap-0 border-b border-gray-50">
                  <div className="bg-amber-500 w-1.5 flex-shrink-0" />
                  <div className="px-4 py-3 flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        ♪ ምስባክ <span className="font-normal normal-case text-gray-400">· Psalm</span>
                      </p>
                      {bookId && (
                        <Link href={`/books/${bookId}`} className="text-xs text-blue-500 hover:underline">{ref}</Link>
                      )}
                    </div>
                    {verse && <p className="text-sm text-gray-800 leading-relaxed italic">&ldquo;{verse}&rdquo;</p>}
                  </div>
                </div>
              );
            })()}

            {/* Morning Gospel */}
            {data.gospel_negah && (
              <div className="flex gap-0">
                <div className="bg-blue-600 w-1.5 flex-shrink-0" />
                <div className="px-4 py-3 flex-1 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    📖 ወንጌለ ነግህ <span className="font-normal normal-case text-gray-400">· Morning Gospel</span>
                  </p>
                  <BibleChip text={data.gospel_negah.replace(/^ዘነግህ ወንጌል:\s*/,'')} />
                </div>
              </div>
            )}
          </div>

          {/* ── LITURGY ───────────────────────────────────────────────── */}
          <div>
            <div className="bg-red-50 px-4 py-2 border-b border-red-100">
              <p className="text-xs font-bold text-red-800 uppercase tracking-wider">⛪ Liturgy — ቅዳሴ</p>
            </div>

            {/* Pauline */}
            {data.pauline && (
              <div className="flex gap-0 border-b border-gray-50">
                <div className="bg-green-700 w-1.5 flex-shrink-0" />
                <div className="px-4 py-3 flex-1 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    📜 ጳውሎስ <span className="font-normal normal-case text-gray-400">· Epistle</span>
                  </p>
                  <BibleChip text={data.pauline.replace(/^ጳውሎስ:\s*/,'')} />
                </div>
              </div>
            )}

            {/* Apostles */}
            {data.apostles && (
              <div className="flex gap-0 border-b border-gray-50">
                <div className="bg-teal-600 w-1.5 flex-shrink-0" />
                <div className="px-4 py-3 flex-1 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    📜 ሐዋርያት <span className="font-normal normal-case text-gray-400">· Apostles</span>
                  </p>
                  <BibleChip text={data.apostles.replace(/^ሐዋርያት:\s*/,'')} />
                </div>
              </div>
            )}

            {/* Acts */}
            {data.acts && (
              <div className="flex gap-0 border-b border-gray-50">
                <div className="bg-cyan-700 w-1.5 flex-shrink-0" />
                <div className="px-4 py-3 flex-1 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    📜 ግብረ ሐዋርያት <span className="font-normal normal-case text-gray-400">· Acts</span>
                  </p>
                  <BibleChip text={data.acts.replace(/^ግብረ ሐዋርያት:\s*/,'')} />
                </div>
              </div>
            )}

            {/* Liturgy Psalm — show text inline */}
            {data.misbak_qidat && (() => {
              const { ref, verse, bookId } = parseMisbak(data.misbak_qidat);
              return (
                <div className="flex gap-0 border-b border-gray-50">
                  <div className="bg-orange-500 w-1.5 flex-shrink-0" />
                  <div className="px-4 py-3 flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                        ♪ ቅዳሴ ምስባክ <span className="font-normal normal-case text-gray-400">· Psalm</span>
                      </p>
                      {bookId && (
                        <Link href={`/books/${bookId}`} className="text-xs text-blue-500 hover:underline">{ref}</Link>
                      )}
                    </div>
                    {verse && <p className="text-sm text-gray-800 leading-relaxed italic">&ldquo;{verse}&rdquo;</p>}
                  </div>
                </div>
              );
            })()}

            {/* Liturgy Gospel */}
            {data.gospel_qidat && (
              <div className="flex gap-0 border-b border-gray-50">
                <div className="bg-red-600 w-1.5 flex-shrink-0" />
                <div className="px-4 py-3 flex-1 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    📖 ዘቅዳሴ ወንጌል <span className="font-normal normal-case text-gray-400">· Gospel</span>
                  </p>
                  <BibleChip text={data.gospel_qidat.replace(/^ዘቅዳሴ ወንጌል:\s*/,'')} />
                </div>
              </div>
            )}

            {/* Anaphora — linked */}
            {data.anaphora && (
              <div className="flex gap-0">
                <div className="bg-yellow-600 w-1.5 flex-shrink-0" />
                <div className="px-4 py-4 flex-1 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    ⛪ ቅዳሴ <span className="font-normal normal-case text-gray-400">· Anaphora</span>
                  </p>
                  <AnaphoraChip text={data.anaphora} />
                </div>
              </div>
            )}
          </div>

          {/* Footer nav */}
          <div className="px-5 py-3 bg-gray-50 flex justify-between items-center border-t border-gray-100">
            <button onClick={prev} disabled={isFirst}
              className="text-xs text-gray-500 hover:text-amber-700 disabled:opacity-30">
              ‹ {day > 1 ? `${month} ${day-1}` : MONTHS[mi-1] ? `${MONTHS[mi-1]} ${DAYS_PER_MONTH[MONTHS[mi-1]]}` : ''}
            </button>
            <span className="text-xs text-gray-300">ግጻዌ</span>
            <button onClick={next} disabled={isLast}
              className="text-xs text-gray-500 hover:text-amber-700 disabled:opacity-30">
              {day < maxDay ? `${month} ${day+1}` : MONTHS[mi+1] ? `${MONTHS[mi+1]} 1` : ''} ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
