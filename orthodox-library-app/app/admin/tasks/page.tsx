'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { isAdmin, logout, getCurrentUser } from '@/lib/auth';
import {
  fetchBooks, fetchBook, fetchBookStructure, fetchBookProgress,
  updateBookLanguages, createBulkTasks,
  assignVolunteer, deleteAssignment,
  type Book, type Assignment, type BookProgress, type BookStructure
} from '@/lib/realApi';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

const CATEGORIES = [
  { value: 'anaphora', label: 'Anaphora', icon: '✝️' },
  { value: 'synaxar',  label: 'Synaxar',  icon: '📖' },
  { value: 'seatat',   label: 'Seatat',   icon: '🕐' },
  { value: 'bible',    label: 'Bible',    icon: '📜' },
];

const COMMON_LANGS: Record<string, string> = {
  gez: "Ge'ez", ti: 'Tigrinya', en: 'English',
  am: 'Amharic', ar: 'Arabic', fr: 'French', it: 'Italian', de: 'German'
};

const STATUS_COLOR: Record<string, string> = {
  unassigned:    'bg-gray-100 text-gray-500',
  assigned:      'bg-yellow-100 text-yellow-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  completed:     'bg-green-100 text-green-700',
  verified:      'bg-purple-100 text-purple-700',
};

const SIZE_COLOR: Record<string, string> = {
  small:  'text-green-600 bg-green-50 border-green-200',
  medium: 'text-blue-600 bg-blue-50 border-blue-200',
  large:  'text-purple-600 bg-purple-50 border-purple-200',
};

interface VolunteerProfile {
  _id: string; name: string; email: string;
  languages: string[]; languageProficiency: Record<string, string>;
  hoursPerWeek: number; taskSizePreference: string;
  status: string; stats: { tasksCompleted: number };
}

type RightPanel = 'none' | 'create' | 'assign' | 'languages';

