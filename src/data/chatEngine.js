// chatEngine.js — Real backend connector
// Replaces the hardcoded mock engine with actual API calls

import { API_BASE } from '../config.js'

/**
 * Send a question to the backend.
 * Returns a structured response object that QueryBotPage renders.
 */
export async function generateResponse(question) {
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return {
        type: 'error',
        text: err.detail || `Server error (${res.status}). Is the backend running?`,
      }
    }

    const data = await res.json()

    // DB or API key not configured
    if (data.error && !data.chart_data && !data.rows?.length) {
      return { type: 'error', text: data.text, sql: data.sql, error: data.error }
    }

    // Determine response type from chart_type
    const type = data.chart_type === 'number'  ? 'number'
               : data.chart_type === 'bar'     ? 'bar'
               : data.chart_type === 'line'    ? 'line'
               : data.rows?.length > 1         ? 'table'
               : data.rows?.length === 1       ? 'number'
               : 'text'

    return {
      type,
      text:       data.text,
      insight:    data.insight,
      sql:        data.sql,
      chart_type: data.chart_type,
      chart_data: data.chart_data,
      columns:    data.columns,
      rows:       data.rows,
      row_count:  data.row_count,
    }

  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return {
        type: 'error',
        text: '**Backend not reachable.** Make sure the Python server is running:\n`cd schemaiq-backend && uvicorn main:app --reload`',
      }
    }
    return { type: 'error', text: `Unexpected error: ${err.message}` }
  }
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`)
    return await res.json()
  } catch {
    return { db: false, api_key_set: false, ready: false }
  }
}

export async function getSuggestions() {
  try {
    const res = await fetch(`${API_BASE}/api/suggestions`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function fetchSchema() {
  try {
    const res = await fetch(`${API_BASE}/schema`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function fetchProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function fetchMetrics() {
  try {
    const res = await fetch(`${API_BASE}/metrics`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

// ─── SCHEMA INTELLIGENCE ENGINE (TWIF) ROUTES ──────────────────────────────
export async function runTwifDemo(db_path) {
  try {
    const res = await fetch(`${API_BASE}/api/twif/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ db_path })
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function trainTwifModel(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/twif/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

export async function detectTwifAnomalies(payload) {
  try {
    const res = await fetch(`${API_BASE}/api/twif/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}