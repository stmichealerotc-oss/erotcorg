/**
 * Books List Component
 * Works with both mock data (book.id) and real API data (book._id)
 */

import Link from "next/link";

interface BookItem {
  id?: string;
  _id?: string;
  title: string;
  titleGez?: string;
  titleTi?: string;
  description?: string;
  type?: string;
  tradition?: string;
  languages?: string[];
  blockCount?: number;
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
        const bookId = book._id || book.id || '';
        return (
          <Link
            key={bookId}
            href={`/books/${bookId}`}
            className="group border rounded-lg overflow-hidden hover:shadow-lg transition transform hover:-translate-y-1"
          >
            <div className="bg-gradient-to-r from-amber-700 to-amber-900 h-40 flex items-center justify-center">
              <div className="text-center text-white px-4">
                <p className="text-xs uppercase tracking-widest opacity-75 mb-2">Anaphora</p>
                <p className="text-xl font-serif font-bold">{book.titleGez || book.titleTi || "—"}</p>
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
                  <div className="flex gap-1">
                    {book.languages.map((lang) => (
                      <span key={lang} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                        {lang.toUpperCase()}
                      </span>
                    ))}
                  </div>
                )}
                {book.blockCount !== undefined && (
                  <span className="text-xs text-gray-400">{book.blockCount} blocks</span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
