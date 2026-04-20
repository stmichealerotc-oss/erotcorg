'use client';

import { useState, useEffect } from 'react';
import { fetchBooks, type Book } from '@/lib/realApi';
import BooksList from '@/components/BooksList';

const CATEGORIES = [
  { value: '',         label: 'All',                  icon: '📚' },
  { value: 'anaphora', label: 'Anaphora (ኣናፎራ)',     icon: '✝️' },
  { value: 'synaxar',  label: 'Synaxar (ስንክሳር)',      icon: '📖' },
  { value: 'seatat',   label: 'Seatat (ሰዓታት)',        icon: '🕐' },
  { value: 'bible',    label: 'Bible (መጽሐፍ ቅዱስ)',     icon: '📜' },
];

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetchBooks(activeCategory || undefined)
      .then(setBooks)
      .catch(() => setError('Could not load books. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-1">Liturgical Books</h1>
        <p className="text-gray-500">Select a book to explore in Reader, Study, or Projector mode</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.value
                ? 'bg-amber-700 text-white'
                : 'bg-white border border-gray-300 text-gray-600 hover:border-amber-400'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
            {cat.value !== '' && (
              <span className="text-xs opacity-70">
                ({books.filter(b => b.category === cat.value).length || '…'})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-4 animate-pulse">📚</p>
          <p>Loading books...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>
      )}

      {!loading && !error && <BooksList books={books} />}
    </div>
  );
}
