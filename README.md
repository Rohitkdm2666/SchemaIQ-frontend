# SchemaIQ — AI Data Intelligence Platform

A premium React + Vite frontend for the SchemaIQ AI-powered database intelligence platform. 

This repository contains the Single Page Application (SPA) that interfaces with the SchemaIQ Python Backend to provide automated schema exploration, data quality profiling, natural language querying, and intelligent architectural insights. Manual database documentation and profiling are time-consuming; SchemaIQ automates these workflows for data analysts, database administrators, and data engineers.

**Live Deployment**: [https://schemaiq.netlify.app/](https://schemaiq.netlify.app/)

## ✨ Features

- **Database Connections Management**: Connect via URL, form builder, or file upload. Supported sources include **PostgreSQL, MySQL, CSV files, and SQL queries**.
- **Schema Explorer & Interactive ER Diagrams**: Browse tables and columns, and visualize relationships with Modern and Classic (Chen) views.
- **AI-generated Data Dictionary**: Automatic documentation with searchable tabs and PDF export capabilities.
- **Data Quality Profiling**: Visual health metrics and heatmaps for completeness, consistency, and foreign key integrity.
- **AI Agents Pipeline**: Track the status, live logs, and progress of backend AI agents.
- **QueryBot**: Natural language to SQL generation with automated charting and visualizations.
- **Architectural Insights**: AI-generated analysis of schema design and optimization recommendations.

## 🏗 Architecture

The application is structured to enforce separation of concerns:
- **Pages**: Dedicated views (`/dashboard`, `/connections`, `/schema`, `/querybot`, etc.).
- **Shared UI Components**: Reusable panels, metric cards, buttons, and layout wrappers.
- **Visualizations**: Specialized components for rendering data structures (`ERDiagram` using D3.js, `ClassicERDiagram`).
- **Data Layer**: API connectors (`chatEngine.js`, `db.js`) to communicate with the REST backend.
- **State Management**: React Context (`AuthContext`) for authentication and session state.

## 🚀 Quick Start

### Prerequisites
- Node.js installed on your machine.
- The SchemaIQ Python Backend API running locally or accessible via URL. (Remote backend instance: `https://schemaiq-backend-1.onrender.com`)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Environment Variables
By default, the application connects to the backend at `http://localhost:8001`. To connect to the production backend, set the `VITE_API_URL` environment variable. There are no other required environment variables.

Create a `.env` file or export it in your shell:
```env
VITE_API_URL=https://schemaiq-backend-1.onrender.com
```

### 3. Start the dev server
```bash
npm run dev
```

### 4. Build for Production
To create a static production build in the `dist/` folder and preview it locally:
```bash
npm run build
npm run preview
```

## 🔑 Demo Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@schemaiq.ai` | `Kaizen@2025` |
| **Analyst** | `analyst@schemaiq.ai` | `Analyst@123` |

## 🚢 Deployment

This frontend is configured for rapid deployment on **Netlify**. A `netlify.toml` file is included in the repository for auto-configuration, which handles SPA routing and `[[redirects]]`.

1. Create a New Site on Netlify and connect this repository.
2. Set the build environment variable `VITE_API_URL` to your backend URL (e.g., `https://schemaiq-backend-1.onrender.com`).
3. Netlify will build using `npm run build` and serve from the `dist/` directory automatically.

## 🔧 Tech Stack

- **UI Framework**: React 18
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Routing**: React Router v6
- **Data Visualization**: Recharts, D3.js (force-directed + Peter Chen)
- **PDF Export**: jsPDF + jspdf-autotable + html2canvas
- **Icons**: Lucide React

## 🧪 Testing

*Note: There are currently no automated unit or integration tests present in the frontend repository.*