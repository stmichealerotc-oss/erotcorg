/**
 * Real API client - connects to backend at /api/orthodox-library
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface Book {
  _id: string;
  title: string;
  titleGez?: string;
  titleTi?: string;
  description?: string;
  category: 'anaphora' | 'synaxar' | 'seatat' | 'bible' | 'other';
  type: string;
  languages?: string[];
  blockCount: number;
  status: string;
}

export interface Block {
  _id: string;
  blockId: string;
  bookId: string;
  sectionId: string;
  order: number;
  type: string;
  role: string;
  translations: { gez?: string; ti?: string; en?: string; am?: string };
  isRubric: boolean;
  isResponsive: boolean;
  metadata?: { enteredBy?: string; language?: string };
}

export interface Assignment {
  assignmentId: string;
  volunteerEmail: string | null;
  volunteerName: string | null;
  bookId: string;
  bookTitle: string;
  category: string;
  sectionId: string;
  subtitle: string;
  startOrder: number;
  endOrder: number;
  language: string;
  taskSize: 'small' | 'medium' | 'large';
  status: 'unassigned' | 'assigned' | 'in-progress' | 'completed' | 'verified';
  progress: { completedBlocks: number; totalBlocks: number };
  assignedAt: string;
  createdAt: string;
  notes?: string;
}

export interface BookProgress {
  summary: {
    total: number;
    unassigned: number;
    assigned: number;
    inProgress: number;
    completed: number;
    verified: number;
  };
  data: Assignment[];
}

export interface BookStructure {
  sectionId: string;  // "opening", "Chapter 1", "Meskerem 1", etc.
  subtitles: {
    name: string;     // "" for no subtitle, or "The Genealogy of Jesus"
    startVerse: number;
    endVerse: number;
    verseCount: number;
  }[];
}

// ── Books ──────────────────────────────────────────────────────────────────

export async function fetchBooks(category?: string): Promise<Book[]> {
  const q = category ? `?category=${category}` : '';
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/books${q}`, { cache: 'no-store' });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch { return []; }
}

export async function fetchBook(bookId: string): Promise<Book | null> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/books/${bookId}`, { cache: 'no-store' });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch { return null; }
}

export async function fetchBookStructure(bookId: string): Promise<BookStructure[]> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/books/${bookId}/structure`, { cache: 'no-store' });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch { return []; }
}

export async function updateBookLanguages(bookId: string, languages: string[]): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/books/${bookId}/languages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ languages })
    });
    const data = await res.json();
    return data.success;
  } catch { return false; }
}

// ── Blocks ─────────────────────────────────────────────────────────────────

export async function fetchBlocks(bookId: string, sectionId?: string): Promise<Block[]> {
  const q = sectionId ? `?sectionId=${sectionId}` : '';
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/books/${bookId}/blocks${q}`, { cache: 'no-store' });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch { return []; }
}

export async function submitBlocks(blocks: Partial<Block>[]): Promise<{ success: boolean; count: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/blocks/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks })
    });
    const data = await res.json();
    return { success: data.success, count: data.count || 0 };
  } catch { return { success: false, count: 0 }; }
}

// ── Assignments ────────────────────────────────────────────────────────────

export async function fetchMyAssignments(email: string): Promise<Assignment[]> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/assignments/my/${encodeURIComponent(email)}`, { cache: 'no-store' });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch { return []; }
}

export async function fetchAllAssignments(params?: {
  status?: string; bookId?: string; category?: string; volunteerEmail?: string;
}): Promise<Assignment[]> {
  try {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.bookId) q.set('bookId', params.bookId);
    if (params?.category) q.set('category', params.category);
    if (params?.volunteerEmail) q.set('volunteerEmail', params.volunteerEmail);
    const res = await fetch(`${API_BASE}/api/orthodox-library/assignments?${q}`, { cache: 'no-store' });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch { return []; }
}

export async function fetchBookProgress(bookId: string): Promise<BookProgress | null> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/assignments/book/${bookId}/progress`, { cache: 'no-store' });
    const data = await res.json();
    return data.success ? data : null;
  } catch { return null; }
}

export async function createAssignment(payload: {
  bookId: string; bookTitle: string; category?: string;
  sectionId: string; subtitle?: string;
  startOrder: number; endOrder: number; language: string;
  volunteerEmail?: string; volunteerName?: string; notes?: string;
}): Promise<Assignment | null> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch { return null; }
}

export async function createBulkTasks(payload: {
  bookId: string; bookTitle: string; category?: string;
  sectionId: string; subtitle?: string;
  totalVerses: number; taskCount: number;
  language: string; notes?: string;
}): Promise<Assignment[]> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/assignments/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch { return []; }
}

export async function assignVolunteer(
  assignmentId: string,
  volunteerEmail: string,
  volunteerName: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/assignments/${assignmentId}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volunteerEmail, volunteerName })
    });
    const data = await res.json();
    return data.success;
  } catch { return false; }
}

export async function updateAssignmentStatus(
  assignmentId: string, status: string, completedBlocks?: number
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/assignments/${assignmentId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, completedBlocks })
    });
    const data = await res.json();
    return data.success;
  } catch { return false; }
}

export async function deleteAssignment(assignmentId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/orthodox-library/assignments/${assignmentId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    return data.success;
  } catch { return false; }
}
