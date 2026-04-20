'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Book {
  _id: string;
  title: string;
  titleGez: string;
  titleTi: string;
  blockCount: number;
}

interface BlockFormData {
  bookId: string;
  sectionId: string;
  order: number;
  type: string;
  role: string;
  translations: {
    gez: string;
    ti: string;
    en: string;
    am: string;
  };
  isRubric: boolean;
  isResponsive: boolean;
}

export default function AdminPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [formData, setFormData] = useState<BlockFormData>({
    bookId: '',
    sectionId: 'opening',
    order: 1,
    type: 'prayer',
    role: 'priest',
    translations: {
      gez: '',
      ti: '',
      en: '',
      am: ''
    },
    isRubric: false,
    isResponsive: false
  });

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/orthodox-library/books`);
      const data = await response.json();
      if (data.success) {
        setBooks(data.data);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const blockData = {
        ...formData,
        bookId: selectedBook,
        blockId: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const response = await fetch(`${API_BASE_URL}/api/orthodox-library/blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blockData)
      });

      const data = await response.json();

      if (data.success) {
        setMessage('✅ Block added successfully!');
        // Reset form
        setFormData({
          ...formData,
          order: formData.order + 1,
          translations: { gez: '', ti: '', en: '', am: '' }
        });
        fetchBooks(); // Refresh book list
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Orthodox Library - Data Entry
          </h1>
          <p className="text-gray-600 mb-6">
            Add liturgical content blocks for the 14 Anaphoras
          </p>

          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Book Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Anaphora *
              </label>
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select an Anaphora --</option>
                {books.map((book) => (
                  <option key={book._id} value={book._id}>
                    {book.title} ({book.titleGez}) - {book.blockCount} blocks
                  </option>
                ))}
              </select>
            </div>

            {/* Section and Order */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section *
                </label>
                <input
                  type="text"
                  value={formData.sectionId}
                  onChange={(e) => setFormData({...formData, sectionId: e.target.value})}
                  placeholder="e.g., opening, anaphora, epiclesis"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order *
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({...formData, order: parseInt(e.target.value)})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Type and Role */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="prayer">Prayer</option>
                  <option value="dialogue">Dialogue</option>
                  <option value="hymn">Hymn</option>
                  <option value="reading">Reading</option>
                  <option value="rubric">Rubric</option>
                  <option value="instruction">Instruction</option>
                  <option value="response">Response</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="priest">Priest</option>
                  <option value="deacon">Deacon</option>
                  <option value="choir">Choir</option>
                  <option value="reader">Reader</option>
                  <option value="people">People</option>
                  <option value="bishop">Bishop</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            {/* Translations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Translations</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ge&apos;ez (ግዕዝ) *
                </label>
                <textarea
                  value={formData.translations.gez}
                  onChange={(e) => setFormData({
                    ...formData,
                    translations: {...formData.translations, gez: e.target.value}
                  })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Ge'ez text..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tigrinya (ትግርኛ) *
                </label>
                <textarea
                  value={formData.translations.ti}
                  onChange={(e) => setFormData({
                    ...formData,
                    translations: {...formData.translations, ti: e.target.value}
                  })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Tigrinya text..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  English *
                </label>
                <textarea
                  value={formData.translations.en}
                  onChange={(e) => setFormData({
                    ...formData,
                    translations: {...formData.translations, en: e.target.value}
                  })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter English text..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amharic (አማርኛ)
                </label>
                <textarea
                  value={formData.translations.am}
                  onChange={(e) => setFormData({
                    ...formData,
                    translations: {...formData.translations, am: e.target.value}
                  })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter Amharic text (optional)..."
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRubric}
                  onChange={(e) => setFormData({...formData, isRubric: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Is Rubric (instruction)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isResponsive}
                  onChange={(e) => setFormData({...formData, isResponsive: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Is Responsive (call & response)</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading || !selectedBook}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Adding...' : 'Add Block'}
              </button>
              
              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Back to Library
              </button>
            </div>
          </form>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Instructions for Volunteers:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. Select the Anaphora you&apos;re working on</li>
              <li>2. Enter the section name (e.g., &quot;opening&quot;, &quot;anaphora&quot;, &quot;epiclesis&quot;)</li>
              <li>3. Order number will auto-increment after each entry</li>
              <li>4. Fill in all language translations (Amharic is optional)</li>
              <li>5. Click &quot;Add Block&quot; to save</li>
              <li>6. The form will reset for the next entry</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
