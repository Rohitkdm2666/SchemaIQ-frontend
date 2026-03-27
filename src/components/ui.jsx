// All shared UI components — fully inline styled for Tailwind v4 compatibility

export function Tag({ children, variant = 'default' }) {
  const variants = {
    pk:      { background: 'rgba(39,174,96,0.15)',  color: '#27ae60', border: '1px solid rgba(39,174,96,0.3)' },
    fk:      { background: 'rgba(41,128,185,0.15)', color: '#3498db', border: '1px solid rgba(41,128,185,0.3)' },
    idx:     { background: 'rgba(243,156,18,0.15)', color: '#f39c12', border: '1px solid rgba(243,156,18,0.3)' },
    nn:      { background: 'rgba(192,57,43,0.15)',  color: '#e74c3c', border: '1px solid rgba(192,57,43,0.3)' },
    done:    { background: 'rgba(39,174,96,0.15)',  color: '#27ae60', border: '1px solid rgba(39,174,96,0.3)' },
    run:     { background: 'rgba(243,156,18,0.15)', color: '#f39c12', border: '1px solid rgba(243,156,18,0.3)' },
    idle:    { background: 'rgba(80,80,100,0.15)',  color: '#666680', border: '1px solid #252540' },
    warn:    { background: 'rgba(243,156,18,0.15)', color: '#f39c12', border: '1px solid rgba(243,156,18,0.3)' },
    err:     { background: 'rgba(192,57,43,0.15)',  color: '#e74c3c', border: '1px solid rgba(192,57,43,0.3)' },
    info:    { background: 'rgba(41,128,185,0.15)', color: '#3498db', border: '1px solid rgba(41,128,185,0.3)' },
    default: { background: 'rgba(80,80,100,0.15)',  color: '#888898', border: '1px solid #252540' },
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontFamily: "'Space Mono', monospace",
      fontSize: 10, padding: '3px 8px', borderRadius: 4,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      whiteSpace: 'nowrap', flexShrink: 0,
      ...variants[variant],
    }}>
      {children}
    </span>
  )
}

export function Button({ children, variant = 'primary', onClick, type = 'button', disabled = false }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: "'Space Mono', monospace", fontSize: 11,
    padding: '8px 16px', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    border: 'none', transition: 'all 0.15s', letterSpacing: '0.04em',
    opacity: disabled ? 0.5 : 1, outline: 'none', whiteSpace: 'nowrap',
  }
  const variants = {
    primary: { background: '#c0392b', color: '#fff' },
    ghost:   { background: '#16161f', color: '#b0b0c8', border: '1px solid #1e1e2e' },
    danger:  { background: 'rgba(192,57,43,0.15)', color: '#e74c3c', border: '1px solid rgba(192,57,43,0.3)' },
  }
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={e => {
        if (disabled) return
        if (variant === 'primary') e.currentTarget.style.background = '#e74c3c'
        if (variant === 'ghost') { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#f0828a' }
      }}
      onMouseLeave={e => {
        if (disabled) return
        if (variant === 'primary') e.currentTarget.style.background = '#c0392b'
        if (variant === 'ghost') { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#b0b0c8' }
      }}
    >
      {children}
    </button>
  )
}

export function Panel({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      background: '#111118', border: '1px solid #1e1e2e',
      borderRadius: 14, overflow: 'hidden', ...style,
    }}>
      {children}
    </div>
  )
}

export function PanelHeader({ title, subtitle, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 22px', borderBottom: '1px solid #1e1e2e', gap: 12,
    }}>
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: '#e8e8f0' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#666680', marginTop: 3 }}>{subtitle}</div>}
      </div>
      {children && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>{children}</div>}
    </div>
  )
}

export function PanelBody({ children, style = {}, noPad = false }) {
  return (
    <div style={{ ...(noPad ? {} : { padding: '20px 22px' }), ...style }}>
      {children}
    </div>
  )
}

export function MetricCard({ icon, label, value, delta, deltaColor, cardColor = '#c0392b', delay = 0 }) {
  return (
    <div
      className="animate-fade-up"
      style={{
        position: 'relative', overflow: 'hidden',
        background: '#111118', border: '1px solid #1e1e2e',
        borderRadius: 14, padding: '20px 22px',
        animationDelay: `${delay}ms`,
        transition: 'border-color 0.2s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 64, height: 64,
        borderRadius: '0 14px 0 64px',
        background: cardColor, opacity: 0.07,
      }} />
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 30, fontWeight: 700, color: '#e8e8f0', margin: '8px 0 5px' }}>{value}</div>
      {delta && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: deltaColor || '#27ae60' }}>{delta}</div>
      )}
    </div>
  )
}

export function QualityBar({ label, pct, color = '#27ae60', textColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0', borderBottom: '1px solid rgba(30,30,46,0.5)' }}>
      <div style={{ fontSize: 12, color: '#666680', minWidth: 100 }}>{label}</div>
      <div style={{ flex: 1, height: 5, background: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: textColor || color, width: 40, textAlign: 'right' }}>{pct}%</div>
    </div>
  )
}

export function Toggle({ on = false, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: on ? '#c0392b' : '#1e1e2e',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  )
}

export function Spinner({ size = 16, color = '#f0828a' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid rgba(255,255,255,0.15)`,
      borderTopColor: color,
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  )
}

export function Input({ style = {}, ...props }) {
  return (
    <input
      style={{
        width: '100%', background: '#16161f',
        border: '1px solid #1e1e2e', borderRadius: 8,
        padding: '10px 14px', fontSize: 13, color: '#e8e8f0',
        fontFamily: "'DM Sans', sans-serif",
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s', ...style,
      }}
      onFocus={e => e.target.style.borderColor = '#c0392b'}
      onBlur={e => e.target.style.borderColor = '#1e1e2e'}
      {...props}
    />
  )
}

export function Select({ style = {}, children, ...props }) {
  return (
    <select
      style={{
        width: '100%', background: '#16161f',
        border: '1px solid #1e1e2e', borderRadius: 8,
        padding: '10px 14px', fontSize: 13, color: '#e8e8f0',
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.2s', ...style,
      }}
      onFocus={e => e.target.style.borderColor = '#c0392b'}
      onBlur={e => e.target.style.borderColor = '#1e1e2e'}
      {...props}
    >
      {children}
    </select>
  )
}