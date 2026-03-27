import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { MetricCard, Panel, PanelHeader, PanelBody, Tag, Button, QualityBar } from '../components/ui.jsx'
import { normalizeProfile, computeQualityMetrics } from '../utils/qualityMetrics.js'
import { API_BASE } from '../config.js'

const statusVariant = { done: 'done', running: 'run', idle: 'idle' }
const statusLabel = { done: '✓ DONE', running: '⟳ RUNNING', idle: '○ IDLE' }

export default function Dashboard() {
  const navigate = useNavigate()
  const [ringOffset, setRingOffset] = useState(270)

  const [graphData, setGraphData] = useState({ nodes: [], links: [], colsCount: 0 })
  const [connInfo, setConnInfo] = useState({ status: 'disconnected', url: '', engine: '' })
  const [profileData, setProfileData] = useState(null)
  const [dictData, setDictData] = useState(null)
  const [agents, setAgents] = useState([
    { emoji: '⛁', name: 'Schema Extraction', desc: 'Waiting...', status: 'idle' },
    { emoji: '⬡', name: 'Relationship Mapping', desc: 'Waiting...', status: 'idle' },
    { emoji: '📊', name: 'Data Profiling', desc: 'Waiting...', status: 'idle' },
    { emoji: '🧠', name: 'Business Context', desc: 'Waiting...', status: 'idle' },
    { emoji: '📖', name: 'Data Dictionary', desc: 'Waiting...', status: 'idle' },
    { emoji: '🗺', name: 'Visualization', desc: 'Waiting...', status: 'idle' },
  ])
  const [activity, setActivity] = useState([])
  const [totalRows, setTotalRows] = useState(0)

  const parseUrl = (url) => {
    if (!url) return { db: '' }
    try {
      // For Windows paths: remove proto and normalize slashes
      const clean = url.includes('://') ? url.split('://')[1] : url
      const parts = clean.replace(/\\/g, '/').split('/')
      return { db: parts[parts.length - 1] || 'Database' }
    } catch (e) { return { db: 'Database' } }
  }

  const addActivity = (color, text) => {
    setActivity(prev => [{ color, text, time: 'just now' }, ...prev].slice(0, 8))
  }

  useEffect(() => {
    const runAnalysis = async () => {
      try {
        // Step 1: Connection info
        const connRes = await fetch(`${API_BASE}/api/connection`)
        const conn = await connRes.json()
        setConnInfo(conn)

        // Step 2: Schema extraction
        setAgents(prev => prev.map((a, i) => i === 0 ? { ...a, status: 'running', desc: 'Extracting schema...' } : a))
        addActivity('#60a5fa', 'Starting schema extraction...')

        const schemaRes = await fetch(`${API_BASE}/api/schema?infer=true`)
        const schemaData = await schemaRes.json()
        const nodes = schemaData.tables || []
        const links = schemaData.relationships || []
        const colsCount = nodes.reduce((sum, n) => sum + (n.columns?.length || 0), 0)
        setGraphData({ nodes, links, colsCount })

        setAgents(prev => prev.map((a, i) =>
          i === 0 ? { ...a, status: 'done', desc: `${nodes.length} tables · ${colsCount} columns extracted` } :
          i === 1 ? { ...a, status: 'running', desc: 'Mapping relationships...' } : a
        ))
        addActivity('#4ade80', `Schema extraction complete — ${nodes.length} tables, ${colsCount} columns mapped.`)

        // Step 3: Relationship mapping (already in schema data)
        setAgents(prev => prev.map((a, i) =>
          i === 1 ? { ...a, status: 'done', desc: `${links.length} FK relationships detected` } :
          i === 2 ? { ...a, status: 'running', desc: 'Profiling data quality...' } : a
        ))
        if (links.length > 0) {
          addActivity('#4ade80', `FK relationships detected: ${links.length} connections mapped.`)
        }

        // Step 4: Data profiling
        const profileRes = await fetch(`${API_BASE}/api/profile`)
        const profile = normalizeProfile(await profileRes.json())
        setProfileData(profile)

        const rows = (profile.tables || []).reduce((s, t) => s + (t.row_count || 0), 0)
        setTotalRows(rows)

        // Generate activity from profiling
        const highNullCols = (profile.tables || []).flatMap(t =>
          (t.columns || []).filter(c => c.null_percent > 30).map(c => ({ table: t.name, col: c.name, pct: c.null_percent }))
        )
        highNullCols.slice(0, 2).forEach(c => {
          addActivity('#facc15', `High null rate in ${c.table}.${c.col} — ${c.pct.toFixed(1)}% null.`)
        })

        const orphans = (profile.fk_orphans || []).filter(o => o.orphan_count > 0)
        if (orphans.length > 0) {
          orphans.slice(0, 2).forEach(o => {
            addActivity('#f87171', `FK orphans: ${o.from_table}.${o.from_column} → ${o.to_table} has ${o.orphan_count} orphaned rows.`)
          })
        } else if ((profile.fk_orphans || []).length > 0) {
          addActivity('#4ade80', `FK integrity check passed — 0 orphaned rows across ${profile.fk_orphans.length} relationships.`)
        }

        setAgents(prev => prev.map((a, i) =>
          i === 2 ? { ...a, status: 'done', desc: `${rows.toLocaleString()} rows profiled across ${(profile.tables || []).length} tables` } :
          i === 3 ? { ...a, status: 'running', desc: 'Generating business context...' } : a
        ))
        addActivity('#4ade80', `Data profiling complete — ${rows.toLocaleString()} total rows analyzed.`)

        // Step 5: AI Dictionary (business context + data dictionary)
        const dictRes = await fetch(`${API_BASE}/api/dictionary/quick`)
        const dict = await dictRes.json()
        setDictData(dict)

        setAgents(prev => prev.map((a, i) =>
          i === 3 ? { ...a, status: 'done', desc: `Domain: ${dict.domain_analysis?.primary_domain || 'analyzed'}` } :
          i === 4 ? { ...a, status: 'done', desc: `${Object.keys(dict.tables || {}).length} table entries generated` } :
          i === 5 ? { ...a, status: 'done', desc: 'ER diagram ready' } : a
        ))
        addActivity('#60a5fa', `Business context generated — domain: ${dict.domain_analysis?.primary_domain || 'general'}.`)
        addActivity('#4ade80', `AI Data Dictionary generated — ${dict.total_tables || 0} tables documented.`)

      } catch (err) {
        console.error('Dashboard analysis error:', err)
        addActivity('#f87171', `Analysis error: ${err.message}`)
      }
    }

    runAnalysis()
  }, [])

  // Animate quality ring when profile data arrives
  useEffect(() => {
    if (profileData) {
      const q = computeQualityMetrics(profileData)
      const pct = q.overall / 100
      setTimeout(() => setRingOffset(270.2 * (1 - pct)), 400)
    }
  }, [profileData])

  const quality = profileData ? computeQualityMetrics(profileData) : { overall: 0, completeness: 0, consistency: 0, validity: 0, fkIntegrity: 0, uniqueness: 0, perTable: [] }
  const qualityColor = quality.overall >= 90 ? '#27ae60' : quality.overall >= 70 ? '#f39c12' : '#e74c3c'
  const qualityDelta = quality.overall >= 90 ? '▲ Excellent' : quality.overall >= 70 ? '● Good' : '▼ Needs Work'

  const dbName = connInfo.display_name || parseUrl(connInfo.url).db || 'Dashboard'

  // Build row count chart from profile data
  const rowCountChart = profileData ? (profileData.tables || []).map(t => ({
    name: t.name.length > 14 ? t.name.slice(0, 14) + '…' : t.name,
    rows: t.row_count || 0,
  })).sort((a, b) => b.rows - a.rows).slice(0, 6) : []

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 animate-fade-up">
        <h1 style={{ fontFamily: 'Space Mono', fontSize: 20, fontWeight: 700, color: '#e8e8f0' }}>
          Database Intelligence Dashboard
        </h1>
        <p style={{ fontSize: 13, color: '#666680', marginTop: 4 }}>
          {dbName} Explorer · {graphData.nodes.length || 0} tables · {totalRows.toLocaleString()} rows · Auto-analyzed by AI agents · Last run just now
        </p>
      </div>

      {/* Metric cards — 4 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <MetricCard icon="⛁" label="Total Tables" value={graphData.nodes.length || '0'} delta="▲ All analyzed" cardColor="#27ae60" delay={50} />
        <MetricCard icon="≡" label="Total Columns" value={graphData.colsCount || '0'} delta={`${totalRows.toLocaleString()} total rows`} cardColor="#2980b9" delay={100} />
        <MetricCard icon="⬡" label="FK Relationships" value={graphData.links.length || '0'} delta="◉ ER diagram ready" deltaColor="text-yellow-400" cardColor="#f39c12" delay={150} />
        <MetricCard icon="◎" label="Data Quality Score" value={profileData ? `${quality.overall}%` : '...'} delta={profileData ? qualityDelta : 'Analyzing...'} cardColor="#c0392b" delay={200} />
      </div>

      {/* Row 1 — Row Distribution chart + Agents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginBottom: 14 }}>
        <Panel className="animate-fade-up delay-200">
          <PanelHeader title="Table Row Distribution" subtitle={`Live data from ${graphData.nodes.length} tables`}>
            <Button variant="ghost">Export</Button>
          </PanelHeader>
          <PanelBody>
            {rowCountChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={rowCountChart} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120}
                    tick={{ fill: '#666680', fontSize: 9, fontFamily: 'Space Mono' }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontFamily: 'Space Mono', fontSize: 11 }}
                    itemStyle={{ color: '#e8e8f0' }} labelStyle={{ color: '#f0828a' }}
                    formatter={v => [v.toLocaleString(), 'Rows']}
                  />
                  <Bar dataKey="rows" fill="#c0392b" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444458', fontFamily: 'Space Mono', fontSize: 12 }}>
                Loading profile data...
              </div>
            )}
          </PanelBody>
        </Panel>

        <Panel className="animate-fade-up delay-250">
          <PanelHeader title="AI Agents — Status">
            <Button variant="ghost" onClick={() => navigate('/agents')}>Full View →</Button>
          </PanelHeader>
          <PanelBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {agents.map(a => (
                <div key={a.name} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#16161f', border: '1px solid #1e1e2e',
                  borderRadius: 8, padding: '8px 14px',
                }}>
                  <div style={{ fontSize: 16, width: 32, height: 32, background: 'rgba(192,57,43,0.1)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {a.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 11, fontWeight: 700, color: '#e8e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: '#666680', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</div>
                  </div>
                  <Tag variant={statusVariant[a.status]}>{statusLabel[a.status]}</Tag>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* Row 2 — Null Rate Analysis + Quality + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* Per-Table Quality */}
        <Panel className="animate-fade-up delay-300">
          <PanelHeader title="Table Completeness" />
          <PanelBody>
            {profileData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {quality.perTable.map(t => (
                  <QualityBar key={t.name} label={t.name} pct={t.score} color={t.color} />
                ))}
              </div>
            ) : (
              <div style={{ color: '#444458', fontFamily: 'Space Mono', fontSize: 12, textAlign: 'center', padding: 20 }}>Loading...</div>
            )}
          </PanelBody>
        </Panel>

        {/* Quality */}
        <Panel className="animate-fade-up delay-300">
          <PanelHeader title="Data Quality Score">
            <Button variant="ghost" onClick={() => navigate('/quality')}>Report →</Button>
          </PanelHeader>
          <PanelBody>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 100, height: 100 }}>
                <svg viewBox="0 0 100 100" width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                  <circle fill="none" stroke="#1e1e2e" strokeWidth="7" cx="50" cy="50" r="43" />
                  <circle fill="none" stroke={qualityColor} strokeWidth="7" cx="50" cy="50" r="43"
                    strokeLinecap="round" strokeDasharray="270.2" strokeDashoffset={ringOffset}
                    style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 20, fontWeight: 700, color: qualityColor }}>{profileData ? quality.overall : '...'}</span>
                  <span style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#666680' }}>%</span>
                </div>
              </div>
            </div>
            <QualityBar label="Completeness" pct={quality.completeness} />
            <QualityBar label="Consistency" pct={quality.consistency} />
            <QualityBar label="Validity" pct={quality.validity} color="#f39c12" textColor="#f39c12" />
            <QualityBar label="FK Integrity" pct={quality.fkIntegrity} />
            <QualityBar label="Uniqueness" pct={quality.uniqueness} color="#3498db" textColor="#3498db" />
          </PanelBody>
        </Panel>

        {/* Activity */}
        <Panel className="animate-fade-up delay-350">
          <PanelHeader title="Live Activity Feed" />
          <PanelBody>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {activity.length > 0 ? activity.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < activity.length - 1 ? '1px solid rgba(30,30,46,0.6)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11, color: '#b0b0c8', lineHeight: 1.5 }}>{a.text}</p>
                    <p style={{ fontFamily: 'Space Mono', fontSize: 9, color: '#444458', marginTop: 3 }}>{a.time}</p>
                  </div>
                </div>
              )) : (
                <div style={{ color: '#444458', fontFamily: 'Space Mono', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  Waiting for analysis...
                </div>
              )}
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* QueryBot CTA */}
      <div
        onClick={() => navigate('/querybot')}
        style={{
          background: 'linear-gradient(to right, rgba(192,57,43,0.1), rgba(41,128,185,0.1))',
          border: '1px solid rgba(192,57,43,0.3)',
          borderRadius: 12, padding: '16px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          cursor: 'pointer', transition: 'border-color 0.2s',
        }}
        className="animate-fade-up delay-400"
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.6)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)'}
      >
        <div style={{ fontSize: 24 }}>💬</div>
        <div>
          <div style={{ fontFamily: 'Space Mono', fontSize: 13, fontWeight: 700, color: '#f0828a' }}>
            QueryBot — AI Database Assistant
          </div>
          <div style={{ fontSize: 12, color: '#666680', marginTop: 3 }}>
            Ask anything about your {graphData.nodes.length} tables and {totalRows.toLocaleString()} rows of data
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: 'Space Mono', fontSize: 11, color: '#666680' }}>Open →</div>
      </div>
    </div>
  )
}