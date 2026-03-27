import { useState, useRef, useEffect } from 'react'
import { generateResponse, checkHealth, getSuggestions } from '../data/chatEngine.js'
import { Panel, Tag } from '../components/ui.jsx'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

const DEFAULT_SUGGESTIONS = [
  'How many orders were delivered in March 2018?',
  'What are the top 5 product categories by total revenue?',
  'Which state has the most customers?',
  'What is the average review score by product category?',
  'How many orders were canceled in 2018?',
  'What is the total GMV (revenue) across all delivered orders?',
]

// ── Markdown bold renderer ─────────────────────────────────────────────────
function Md({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} style={{ color: '#f0828a', fontWeight: 600 }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, background: '#16161f', padding: '1px 6px', borderRadius: 4, color: '#3498db' }}>{p.slice(1, -1)}</code>
    return p
  })
}

// ── Typing indicator ───────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#c0392b,#f0828a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🧠</div>
      <div style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: '18px 18px 18px 4px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#f0828a', animation: 'pulseDot 1.4s ease infinite', animationDelay: `${i * 200}ms` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── SQL block ──────────────────────────────────────────────────────────────
function SqlBlock({ sql }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: 'none', border: '1px solid #252540', borderRadius: 6,
        padding: '5px 12px', fontFamily: "'Space Mono',monospace",
        fontSize: 10, color: '#666680', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {open ? '▾' : '▸'} {open ? 'Hide' : 'Show'} SQL
      </button>
      {open && (
        <pre style={{
          marginTop: 8, background: '#0a0a0f', border: '1px solid #1e1e2e',
          borderRadius: 8, padding: '12px 16px', fontFamily: "'Space Mono',monospace",
          fontSize: 11, color: '#b0b0c8', overflowX: 'auto', lineHeight: 1.8,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>{sql}</pre>
      )}
    </div>
  )
}

// ── Result table ───────────────────────────────────────────────────────────
function ResultTable({ columns, rows }) {
  const MAX_ROWS = 20
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? rows : rows.slice(0, MAX_ROWS)

  return (
    <div style={{ marginTop: 12, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#16161f' }}>
            {columns.map(c => (
              <th key={c} style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #1e1e2e', whiteSpace: 'nowrap' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(30,30,46,0.5)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map(c => (
                <td key={c} style={{ padding: '8px 12px', color: '#b0b0c8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row[c] === null || row[c] === undefined ? <span style={{ color: '#444458' }}>NULL</span> : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > MAX_ROWS && !showAll && (
        <button onClick={() => setShowAll(true)} style={{ marginTop: 8, background: 'none', border: '1px solid #1e1e2e', borderRadius: 6, padding: '5px 14px', fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#666680', cursor: 'pointer' }}>
          + {rows.length - MAX_ROWS} more rows
        </button>
      )}
    </div>
  )
}

// ── Chart components ───────────────────────────────────────────────────────
const CHART_TOOLTIP_STYLE = {
  contentStyle: { background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontFamily: 'Space Mono', fontSize: 11 },
  itemStyle: { color: '#e8e8f0' },
  labelStyle: { color: '#f0828a' },
}

function ResultBar({ data }) {
  return (
    <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 10, padding: '14px', marginTop: 12 }}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 40, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#666680', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: '#666680', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : v} />
          <Tooltip {...CHART_TOOLTIP_STYLE} formatter={v => [typeof v === 'number' ? v.toLocaleString() : v, 'value']} />
          <Bar dataKey="value" fill="#c0392b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function ResultLine({ data }) {
  return (
    <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 10, padding: '14px', marginTop: 12 }}>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 20, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: '#666680', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#666680', fontSize: 9, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
          <Tooltip {...CHART_TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="value" stroke="#c0392b" strokeWidth={2} dot={{ fill: '#c0392b', r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ResultNumber({ rows, columns }) {
  const val = rows?.[0] ? Object.values(rows[0])[0] : null
  const label = columns?.[0] || 'Result'
  const formatted = typeof val === 'number'
    ? val >= 1e6 ? `${(val / 1e6).toFixed(2)}M`
      : val >= 1e3 ? `${(val / 1e3).toFixed(1)}K`
        : val.toLocaleString()
    : String(val ?? '—')

  return (
    <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 10, padding: '20px 24px', marginTop: 12, textAlign: 'center' }}>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 36, fontWeight: 700, color: '#f0828a' }}>{formatted}</div>
    </div>
  )
}

// ── Message bubble ─────────────────────────────────────────────────────────
function UserBubble({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '72%', background: 'rgba(192,57,43,0.18)', border: '1px solid rgba(192,57,43,0.35)', borderRadius: '18px 18px 4px 18px', padding: '13px 18px' }}>
        <p style={{ fontSize: 14, color: '#e8e8f0', lineHeight: 1.6, margin: 0 }}>{text}</p>
      </div>
    </div>
  )
}

function AssistantBubble({ response, time }) {
  const r = response

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#c0392b,#f0828a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginBottom: 20 }}>🧠</div>
      <div style={{ maxWidth: '88%' }}>
        <div style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: '18px 18px 18px 4px', padding: '16px 20px' }}>

          {/* Main text */}
          <p style={{ fontSize: 14, color: '#b0b0c8', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-line' }}>
            <Md text={r.text} />
          </p>

          {/* Insight */}
          {r.insight && (
            <div style={{ marginTop: 10, background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: 8, padding: '9px 14px', fontSize: 12, color: '#b0b0c8', lineHeight: 1.6 }}>
              💡 {r.insight}
            </div>
          )}

          {/* Error box */}
          {r.type === 'error' && (
            <div style={{ marginTop: 10, background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: '9px 14px', fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#e74c3c' }}>
              {r.error || 'An error occurred'}
            </div>
          )}

          {/* Charts */}
          {(r.type === 'bar' || r.chart_type === 'bar') && r.chart_data?.length > 0 && <ResultBar data={r.chart_data} />}
          {(r.type === 'line' || r.chart_type === 'line') && r.chart_data?.length > 0 && <ResultLine data={r.chart_data} />}
          {(r.type === 'number' || r.chart_type === 'number') && r.rows?.length > 0 && <ResultNumber rows={r.rows} columns={r.columns} />}

          {/* Table */}
          {r.type === 'table' && r.rows?.length > 0 && r.columns?.length > 0 && (
            <ResultTable columns={r.columns} rows={r.rows} />
          )}

          {/* Row count */}
          {r.row_count != null && r.type !== 'number' && (
            <div style={{ marginTop: 10, fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458' }}>
              {r.row_count.toLocaleString()} row{r.row_count !== 1 ? 's' : ''} returned
            </div>
          )}

          {/* SQL block (collapsible) */}
          {r.sql && <SqlBlock sql={r.sql} />}
        </div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#333348', marginTop: 6, paddingLeft: 4 }}>{time}</div>
      </div>
    </div>
  )
}

const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

// ── Health banner ──────────────────────────────────────────────────────────
function HealthBanner({ health }) {
  if (!health) return null
  if (health.ready) return null  // all good, show nothing

  const issues = []
  if (!health.db) issues.push('No database connected. Please go to the Connections page.')
  if (!health.api_key_set) issues.push('GEMINI_API_KEY not set in .env')

  return (
    <div style={{ background: 'rgba(243,156,18,0.1)', border: '1px solid rgba(243,156,18,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 16 }}>⚠️</span>
      <div>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#f39c12', marginBottom: 4 }}>Backend not fully ready</div>
        {issues.map((issue, i) => (
          <div key={i} style={{ fontSize: 12, color: '#b0b0c8', lineHeight: 1.6 }}>• {issue}</div>
        ))}
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#666680', marginTop: 6 }}>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function QueryBotPage() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('schemaiq_chat_history')
    return saved ? JSON.parse(saved) : [{
      id: 0, role: 'assistant', time: now(),
      response: {
        type: 'help',
        text: "👋 Hi! I'm **QueryBot**.\n\nAsk me anything in plain English and I'll write the SQL, run it, and explain the results.",
      }
    }]
  })
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [health, setHealth] = useState(null)
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Check backend health on mount
  useEffect(() => {
    const init = async () => {
      const h = await checkHealth()
      setHealth(h)
      if (h?.db) {
        setLoadingSuggestions(true)
        const s = await getSuggestions()
        if (s?.suggestions?.length > 0) {
          setSuggestions(s.suggestions)
        }
        setLoadingSuggestions(false)
      }
    }
    init()
  }, [])

  // Persist messages to localStorage
  useEffect(() => {
    localStorage.setItem('schemaiq_chat_history', JSON.stringify(messages))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = async (text) => {
    if (!text.trim() || typing) return
    const userMsg = { id: Date.now(), role: 'user', text: text.trim(), time: now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    const response = await generateResponse(text.trim())
    setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', time: now(), response }])
    setTyping(false)
    inputRef.current?.focus()
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const clear = () => {
    localStorage.removeItem('schemaiq_chat_history')
    setMessages([{
      id: 0, role: 'assistant', time: now(),
      response: { type: 'text', text: '🔄 Chat cleared. Ask me anything about the connected database.' }
    }])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 64px)', maxHeight: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: '#e8e8f0', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            💬 QueryBot
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, background: health?.ready ? 'rgba(39,174,96,0.15)' : 'rgba(243,156,18,0.15)', color: health?.ready ? '#27ae60' : '#f39c12', border: `1px solid ${health?.ready ? 'rgba(39,174,96,0.3)' : 'rgba(243,156,18,0.3)'}`, padding: '3px 10px', borderRadius: 20 }}>
              {health?.ready ? '● LIVE' : health === null ? '◌ Checking…' : '⚠ Setup needed'}
            </span>
          </h1>
        </div>
        <button onClick={clear} style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, padding: '8px 16px', fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#b0b0c8', cursor: 'pointer' }}>🗑 Clear</button>
      </div>

      <HealthBanner health={health} />

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Chat area (Full Width) */}
        <Panel style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 8px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {messages.map(msg => (
              msg.role === 'user'
                ? <UserBubble key={msg.id} text={msg.text} />
                : <AssistantBubble key={msg.id} response={msg.response} time={msg.time} />
            ))}
            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid #1e1e2e', padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 14, padding: '12px 18px', transition: 'border-color 0.2s' }}
                onFocus={e => e.currentTarget.style.borderColor = '#c0392b'}
                onBlur={e => e.currentTarget.style.borderColor = '#1e1e2e'}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything… e.g. 'Top 5 categories by revenue'"
                  rows={1}
                  disabled={typing}
                  style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#e8e8f0', fontFamily: "'DM Sans',sans-serif", resize: 'none', lineHeight: 1.6, maxHeight: 120 }}
                />
              </div>
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || typing}
                style={{ width: 44, height: 44, background: input.trim() && !typing ? '#c0392b' : '#16161f', border: 'none', borderRadius: 12, color: '#fff', fontSize: 18, cursor: input.trim() && !typing ? 'pointer' : 'not-allowed', opacity: input.trim() && !typing ? 1 : 0.4, transition: 'all 0.15s', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >↑</button>
            </div>

            {/* Wrapped Suggestions (Inline below input) */}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {loadingSuggestions ? (
                <div style={{ padding: '4px 12px', color: '#666680', fontSize: 11, fontFamily: "'Space Mono',monospace" }}>⟳ Generating hints...</div>
              ) : (
                suggestions.map((s, i) => (
                  <button key={i} onClick={() => send(s)} disabled={typing}
                    style={{
                      background: '#16161f', border: '1px solid #1e1e2e',
                      borderRadius: 20, padding: '6px 14px', fontSize: 11, color: '#b0b0c8',
                      cursor: typing ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!typing) { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.background = 'rgba(192,57,43,0.1)' } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.background = '#16161f' }}
                  >
                    {s}
                  </button>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingLeft: 4 }}>
              <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#333348' }}>Enter to send · Shift+Enter for new line</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}