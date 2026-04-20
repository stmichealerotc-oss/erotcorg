/**
 * Mock Data Service
 * Provides sample liturgical data for development and design testing
 * Later: Replace with real Cosmos DB queries
 */

import {
  Book,
  LiturgicalBlock,
  LiturgicalSection,
  CalendarDay,
  User,
  ContentTask,
} from "@/models/types";

// Sample Books
export const mockBooks: Book[] = [
  {
    id: "kidase-john",
    title: "Divine Liturgy of Saint John Chrysostom",
    titleGez: "ቅደስ ዮሐንስ",
    titleTi: "ሞይተ ዮሐንስ",
    description: "The most commonly used divine liturgy in the Eritrean Orthodox Church",
    type: "liturgy",
    tradition: "eritrean-orthodox",
    languages: ["gez", "ti", "en"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "kidase-basil",
    title: "Divine Liturgy of Saint Basil the Great",
    titleGez: "ቅደስ ገብረ ሙስጥር",
    titleTi: "ሞይተ ባሲል",
    description: "Used during fasting periods and Lenten seasons",
    type: "liturgy",
    tradition: "eritrean-orthodox",
    languages: ["gez", "ti", "en"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Sample Liturgical Blocks for Divine Liturgy (converted to new schema)
export const mockLiturgicalBlocks: LiturgicalBlock[] = [
  {
    id: "kidase-john-opening-1",
    bookId: "kidase-john",
    section: "opening",
    verseNumber: 1,
    globalOrder: 1,
    role: "priest",
    translations: { gez: "ሰላም ለኩሉክሙ", ti: "ሰላም ንኹሉኹም", en: "Peace be with you all" },
    isRubric: false,
    isResponsive: true,
    createdBy: "user-admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "kidase-john-opening-2",
    bookId: "kidase-john",
    section: "opening",
    verseNumber: 2,
    globalOrder: 2,
    role: "people",
    translations: { gez: "ለመንግሥትከ ምሳ ስሙ ስሙ", ti: "ሕብረት ስሙ", en: "And with your spirit" },
    isRubric: false,
    isResponsive: true,
    createdBy: "user-vol1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "kidase-john-opening-3",
    bookId: "kidase-john",
    section: "opening",
    verseNumber: 3,
    globalOrder: 3,
    role: "deacon",
    translations: {
      gez: "አዕሪበ በገንቤእ ሞገስ ሊተ",
      ti: "ደያሙ ሞገስ",
      en: "The deacon proclaims loudly from the sanctuary:",
    },
    isRubric: false,
    isResponsive: true,
    createdBy: "user-vol1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  // sample rubric instruction block
  {
    id: "kidase-john-opening-4",
    bookId: "kidase-john",
    section: "opening",
    verseNumber: 4,
    globalOrder: 4,
    role: "priest",
    translations: {
      gez: "[ይህ መልስ የሚከተለው ክፍል የማስታወቂያ ነው]",
      ti: "[እንዲህ ይላል ክፍል ማስታወቂያ ነው]",
      en: "[This section contains an instruction/rubric]",
    },
    isRubric: true,
    isResponsive: true,
    createdBy: "user-admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Sample Liturgical Sections
export const mockSections: LiturgicalSection[] = [
  {
    id: "opening-antiphons",
    bookId: "kidase-john",
    title: {
      gez: "መክደስ",
      ti: "ዝነብር",
      en: "Opening Antiphons",
    },
    order: 1,
    blocks: ["block-001", "block-002", "block-003"],
    description: "The opening portion of the Divine Liturgy",
  },
  {
    id: "epiclesis",
    bookId: "kidase-john",
    title: {
      gez: "ተዋሥያ",
      ti: "ቁዳስ",
      en: "Epiclesis (Consecration)",
    },
    order: 2,
    blocks: ["block-004", "block-005"],
    description: "The moment of consecration",
  },
  {
    id: "doxology",
    bookId: "kidase-john",
    title: {
      gez: "ዲክስሎጂያ",
      ti: "ዲክስሎጂያ",
      en: "Doxology",
    },
    order: 3,
    blocks: ["block-006"],
    description: "Closing doxology",
  },
];

// Sample Calendar Days (Eritrean Orthodox calendar)
export const mockCalendarDays: CalendarDay[] = [
  {
    id: "meskerem-1",
    month: 1,
    day: 1,
    eYear: 2018, // Ethiopian calendar year
    titleGez: "ኖwade 2048",
    titleTi: "ሰውነት 1",
    titleEn: "Eritrean New Year",
    fasting: false,
    commemorations: [],
  },
  {
    id: "meskerem-11",
    month: 1,
    day: 11,
    titleGez: "ውድስት ወወጣዊ",
    titleTi: "ሞይተ ሙሴ",
    titleEn: "Saint Tekle Haimanot",
    fasting: false,
    commemorations: [
      {
        saintId: "saint-tekle",
        nameGez: "ቴክለ ሃይማኖት",
        nameTi: "ቴክለ ሃይማኖት",
        nameEn: "Tekle Haimanot",
        feastType: "major",
      },
    ],
  },
  {
    id: "tahisas-25",
    month: 4,
    day: 25,
    titleGez: "ጠሓሰ 25",
    titleTi: "ሕዛን 18",
    titleEn: "Christmas",
    fasting: false,
    commemorations: [
      {
        saintId: "jesus-birth",
        nameGez: "ልደተ ክርስቶስ",
        nameTi: "ልደተ ኢየሱስ",
        nameEn: "Nativity of Jesus Christ",
        feastType: "major",
      },
    ],
  },
];

// Users & tasks
export const mockUsers: User[] = [
  { id: "user-admin", name: "Administrator", email: "admin@example.com", password: "admin123", role: "admin", canEdit: true, createdAt: new Date().toISOString() },
  { id: "user-vol1", name: "Volunteer One", email: "vol1@example.com", password: "vol123", role: "volunteer", canEdit: true, createdAt: new Date().toISOString() },
  { id: "user-reader1", name: "John Tekle", email: "john@example.com", password: "reader123", role: "", canEdit: false, church: "Holy Spirit Church", createdAt: new Date().toISOString() },
  { id: "user-reader2", name: "Maria Samuel", email: "maria@example.com", password: "reader123", role: "", canEdit: false, church: "Saint Mary Church", createdAt: new Date().toISOString() },
];

export const mockContentTasks: ContentTask[] = [
  {
    id: "task-kidase-john-opening-1-3",
    bookId: "kidase-john",
    section: "opening",
    startVerse: 1,
    endVerse: 3,
    assignedTo: "user-vol1",
    status: "in-progress",
    createdAt: new Date().toISOString(),
  },
];

// Fetch functions
export async function getUsers(): Promise<User[]> {
  return mockUsers;
}

export async function getUserById(id: string): Promise<User | null> {
  return mockUsers.find((u) => u.id === id) || null;
}

export async function getTasks(bookId?: string): Promise<ContentTask[]> {
  if (bookId) return mockContentTasks.filter((t) => t.bookId === bookId);
  return mockContentTasks;
}

export async function getTaskById(taskId: string): Promise<ContentTask | null> {
  return mockContentTasks.find((t) => t.id === taskId) || null;
}

export async function createTask(task: ContentTask): Promise<ContentTask> {
  mockContentTasks.push(task);
  return task;
}

// updateTask allows partial updates including status, reviewer etc.
export async function updateTask(
  taskId: string,
  data: Partial<Pick<ContentTask, 'status' | 'reviewerId' | 'assignedTo' | 'startVerse' | 'endVerse'>>
): Promise<ContentTask | null> {
  const t = mockContentTasks.find((x) => x.id === taskId);
  if (!t) return null;

  if (data.status) {
    t.status = data.status;
    if (data.status === 'submitted') t.submittedAt = new Date().toISOString();
    if (
      data.status === 'under-review' ||
      data.status === 'approved' ||
      data.status === 'rejected'
    ) {
      t.reviewedAt = new Date().toISOString();
    }
  }
  if (data.reviewerId !== undefined) t.reviewerId = data.reviewerId;
  if (data.assignedTo) t.assignedTo = data.assignedTo;
  if (data.startVerse) t.startVerse = data.startVerse;
  if (data.endVerse) t.endVerse = data.endVerse;

  return t;
}

// backward compatibility
export async function updateTaskStatus(taskId: string, status: ContentTask["status"]): Promise<ContentTask | null> {
  return updateTask(taskId, { status });
}

// Block-related logic (validation + upsert)
export async function upsertBlock(
  userId: string,
  taskId: string,
  block: Omit<LiturgicalBlock, "createdAt" | "updatedAt" | "createdBy"> & { verseNumber: number; section: string }
): Promise<LiturgicalBlock> {
  const task = await getTaskById(taskId);
  if (!task) throw new Error("Task not found");
  if (userId !== task.assignedTo) throw new Error("Not assigned to this user");
  if (block.verseNumber < task.startVerse || block.verseNumber > task.endVerse) {
    throw new Error("Verse out of range");
  }
  const id = `${block.bookId}-${block.section}-${block.verseNumber}`;
  let existing = mockLiturgicalBlocks.find((b) => b.id === id);
  if (existing) {
    if (existing.createdBy !== userId) throw new Error("Cannot overwrite another user's work");
    // update fields
    existing.translations = block.translations;
    existing.role = block.role;
    existing.globalOrder = block.globalOrder || existing.globalOrder;
    // propagate new flags if present
    if (typeof block.isRubric !== "undefined") existing.isRubric = block.isRubric;
    if (typeof block.isResponsive !== "undefined") existing.isResponsive = block.isResponsive;
    existing.updatedAt = new Date().toISOString();
    return existing;
  }
  const newBlock: LiturgicalBlock = {
    ...block,
    id,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as LiturgicalBlock;
  mockLiturgicalBlocks.push(newBlock);
  return newBlock;
}

export async function countBlocksForTask(task: ContentTask): Promise<number> {
  return mockLiturgicalBlocks.filter(
    (b) =>
      b.bookId === task.bookId &&
      b.section === task.section &&
      b.verseNumber >= task.startVerse &&
      b.verseNumber <= task.endVerse
  ).length;
}

export async function calculateProgress(task: ContentTask): Promise<number> {
  const count = await countBlocksForTask(task);
  const total = task.endVerse - task.startVerse + 1;
  return Math.floor((count / total) * 100);
}

export async function getBlocksForTask(task: ContentTask): Promise<LiturgicalBlock[]> {
  return mockLiturgicalBlocks.filter(
    (b) =>
      b.bookId === task.bookId &&
      b.section === task.section &&
      b.verseNumber >= task.startVerse &&
      b.verseNumber <= task.endVerse
  );
}

// Fetch functions
export async function getBooks(): Promise<Book[]> {
  // TODO: Replace with Cosmos DB query: 
  // SELECT * FROM books
  return mockBooks;
}

export async function getBookById(bookId: string): Promise<Book | null> {
  // TODO: Replace with Cosmos DB query:
  // SELECT * FROM books WHERE books.id = @bookId
  return mockBooks.find((b) => b.id === bookId) || null;
}

export async function getLiturgicalBlocks(bookId: string): Promise<LiturgicalBlock[]> {
  // TODO: Replace with Cosmos DB query:
  // SELECT * FROM liturgical_blocks WHERE liturgical_blocks.bookId = @bookId ORDER BY liturgical_blocks.sectionId, liturgical_blocks.order
  return mockLiturgicalBlocks.filter((b) => b.bookId === bookId);
}

export async function getLiturgicalBlocksBySection(
  bookId: string,
  sectionId: string
): Promise<LiturgicalBlock[]> {
  // TODO: Replace with Cosmos DB query
  return mockLiturgicalBlocks.filter((b) => b.bookId === bookId && b.section === sectionId);
}

export async function getSections(bookId: string): Promise<LiturgicalSection[]> {
  // TODO: Replace with Cosmos DB query
  return mockSections.filter((s) => s.bookId === bookId);
}

export async function getCalendarDays(): Promise<CalendarDay[]> {
  // TODO: Replace with Cosmos DB query:
  // SELECT * FROM calendar_days
  return mockCalendarDays;
}

export async function getCalendarDay(month: number, day: number): Promise<CalendarDay | null> {
  // TODO: Replace with Cosmos DB query
  return mockCalendarDays.find((d) => d.month === month && d.day === day) || null;
}

// Book CRUD operations
export async function createBook(data: Partial<Book>): Promise<Book> {
  const book: Book = {
    id: data.id || `book-${Date.now()}`,
    title: data.title || "",
    titleGez: data.titleGez,
    titleTi: data.titleTi,
    description: data.description,
    type: data.type || "liturgy",
    tradition: data.tradition || "eritrean-orthodox",
    languages: data.languages || ["gez", "ti", "en"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockBooks.push(book);
  return book;
}

export async function updateBook(bookId: string, data: Partial<Book>): Promise<Book | null> {
  const book = mockBooks.find((b) => b.id === bookId);
  if (!book) return null;
  if (data.title) book.title = data.title;
  if (data.titleGez !== undefined) book.titleGez = data.titleGez;
  if (data.titleTi !== undefined) book.titleTi = data.titleTi;
  if (data.description !== undefined) book.description = data.description;
  if (data.type) book.type = data.type;
  book.updatedAt = new Date().toISOString();
  return book;
}

export async function deleteBook(bookId: string): Promise<void> {
  const index = mockBooks.findIndex((b) => b.id === bookId);
  if (index !== -1) mockBooks.splice(index, 1);
}

// User CRUD operations
export async function createUser(data: Partial<User>): Promise<User> {
  // basic validation
  if (!data.name || !data.email || !data.password) {
    throw new Error("Name, email and password are required");
  }

  // prevent duplicate emails
  const existing = mockUsers.find((u) => u.email === data.email);
  if (existing) {
    throw new Error("A user with that email already exists");
  }

  // enforce roles: only volunteers can register themselves
  let role: User["role"] = "";
  if (data.role === "volunteer") {
    role = "volunteer";
  }

  const canEdit = role === "volunteer";

  const user: User = {
    id: data.id || `user-${Date.now()}`,
    name: data.name,
    email: data.email,
    password: data.password,
    role,
    canEdit,
    church: data.church,
    createdAt: new Date().toISOString(),
  };

  mockUsers.push(user);
  return user;
}

export async function updateUser(userId: string, data: Partial<User>): Promise<User | null> {
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) return null;
  if (data.name) user.name = data.name;
  if (data.email) user.email = data.email;
  if (data.role) user.role = data.role;
  if (data.canEdit !== undefined) user.canEdit = data.canEdit;
  if (data.church !== undefined) user.church = data.church;
  return user;
}

export async function deleteUser(userId: string): Promise<void> {
  const index = mockUsers.findIndex((u) => u.id === userId);
  if (index !== -1) mockUsers.splice(index, 1);
}

// Block CRUD operations
export async function getBlockById(blockId: string): Promise<LiturgicalBlock | null> {
  return mockLiturgicalBlocks.find((b) => b.id === blockId) || null;
}

export async function createBlock(data: {
  bookId: string;
  section: string;
  verseNumber: number;
  role: LiturgicalBlock["role"];
  translations: LiturgicalBlock["translations"];
  isRubric?: boolean;
  isResponsive?: boolean;
}): Promise<LiturgicalBlock> {
  const id = `${data.bookId}-${data.section}-${data.verseNumber}`;
  const existing = mockLiturgicalBlocks.find((b) => b.id === id);
  if (existing) {
    // simple overwrite for admin-created content
    existing.role = data.role;
    existing.translations = data.translations;
    if (typeof data.isRubric !== "undefined") existing.isRubric = data.isRubric;
    if (typeof data.isResponsive !== "undefined") {
      existing.isResponsive = data.isResponsive;
    }
    existing.updatedAt = new Date().toISOString();
    return existing;
  }
  const newBlock: LiturgicalBlock = {
    id,
    bookId: data.bookId,
    section: data.section,
    verseNumber: data.verseNumber,
    globalOrder: data.verseNumber,
    role: data.role,
    translations: data.translations,
    isRubric: data.isRubric,
    isResponsive: data.isResponsive,
    createdBy: "user-admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockLiturgicalBlocks.push(newBlock);
  return newBlock;
}

export async function updateBlock(blockId: string, data: Partial<LiturgicalBlock>): Promise<LiturgicalBlock | null> {
  const block = mockLiturgicalBlocks.find((b) => b.id === blockId);
  if (!block) return null;
  if (data.role) block.role = data.role;
  if (data.translations) block.translations = { ...block.translations, ...data.translations };
  if (data.isRubric !== undefined) block.isRubric = data.isRubric;
  if (data.isResponsive !== undefined) block.isResponsive = data.isResponsive;
  if (data.globalOrder !== undefined) block.globalOrder = data.globalOrder;
  block.updatedAt = new Date().toISOString();
  return block;
}

export async function deleteBlock(blockId: string): Promise<void> {
  const index = mockLiturgicalBlocks.findIndex((b) => b.id === blockId);
  if (index !== -1) mockLiturgicalBlocks.splice(index, 1);
}
