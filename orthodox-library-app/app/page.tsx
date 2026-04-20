import Link from "next/link";

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-r from-amber-900 to-amber-700 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4 font-serif">Orthodox Library</h1>
          <p className="text-xl text-amber-100 mb-8">
            Digital Liturgical Platform for Eritrean Orthodox Tewahedo Church
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/books" className="bg-white text-amber-900 px-6 py-3 rounded font-bold hover:bg-amber-50">
              Explore Books
            </Link>
            <Link href="/volunteer" className="bg-green-600 text-white px-6 py-3 rounded font-bold hover:bg-green-700">
              Volunteer Portal
            </Link>
            <Link href="/admin/tasks" className="bg-blue-600 text-white px-6 py-3 rounded font-bold hover:bg-blue-700">
              Admin Tasks
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '📖', title: 'Reader Mode', desc: "Sequential reading with language switching between Ge'ez, Tigrinya, and English" },
            { icon: '🔀', title: 'Study Mode', desc: '3-column parallel view to compare translations side-by-side' },
            { icon: '🎬', title: 'Projector Mode', desc: 'Fullscreen display with role-based coloring for church presentations' },
          ].map(f => (
            <div key={f.title} className="bg-white p-6 rounded-lg border hover:shadow-lg transition">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Volunteer CTA */}
      <section className="bg-green-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8 text-center">Contribute to the Library</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg border-2 border-green-300 hover:shadow-lg transition">
              <div className="text-4xl mb-3">✍️</div>
              <h3 className="font-bold text-lg mb-2">For Volunteers</h3>
              <p className="text-gray-600 text-sm mb-4">
                Help digitize our liturgical content. Each volunteer enters one language — Ge&apos;ez, Tigrinya, or English — for their assigned verses.
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-5">
                <li>• Get assigned a specific book, section, and verse range</li>
                <li>• Enter your language only — clean and focused</li>
                <li>• Progress auto-saves, resume anytime</li>
                <li>• Verses matched automatically across languages</li>
              </ul>
              <Link href="/register" className="block text-center bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700">
                Register as Volunteer →
              </Link>
            </div>
            <div className="bg-white p-8 rounded-lg border-2 border-blue-300 hover:shadow-lg transition">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="font-bold text-lg mb-2">For Administrators</h3>
              <p className="text-gray-600 text-sm mb-4">
                Distribute work across volunteers. Assign specific verse ranges and languages to each person, then track their progress.
              </p>
              <ul className="text-sm text-gray-600 space-y-1 mb-5">
                <li>• Assign book + section + verse range + language</li>
                <li>• Track status: assigned → in-progress → completed</li>
                <li>• See progress per book and per volunteer</li>
                <li>• Multiple volunteers can work in parallel</li>
              </ul>
              <Link href="/admin/tasks" className="block text-center bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700">
                Open Task Management
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Role Colors */}
      <section className="bg-gray-100 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-center">Role-Based Colors</h2>
          <div className="grid grid-cols-5 gap-4">
            {[
              { color: 'bg-yellow-500', label: 'Priest' },
              { color: 'bg-red-600', label: 'Deacon' },
              { color: 'bg-blue-600', label: 'Choir' },
              { color: 'bg-green-600', label: 'Reader' },
              { color: 'bg-red-900', label: 'Rubrics' },
            ].map(r => (
              <div key={r.label} className="text-center">
                <div className={`${r.color} h-10 rounded mb-2`} />
                <p className="font-semibold text-sm">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Languages */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Languages Supported</h2>
        <div className="grid grid-cols-3 gap-6 text-center">
          {[
            { flag: '🔤', lang: "Ge'ez", desc: 'Ancient liturgical language' },
            { flag: '🔤', lang: 'Tigrinya', desc: 'Modern understanding' },
            { flag: '🔤', lang: 'English', desc: 'Diaspora & study' },
          ].map(l => (
            <div key={l.lang}>
              <p className="text-3xl mb-2">{l.flag}</p>
              <h3 className="font-bold">{l.lang}</h3>
              <p className="text-gray-500 text-sm">{l.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
