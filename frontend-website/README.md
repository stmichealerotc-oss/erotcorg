# St. Michael Church - Public Website (Static)

This is the static public-facing website for St. Michael Eritrean Orthodox Tewahdo Church.

## 📁 Structure

```
frontend-website/
├── index.html              # Main homepage
├── css/                    # Stylesheets
│   └── styles.css         # Main styles
├── js/                     # JavaScript files
│   ├── script.js          # Main navigation & UI
│   ├── calendar.js        # Bahre Hasab calendar
│   ├── articles.js        # Articles system
│   ├── kidsprogram.js     # Kids program (connects to backend API)
│   └── TewahdoHaymanot.js # Tewahdo teachings
├── data/                   # Static data files
│   ├── articles/          # Article content (JSON)
│   ├── pillars/           # Faith pillars content
│   ├── sacraments/        # Sacraments content
│   └── liturgy/           # Liturgy content
├── pages/                  # Additional pages
│   ├── member-registration.html
│   ├── member-update.html
│   └── privacy-policy.html
└── audio/                  # Audio files for mezmur

## 🔗 Backend Integration

The website connects to the st-michael-church backend for:
- Kids Program data (API: `/api/kids-program/:year/:month`)
- Member registration (API: `/api/members/register`)
- Contact form submissions

### API Configuration

**Local Development:**
- Backend runs on: `http://localhost:3001`
- Frontend can be served from any port

**Production (Azure):**
- Backend and frontend share the same origin
- API calls use relative paths

## 🚀 Deployment

This static website is designed for Azure Static Web Apps deployment:

1. **Build**: No build step required (pure HTML/CSS/JS)
2. **Deploy**: Push to GitHub, Azure Static Web Apps auto-deploys
3. **Backend**: Connects to st-michael-church backend (port 3001)

## 📝 Features

- ✅ Responsive design (mobile-first)
- ✅ Bahre Hasab calendar calculator
- ✅ Articles system with categories
- ✅ Kids Program with weekly lessons
- ✅ Member registration
- ✅ Tewahdo Haymanot teachings
- ✅ Audio player for mezmur
- ✅ SEO optimized

## 🔧 Local Testing

1. Start the backend:
   ```powershell
   cd st-michael-church/backend
   node server.js
   ```

2. Serve the frontend:
   ```powershell
   # Option 1: Using Python
   cd st-michael-church/frontend-website
   python -m http.server 8080

   # Option 2: Using Node.js http-server
   npx http-server st-michael-church/frontend-website -p 8080
   ```

3. Open: `http://localhost:8080`

## 📦 Static Assets

All content is self-contained:
- No external dependencies (except Font Awesome CDN)
- All data files are local JSON
- Images and audio files are local
- Works offline (except API calls)

## 🎨 Customization

To customize the website:
1. **Colors**: Edit CSS variables in `css/styles.css`
2. **Content**: Update JSON files in `data/` folder
3. **Layout**: Modify `index.html` and section templates
4. **Features**: Add/modify JavaScript in `js/` folder

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔐 Security

- CORS configured for backend API
- No sensitive data in frontend
- Form validation on client and server
- Rate limiting on backend API
