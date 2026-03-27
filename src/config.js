// Centralized API configuration
// In production (Netlify), set VITE_API_URL to your Render backend URL.
// In local dev, falls back to localhost:8001.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001'
