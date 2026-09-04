'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchBook, fetchBlocks, fetchBookStructure, type Book, type Block, type BookStructure } from '@/lib/realApi';

const LANG_LABELS: Record<string, string> = { gez: "Ge'ez", ti: 'Tigrinya', en: 'English', am: 'Amharic', ar: 'Arabic' };
const COL_COLORS = [
  'border-amber-600 bg-amber-50',
  'border-orange-600 bg-orange-50',
  'border-blue-600 bg-blue-50',
  'border-green-600 bg-green-50',
];

export default function StudyPage() {
  const { bookId } = useParams() as { bookId: string };
  const [book, setBook]           = useState<Book | null>(null);
  const [structure, setStructure] = useState<BookStructure[]>([]);
  const [blocks, setBlocks]       = useState<Block[]>([]);
  const [stacked, setStacked]     = useState(false);
  const [cols, setCols]           = useState<string[]>(['gez', 'ti', 'en']);
  const [section, setSection]     = useState('');
  const [loading, setLoading]     = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(false);

  // Load book + structure
  useEffect(() => {
    Promise.all([fetchBook(bookId), fetchBookStructure(bookId)])
      .then(([b, struct]) => {
        setBook(b);
        setStructure(struct);
        if (b?.languages?.length) setCols(b.languages.slice(0, 3));
      })
      .finally(() => setLoading(false));
  }, [bookId]);

  // Load blocks when section changes
  useEffect(() => {
    if (!bookId) return;
    setLoadingBlocks(true);
    fetchBlocks(bookId, section || undefined)
      .then(setBlocks)
      .finally(() => setLoadingBlocks(false));
  }, [bookId, section]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 animate-pulse">Loading...</div>
  );
  if (!book) return (
    <div className="p-8 text-center">
      <Link href="/books" className="text-blue-600">← Books</Link>
    </div>
  );

  return (
    <div className="w-full">
      {/* Sticky header */}
      <div className="sticky top-0 bg-white border-b z-10 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/books/${bookId}`} className="text-sm text-gray-400 hover:text-gray-600 mr-3">← Back</Link>
            <span className="font-bold text-gray-900">{book.title}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStacked(false)}
              className={`px-3 py-1 rounded text-sm ${!stacked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              Parallel
            </button>
            <button onClick={() => setStacked(true)}
              className={`px-3 py-1 rounded text-sm ${stacked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
              Stacked
            </button>
          </div>
        </div>

        {/* Section filter */}
        {structure.length > 1 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-gray-400">Section:</span>
            <button onClick={() => setSection('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                section === '' ? 'bg-amber-700 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-amber-400'
              }`}>
              All
            </button>
            {structure.map(s => (
              <button key={s.sectionId} onClick={() => setSection(s.sectionId)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  section === s.sectionId ? 'bg-amber-700 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-amber-400'
                }`}>
                {s.sectionId}
              </button>
            ))}
          </div>
        )}

        {/* Column language selector */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-xs text-gray-400">Columns:</span>
          {(book.languages || ['gez', 'ti', 'en']).map(lang => (
            <button key={lang}
              onClick={() => {
                if (cols.includes(lang)) {
                  if (cols.length > 1) setCols(cols.filter(c => c !== lang));
                } else {
                  setCols([...cols, lang]);
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                cols.includes(lang) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
              }`}>
              {LANG_LABELS[lang] || lang}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loadingBlocks ? (
        <div className="text-center py-12 text-gray-400 animate-pulse">Loading blocks...</div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔀</p>
          <p>No content yet{section ? ` for "${section}"` : ''}.</p>
        </div>
      ) : stacked ? (
        /* ── STACKED: one block per row, all languages below each other ── */
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {blocks.map(block => {
            const t = block.translations as Record<string, string>;
            return (
              <div key={block._id} className="border rounded-lg overflow-hidden">
                {block.role && (
                  <p className="text-xs font-semibold text-gray-400 uppercase px-3 pt-2">{block.role}</p>
                )}
                {cols.map((lang, i) => (
                  <div key={lang} className={`px-4 py-2 border-l-4 ${COL_COLORS[i]?.split(' ')[0]} ${COL_COLORS[i]?.split(' ')[1]}`}>
                    <p className="text-xs text-gray-400 mb-0.5">{LANG_LABELS[lang] || lang}</p>
                    <p className="text-sm leading-relaxed">
                      {t?.[lang] || <span className="text-gray-300 italic">—</span>}
                    </p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── PARALLEL: columns side-by-side ─────────────────────────── */
        <div className="p-4">
          {/* Column headers */}
          <div className="grid gap-4 mb-2 sticky top-32 bg-white py-2 z-10"
            style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
            {cols.map((lang, i) => (
              <div key={lang}
                className={`font-bold text-center pb-2 border-b-2 ${COL_COLORS[i]?.split(' ')[0]}`}>
                {LANG_LABELS[lang] || lang}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {blocks.map(block => {
              const t = block.translations as Record<string, string>;
              return (
                <div key={block._id} className="grid gap-4"
                  style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
                  {cols.map((lang, i) => (
                    <div key={lang} className={`p-3 rounded border-l-4 ${COL_COLORS[i]}`}>
                      {block.role && (
                        <p className="text-xs text-gray-400 uppercase mb-1">{block.role}</p>
                      )}
                      <p className={`text-sm leading-relaxed ${block.isRubric ? 'italic text-red-800' : ''}`}>
                        {t?.[lang] || <span className="text-gray-300 italic">—</span>}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
