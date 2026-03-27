import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV = [
  {
    section: 'Overview', items: [
      { icon: '⊞', label: 'Dashboard', to: '/' },
      { icon: '⛁', label: 'DB Connections', to: '/connections' },
    ]
  },
  {
    section: 'Analysis', items: [
      { icon: '◈', label: 'Schema Explorer', to: '/schema' },
      { icon: '⬡', label: 'ER Diagram', to: '/er-diagram' },
      { icon: '≡', label: 'Data Dictionary', to: '/dictionary' },
    ]
  },
  {
    section: 'Intelligence', items: [
      { icon: '◉', label: 'Data Quality', to: '/quality' },
      { icon: '⬢', label: 'AI Agents', to: '/agents' },
      { icon: '🧩', label: 'Insights', to: '/insights' },
      { icon: '💬', label: 'QueryBot', to: '/querybot' },
    ]
  },
  {
    section: 'System', items: [
      { icon: '⚙', label: 'Settings', to: '/settings' },
    ]
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
      background: '#0f0f17',
      borderRight: '1px solid #1e1e2e',
      display: 'flex', flexDirection: 'column',
      zIndex: 50, fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Top accent */}
      <div style={{ height: 2, background: 'linear-gradient(to right, #c0392b, #f0828a, transparent)', flexShrink: 0 }} />

      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid #1e1e2e', flexShrink: 0 }}>
        <img
          src="/schemaiqlogo.png"
          alt="SchemaIQ Logo"
          style={{
            width: 140, // Increased width to account for combined logo + text in image
            height: 'auto',
            display: 'block'
          }}
        />
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#444458', marginTop: 10, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          AI Data Intelligence · v1.0
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {NAV.map(group => (
          <div key={group.section}>
            {/* Section label */}
            <div style={{
              padding: '16px 20px 6px',
              fontFamily: "'Space Mono', monospace",
              fontSize: 9, color: '#3a3a52',
              textTransform: 'uppercase', letterSpacing: '0.14em',
            }}>
              {group.section}
            </div>

            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 20px',
                  fontSize: 14, fontWeight: isActive ? 500 : 400,
                  color: isActive ? '#f0828a' : '#606078',
                  borderLeft: `3px solid ${isActive ? '#c0392b' : 'transparent'}`,
                  background: isActive ? 'rgba(192,57,43,0.08)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                })}
                onMouseEnter={e => {
                  if (!e.currentTarget.style.borderLeftColor.includes('192')) {
                    e.currentTarget.style.color = '#b0b0c8'
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.style.borderLeftColor.includes('192')) {
                    e.currentTarget.style.color = '#606078'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span style={{ fontSize: 15, width: 18, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid #1e1e2e', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#27ae60', boxShadow: '0 0 8px #27ae60', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: '#606078' }}>6 agents active</span>
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#2e2e42', marginBottom: 14 }}>
          Olist dataset loaded
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #c0392b, #f0828a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, color: '#fff',
                flexShrink: 0,
              }}>
                {user.initials}
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#b0b0c8', fontWeight: 500, lineHeight: 1.2 }}>{user.name.split(' ')[0]}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#444458' }}>{user.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#444458', padding: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = '#f0828a'}
              onMouseLeave={e => e.currentTarget.style.color = '#444458'}
            >⏻</button>
          </div>
        )}
      </div>
    </aside>
  )
}