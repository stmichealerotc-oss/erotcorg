'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchBook, fetchBlocks, type Book, type Block } from '@/lib/realApi';

const LANG_LABELS: Record<string, string> = {
  gez: "Ge'ez", ti: 'Tigrinya', en: 'English', am: 'Amharic', ar: 'Arabic'
};

const ROLE_COLOR: Record<string, string> = {
  priest:  'border-l-4 border-yellow-500',
  deacon:  'border-l-4 border-red-600',
  choir:   'border-l-4 border-blue-600',
  people:  'border-l-4 border-green-600',
  reader:  'border-l-4 border-green-600',
  all:     'border-l-4 border-gray-400',
  '':      '',
};

export default function ReaderPage() {
  const { bookId } = useParams() as { bookId: string };
  const [book, setBook] = useState<Book | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBook(bookId), fetchBlocks(bookId)])
      .then(([b, bl]) => {
        setBook(b);
        setBlocks(bl);
        if (b?.languages?.length) setLanguage(b.languages[0]);
      })
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  if (!book) return <div className="p-8 text-center"><p className="text-gray-500">Book not found.</p><Link href="/books" className="text-blue-600">← Books</Link></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 pb-4 border-b mb-6">
        <Link href={`/books/${bookId}`} className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">← Back</Link>
        <h1 className="text-2xl font-bold mb-3">{book.title}</h1>
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
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📖</p>
          <p>No content yet for this book.</p>
          <p className="text-sm mt-2">Volunteers are working on it!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map(block => {
            const text = block.translations?.[language as keyof typeof block.translations] || '';
            const roleClass = ROLE_COLOR[block.role] || '';
            return (
              <div key={block._id} className={`p-4 rounded-lg bg-white shadow-sm ${roleClass} ${block.isRubric ? 'bg-red-50 italic' : ''}`}>
                {block.role && (
                  <p className="text-xs font-semibold text-gray-400 uppercase mb-1">{block.role}</p>
                )}
                <p className="text-base leading-relaxed">{text || <span className="text-gray-300 italic">No {LANG_LABELS[language] || language} translation yet</span>}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-12 py-6 border-t text-center text-gray-400 text-sm">End of {book.title}</div>
    </div>
  );
}

