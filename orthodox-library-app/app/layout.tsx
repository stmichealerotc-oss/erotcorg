import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orthodox Library",
  description: "Eritrean Orthodox Tewahedo Church Liturgical Library",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white">
        {/* Header Navigation */}
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-2xl font-bold text-amber-900">
                ✝️ Orthodox Library
              </Link>
              <nav className="space-x-6">
                <Link href="/" className="text-gray-700 hover:text-blue-600">
                  Home
                </Link>
                <Link href="/books" className="text-gray-700 hover:text-blue-600">
                  Books
                </Link>
                <Link href="/volunteer" className="text-gray-700 hover:text-green-600">
                  Volunteer
                </Link>
                <Link href="/login" className="text-gray-700 hover:text-amber-700">
                  Admin
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-8 border-t">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="font-bold mb-2">About</h3>
                <p className="text-sm text-gray-400">
                  Digital library for Eritrean Orthodox Tewahedo Church
                </p>
              </div>
              <div>
                <h3 className="font-bold mb-2">Features</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>Multi-language (Ge&apos;ez, Tigrinya, English)</li>
                  <li>Church projector mode</li>
                  <li>Role-based display</li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-2">Tradition</h3>
                <p className="text-sm text-gray-400">🇪🇷 Eritrean Orthodox Tewahedo</p>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-400">
              <p>&copy; 2026 Orthodox Library. Designed with <span className="text-red-500">❤️</span></p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
