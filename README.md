# SchemaIQ — AI Data Intelligence Platform

> Team Kaizen · Code Apex Hackathon · Track 2: AI Agents

A premium React + Vite + Tailwind v4 frontend for the SchemaIQ AI-powered database intelligence platform.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start the dev server
```bash
npm run dev
```

### 3. Open in browser
```
http://localhost:5173
```

> The frontend expects the backend API at `http://localhost:8001` by default.
> Set `VITE_API_URL` env var to override (e.g. for production).

---

## 🔑 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@schemaiq.ai` | `Kaizen@2025` |
| Analyst | `analyst@schemaiq.ai` | `Analyst@123` |

---

## 📄 Pages

| Route | Page |
|-------|------|
| `/login` | Admin login with demo credentials |
| `/` | Dashboard — metrics, agents status, quality ring |
| `/connections` | DB connections — URL, form builder, file upload |
| `/schema` | Schema Explorer — browse tables and columns |
| `/er-diagram` | Interactive ER Diagram — Modern + Classic views |
| `/dictionary` | AI Data Dictionary — tabbed, searchable, PDF export |
| `/quality` | Data Quality — heatmap, completeness, FK integrity |
| `/agents` | AI Agents — pipeline view, live log, status cards |
| `/querybot` | QueryBot — natural language → SQL → charts |
| `/insights` | Architectural Insights — AI-generated analysis |
| `/settings` | Settings — models, agents, export, notifications |

---

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | **React 18** |
| Build Tool | **Vite 5** |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) |
| Routing | **React Router v6** |
| Charts | **Recharts** |
| ER Diagrams | **D3.js** (force-directed + Peter Chen) |
| PDF Export | **jsPDF + jspdf-autotable + html2canvas** |
| Icons | **Lucide React** |

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8001` |

For production builds, set this in `.env.production` or as a Netlify build variable.

---

## 🚢 Deploy to Netlify

This repo includes `netlify.toml` for auto-configuration.

1. Create a **New Site** on Netlify
2. Connect this repo
3. Set build environment variable:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://schemaiq-backend.onrender.com`)
4. Netlify auto-detects `netlify.toml` — builds with `npm run build`, serves from `dist/`

SPA routing is pre-configured via `[[redirects]]` in `netlify.toml`.

---

## 🔨 Build for Production

```bash
npm run build
npm run preview   # local preview of production build
```

The `dist/` folder contains the static build ready for deployment.

---

## 📁 Project Structure

```
├── index.html                  # Vite entry point
├── vite.config.js              # Vite + Tailwind config
├── netlify.toml                # Netlify deployment config
├── package.json
├── .env.production             # Production API URL
├── public/
│   └── schemaiqlogo.png        # Logo asset
└── src/
    ├── main.jsx                # React entry
    ├── App.jsx                 # Router + auth guard
    ├── config.js               # Centralized API_BASE URL
    ├── index.css               # Tailwind v4 + custom tokens
    ├── context/
    │   └── AuthContext.jsx     # Login state
    ├── data/
    │   ├── db.js               # Static reference data
    │   └── chatEngine.js       # QueryBot API connector
    ├── components/
    │   ├── ui.jsx              # Shared UI components
    │   ├── Sidebar.jsx         # Navigation sidebar
    │   ├── Topbar.jsx          # Top header bar
    │   ├── Layout.jsx          # Page wrapper
    │   ├── ERDiagram.jsx       # Modern D3 ER diagram
    │   └── ClassicERDiagram.jsx # Peter Chen ER diagram
    ├── utils/
    │   ├── schemaToGraph.js    # Schema → D3 graph converter
    │   └── qualityMetrics.js   # Quality score calculator
    └── pages/
        ├── LoginPage.jsx       # Login page
        ├── Dashboard.jsx       # Main dashboard
        ├── QueryBotPage.jsx    # AI chatbot
        ├── SchemaPage.jsx      # Schema Explorer
        ├── InsightsPage.jsx    # AI Insights
        └── OtherPages.jsx      # ER, Dictionary, Quality,
                                # Agents, Connections, Settings
```

---

*Built by Team Kaizen for Code Apex — Track 2: AI Agents*
