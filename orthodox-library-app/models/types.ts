/**
 * Orthodox Church Library Data Models
 * Designed for Eritrean Orthodox Tewahedo Church
 */

export type Role = "priest" | "deacon" | "choir" | "reader" | "people" | "bishop" | "";
export type Language = "gez" | "ti" | "en";
export type LiturgicalType = "dialogue" | "hymn" | "prayer" | "reading" | "rubric" | "instruction";

// Book metadata
export interface Book {
  id: string;
  title: string;
  titleGez?: string;
  titleTi?: string;
  description?: string;
  type: "liturgy" | "synaxarion" | "bible" | "hymnology";
  tradition: "eritrean-orthodox" | "ethiopian-orthodox" | "other";
  languages: Language[];
  imageCover?: string;
  createdAt: string;
  updatedAt: string;
}

// Translations container
export interface Translations {
  gez?: string;
  ti?: string;
  en?: string;
}

// Style information for display
export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  color?: string; // e.g., "gold", "red", "blue"
  fontSize?: "small" | "normal" | "large" | "xlarge";
}

// Main liturgical block (smallest unit of content)
export interface LiturgicalBlock {
  id: string;              // format: `${bookId}-${section}-${verseNumber}`
  bookId: string; // partition key for Cosmos
  section: string; // e.g., "opening", "anaphora", "doxology"
  verseNumber: number; // discrete verse within section for task ranges
  globalOrder: number; // overall ordering across book if needed
  role: Role; // who speaks this
  translations: Translations;
  // content flags
  isRubric?: boolean; // instruction/rubric rather than spoken text (displayed italic, dark red)
  isResponsive?: boolean; // hint for responsive layout adjustments (future use)
  
  createdBy: string; // user id of volunteer who entered
  createdAt: string;
  updatedAt: string;
}

// Section grouping (e.g., Anaphora, Epiclesis)
export interface LiturgicalSection {
  id: string;
  bookId: string;
  title: Translations;
  order: number;
  blocks: string[]; // array of block IDs
  description?: string;
}

// Calendar day with Synaxarion info
export interface CalendarDay {
  id: string; // e.g., "meskerem-1"
  month: number; // 1-13
  day: number;
  year?: number; // Gregorian
  eYear?: number; // Ethiopian/Eritrean
  titleGez?: string;
  titleTi?: string;
  titleEn?: string;
  fasting: boolean;
  fastingType?: "complete" | "no-meat" | "partial";
  commemorations: Commemoration[];
  moveable?: boolean; // for moveable feasts like Pascha
  paschalOffset?: number; // days from Pascha (can be negative)
}

export interface Commemoration {
  saintId: string;
  nameGez?: string;
  nameTi?: string;
  nameEn?: string;
  synaxarionText?: Translations;
  feastType?: "major" | "minor";
}

// User for admin/volunteer access
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // optional for login system
  role: "admin" | "volunteer" | "reader" | "";
  canEdit: boolean;
  church?: string;
  createdAt: string;
}
// Content task for volunteer entry
export interface ContentTask {
  id: string; // task-${bookId}-${section}-${startVerse}-${endVerse}
  bookId: string;
  section: string;
  startVerse: number;
  endVerse: number;
  assignedTo: string; // user id of volunteer
  // status workflow expanded for review/audit process
  status:
    | "pending"        // just created, not started
    | "in-progress"    // volunteer has begun entering text
    | "submitted"      // volunteer has finished and sent for review
    | "under-review"   // reviewer (adult/teacher/expert) is evaluating
    | "approved"       // reviewer signed off
    | "rejected"       // reviewer sent back for corrections
    | "completed";     // final state after approval
  reviewerId?: string; // optional user id of the person assigned to review
  createdAt: string;
  submittedAt?: string;
  reviewedAt?: string;
}
