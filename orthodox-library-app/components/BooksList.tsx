/**
 * Books List Component
 * Works with real API data from /api/orthodox-library/books
 */

import Link from "next/link";

// Category display labels and colours
const CATEGORY_LABELS: Record<string, string> = {
  anaphora: 'Anaphora (ኣናፎራ)',
  synaxar:  'Synaxar (ስንክሳር)',
  seatat:   'Seatat (ሰዓታት)',
  bible:    'Bible (መጽሐፍ ቅዱስ)',
  other:    'Other',
};

const CATEGORY_GRADIENT: Record<string, string> = {
  anaphora: 'from-amber-700 to-amber-900',
  synaxar:  'from-purple-700 to-purple-900',
  seatat:   'from-blue-700 to-blue-900',
  bible:    'from-green-700 to-green-900',
  other:    'from-gray-600 to-gray-800',
};

interface BookItem {
  _id: string;
  title: string;
  titleGez?: string;
  titleTi?: string;
  description?: string;
  category?: string;   // ← was missing; used by BooksPage filter counts
  type?: string;
  languages?: string[];
  blockCount?: number;
  status?: string;
}

interface BooksListProps {
  books: BookItem[];
}

export default function BooksList({ books }: BooksListProps) {
  if (!books || books.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-4">📚</p>
        <p>No books available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {books.map((book) => {
        const gradient = CATEGORY_GRADIENT[book.category || 'other'] ?? CATEGORY_GRADIENT.other;
        const categoryLabel = CATEGORY_LABELS[book.category || ''] ?? book.category ?? '';
        return (
          <Link
            key={book._id}
            href={`/books/${book._id}`}
            className="group border rounded-lg overflow-hidden hover:shadow-lg transition transform hover:-translate-y-1"
          >
            <div className={`bg-gradient-to-r ${gradient} h-40 flex items-center justify-center`}>
              <div className="text-center text-white px-4">
                {categoryLabel && (
                  <p className="text-xs uppercase tracking-widest opacity-75 mb-2">{categoryLabel}</p>
                )}
                <p className="text-xl font-serif font-bold leading-snug">
                  {book.titleGez || book.titleTi || book.title}
                </p>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-bold text-base mb-1 group-hover:text-amber-700 leading-tight">
                {book.title}
              </h3>

              {book.description && (
                <p className="text-gray-500 text-sm mb-3 line-clamp-2">{book.description}</p>
              )}

              <div className="flex items-center justify-between mt-2">
                {book.languages && book.languages.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {book.languages.map((lang) => (
                      <span key={lang} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                        {lang.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
                {book.blockCount !== undefined && (
                  <span className="text-xs text-gray-400 ml-auto pl-2">{book.blockCount} blocks</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