export default function AdminTasksPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('anaphora');
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [structure, setStructure] = useState<BookStructure[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [progress, setProgress] = useState<BookProgress | null>(null);
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [selectedVolunteer, setSelectedVolunteer] = useState<VolunteerProfile | null>(null);
  const [panel, setPanel] = useState<RightPanel>('none');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [bookLanguages, setBookLanguages] = useState<string[]>([]);
  const [newLangCode, setNewLangCode] = useState('');

  // Task creation form
  const [taskForm, setTaskForm] = useState({
    sectionId: '', subtitle: '', startOrder: 1, endOrder: 10,
    language: 'gez', taskCount: 5, notes: ''
  });

  const loadBooks = useCallback(async (cat: string) => {
    const data = await fetchBooks(cat);
    setBooks(data);
    setSelectedBook(null); setStructure([]); setProgress(null);
    setSelectedSection(''); setSelectedTasks(new Set());
  }, []);

  const loadBook = useCallback(async (book: Book) => {
    setSelectedBook(book);
    setBookLanguages(book.languages || []);
    setSelectedSection(''); setSelectedTasks(new Set()); setPanel('none');
    const [struct, prog] = await Promise.all([
      fetchBookStructure(book._id), fetchBookProgress(book._id)
    ]);
    setStructure(struct);
    setProgress(prog);
    if (struct.length > 0) {
      setSelectedSection(struct[0].sectionId);
      const first = struct[0];
      const sub = first.subtitles[0];
      setTaskForm(f => ({
        ...f, sectionId: first.sectionId,
        subtitle: sub?.name || '',
        startOrder: sub?.startVerse || 1,
        endOrder: sub?.endVerse || 10
      }));
    }
  }, []);

  const loadVolunteers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/volunteers?status=active`);
      const data = await res.json();
      if (data.success) setVolunteers(data.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!isAdmin()) { router.push('/login'); return; }
    loadBooks(activeCategory);
    loadVolunteers();
  }, [router, activeCategory, loadBooks, loadVolunteers]);

  // When section changes, pre-fill form with first subtitle
  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    setSelectedTasks(new Set());
    const sec = structure.find(s => s.sectionId === sectionId);
    const sub = sec?.subtitles[0];
    setTaskForm(f => ({
      ...f, sectionId,
      subtitle: sub?.name || '',
      startOrder: sub?.startVerse || 1,
      endOrder: sub?.endVerse || 10
    }));
  };

  const handleCreateTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    setLoading(true);
    const tasks = await createBulkTasks({
      bookId: selectedBook._id, bookTitle: selectedBook.title,
      category: selectedBook.category,
      sectionId: taskForm.sectionId,
      subtitle: taskForm.subtitle || undefined,
      totalVerses: taskForm.endOrder - taskForm.startOrder + 1,
      taskCount: taskForm.taskCount,
      language: taskForm.language,
      notes: taskForm.notes
    });
    if (tasks.length > 0) {
      const label = taskForm.subtitle ? `${taskForm.sectionId} › ${taskForm.subtitle}` : taskForm.sectionId;
      setMessage(`✅ Created ${tasks.length} tasks for "${label}"`);
      setPanel('none');
      const prog = await fetchBookProgress(selectedBook._id);
      setProgress(prog);
    } else {
      setMessage('❌ Failed to create tasks');
    }
    setLoading(false);
  };

  const handleAssignTasks = async () => {
    if (!selectedVolunteer || selectedTasks.size === 0) return;
    setLoading(true);
    let done = 0;
    for (const id of selectedTasks) {
      const ok = await assignVolunteer(id, selectedVolunteer.email, selectedVolunteer.name);
      if (ok) done++;
    }
    setMessage(`✅ Assigned ${done} task(s) to ${selectedVolunteer.name}`);
    setSelectedTasks(new Set()); setSelectedVolunteer(null); setPanel('none');
    if (selectedBook) { const prog = await fetchBookProgress(selectedBook._id); setProgress(prog); }
    setLoading(false);
  };

  const handleSaveLanguages = async () => {
    if (!selectedBook) return;
    const ok = await updateBookLanguages(selectedBook._id, bookLanguages);
    if (ok) {
      setMessage('✅ Languages saved');
      const updated = await fetchBook(selectedBook._id);
      if (updated) setSelectedBook(updated);
    } else setMessage('❌ Failed to save languages');
  };

  const suggestTasksForVolunteer = (vol: VolunteerProfile) => {
    if (!progress) return;
    const matching = progress.data.filter(t =>
      t.status === 'unassigned' &&
      (vol.languages.includes(t.language) || t.language === 'all') &&
      (vol.taskSizePreference === 'any' || t.taskSize === vol.taskSizePreference)
    );
    setSelectedTasks(new Set(matching.map(t => t.assignmentId)));
    setMessage(`💡 Auto-selected ${matching.length} tasks matching ${vol.name}'s profile`);
  };

  const toggleTask = (id: string) => {
    setSelectedTasks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const currentSection = structure.find(s => s.sectionId === selectedSection);
  const sectionTasks = progress?.data.filter(t => t.sectionId === selectedSection) || [];
  const allTasks = progress?.data || [];
  const unassignedCount = progress?.summary.unassigned || 0;
  const doneCount = (progress?.summary.completed || 0) + (progress?.summary.verified || 0);
  const totalCount = progress?.summary.total || 0;
  const user = getCurrentUser();
  const sectionIdx = structure.findIndex(s => s.sectionId === selectedSection);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b px-6 py-3 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-6">
          <span className="font-bold text-gray-900">Task Management</span>
          <button onClick={() => router.push('/admin/volunteers')} className="text-sm text-gray-500 hover:text-gray-800">Volunteers</button>
          <button onClick={() => router.push('/admin')} className="text-sm text-gray-500 hover:text-gray-800">Data Entry</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{user?.name}</span>
          <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-red-500">Logout</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT: Category + Book list ─────────────────────────────────── */}
        <div className="w-60 bg-white border-r flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-3 border-b">
            {CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 mb-0.5 ${
                  activeCategory === cat.value ? 'bg-amber-50 text-amber-800 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <span>{cat.icon}</span><span>{cat.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {books.map(book => (
              <button key={book._id} onClick={() => loadBook(book)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 border transition-all ${
                  selectedBook?._id === book._id ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-gray-50'
                }`}>
                <p className="text-sm font-medium text-gray-900 leading-tight">{book.title}</p>
                {book.titleGez && <p className="text-xs text-gray-400">{book.titleGez}</p>}
              </button>
            ))}
          </div>
        </div>

        {/* ── MIDDLE: Section nav + Task board ──────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {!selectedBook ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center"><p className="text-5xl mb-3">📋</p><p>Select a book to manage its tasks</p></div>
            </div>
          ) : (
            <>
              {/* Book header */}
              <div className="bg-white border-b px-5 py-3 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">{selectedBook.title}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {bookLanguages.map(l => (
                      <span key={l} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                        {COMMON_LANGS[l] || l}
                      </span>
                    ))}
                    <button onClick={() => setPanel(panel === 'languages' ? 'none' : 'languages')}
                      className="text-xs text-blue-500 hover:text-blue-700 ml-1">+ Languages</button>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedTasks.size > 0 && (
                    <button onClick={() => setPanel('assign')}
                      className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700">
                      👤 Assign ({selectedTasks.size})
                    </button>
                  )}
                  <button onClick={() => setPanel(panel === 'create' ? 'none' : 'create')}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700">
                    ⚡ Create Tasks
                  </button>
                </div>
              </div>

              {/* Progress summary */}
              {progress && (
                <div className="bg-white border-b px-5 py-2 flex items-center gap-5">
                  {[
                    { label: 'Unassigned', val: progress.summary.unassigned, color: 'text-gray-500' },
                    { label: 'Assigned',   val: progress.summary.assigned,   color: 'text-yellow-600' },
                    { label: 'In Progress',val: progress.summary.inProgress, color: 'text-blue-600' },
                    { label: 'Completed',  val: progress.summary.completed,  color: 'text-green-600' },
                    { label: 'Verified',   val: progress.summary.verified,   color: 'text-purple-600' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-xs text-gray-400">{s.label}</p>
                    </div>
                  ))}
                  {totalCount > 0 && (
                    <div className="flex-1 ml-2">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{doneCount}/{totalCount} done</span>
                        <span>{Math.round((doneCount / totalCount) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(doneCount / totalCount) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {message && (
                <div className={`mx-5 mt-3 p-3 rounded-lg text-sm ${
                  message.startsWith('✅') ? 'bg-green-100 text-green-800' :
                  message.startsWith('💡') ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}>{message}</div>
              )}

              {/* Section navigation */}
              <div className="px-5 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => sectionIdx > 0 && handleSectionChange(structure[sectionIdx - 1].sectionId)}
                    disabled={sectionIdx <= 0}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 flex-shrink-0"
                  >← Prev</button>

                  <div className="flex-1 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {structure.map(s => (
                      <button key={s.sectionId} onClick={() => handleSectionChange(s.sectionId)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          selectedSection === s.sectionId
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'
                        }`}>
                        {s.sectionId}
                        {/* dot indicator if has tasks */}
                        {progress?.data.some(t => t.sectionId === s.sectionId) && (
                          <span className={`ml-1.5 inline-block w-1.5 h-1.5 rounded-full ${
                            progress.data.filter(t => t.sectionId === s.sectionId).every(t => t.status === 'completed' || t.status === 'verified')
                              ? 'bg-green-400' : 'bg-yellow-400'
                          }`} />
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => sectionIdx < structure.length - 1 && handleSectionChange(structure[sectionIdx + 1].sectionId)}
                    disabled={sectionIdx >= structure.length - 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 flex-shrink-0"
                  >Next →</button>
                </div>

                {/* Subtitles for current section */}
                {currentSection && currentSection.subtitles.filter(s => s.name).length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-3">
                    {currentSection.subtitles.filter(s => s.name).map(sub => (
                      <span key={sub.name} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border">
                        {sub.name} <span className="text-gray-400">(v{sub.startVerse}–{sub.endVerse})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Task list for current section */}
              <div className="px-5 pb-5">
                {unassignedCount > 0 && (
                  <div className="flex items-center gap-3 mb-2 text-xs">
                    <button onClick={() => setSelectedTasks(new Set(allTasks.filter(t => t.status === 'unassigned').map(t => t.assignmentId)))}
                      className="text-blue-600 hover:text-blue-800 font-medium">
                      Select all unassigned ({unassignedCount})
                    </button>
                    {selectedTasks.size > 0 && (
                      <><span className="text-gray-300">|</span>
                      <span className="text-gray-500">{selectedTasks.size} selected</span>
                      <button onClick={() => setSelectedTasks(new Set())} className="text-gray-400 hover:text-gray-600">Clear</button></>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {sectionTasks.length === 0 && structure.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                      <p className="text-3xl mb-2">📋</p>
                      <p className="mb-3">No tasks yet for this book.</p>
                      <button onClick={() => setPanel('create')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700">⚡ Create Tasks</button>
                    </div>
                  ) : sectionTasks.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <p className="mb-2">No tasks for this section yet.</p>
                      <button onClick={() => setPanel('create')} className="text-blue-600 hover:text-blue-800 text-sm font-medium">⚡ Create tasks for &quot;{selectedSection}&quot;</button>
                    </div>
                  ) : (
                    sectionTasks.map((task, i) => {
                      const isSelected = selectedTasks.has(task.assignmentId);
                      const canSelect = task.status === 'unassigned';
                      const pct = Math.round((task.progress.completedBlocks / task.progress.totalBlocks) * 100);
                      return (
                        <div key={task.assignmentId}
                          onClick={() => canSelect && toggleTask(task.assignmentId)}
                          className={`flex items-center gap-3 px-4 py-3 border-b last:border-0 transition-all ${canSelect ? 'cursor-pointer hover:bg-gray-50' : ''} ${isSelected ? 'bg-blue-50' : ''}`}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : canSelect ? 'border-gray-300' : 'border-gray-100 bg-gray-50'}`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <span className="text-xs text-gray-400 w-5 flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">
                                {task.subtitle ? `${task.subtitle} · ` : ''}{task.sectionId} · v{task.startOrder}–{task.endOrder}
                              </span>
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${SIZE_COLOR[task.taskSize]}`}>{task.taskSize}</span>
                              <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                                {COMMON_LANGS[task.language] || task.language}
                              </span>
                            </div>
                            {task.volunteerName
                              ? <p className="text-xs text-gray-500 mt-0.5">👤 {task.volunteerName}</p>
                              : <p className="text-xs text-gray-300 mt-0.5 italic">unassigned</p>}
                            {task.status !== 'unassigned' && task.status !== 'assigned' && (
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-20 bg-gray-200 rounded-full h-1"><div className="bg-blue-500 h-1 rounded-full" style={{ width: `${pct}%` }} /></div>
                                <span className="text-xs text-gray-400">{pct}%</span>
                              </div>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[task.status]}`}>{task.status}</span>
                          <button onClick={e => { e.stopPropagation(); deleteAssignment(task.assignmentId).then(() => fetchBookProgress(selectedBook!._id).then(setProgress)); }}
                            className="text-gray-300 hover:text-red-500 flex-shrink-0 text-lg leading-none">×</button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        {panel !== 'none' && (
          <div className="w-80 bg-white border-l flex flex-col overflow-hidden flex-shrink-0">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-900">
                {panel === 'create' ? '⚡ Create Tasks' : panel === 'assign' ? '👤 Assign Volunteer' : '🌐 Languages'}
              </h3>
              <button onClick={() => setPanel('none')} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* CREATE TASKS */}
            {panel === 'create' && selectedBook && (
              <div className="flex-1 overflow-y-auto p-4">
                <form onSubmit={handleCreateTasks} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Section / Title *</label>
                    {structure.length > 0 ? (
                      <select value={taskForm.sectionId}
                        onChange={e => handleSectionChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Select section --</option>
                        {structure.map(s => <option key={s.sectionId} value={s.sectionId}>{s.sectionId}</option>)}
                        <option value="__new">+ New section...</option>
                      </select>
                    ) : (
                      <input type="text" value={taskForm.sectionId} required
                        onChange={e => setTaskForm({...taskForm, sectionId: e.target.value})}
                        placeholder="e.g. opening, Chapter 1, Meskerem 1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    )}
                    {taskForm.sectionId === '__new' && (
                      <input type="text" required placeholder="Enter section name"
                        onChange={e => setTaskForm({...taskForm, sectionId: e.target.value})}
                        className="w-full mt-2 px-3 py-2 border border-blue-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subtitle (optional)</label>
                    {currentSection && currentSection.subtitles.filter(s => s.name).length > 0 ? (
                      <select value={taskForm.subtitle}
                        onChange={e => {
                          const sub = currentSection.subtitles.find(s => s.name === e.target.value);
                          setTaskForm({...taskForm, subtitle: e.target.value,
                            startOrder: sub?.startVerse || taskForm.startOrder,
                            endOrder: sub?.endVerse || taskForm.endOrder});
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- No subtitle --</option>
                        {currentSection.subtitles.filter(s => s.name).map(s => (
                          <option key={s.name} value={s.name}>{s.name} (v{s.startVerse}–{s.endVerse})</option>
                        ))}
                        <option value="__new">+ New subtitle...</option>
                      </select>
                    ) : (
                      <input type="text" value={taskForm.subtitle}
                        onChange={e => setTaskForm({...taskForm, subtitle: e.target.value})}
                        placeholder="e.g. The Genealogy of Jesus"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    )}
                    {taskForm.subtitle === '__new' && (
                      <input type="text" placeholder="Enter subtitle name"
                        onChange={e => setTaskForm({...taskForm, subtitle: e.target.value})}
                        className="w-full mt-2 px-3 py-2 border border-blue-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start Verse</label>
                      <input type="number" value={taskForm.startOrder} min={1}
                        onChange={e => setTaskForm({...taskForm, startOrder: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End Verse</label>
                      <input type="number" value={taskForm.endOrder} min={1}
                        onChange={e => setTaskForm({...taskForm, endOrder: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Language</label>
                    <select value={taskForm.language} onChange={e => setTaskForm({...taskForm, language: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
                      {(bookLanguages.length > 0 ? bookLanguages : ['gez','ti','en']).map(l => (
                        <option key={l} value={l}>{COMMON_LANGS[l] || l}</option>
                      ))}
                      <option value="all">All Languages</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Split into N tasks</label>
                    <input type="number" value={taskForm.taskCount} min={1} max={50}
                      onChange={e => setTaskForm({...taskForm, taskCount: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  <div className="bg-blue-50 p-2.5 rounded-lg text-xs text-blue-700">
                    → {taskForm.taskCount} tasks · ~{Math.ceil((taskForm.endOrder - taskForm.startOrder + 1) / Math.max(taskForm.taskCount, 1))} verses each
                  </div>

                  <button type="submit" disabled={loading || !taskForm.sectionId || taskForm.sectionId === '__new'}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                    {loading ? 'Creating...' : `Create ${taskForm.taskCount} Tasks`}
                  </button>
                </form>
              </div>
            )}

            {/* ASSIGN VOLUNTEER */}
            {panel === 'assign' && (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  <p className="text-xs text-gray-500 mb-2">{selectedTasks.size} task(s) selected. Pick a volunteer:</p>
                  {volunteers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No active volunteers yet</p>
                  ) : volunteers.map(vol => {
                    const isSel = selectedVolunteer?.email === vol.email;
                    return (
                      <div key={vol.email}
                        onClick={() => { setSelectedVolunteer(isSel ? null : vol); if (!isSel) suggestTasksForVolunteer(vol); }}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${isSel ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <p className="font-semibold text-sm text-gray-900">{vol.name}</p>
                            <p className="text-xs text-gray-400">{vol.email}</p>
                          </div>
                          <span className="text-xs text-gray-400">⏱️ {vol.hoursPerWeek}h/wk</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {vol.languages.map(l => (
                            <span key={l} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                              {COMMON_LANGS[l] || l}{vol.languageProficiency?.[l] ? ` · ${vol.languageProficiency[l]}` : ''}
                            </span>
                          ))}
                        </div>
                        {vol.stats.tasksCompleted > 0 && (
                          <p className="text-xs text-gray-400 mt-1">✅ {vol.stats.tasksCompleted} tasks done</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedVolunteer && (
                  <div className="p-4 border-t bg-gray-50">
                    <p className="text-sm text-gray-600 mb-3">
                      Assign <strong>{selectedTasks.size} task(s)</strong> to <strong>{selectedVolunteer.name}</strong>
                    </p>
                    <button onClick={handleAssignTasks} disabled={loading}
                      className="w-full bg-green-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-50">
                      {loading ? 'Assigning...' : 'Confirm Assignment'}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* LANGUAGES */}
            {panel === 'languages' && selectedBook && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-sm text-gray-500">Languages available for this book. Volunteers see only these when entering text.</p>
                <div className="space-y-2">
                  {bookLanguages.map(l => (
                    <div key={l} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                      <span className="text-sm font-medium">{COMMON_LANGS[l] || l} <span className="text-gray-400 text-xs">({l})</span></span>
                      <button onClick={() => setBookLanguages(bookLanguages.filter(x => x !== l))}
                        className="text-red-400 hover:text-red-600 text-sm">Remove</button>
                    </div>
                  ))}
                  {bookLanguages.length === 0 && <p className="text-sm text-gray-400 italic">No languages set</p>}
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Quick add:</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Object.entries(COMMON_LANGS).filter(([code]) => !bookLanguages.includes(code)).map(([code, label]) => (
                      <button key={code} onClick={() => setBookLanguages([...bookLanguages, code])}
                        className="text-xs bg-white border border-gray-300 px-2.5 py-1 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all">
                        + {label}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-semibold text-gray-600 mb-2">Add custom language:</p>
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={newLangCode} onChange={e => setNewLangCode(e.target.value.toLowerCase())}
                      placeholder="code (e.g. sw)" maxLength={10}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={() => {
                      const code = newLangCode.trim();
                      if (code && !bookLanguages.includes(code)) {
                        setBookLanguages([...bookLanguages, code]);
                        setNewLangCode('');
                      }
                    }} disabled={!newLangCode}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-40">
                      Add
                    </button>
                  </div>

                  <button onClick={handleSaveLanguages}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700">
                    Save Languages
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
