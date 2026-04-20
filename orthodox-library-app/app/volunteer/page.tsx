'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, setCurrentUser } from '@/lib/auth';
import { fetchMyAssignments, updateAssignmentStatus, submitBlocks } from '@/lib/realApi';
import type { Assignment } from '@/lib/realApi';

const LANG_LABELS: Record<string, string> = {
  gez: "Ge'ez (ግዕዝ)",
  ti: 'Tigrinya (ትግርኛ)',
  en: 'English',
  am: 'Amharic (አማርኛ)',
  all: 'All Languages',
};

const LANG_PLACEHOLDER: Record<string, string> = {
  gez: 'ጽሑፍ ብግዕዝ...',
  ti: 'ጽሑፍ ብትግርኛ...',
  en: 'Enter English text...',
  am: 'ጽሑፍ ባማርኛ...',
};

interface BlockDraft {
  order: number;
  type: string;
  role: string;
  text: string; // single language text for this volunteer
  isRubric: boolean;
}

export default function VolunteerPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<Assignment | null>(null);
  const [drafts, setDrafts] = useState<BlockDraft[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const STORAGE_KEY = `volunteer_progress_${email}`;

  const loadAssignments = useCallback(async (e: string) => {
    const data = await fetchMyAssignments(e);
    setAssignments(data);
  }, []);

  useEffect(() => {
    const user = getCurrentUser();
    if (user?.email) {
      setEmail(user.email);
      setName(user.name || '');
      setIsLoggedIn(true);
      loadAssignments(user.email);
    }
  }, [loadAssignments]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    setCurrentUser({ email, name, role: 'volunteer', canEdit: true } as any);
    setIsLoggedIn(true);
    loadAssignments(email);
  };

  const startAssignment = (assignment: Assignment) => {
    setActiveAssignment(assignment);
    setMessage('');

    // Try to restore saved progress
    const saved = localStorage.getItem(STORAGE_KEY + '_' + assignment.assignmentId);
    if (saved) {
      const { drafts: savedDrafts, idx } = JSON.parse(saved);
      setDrafts(savedDrafts);
      setCurrentIdx(idx || 0);
      setMessage('📝 Resuming from where you left off');
      return;
    }

    // Initialize fresh drafts
    const fresh: BlockDraft[] = [];
    for (let i = assignment.startOrder; i <= assignment.endOrder; i++) {
      fresh.push({ order: i, type: 'prayer', role: '', text: '', isRubric: false });
    }
    setDrafts(fresh);
    setCurrentIdx(0);
    updateAssignmentStatus(assignment.assignmentId, 'in-progress', 0);
  };

  const saveProgress = (newDrafts: BlockDraft[], idx: number) => {
    if (!activeAssignment) return;
    localStorage.setItem(
      STORAGE_KEY + '_' + activeAssignment.assignmentId,
      JSON.stringify({ drafts: newDrafts, idx })
    );
  };

  const updateDraft = (field: keyof BlockDraft, value: string | boolean) => {
    const updated = [...drafts];
    (updated[currentIdx] as any)[field] = value;
    setDrafts(updated);
    saveProgress(updated, currentIdx);
  };

  const navigate = (dir: 1 | -1) => {
    const newIdx = currentIdx + dir;
    if (newIdx < 0 || newIdx >= drafts.length) return;
    setCurrentIdx(newIdx);
    saveProgress(drafts, newIdx);
  };

  const submitAll = async () => {
    if (!activeAssignment) return;
    setLoading(true);
    setMessage('');

    const lang = activeAssignment.language;
    const isAll = lang === 'all';

    const blocks = drafts.map((d) => ({
      blockId: `${activeAssignment.bookId}-${activeAssignment.sectionId}-${d.order}-${Date.now()}`,
      bookId: activeAssignment.bookId,
      sectionId: activeAssignment.sectionId,
      order: d.order,
      type: d.type,
      role: d.role,
      translations: isAll
        ? { gez: d.text, ti: d.text, en: d.text } // fallback for 'all'
        : { [lang]: d.text },
      isRubric: d.isRubric,
      isResponsive: false,
      metadata: {
        enteredBy: name,
        language: lang,
        enteredAt: new Date().toISOString()
      }
    }));

    const result = await submitBlocks(blocks);

    if (result.success) {
      setMessage(`✅ Submitted ${result.count} blocks!`);
      await updateAssignmentStatus(activeAssignment.assignmentId, 'completed', drafts.length);
      localStorage.removeItem(STORAGE_KEY + '_' + activeAssignment.assignmentId);
      setTimeout(() => {
        setActiveAssignment(null);
        setDrafts([]);
        setCurrentIdx(0);
        loadAssignments(email);
      }, 2000);
    } else {
      setMessage('❌ Submission failed. Please try again.');
    }
    setLoading(false);
  };

  const statusColor = (s: string) => ({
    assigned: 'bg-gray-100 text-gray-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    verified: 'bg-purple-100 text-purple-700',
  }[s] || 'bg-gray-100 text-gray-700');

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">✝️</div>
            <h1 className="text-2xl font-bold text-green-900">Volunteer Portal</h1>
            <p className="text-gray-500 text-sm mt-1">Enter your details to view your assignments</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
            >
              View My Assignments
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Contact your administrator to get assigned tasks
          </p>
        </div>
      </div>
    );
  }

  // ── Active Entry Screen ───────────────────────────────────────────────────
  if (activeAssignment && drafts.length > 0) {
    const draft = drafts[currentIdx];
    const lang = activeAssignment.language;
    const progress = Math.round(((currentIdx + 1) / drafts.length) * 100);
    const filledCount = drafts.filter(d => d.text.trim().length > 0).length;

    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6">

            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{activeAssignment.bookTitle}</h1>
                <p className="text-sm text-gray-500">
                  Section: <span className="font-medium">{activeAssignment.sectionId}</span>
                  {' · '}Language: <span className="font-medium text-green-700">{LANG_LABELS[lang] || lang}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Progress is saved. You can resume later.')) {
                    setActiveAssignment(null);
                  }
                }}
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1 rounded-lg"
              >
                ← Back
              </button>
            </div>

            {/* Progress */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Verse {currentIdx + 1} of {drafts.length}</span>
                <span>{filledCount}/{drafts.length} filled · {progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(filledCount / drafts.length) * 100}%` }} />
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${
                message.startsWith('✅') ? 'bg-green-100 text-green-800' :
                message.startsWith('📝') ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {message}
              </div>
            )}

            {/* Verse metadata */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Verse #</label>
                <input
                  type="number"
                  value={draft.order}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={draft.type}
                  onChange={(e) => updateDraft('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="prayer">Prayer</option>
                  <option value="dialogue">Dialogue</option>
                  <option value="hymn">Hymn</option>
                  <option value="reading">Reading</option>
                  <option value="rubric">Rubric</option>
                  <option value="response">Response</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role (optional)</label>
                <select
                  value={draft.role}
                  onChange={(e) => updateDraft('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">— None —</option>
                  <option value="priest">Priest</option>
                  <option value="deacon">Deacon</option>
                  <option value="choir">Choir</option>
                  <option value="people">People</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>

            {/* Text entry - single language */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {LANG_LABELS[lang] || lang}
                {draft.text.trim() && <span className="ml-2 text-green-600 text-xs">✓ filled</span>}
              </label>
              <textarea
                value={draft.text}
                onChange={(e) => updateDraft('text', e.target.value)}
                rows={4}
                placeholder={LANG_PLACEHOLDER[lang] || 'Enter text...'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-base resize-none"
                dir={lang === 'gez' || lang === 'ti' || lang === 'am' ? 'ltr' : 'ltr'}
              />
            </div>

            <label className="flex items-center gap-2 mb-5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={draft.isRubric}
                onChange={(e) => updateDraft('isRubric', e.target.checked)}
                className="w-4 h-4 rounded"
              />
              This is a rubric / instruction (not spoken text)
            </label>

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate(-1)}
                disabled={currentIdx === 0}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>

              <button
                onClick={() => navigate(1)}
                disabled={currentIdx === drafts.length - 1}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>

              {currentIdx === drafts.length - 1 && (
                <button
                  onClick={submitAll}
                  disabled={loading}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit All ✓'}
                </button>
              )}
            </div>

            {/* Jump to verse */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Jump to verse:</p>
              <div className="flex flex-wrap gap-1">
                {drafts.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => { setCurrentIdx(i); saveProgress(drafts, i); }}
                    className={`w-8 h-8 text-xs rounded ${
                      i === currentIdx ? 'bg-green-600 text-white' :
                      d.text.trim() ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {d.order}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Assignments List ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Assignments</h1>
              <p className="text-gray-500 text-sm">Welcome, {name}</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('orthlib_user');
                setIsLoggedIn(false);
                setAssignments([]);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg"
            >
              Logout
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-500 text-lg">No assignments yet</p>
              <p className="text-gray-400 text-sm mt-2">Contact your administrator to get assigned tasks</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((a) => {
                const pct = Math.round((a.progress.completedBlocks / a.progress.totalBlocks) * 100);
                return (
                  <div key={a.assignmentId} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{a.bookTitle}</h3>
                        <p className="text-sm text-gray-500">
                          Section: {a.sectionId} · Verses {a.startOrder}–{a.endOrder}
                        </p>
                        <p className="text-sm font-medium text-green-700 mt-0.5">
                          Language: {LANG_LABELS[a.language] || a.language}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(a.status)}`}>
                        {a.status}
                      </span>
                    </div>

                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{a.progress.completedBlocks}/{a.progress.totalBlocks} · {pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    {a.notes && (
                      <p className="text-xs text-gray-500 italic mb-3">Note: {a.notes}</p>
                    )}

                    {a.status !== 'completed' && a.status !== 'verified' && (
                      <button
                        onClick={() => startAssignment(a)}
                        className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                      >
                        {a.status === 'in-progress' ? '▶ Continue Working' : '▶ Start Working'}
                      </button>
                    )}

                    {(a.status === 'completed' || a.status === 'verified') && (
                      <div className="text-center text-sm text-green-600 font-medium py-2">
                        ✓ Completed — awaiting review
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
