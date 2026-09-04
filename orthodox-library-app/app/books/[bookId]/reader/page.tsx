'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchBook, fetchBlocks, fetchBookStructure, type Book, type Block, type BookStructure } from '@/lib/realApi';

const LANG_LABELS: Record<string, string> = {
  gez: "Ge'ez", ti: 'Tigrinya', en: 'English', am: 'Amharic', ar: 'Arabic'
};

const ROLE_COLOR: Record<string, string> = {
  priest: 'border-l-4 border-yellow-500',
  deacon: 'border-l-4 border-red-600',
  choir:  'border-l-4 border-blue-600',
  people: 'border-l-4 border-green-600',
  reader: 'border-l-4 border-green-600',
  all:    'border-l-4 border-gray-400',
  '':     '',
};

export default function ReaderPage() {
  const { bookId } = useParams() as { bookId: string };

  const [book, setBook]           = useState<Book | null>(null);
  const [structure, setStructure] = useState<BookStructure[]>([]);
  const [blocks, setBlocks]       = useState<Block[]>([]);
  const [language, setLanguage]   = useState('en');
  const [section, setSection]     = useState('');   // '' = all sections
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Load book + structure on mount
  useEffect(() => {
    Promise.all([fetchBook(bookId), fetchBookStructure(bookId)])
      .then(([b, struct]) => {
        setBook(b);
        setStructure(struct);
        if (b?.languages?.length) setLanguage(b.languages[0]);
      })
      .finally(() => setLoading(false));
  }, [bookId]);

  // Load blocks whenever section changes
  useEffect(() => {
    if (!bookId) return;
    setLoadingBlocks(true);
    setSearch('');
    fetchBlocks(bookId, section || undefined)
      .then(setBlocks)
      .finally(() => setLoadingBlocks(false));
  }, [bookId, section]);

  // Filtered blocks based on search
  const filtered = search.trim()
    ? blocks.filter(b => {
        const q = search.toLowerCase();
        const t = b.translations as Record<string, string>;
        return Object.values(t).some(v => v?.toLowerCase().includes(q));
      })
    : blocks;

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <p className="animate-pulse">Loading...</p>
    </div>
  );

  if (!book) return (
    <div className="p-8 text-center">
      <p className="text-gray-500 mb-4">Book not found.</p>
      <Link href="/books" className="text-blue-600">← Books</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="sticky top-0 bg-white z-10 pb-4 border-b mb-6 space-y-3">
        <Link href={`/books/${bookId}`} className="text-sm text-gray-400 hover:text-gray-600 inline-block">← Back</Link>
        <h1 className="text-2xl font-bold">{book.title}</h1>

        {/* Language tabs */}
        <div className="flex gap-2 flex-wrap">
          {(book.languages || ['en']).map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                language === lang ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {LANG_LABELS[lang] || lang}
            </button>
          ))}
        </div>

        {/* Section filter */}
        {structure.length > 1 && (
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-gray-400 mr-1">Section:</span>
            <button
              onClick={() => setSection('')}
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

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search within this book..."
            className="w-full pl-8 pr-10 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">
              ×
            </button>
          )}
        </div>

        {/* Result count when searching */}
        {search && (
          <p className="text-xs text-gray-400">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
          </p>
        )}
      </div>

      {/* ── Block list ────────────────────────────────────────────── */}
      {loadingBlocks ? (
        <div className="text-center py-12 text-gray-400 animate-pulse">Loading blocks...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {search ? (
            <>
              <p className="text-3xl mb-3">🔍</p>
              <p>No results for &ldquo;{search}&rdquo;</p>
              <button onClick={() => setSearch('')} className="mt-3 text-sm text-blue-600 hover:underline">Clear search</button>
            </>
          ) : (
            <>
              <p className="text-4xl mb-3">📖</p>
              <p>No content yet{section ? ` for section "${section}"` : ''}.</p>
              <p className="text-sm mt-2">Volunteers are working on it!</p>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Group blocks by section when showing all */}
          {!section && structure.length > 1
            ? structure.map(sec => {
                const sectionBlocks = filtered.filter(b => b.sectionId === sec.sectionId);
                if (sectionBlocks.length === 0) return null;
                return (
                  <div key={sec.sectionId} className="mb-8">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3 pt-2 border-t">
                      {sec.sectionId}
                    </h2>
                    <BlockList blocks={sectionBlocks} language={language} highlight={search} />
                  </div>
                );
              })
            : <BlockList blocks={filtered} language={language} highlight={search} />
          }
          <div className="mt-12 py-6 border-t text-center text-gray-400 text-sm">
            {filtered.length} block{filtered.length !== 1 ? 's' : ''} · {book.title}
          </div>
        </>
      )}
    </div>
  );
}

// ── Block list sub-component ───────────────────────────────────────────────
function BlockList({ blocks, language, highlight }: {
  blocks: Block[];
  language: string;
  highlight: string;
}) {
  return (
    <div className="space-y-3">
      {blocks.map(block => {
        const t = block.translations as Record<string, string>;
        const text = t?.[language] || '';
        return (
          <div key={block._id}
            className={`p-4 rounded-lg bg-white shadow-sm ${ROLE_COLOR[block.role] || ''} ${block.isRubric ? 'bg-red-50 italic' : ''}`}>
            {block.role && (
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{block.role}</p>
            )}
            <p className="text-base leading-relaxed">
              {text
                ? highlight
                  ? <HighlightText text={text} query={highlight} />
                  : text
                : <span className="text-gray-300 italic">No {LANG_LABELS[language] || language} translation yet</span>
              }
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Inline search highlight ────────────────────────────────────────────────
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
          : part
      )}
    </>
  );
}
