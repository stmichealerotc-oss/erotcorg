'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchBook, fetchBlocks, type Book, type Block } from '@/lib/realApi';

const ROLE_BG: Record<string, string> = {
  priest: 'bg-yellow-700', deacon: 'bg-red-700', choir: 'bg-blue-800',
  people: 'bg-green-800',  reader: 'bg-green-800', all: 'bg-gray-800', '': 'bg-gray-900',
};
const LANG_LABELS: Record<string, string> = { gez: "Ge'ez", ti: 'Tigrinya', en: 'English', am: 'Amharic' };

export default function DisplayPage() {
  const { bookId } = useParams() as { bookId: string };
  const [book, setBook] = useState<Book | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [idx, setIdx] = useState(0);
  const [language, setLanguage] = useState('ti');
  const [fontSize, setFontSize] = useState(4);
  const [autoScroll, setAutoScroll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBook(bookId), fetchBlocks(bookId)])
      .then(([b, bl]) => { setBook(b); setBlocks(bl); if (b?.languages?.length) setLanguage(b.languages[0]); })
      .finally(() => setLoading(false));
  }, [bookId]);

  useEffect(() => {
    if (!autoScroll || blocks.length === 0) return;
    const t = setTimeout(() => { if (idx < blocks.length - 1) setIdx(i => i + 1); }, 8000);
    return () => clearTimeout(t);
  }, [autoScroll, idx, blocks.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') setIdx(i => Math.min(i + 1, blocks.length - 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [blocks.length]);

  if (loading) return <div className="fixed inset-0 bg-gray-900 flex items-center justify-center text-white">Loading...</div>;
  if (!book || blocks.length === 0) return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col items-center justify-center text-white">
      <p className="text-2xl mb-4">{book?.title || 'Book not found'}</p>
      <p className="text-gray-400 mb-6">No content available yet.</p>
      <Link href={`/books/${bookId}`} className="text-blue-400 hover:text-blue-300">← Back</Link>
    </div>
  );

  const block = blocks[idx];
  const text = block?.translations?.[language as keyof typeof block.translations] || '';
  const bg = ROLE_BG[block?.role || ''] || 'bg-gray-900';
  const fontSizes: Record<number, string> = { 2:'text-2xl', 3:'text-3xl', 4:'text-4xl', 5:'text-5xl', 6:'text-6xl' };
  const langs = book.languages?.length ? book.languages : ['gez','ti','en'];

  return (
    <>
      <div className={`fixed inset-0 ${bg} flex items-center justify-center p-8 pb-24`}>
        <div className="text-center max-w-4xl">
          {block?.role && <p className="text-white text-lg font-semibold mb-4 opacity-60 uppercase tracking-widest">{block.role}</p>}
          <p className={`${fontSizes[fontSize] || 'text-4xl'} font-serif text-white leading-relaxed font-bold`}>
            {text || <span className="opacity-40 italic">No {LANG_LABELS[language] || language} translation</span>}
          </p>
          {block?.isRubric && <p className="text-white text-base mt-4 italic opacity-50">[Instruction]</p>}
          <p className="text-white text-xs mt-8 opacity-30">{idx + 1} / {blocks.length}</p>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setIdx(i => Math.max(i-1,0))} disabled={idx===0} className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30 text-sm">← Prev</button>
          <span className="text-sm text-gray-400">{idx+1}/{blocks.length}</span>
          <button onClick={() => setIdx(i => Math.min(i+1,blocks.length-1))} disabled={idx===blocks.length-1} className="px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-30 text-sm">Next →</button>
        </div>
        <div className="flex gap-1">
          {langs.map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)} className={`px-3 py-1 text-sm rounded ${language===lang?'bg-blue-600':'bg-gray-700 hover:bg-gray-600'}`}>
              {LANG_LABELS[lang] || lang}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">A</span>
            <input type="range" min={2} max={6} value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-16 accent-blue-500" />
            <span className="text-sm text-gray-400">A</span>
          </div>
          <button onClick={() => setAutoScroll(a => !a)} className={`px-3 py-1 rounded text-sm ${autoScroll?'bg-green-600':'bg-gray-700 hover:bg-gray-600'}`}>
            {autoScroll ? 'Auto: ON' : 'Auto: OFF'}
          </button>
          <Link href={`/books/${bookId}`} className="text-xs text-gray-400 hover:text-white">Exit</Link>
        </div>
      </div>
    </>
  );
}
