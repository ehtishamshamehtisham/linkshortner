# 🏗️ Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                    │
│                           ↓                                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌───────────────────┐                  ┌───────────────────┐
│   TOOL 1          │                  │   TOOL 2          │
│   URL Shortener   │                  │   Secure Share    │
│                   │                  │                   │
│ linkshortner.site │                  │ linkshortner-     │
│                   │                  │ tool2.netlify.app │
│                   │                  │                   │
│ [Netlify Deploy]  │                  │ [Netlify Deploy]  │
│ from: public/     │                  │ from: tool2/      │
│                   │                  │       frontend/   │
└─────────┬─────────┘                  └─────────┬─────────┘
          │                                      │
          │    ┌────────────────────────────────┘
          │    │
          ↓    ↓
    ┌─────────────────────────────┐
    │      BACKEND API            │
    │                             │
    │  linkshortner-6ils.        │
    │  onrender.com               │
    │                             │
    │  [Render Deploy]            │
    │  from: backend/             │
    │                             │
    │  Routes:                    │
    │  • /api/auth/*              │
    │  • /api/links/*             │
    │  • /api/qr/*                │
    │  • /api/content/*           │
    │  • /api/analytics-data      │
    │  • /api/contact             │
    └──────────┬──────────────────┘
               │
               ↓
    ┌──────────────────────────┐
    │   MongoDB Atlas          │
    │                          │
    │   Database:              │
    │   • Users                │
    │   • URLs                 │
    │   • QR Codes             │
    │   • Clicks               │
    │   • Content (Tool 2)     │
    │   • Contact Messages     │
    └──────────────────────────┘
```

## Data Flow

### Tool 1 - Creating a Short Link

```
User (Browser)
    ↓
    1. Enters long URL in form
    ↓
linkshortner.site (Frontend)
    ↓
    2. script.js sends POST request
    ↓
linkshortner-6ils.onrender.com (Backend)
    ↓
    3. Validates & generates short code
    ↓
MongoDB Atlas
    ↓
    4. Saves URL document
    ↓
Backend returns short URL
    ↓
Frontend displays result + QR code
```

### Tool 2 - Creating Secure Share

```
User (Browser)
    ↓
    1. Uploads file/text with password
    ↓
linkshortner-tool2.netlify.app (Frontend)
    ↓
    2. tool.js sends FormData
    ↓
linkshortner-6ils.onrender.com (Backend)
    ↓
    3. Uploads to Cloudinary
    ↓
    4. Saves metadata to MongoDB
    ↓
Backend returns share ID
    ↓
Frontend generates secure link
```

## File Structure

```
premium-shortener/
│
├── frontend/              ← 🛠️ DEVELOPMENT (you edit here)
│   ├── index.html
│   ├── script.js
│   ├── auth.html
│   └── ... (other pages)
│
├── public/                ← 🚀 PRODUCTION (deployed to Netlify)
│   ├── index.html
│   ├── script.js         ← ✅ NOW HAS API_BASE
│   ├── auth.js           ← ✅ NOW HAS API_BASE
│   └── ... (other pages)
│
├── tool2/
│   └── frontend/          ← 🚀 PRODUCTION (deployed to Netlify)
│       ├── index.html
│       ├── js/
│       │   └── tool.js   ← ✅ Already has API_BASE
│       └── ... (other files)
│
├── backend/               ← 🚀 PRODUCTION (deployed to Render)
│   ├── server.js
│   ├── routes/
│   │   ├── tool1.routes.js
│   │   ├── tool2.routes.js
│   │   └── content.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Url.js
│   │   ├── QRCode.js
│   │   └── Content.js
│   └── .env             ← Environment variables
│
└── sync-to-public.bat    ← 🔄 Sync script
```

## Deployment Pipeline

```
Local Development
    ↓
    1. Edit files in frontend/
    ↓
    2. Run sync-to-public.bat
    ↓
    3. Files copied to public/
    ↓
    4. git add . && git commit && git push
    ↓
GitHub Repository
    ↓
    ├─→ Netlify (Tool 1)     → Builds from public/
    ├─→ Netlify (Tool 2)     → Builds from tool2/frontend/
    └─→ Render (Backend)     → Builds from backend/
    ↓
Live Websites
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Tool 1 - URL Shortener
- `POST /api/links` - Create short link
- `GET /api/links` - Get user's links
- `DELETE /api/links/:id` - Delete link
- `GET /api/analytics-data` - Get analytics
- `POST /api/qr/generate` - Generate QR code
- `GET /api/qr/list` - List QR codes

### Tool 2 - Secure Share
- `POST /api/content` - Create secure share
- `POST /api/content/unlock` - Unlock with password
- `GET /api/content/:id` - Get content metadata

### Other
- `POST /api/contact` - Send contact message

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FRONTEND_URL=https://linkshortner.site
```

### Frontend (hardcoded in JS)
```javascript
const API_BASE = "https://linkshortner-6ils.onrender.com";
```

## Security Features

- 🔐 JWT Authentication
- 🔒 Password Hashing (bcrypt)
- 🛡️ CORS Protection
- ⏱️ Rate Limiting
- 🔑 Password-Protected Shares
- ⏰ Time-Limited Shares
- 👁️ View-Limited Shares

---

**Last Updated**: January 29, 2026
