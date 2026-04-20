'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, logout } from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const EXPERTISE_LABELS: Record<string, string> = {
  'text-entry':   '⌨️ Text Entry',
  'translation':  '🔄 Translation',
  'review':       '✅ Review',
  'scholar':      '📚 Scholar',
  'it':           '💻 IT',
  'audio':        '🎙️ Audio',
  'design':       '🎨 Design',
  'coordination': '📋 Coordination',
};

const LANG_LABELS: Record<string, string> = {
  gez: "Ge'ez", ti: 'Tigrinya', en: 'English', am: 'Amharic', ar: 'Arabic', other: 'Other'
};

interface VolunteerProfile {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  languages: string[];
  languageProficiency: Record<string, string>;
  expertise: string[];
  hoursPerWeek: number;
  taskSizePreference: string;
  availability: string;
  notes?: string;
  status: 'pending' | 'active' | 'inactive';
  stats: { tasksCompleted: number; blocksEntered: number };
  registeredAt: string;
}

export default function AdminVolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin()) { router.push('/login'); return; }
    fetchVolunteers();
  }, [router]);

  const fetchVolunteers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/volunteers`);
      const data = await res.json();
      if (data.success) setVolunteers(data.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const updateStatus = async (email: string, status: string) => {
    await fetch(`${API_BASE}/api/volunteers/${encodeURIComponent(email)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchVolunteers();
  };

  const taskSizeLabel = (hours: number) => {
    if (hours <= 2) return { label: 'Small', color: 'bg-green-100 text-green-700' };
    if (hours <= 5) return { label: 'Medium', color: 'bg-blue-100 text-blue-700' };
    return { label: 'Large', color: 'bg-purple-100 text-purple-700' };
  };

  const statusColor = (s: string) => ({
    pending:  'bg-yellow-100 text-yellow-700',
    active:   'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
  }[s] || 'bg-gray-100 text-gray-500');

  const filtered = volunteers.filter(v => {
    const matchStatus = filter === 'all' || v.status === filter;
    const matchSearch = !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.email.toLowerCase().includes(search.toLowerCase()) ||
      v.languages.some(l => l.includes(search.toLowerCase())) ||
      v.expertise.some(e => e.includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const pending = volunteers.filter(v => v.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Volunteer Roster</h1>
              <p className="text-gray-500 text-sm">
                {volunteers.length} registered · {pending > 0 && <span className="text-yellow-600 font-medium">{pending} pending review</span>}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.push('/admin/tasks')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Task Management
              </button>
              <button onClick={() => { logout(); router.push('/login'); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-red-600 hover:bg-gray-50">
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search name, email, language, skill..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          {['all', 'pending', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                filter === s ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s} {s !== 'all' && `(${volunteers.filter(v => v.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Volunteer cards */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👥</p>
            <p>No volunteers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(v => {
              const size = taskSizeLabel(v.hoursPerWeek);
              return (
                <div key={v._id} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                  {/* Top row */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">{v.name}</h3>
                      <p className="text-sm text-gray-500">{v.email}</p>
                      {v.location && <p className="text-xs text-gray-400">📍 {v.location}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(v.status)}`}>
                        {v.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${size.color}`}>
                        {size.label} tasks
                      </span>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">LANGUAGES</p>
                    <div className="flex flex-wrap gap-1">
                      {v.languages.map(l => (
                        <span key={l} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                          {LANG_LABELS[l] || l}
                          {v.languageProficiency?.[l] && (
                            <span className="text-amber-500 ml-1">· {v.languageProficiency[l]}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Expertise */}
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">SKILLS</p>
                    <div className="flex flex-wrap gap-1">
                      {v.expertise.map(e => (
                        <span key={e} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                          {EXPERTISE_LABELS[e] || e}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>⏱️ {v.hoursPerWeek}h/week</span>
                    <span>📅 {v.availability}</span>
                    {v.stats.tasksCompleted > 0 && (
                      <span>✅ {v.stats.tasksCompleted} tasks done</span>
                    )}
                  </div>

                  {v.notes && (
                    <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded mb-3">
                      "{v.notes}"
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    {v.status === 'pending' && (
                      <button
                        onClick={() => updateStatus(v.email, 'active')}
                        className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700"
                      >
                        ✓ Approve
                      </button>
                    )}
                    {v.status === 'active' && (
                      <button
                        onClick={() => router.push(`/admin/tasks?volunteer=${encodeURIComponent(v.email)}`)}
                        className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700"
                      >
                        + Assign Task
                      </button>
                    )}
                    {v.status !== 'inactive' && (
                      <button
                        onClick={() => updateStatus(v.email, 'inactive')}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-500 hover:bg-gray-50"
                      >
                        Deactivate
                      </button>
                    )}
                    {v.status === 'inactive' && (
                      <button
                        onClick={() => updateStatus(v.email, 'active')}
                        className="flex-1 border border-green-300 text-green-600 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-50"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
