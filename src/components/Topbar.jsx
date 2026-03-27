import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Topbar() {
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <header style={{
      height: 64,
      background: '#0f0f17',
      borderBottom: '1px solid #1e1e2e',
      display: 'flex', alignItems: 'center',
      padding: '0 36px', gap: 16,
      position: 'sticky', top: 0, zIndex: 40, flexShrink: 0,
    }}>
      {/* Search */}
      <div style={{
        flex: 1, maxWidth: 480,
        display: 'flex', alignItems: 'center', gap: 10,
        background: '#16161f',
        border: `1px solid ${focused ? '#c0392b' : '#1e1e2e'}`,
        borderRadius: 10, padding: '0 16px', height: 40,
        transition: 'border-color 0.2s',
      }}>
        <span style={{ color: '#444458', fontSize: 15 }}>⌕</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search tables, columns, relationships…"
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontSize: 13, color: '#e8e8f0',
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#2e2e42' }}>⌘K</span>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>

        {/* QueryBot shortcut */}
        <button
          onClick={() => navigate('/querybot')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'Space Mono', monospace", fontSize: 11,
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid #1e1e2e', background: 'none',
            color: '#f0828a', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f0828a'; e.currentTarget.style.background = 'rgba(240,130,138,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.background = 'none' }}
        >
          💬 QueryBot
        </button>

        <span style={{ fontSize: 16, color: '#444458', cursor: 'pointer' }}>🔔</span>

        {user && (
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #c0392b, #f0828a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Space Mono', monospace", fontSize: 12,
            fontWeight: 700, color: '#fff', cursor: 'pointer', flexShrink: 0,
          }}>
            {user.initials}
          </div>
        )}
      </div>
    </header>
  )
}