'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchBook, fetchBlocks, type Book, type Block } from '@/lib/realApi';

const LANG_LABELS: Record<string, string> = {
  gez: "Ge'ez", ti: 'Tigrinya', en: 'English', am: 'Amharic', ar: 'Arabic'
};

export default function StudyPage() {
  const { bookId } = useParams() as { bookId: string };
  const [book, setBook] = useState<Book | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [stacked, setStacked] = useState(false);
  const [cols, setCols] = useState<string[]>(['gez', 'ti', 'en']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBook(bookId), fetchBlocks(bookId)])
      .then(([b, bl]) => {
        setBook(b);
        setBlocks(bl);
        if (b?.languages?.length) setCols(b.languages.slice(0, 3));
      })
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!book) return <div className="p-8 text-center"><Link href="/books" className="text-blue-600">← Books</Link></div>;

  const colColors = ['border-amber-600 bg-amber-50', 'border-orange-600 bg-orange-50', 'border-blue-600 bg-blue-50', 'border-green-600 bg-green-50'];

  return (
    <div className="w-full">
      <div className="sticky top-0 bg-white border-b z-10 px-4 py-3 flex items-center justify-between">
        <div>
          <Link href={`/books/${bookId}`} className="text-sm text-gray-400 hover:text-gray-600 mr-3">← Back</Link>
          <span className="font-bold text-gray-900">{book.title}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStacked(false)} className={`px-3 py-1 rounded text-sm ${!stacked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Parallel</button>
          <button onClick={() => setStacked(true)} className={`px-3 py-1 rounded text-sm ${stacked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Stacked</button>
        </div>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🔀</p>
          <p>No content yet for this book.</p>
        </div>
      ) : stacked ? (
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {blocks.map(block => (
            <div key={block._id} className="border rounded-lg overflow-hidden">
              {block.role && <p className="text-xs font-semibold text-gray-400 uppercase px-3 pt-2">{block.role}</p>}
              {cols.map((lang, i) => (
                <div key={lang} className={`px-4 py-2 border-l-4 ${colColors[i]?.split(' ')[0]} ${colColors[i]?.split(' ')[1]}`}>
                  <p className="text-xs text-gray-400 mb-0.5">{LANG_LABELS[lang] || lang}</p>
                  <p className="text-sm leading-relaxed">{block.translations?.[lang as keyof typeof block.translations] || <span className="text-gray-300 italic">—</span>}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <div className={`grid gap-4 mb-4 sticky top-14 bg-white py-2`} style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
            {cols.map((lang, i) => (
              <div key={lang} className={`font-bold text-center pb-2 border-b-2 ${colColors[i]?.split(' ')[0]}`}>
                {LANG_LABELS[lang] || lang}
              </div>
            ))}
          </div>
          <div className="space-y-6">
            {blocks.map(block => (
              <div key={block._id} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
                {cols.map((lang, i) => (
                  <div key={lang} className={`p-3 rounded border-l-4 ${colColors[i]}`}>
                    {block.role && <p className="text-xs text-gray-400 uppercase mb-1">{block.role}</p>}
                    <p className={`text-sm leading-relaxed ${block.isRubric ? 'italic text-red-800' : ''}`}>
                      {block.translations?.[lang as keyof typeof block.translations] || <span className="text-gray-300 italic">—</span>}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
