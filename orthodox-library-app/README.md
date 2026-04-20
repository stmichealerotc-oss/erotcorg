# Orthodox Library 📖✝️

Digital liturgical platform for Eritrean Orthodox Tewahedo Church

## 🎯 Mission

Create a comprehensive digital library system for the Eritrean Orthodox Tewahedo Church supporting:

- Multi-language liturgical content (Ge'ez, Tigrinya, English)
- Multiple display modes (Reader, Study, Projector)
- Church projector integration with role-based coloring
- Easy admin management and volunteer contributions

## 🏗️ Architecture

### Tech Stack

- **Frontend:** Next.js 15 + React 19 + TypeScript
- **Styling:** Tailwind CSS + custom utilities
- **Backend:** Next.js API Routes
- **Database:** Azure Cosmos DB (planned for Phase 2)
- **Icons:** Heroicons

### Project Structure

```
orthodox-library-app/
├── app/
│   ├── page.tsx                 # Homepage
│   ├── layout.tsx               # Root layout
│   ├── globals.css              # Global styles
│   ├── books/
│   │   ├── page.tsx             # Books list
│   │   └── [bookId]/
│   │       ├── page.tsx         # Book detail with mode selection
│   │       ├── reader/
│   │       │   └── page.tsx     # Reader mode
│   │       ├── study/
│   │       │   └── page.tsx     # Study mode
│   │       └── display/
│   │           └── page.tsx     # Display/Projector mode
│   ├── admin/
│   │   └── page.tsx             # Admin panel (Phase 2)
│   └── api/
│       └── books/
│           ├── route.ts         # GET /api/books
│           ├── [bookId]/
│           │   ├── route.ts     # GET /api/books/:id
│           │   └── blocks/
│           │       └── route.ts # GET /api/books/:id/blocks
├── components/
│   ├── LiturgicalBlock.tsx      # Single block display
│   ├── LiturgicalBlockComponent.tsx # (same, using different name)
│   ├── ReaderMode.tsx           # Sequential reading
│   ├── StudyMode.tsx            # 3-column comparison
│   ├── DisplayMode.tsx          # Fullscreen projector
│   └── BooksList.tsx            # Books grid
├── lib/
│   ├── mockData.ts              # Sample liturgical data
│   ├── utils.ts                 # Utility functions
│   └── cosmos.ts                # Cosmos DB queries (Phase 2)
├── models/
│   └── types.ts                 # TypeScript types & interfaces
├── styles/
│   └── globals.css              # Tailwind + custom CSS
├── public/
│   └── (future image assets)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (npm 9+)
- Git

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd orthodox-library-app
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser


## ⚙️ Environment Variables

Copy `.env.example` to `.env` or configure equivalent variables in your deployment platform (Vercel, Azure, etc.). The project doesn't rely on any secrets yet, but you can add items such as a database URL, analytics key, or authentication settings as needed.

```bash
cp .env.example .env
# edit .env with real values
```

**Tip:** If you encounter out‑of‑memory errors during build, you can set `NODE_OPTIONS` to increase heap size. On macOS/Linux:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

On Windows PowerShell:

```powershell
$env:NODE_OPTIONS = "--max-old-space-size=4096"; npm run build
```

or use the one‑liner:
```powershell
SET NODE_OPTIONS=--max-old-space-size=4096 && npm run build
```

This is only necessary for local builds; most deployment platforms handle resources automatically.

## 🛠️ Deployment

This Next.js app is production‑ready and can be deployed to any standard Node.js host or platform such as Vercel, Netlify, Azure, or AWS.

1. Ensure environment variables are set (`.env` or platform config).
2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```
3. Start the server:
   ```bash
   npm start
   ```

Alternatively, push to Vercel/GitHub and the platform will run the build automatically.

> TIP: Use `npm run lint` to check code quality before deploying.


## 📖 Display Modes

### 1. Reader Mode
- Sequential, single-language reading
- Instant language switching (Ge'ez/Tigrinya/English)
- Mobile-friendly responsive design
- Role indicators for speaker identification

**URL:** `/books/[bookId]/reader`

### 2. Study Mode
- 3-column parallel view
- Compare all three languages side-by-side
- Perfect for learning and research
- Context-aware formatting

**URL:** `/books/[bookId]/study`

### 3. Display Mode (Projector)
- Full-screen church presentation mode
- Role-based color coding:
  - 🟨 Priest: Gold
  - 🟥 Deacon: Red
  - 🟦 Choir: Blue
  - 🟩 Reader: Green
  - 🟥 Rubrics: Dark Red (italic)
- Adjustable font sizes
- Navigation controls (next/previous)
- Optional auto-scroll

**URL:** `/books/[bookId]/display`

## 🗄️ Data Model

### Books
- Title (in 3 languages)
- Description
- Type (liturgy, synaxarion, bible, hymnology)
- Supported languages
- Associated liturgical blocks

### Liturgical Blocks
- ID (UUID)
- Book ID (partition key for Cosmos DB)
- Section ID (e.g., "anaphora", "epiclesis")
- Order (sequence within section)
- Type (dialogue, hymn, prayer, reading, rubric, instruction)
- Role (priest, deacon, choir, reader, people, bishop)
- Translations (Ge'ez, Tigrinya, English)
- Style metadata (color, bold, italic, font size)
- Flags: isRubric, isResponsive

### Calendar Days (Phase 3)
- Month/day (Ge'ez calendar)
- Commemorations (saints)
- Fasting information
- Moveable feast dates

## 👥 Roles in Display Mode

| Role | Color | Use |
|------|-------|-----|
| Priest | Gold (#FFD700) | Main liturgy leader |
| Deacon | Red (#DC143C) | Deacon calls |
| Choir | Blue (#4169E1) | Congregational responses |
| Reader | Green (#228B22) | Special readings |
| People | Blue | Congregational responses |
| Bishop | Gold | Senior ceremonial role |
| *Rubrics* | Dark Red | Instructions (italic) |

## 🌍 Languages Supported

- **Ge'ez (ግዕዝ):** Ancient liturgical language
- **Tigrinya (ትግርኛ):** Modern daily understanding
- **English:** Diaspora and educational use

All languages are stored together in each content block for **instant switching** with no database queries needed.

## 📱 Features

### Phase 1 (Current - MVP)
- ✅ Basic Next.js project setup
- ✅ Mock data service with sample liturgical content
- ✅ Reader mode with language switching
- ✅ Study mode (3-column comparison)
- ✅ Display/Projector mode with role colors
- ✅ Homepage with mode explanations
- ✅ API endpoints for books data

### Phase 2 (Planned)
- 🔲 Admin panel for managing books
- ✅ Enhanced task assignment & review workflow (ranges, reviewers, status states)
- ✅ Volunteer contribution forms with per-verse entry, previous verse access, and progress tracking
- 🔲 User authentication (NextAuth.js)
- 🔲 Cosmos DB integration
- 🔲 Role-based access control

### Phase 3 (Planned)
- 🔲 Synaxarion daily readings
- 🔲 Eritrean Orthodox calendar conversion
- 🔲 Fasting season highlighting
- 🔲 Date-based automatic content

### Phase 4+ (Future)
- 🔲 Search functionality
- 🔲 Bookmarking & favorites
- 🔲 Offline PWA support
- 🔲 Real-time multi-screen sync
- 🔲 Flutter mobile app (using same API)

## 🎨 Design Principles

1. **Liturgical Accuracy:** Respects the structure and traditions of the Eritrean Orthodox Church
2. **Multi-Modal:** Different display modes for different use cases (reading, learning, presentation)
3. **Accessibility:** Role-based coloring, large fonts, responsive design
4. **Performance:** Minimal API calls through embedded translations
5. **Extensibility:** Clean data structure supports future features without redesign

## 🛠️ Development Workflow

### Add a New Liturgical Block

Edit `lib/mockData.ts`:

```typescript
{
  id: "unique-id",
  bookId: "kidase-john",
  sectionId: "doxology",
  order: 5,
  type: "prayer",
  role: "priest",
  translations: {
    gez: "...",
    ti: "...",
    en: "..."
  },
  style: {
    bold: true,
    color: "gold"
  },
  isRubric: false,
  isResponsive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
```

### Roles Usage

```typescript
// In components
import { getRoleColor, getRoleBackgroundColor } from "@/lib/utils";

const textColor = getRoleColor(block.role); // "text-role-priest"
const bgColor = getRoleBackgroundColor(block.role); // "bg-yellow-600"
```

## 📚 Sample Books Included

1. **Divine Liturgy of Saint John Chrysostom** (kidase-john)
   - Most commonly used liturgy
   - Complete with antiphons, epiclesis, doxology
   - Full translations

2. **Divine Liturgy of Saint Basil** (kidase-basil)
   - Used during fasting periods
   - 3-column study mode ready

## 🔗 API Endpoints

```
GET  /api/books                    # All books
GET  /api/books/[bookId]           # Specific book + blocks
GET  /api/books/[bookId]/blocks    # Book blocks only
```

## 🧪 Testing Display Modes

### Quick Test
1. Navigate to home page: http://localhost:3000
2. Click "Explore Books"
3. Select "Divine Liturgy of Saint John Chrysostom"
4. Choose your display mode:
   - **Reader:** /books/kidase-john/reader
   - **Study:** /books/kidase-john/study
   - **Display:** /books/kidase-john/display

### Test Language Switching
In Reader mode, click language buttons (GEZ / TI / EN) to instantly switch translations.

### Test Projector Mode
- Full screen, press F11 (browser fullscreen)
- Use arrow buttons to navigate blocks
- Adjust font size with slider
- Enable auto-scroll for continuous display

## 🔐 Authentication (Phase 2)

Future implementation will use:
- **NextAuth.js** for session management
- **Email/Password** authentication
- **Role-based access control** (Admin, Volunteer, Reader)

## 📝 Contributing

This is a church community project. Volunteers can contribute:
- Liturgical text corrections
- Translation improvements
- Design feedback
- Feature requests

## 📫 Contact

🇪🇷 For Eritrean Orthodox Tewahedo Church

## 📄 License

[To be determined]

## 🙏 Acknowledgments

- Eritrean Orthodox Tewahedo Church
- Contributors and volunteers
- Open-source community

---

**Current Status:** Phase 1 MVP - Fully Functional  
**Last Updated:** February 2026
