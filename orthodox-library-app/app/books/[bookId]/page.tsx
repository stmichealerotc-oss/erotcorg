'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchBook, fetchBlocks, type Book } from '@/lib/realApi';

const LANG_LABELS: Record<string, string> = {
  gez: "Ge'ez", ti: 'Tigrinya', en: 'English', am: 'Amharic', ar: 'Arabic'
};

export default function BookPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const [book, setBook] = useState<Book | null>(null);
  const [blockCount, setBlockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchBook(bookId), fetchBlocks(bookId)])
      .then(([b, blocks]) => {
        setBook(b);
        setBlockCount(blocks.length);
      })
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-gray-400">
        <p className="text-4xl mb-4 animate-pulse">📖</p>
        <p>Loading...</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">❌</p>
        <p className="text-gray-600 mb-4">Book not found.</p>
        <Link href="/books" className="text-blue-600 hover:text-blue-800">← Back to Books</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Book Info */}
      <div className="mb-10">
        <Link href="/books" className="text-sm text-gray-400 hover:text-gray-600 mb-4 inline-block">← Back to Books</Link>
        <h1 className="text-4xl font-bold mb-1">{book.title}</h1>
        {book.titleGez && <p className="text-2xl font-serif text-amber-900 mb-3">{book.titleGez}</p>}
        {book.description && <p className="text-gray-600 mb-4">{book.description}</p>}

        <div className="flex flex-wrap gap-2 mb-6">
          {(book.languages || []).map(lang => (
            <span key={lang} className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-sm font-medium">
              {LANG_LABELS[lang] || lang}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center bg-gray-50 p-4 rounded-xl">
          <div>
            <p className="text-2xl font-bold text-blue-600">{blockCount || book.blockCount}</p>
            <p className="text-sm text-gray-500">Blocks entered</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{(book.languages || []).length}</p>
            <p className="text-sm text-gray-500">Languages</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">3</p>
            <p className="text-sm text-gray-500">Display modes</p>
          </div>
        </div>
      </div>

      {/* Display Modes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href={`/books/${bookId}/reader`}
          className="group bg-white rounded-xl border-2 border-transparent hover:border-blue-500 p-6 hover:shadow-lg transition">
          <div className="text-5xl mb-4">📖</div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600">Reader Mode</h3>
          <p className="text-gray-500 text-sm mb-4">Sequential reading with language switching</p>
          <ul className="text-xs text-gray-400 space-y-1 mb-6">
            <li>✓ One language at a time</li>
            <li>✓ Smooth scrolling</li>
            <li>✓ Mobile friendly</li>
          </ul>
          <div className="w-full bg-blue-600 text-white py-2 rounded-lg text-center font-semibold text-sm">Open Reader</div>
        </Link>

        <Link href={`/books/${bookId}/study`}
          className="group bg-white rounded-xl border-2 border-transparent hover:border-orange-500 p-6 hover:shadow-lg transition">
          <div className="text-5xl mb-4">🔀</div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-orange-600">Study Mode</h3>
          <p className="text-gray-500 text-sm mb-4">Compare translations side-by-side</p>
          <ul className="text-xs text-gray-400 space-y-1 mb-6">
            <li>✓ Parallel columns</li>
            <li>✓ Translation comparison</li>
            <li>✓ Learning focused</li>
          </ul>
          <div className="w-full bg-orange-600 text-white py-2 rounded-lg text-center font-semibold text-sm">Open Study</div>
        </Link>

        <Link href={`/books/${bookId}/display`}
          className="group bg-white rounded-xl border-2 border-transparent hover:border-red-500 p-6 hover:shadow-lg transition">
          <div className="text-5xl mb-4">🎬</div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-red-600">Display Mode</h3>
          <p className="text-gray-500 text-sm mb-4">Fullscreen projector with role colors</p>
          <ul className="text-xs text-gray-400 space-y-1 mb-6">
            <li>✓ Full screen</li>
            <li>✓ Large fonts</li>
            <li>✓ Role-based colors</li>
          </ul>
          <div className="w-full bg-red-600 text-white py-2 rounded-lg text-center font-semibold text-sm">Open Display</div>
        </Link>
      </div>
    </div>
  );
}

// Required for static export - dynamic routes resolved client-side
export function generateStaticParams() { return []; }
