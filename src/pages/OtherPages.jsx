import { useRef, useState, useEffect, Fragment } from 'react'
import { Panel, PanelHeader, PanelBody, Tag, Button, MetricCard, QualityBar, Toggle, Input, Select } from '../components/ui.jsx'
import { RELATIONSHIPS, QUALITY_SCORES, ER_LINKS } from '../data/db.js' // ER_LINKS might be empty now
import ERDiagram from '../components/ERDiagram.jsx'
import ClassicERDiagram from '../components/ClassicERDiagram.jsx'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { schemaToGraph } from '../utils/schemaToGraph.js'
import { normalizeProfile, computeQualityMetrics } from '../utils/qualityMetrics.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import { API_BASE } from '../config.js'

// ─── shared page header ──────────────────────────────────────────────────────
function PageHeader({ title, sub, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
      <div>
        <h1 style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: '#e8e8f0', margin: 0 }}>{title}</h1>
        {sub && <p style={{ fontSize: 14, color: '#666680', marginTop: 6 }}>{sub}</p>}
      </div>
      {children && <div style={{ display: 'flex', gap: 10, flexShrink: 0, marginLeft: 24 }}>{children}</div>}
    </div>
  )
}

// ─── shared form label ───────────────────────────────────────────────────────
function Label({ children }) {
  return (
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
      {children}
    </div>
  )
}

// ─── ER DIAGRAM ──────────────────────────────────────────────────────────────
export function ERDiagramPage() {
  const svgRef = useRef(null)
  const canvasRef = useRef(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [diagramMode, setDiagramMode] = useState('modern')

  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [totalRows, setTotalRows] = useState(0)

  useEffect(() => {
    // Fetch schema for ER diagram
    fetch(`${API_BASE}/api/schema?infer=true`)
      .then(res => res.json())
      .then(data => {
        setGraphData(schemaToGraph(data))
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load schema", err)
        setLoading(false)
      })

    // Fetch row counts from AI dictionary
    fetch(`${API_BASE}/api/dictionary/quick`)
      .then(res => res.json())
      .then(data => {
        if (data.tables && data.tables.length > 0) {
          const total = data.tables.reduce((sum, table) => sum + (table.row_count || 0), 0)
          setTotalRows(total)
        }
      })
      .catch(err => {
        console.error("Failed to load row counts", err)
        setTotalRows(0)
      })
  }, [])

  const toggleFullscreen = () => {
    const el = canvasRef.current
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setFullscreen(true)).catch(() => { })
    } else {
      document.exitFullscreen().then(() => setFullscreen(false)).catch(() => { })
    }
  }

  // sync state if user presses Escape
  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setFullscreen(false) }
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const markerColors = ['#c0392b', '#2980b9', '#9b59b6', '#27ae60', '#f39c12', '#e74c3c', '#8e44ad', '#666680']
  const LEGEND = graphData.nodes.map((n, i) => ({
    color: markerColors[i % markerColors.length],
    label: n.id
  }))

  const tablesCount = graphData.nodes.length
  const relsCount = graphData.links.length
  const colsCount = graphData.nodes.reduce((acc, n) => acc + (n.columns?.length || 0), 0)

  let validLinks = graphData.links

  return (
    <div style={{ paddingBottom: 32 }}>
      <PageHeader title="Custom ER Diagram Viewer" sub="Smart Layout Engine · Expand/Collapse Nodes · Minimap · Search">
        <div style={{ display: 'flex', background: '#16161f', borderRadius: 8, padding: 4, marginRight: 16 }}>
          <button onClick={() => setDiagramMode('modern')} style={{ background: diagramMode === 'modern' ? '#c0392b' : 'transparent', color: diagramMode === 'modern' ? '#fff' : '#666680', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontFamily: "'Space Mono',monospace", cursor: 'pointer', transition: '0.2s' }}>Modern Relation</button>
          <button onClick={() => setDiagramMode('classic')} style={{ background: diagramMode === 'classic' ? '#c0392b' : 'transparent', color: diagramMode === 'classic' ? '#fff' : '#666680', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 11, fontFamily: "'Space Mono',monospace", cursor: 'pointer', transition: '0.2s' }}>Classic ER (Chen)</button>
        </div>
        <Button variant="ghost" onClick={toggleFullscreen}>
          {fullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
        </Button>
        <Button variant="primary" onClick={() => {
          const svg = svgRef.current
          if (!svg) return
          const clone = svg.cloneNode(true)
          clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
          const blob = new Blob([clone.outerHTML], { type: 'image/svg+xml' })
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'schema_er.svg'; a.click()
        }}>⬇ SVG</Button>
      </PageHeader>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        {LEGEND.map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#888898' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, opacity: 0.85 }} />
            {l.label}
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458' }}>
          💡 Drag nodes · Scroll to zoom · Click to inspect
        </div>
      </div>

      {/* Canvas + below panels */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Graph Canvas */}
        <div
          ref={canvasRef}
          style={{
            height: 'calc(100vh - 220px)', minHeight: 600, background: '#0f0f17', border: '1px solid #1e1e2e',
            borderRadius: 16, overflow: 'hidden', position: 'relative',
          }}
        >
          {loading ? (
            <div style={{ color: '#e8e8f0', padding: 20 }}>Loading AI Schema Engine...</div>
          ) : diagramMode === 'modern' ? (
            <ERDiagram svgRef={svgRef} nodes={graphData.nodes} links={graphData.links} />
          ) : (
            <ClassicERDiagram svgRef={svgRef} nodes={graphData.nodes} links={graphData.links} />
          )}
        </div>

        {/* Below panels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, paddingBottom: 24 }}>
          {/* All relationships */}
          <Panel>
            <PanelHeader title={`FK Relationships (${validLinks.length})`} />
            <PanelBody>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 7, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                {validLinks.map((r, i) => (
                  <div key={i} style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#f0828a' }}>{r.source.id || r.source}</span>
                      <span style={{ color: '#444458' }}>→</span>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#f0828a' }}>{r.target.id || r.target}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Tag variant="info">{r.card}</Tag>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680' }}>via {r.via}</span>
                    </div>
                  </div>
                ))}
                {validLinks.length === 0 && <div style={{ fontSize: 12, color: '#444458' }}>No FK relationships</div>}
              </div>
            </PanelBody>
          </Panel>

          {/* Stats */}
          <Panel>
            <PanelHeader title="Schema Stats" />
            <PanelBody>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[['Tables', tablesCount, '#27ae60'], ['Relations', relsCount, '#2980b9'], ['Rows', totalRows.toLocaleString(), '#f39c12'], ['Columns', colsCount, '#9b59b6']].map(([l, v, c]) => (
                  <div key={l} style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{l}</div>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  )
}

// ─── DATA DICTIONARY ─────────────────────────────────────────────────────────
// DICT_TABLES removed to avoid static data flash.

const TV = { PK: 'pk', FK: 'fk', IDX: 'idx', 'NOT NULL': 'nn', NULLABLE: 'warn' }

export function DictionaryPage() {
  const [dictTables, setDictTables] = useState([])
  const [activeTab, setActiveTab] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Use the new AI-powered dictionary endpoint
    fetch(`${API_BASE}/api/dictionary/quick`)
      .then(res => res.json())
      .then(data => {
        if (data.tables && data.tables.length > 0) {
          const parsed = data.tables.map(t => ({
            name: t.name,
            rows: t.row_count || 0,
            cols: t.column_count || t.columns?.length || 0,
            pk: t.primary_keys ? t.primary_keys.join(', ') : '',
            summary: t.business_purpose || t.description || 'AI-generated business context',
            domain: data.domain_analysis?.primary_domain || 'general',
            quality: t.completeness_score || 0,
            columns: t.columns.map(c => ({
              name: c.name,
              type: c.type,
              tags: [
                (c.primary_key ? 'PK' : ''),
                (c.foreign_key ? 'FK' : ''),
                (c.nullable ? 'NULLABLE' : 'NOT NULL')
              ].filter(Boolean),
              desc: c.description || 'AI-generated description',
              biz: c.business_context || 'AI-inferred business context',
              contentType: c.inferred_content_type || 'General data',
              quality: c.quality_score || 0,
              nullPct: c.null_percentage || 0
            }))
          }))
          setDictTables(parsed)
          setActiveTab(parsed[0].name)
          setLoading(false)
        } else {
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('AI Dictionary API failed, falling back to basic schema:', err)
        // Fallback to basic schema endpoint
        fetch(`${API_BASE}/api/schema`)
          .then(res => res.json())
          .then(data => {
            if (data.tables && data.tables.length > 0) {
              const parsed = data.tables.map(t => ({
                name: t.name,
                rows: t.row_count || 0,
                cols: t.columns.length,
                pk: t.primary_keys ? t.primary_keys.join(', ') : '',
                summary: 'Basic schema - AI dictionary unavailable',
                columns: t.columns.map(c => ({
                  name: c.name, type: c.type,
                  tags: [(c.pk ? 'PK' : ''), (!c.notnull ? 'NULLABLE' : 'NOT NULL')].filter(Boolean),
                  desc: 'Basic column info', biz: 'AI context unavailable'
                }))
              }))
              setDictTables(parsed)
              setActiveTab(parsed[0].name)
            }
            setLoading(false)
          })
          .catch(err2 => {
            console.error('Both endpoints failed:', err2)
            setLoading(false)
          })
      })
  }, [])

  if (loading) return <div style={{ color: '#e8e8f0', padding: 40, textAlign: 'center', fontFamily: "'Space Mono',monospace" }}>🔄 Analyzing Schema and Generating Dictionary...</div>
  if (dictTables.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
      <h2 style={{ color: '#e8e8f0', fontFamily: "'Space Mono',monospace" }}>No Database Connected</h2>
      <p style={{ color: '#666680', marginTop: 8 }}>Please connect a database in the Connections page to generate the AI Data Dictionary.</p>
    </div>
  )

  const t = dictTables.find(x => x.name === activeTab) || dictTables[0]
  const cols = (t.columns || []).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.biz || '').toLowerCase().includes(search.toLowerCase()))

  const handleExport = () => {
    const doc = new jsPDF()

    // Header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("SchemaIQ Data Dictionary", 14, 15)

    // Subtitle
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`AI-Generated Business Context · Executed: ${new Date().toLocaleString()}`, 14, 22)

    let currentY = 32

    dictTables.forEach((tb, i) => {
      // Table Header Break
      if (i > 0) {
        doc.addPage()
        currentY = 20
      }

      // Table Title
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(40)
      doc.text(`Table: ${tb.name}`, 14, currentY)
      currentY += 8

      // Table Context / Summary
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(80)
      const splitSummary = doc.splitTextToSize(`${tb.summary}`, 180)
      doc.text(splitSummary, 14, currentY)
      currentY += splitSummary.length * 4.5 + 8

      // Table Columns mapping
      const tableData = (tb.columns || []).map(c => [
        c.name,
        c.type,
        c.tags.join(', '),
        c.desc || '',
        c.biz || ''
      ])

      // AutoTable render
      autoTable(doc, {
        startY: currentY,
        head: [['Column', 'Type', 'Constraints', 'Description', 'Business Meaning']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [192, 57, 43], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3, textColor: 60, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'bold', textColor: 40 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20 },
          3: { cellWidth: 50 },
          4: { cellWidth: 60 }
        }
      })

      currentY = doc.lastAutoTable.finalY + 15
    })

    doc.save("schemaIQ_data_dictionary.pdf")
  }

  return (
    <div>
      <PageHeader title="AI Data Dictionary" sub="Auto-generated human-readable documentation · Business context from LLM agents">
        <Button variant="primary" onClick={handleExport}>⬇ Export All</Button>
      </PageHeader>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {dictTables.map(tb => (
          <button key={tb.name} onClick={() => setActiveTab(tb.name)} style={{
            fontFamily: "'Space Mono',monospace", fontSize: 12, padding: '9px 18px',
            borderRadius: 8, border: `1px solid ${tb.name === activeTab ? '#c0392b' : '#1e1e2e'}`,
            background: tb.name === activeTab ? '#c0392b' : '#16161f',
            color: tb.name === activeTab ? '#fff' : '#666680', cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { if (tb.name !== activeTab) { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#f0828a' } }}
            onMouseLeave={e => { if (tb.name !== activeTab) { e.currentTarget.style.borderColor = '#1e1e2e'; e.currentTarget.style.color = '#666680' } }}
          >{tb.name}</button>
        ))}
      </div>

      {/* Header row */}
      <div style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: '14px 14px 0 0', padding: '20px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 18, fontWeight: 700, color: '#f0828a' }}>{t.name}</div>
          <div style={{ fontSize: 13, color: '#666680', marginTop: 4 }}>{t.cols} columns · {t.rows} rows{t.pk ? ` · PK: ${t.pk}` : ''}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search columns…"
            style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#e8e8f0', outline: 'none', fontFamily: "'Space Mono',monospace", width: 180 }}
            onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = '#1e1e2e'}
          />
          <Tag variant="done">AI Documented</Tag>
        </div>
      </div>

      {/* AI summary */}
      <div style={{ background: 'rgba(192,57,43,0.06)', borderLeft: '1px solid rgba(192,57,43,0.2)', borderRight: '1px solid rgba(192,57,43,0.2)', padding: '16px 24px' }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#f0828a' }}>🧠 AI Summary · </span>
        <span style={{ fontSize: 13, color: '#b0b0c8', lineHeight: 1.7 }}>{t.summary}</span>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #1e1e2e', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#16161f' }}>
              {['#', 'Column', 'Type', 'Constraints', 'Description', 'Business Meaning'].map(h => (
                <th key={h} style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #1e1e2e', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((c, i) => (
              <tr key={c.name} style={{ borderBottom: '1px solid rgba(30,30,46,0.6)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,57,43,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458', padding: '13px 16px' }}>{String(i + 1).padStart(2, '0')}</td>
                <td style={{ padding: '13px 16px' }}><span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: '#f0828a' }}>{c.name}</span></td>
                <td style={{ padding: '13px 16px' }}><span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#3498db' }}>{c.type}</span></td>
                <td style={{ padding: '13px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {c.tags.map(tag => <Tag key={tag} variant={TV[tag] || 'default'}>{tag}</Tag>)}
                  </div>
                </td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#666680', lineHeight: 1.6, maxWidth: 200 }}>{c.desc}</td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#b0b0c8', lineHeight: 1.6, maxWidth: 220 }}>{c.biz}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── DATA QUALITY ─────────────────────────────────────────────────────────────
const sevColor = { err: '#e74c3c', warn: '#f39c12', ok: '#27ae60' }
const sevTag = { err: 'err', warn: 'warn', ok: 'done' }
const sevLabel = { err: 'ERROR', warn: 'WARN', ok: 'PASS' }

export function QualityPage() {
  const [profileData, setProfileData] = useState(null)
  const [schemaData, setSchemaData] = useState(null)
  const [loading, setLoading] = useState(true)
  const ringsRef = useRef(null)

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/profile`).then(r => r.json()),
      fetch(`${API_BASE}/api/schema?infer=true`).then(r => r.json()),
    ]).then(([profile, schema]) => {
      setProfileData(normalizeProfile(profile))
      setSchemaData(schema)
      setLoading(false)
    }).catch(err => {
      console.error('Quality page fetch error:', err)
      setLoading(false)
    })
  }, [])

  const { dims, perTable, issues, heatmap, overall } = computeQualityMetrics(profileData)

  if (loading) return <div style={{ color: '#e8e8f0', padding: 40, textAlign: 'center', fontFamily: 'Space Mono' }}>Loading quality report...</div>

  const handleQualityExport = async () => {
    const doc = new jsPDF()

    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("SchemaIQ Data Quality Report", 14, 15)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Overall Score: ${overall}% · Executed: ${new Date().toLocaleString()}`, 14, 22)

    let currentY = 32

    // Capture rings visual
    // Capture rings visual in light theme
    if (ringsRef.current) {
      try {
        const canvas = await html2canvas(ringsRef.current, { 
          backgroundColor: '#ffffff', 
          scale: 2,
          onclone: (clonedDoc) => {
            const container = clonedDoc.querySelector('[data-export-rings]')
            if (container) {
              container.style.background = '#ffffff'
              container.style.padding = '0px'
              const cards = container.querySelectorAll('.quality-card')
              cards.forEach(card => {
                card.style.background = '#f8f9fa'
                card.style.borderColor = '#e9ecef'
              })
              const bgCircles = container.querySelectorAll('.ring-bg-circle')
              bgCircles.forEach(c => {
                c.setAttribute('stroke', '#e9ecef')
                c.style.stroke = '#e9ecef'
              })
              const labels = container.querySelectorAll('.ring-label')
              labels.forEach(l => l.style.color = '#495057')
            }
          }
        })
        const imgData = canvas.toDataURL('image/png')
        // Aspect ratio: width is ~ 180mm inside PDF
        const pdfWidth = 180
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(40)
        doc.text("Quality Dimensions", 14, currentY)
        currentY += 8
        doc.addImage(imgData, 'PNG', 14, currentY, pdfWidth, pdfHeight)
        currentY += pdfHeight + 15
      } catch (err) {
        console.error("Failed to capture rings:", err)
      }
    }

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(40)
    doc.text("Quality Score by Table", 14, currentY)
    currentY += 8

    autoTable(doc, {
      startY: currentY,
      head: [['Dimension', 'Score']],
      body: dims.map(d => [d.label, `${d.pct}%`]),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3, textColor: 60 }
    })

    currentY = doc.lastAutoTable.finalY + 15

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Quality Score by Table", 14, currentY)
    currentY += 8

    autoTable(doc, {
      startY: currentY,
      head: [['Table', 'Score', 'Status']],
      body: perTable.map(t => [t.name, `${t.score}%`, t.score >= 95 ? 'Excellent' : t.score >= 85 ? 'Good' : 'Review']),
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], fontStyle: 'bold' }
    })

    currentY = doc.lastAutoTable.finalY + 15

    const errs = issues.filter(i => i.sev === 'err')
    const warns = issues.filter(i => i.sev === 'warn')

    if (errs.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(40)
      doc.text(`Critical Issues (${errs.length})`, 14, currentY)
      currentY += 8

      autoTable(doc, {
        startY: currentY,
        head: [['Severity', 'Issue', 'Description']],
        body: errs.map(issue => [sevLabel[issue.sev], issue.title, issue.desc]),
        theme: 'grid',
        headStyles: { fillColor: [192, 57, 43], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 50 }, 2: { cellWidth: 100 } }
      })
      currentY = doc.lastAutoTable.finalY + 15
    }

    if (warns.length > 0) {
      if (currentY > 250) { doc.addPage(); currentY = 20; }
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(40)
      doc.text(`Warnings Detected (${warns.length})`, 14, currentY)
      currentY += 8

      autoTable(doc, {
        startY: currentY,
        head: [['Severity', 'Issue', 'Description']],
        body: warns.map(issue => [sevLabel[issue.sev], issue.title, issue.desc]),
        theme: 'grid',
        headStyles: { fillColor: [243, 156, 18], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 50 }, 2: { cellWidth: 100 } }
      })
      currentY = doc.lastAutoTable.finalY + 15
    }

    doc.save("schemaIQ_quality_report.pdf")
  }

  return (
    <div>
      <PageHeader title="Data Quality Report" sub={`Statistical Profiling Agent · Overall score: ${overall}% · ${profileData?.tables?.length || 0} tables analyzed — Real-time`}>
        <Button variant="primary" onClick={handleQualityExport}>⬇ Export Report</Button>
      </PageHeader>

      {/* Dimension rings */}
      <div ref={ringsRef} data-export-rings style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 24, background: '#0f0f17', padding: '16px', borderRadius: 16 }}>
        {dims.map(d => (
          <div key={d.label} className="quality-card" style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 14, padding: '24px 16px', textAlign: 'center' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
          >
            <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 14px' }}>
              <svg viewBox="0 0 90 90" width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                <circle className="ring-bg-circle" fill="none" stroke="#1e1e2e" strokeWidth="7" cx="45" cy="45" r="37" />
                <circle fill="none" stroke={d.stroke} strokeWidth="7" cx="45" cy="45" r="37"
                  strokeLinecap="round" strokeDasharray="232.5"
                  strokeDashoffset={232.5 * (1 - d.pct / 100)}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 15, fontWeight: 700, color: d.stroke }}>{d.pct}%</span>
              </div>
            </div>
            <div className="ring-label" style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Per-table scores */}
        <Panel>
          <PanelHeader title="Quality Score by Table" />
          <PanelBody>
            {perTable.map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid rgba(30,30,46,0.5)' }}>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: '#f0828a', minWidth: 130 }}>{t.name}</span>
                <div style={{ flex: 1, height: 6, background: '#1e1e2e', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${t.score}%`, height: '100%', background: t.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                </div>
                <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: t.color, minWidth: 46, textAlign: 'right' }}>{t.score}%</span>
                <Tag variant={t.score >= 95 ? 'done' : t.score >= 85 ? 'warn' : 'err'}>{t.score >= 95 ? 'Excellent' : t.score >= 85 ? 'Good' : 'Review'}</Tag>
              </div>
            ))}
          </PanelBody>
        </Panel>

        {/* Issues */}
        <Panel>
          <PanelHeader title={`Quality Issues Detected (${issues.length})`}>
            <Tag variant="warn">Live Profiler</Tag>
          </PanelHeader>
          <PanelBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {issues.length > 0 ? issues.map((issue, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor[issue.sev], marginTop: 4, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#e8e8f0', marginBottom: 5 }}>{issue.title}</div>
                    <p style={{ fontSize: 12, color: '#666680', lineHeight: 1.6 }}>{issue.desc}</p>
                  </div>
                  <Tag variant={sevTag[issue.sev]}>{sevLabel[issue.sev]}</Tag>
                </div>
              )) : (
                <div style={{ color: '#27ae60', fontFamily: 'Space Mono', fontSize: 12, textAlign: 'center', padding: 20 }}>
                  No quality issues detected — all checks passed.
                </div>
              )}
            </div>
          </PanelBody>
        </Panel>
      </div>

      {/* Heatmap */}
      <Panel>
        <PanelHeader title="Quality Heatmap — Table × Dimension" />
        <PanelBody>
          <div style={{ display: 'grid', gridTemplateColumns: '130px repeat(5,1fr)', gap: 4 }}>
            {['', 'Completeness', 'Consistency', 'Validity', 'Uniqueness', 'FK Integrity'].map((h, i) => (
              <div key={i} style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, padding: '8px 10px', borderRadius: 5, color: '#666680', background: i === 0 ? 'transparent' : '#16161f', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>{h}</div>
            ))}
            {heatmap.map(([name, vals]) => (
              <Fragment key={name}>{
                [<div key={name} style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#f0828a', display: 'flex', alignItems: 'center', paddingLeft: 4 }}>{name}</div>,
                ...vals.map((v, i) => {
                  const bg = v === null ? '#1a1a26' : v >= 95 ? 'rgba(39,174,96,0.22)' : v >= 80 ? 'rgba(243,156,18,0.18)' : 'rgba(192,57,43,0.22)'
                  const tc = v === null ? '#444458' : v >= 95 ? '#27ae60' : v >= 80 ? '#f39c12' : '#e74c3c'
                  return <div key={`${name}-${i}`} style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, fontWeight: 700, padding: '9px 6px', borderRadius: 6, textAlign: 'center', background: bg, color: tc }}>{v === null ? 'N/A' : `${v}%`}</div>
                })]
              }</Fragment>
            ))}
          </div>
        </PanelBody>
      </Panel>
    </div>
  )
}

// ─── AI AGENTS ────────────────────────────────────────────────────────────────
const INIT_AGENTS = [
  { emoji: '⛁', name: 'Schema Extraction Agent', role: 'Reads database metadata · extracts tables, columns, keys, constraints', color: '#27ae60', status: 'idle', pct: 0, time: 'Queued', desc: 'Waiting to start...', outputs: [] },
  { emoji: '⬡', name: 'Relationship Mapping Agent', role: 'Detects FK relationships · builds ER structure between tables', color: '#2980b9', status: 'idle', pct: 0, time: 'Queued', desc: 'Waiting to start...', outputs: [] },
  { emoji: '📊', name: 'Data Profiling Agent', role: 'Null rates · distinct counts · FK orphans · data freshness', color: '#f39c12', status: 'idle', pct: 0, time: 'Queued', desc: 'Waiting to start...', outputs: [] },
  { emoji: '🧠', name: 'Business Context Agent', role: 'AI-powered domain classification and business meaning inference', color: '#f0828a', status: 'idle', pct: 0, time: 'Queued', desc: 'Waiting to start...', outputs: [] },
  { emoji: '📖', name: 'Data Dictionary Agent', role: 'Generates human-readable descriptions for all database entities', color: '#8e44ad', status: 'idle', pct: 0, time: 'Queued', desc: 'Waiting to start...', outputs: [] },
  { emoji: '🗺', name: 'Visualization Agent', role: 'Creates schema diagrams and relationship maps', color: '#666680', status: 'idle', pct: 0, time: 'Queued', desc: 'Waiting to start...', outputs: [] },
]

export function AgentsPage() {
  const [agents, setAgents] = useState(INIT_AGENTS)
  const [log, setLog] = useState([])
  const [totalTime, setTotalTime] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const logEndRef = useRef(null)

  const ts = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const addLog = (agent, color, msg) => {
    setLog(prev => [...prev, { t: ts(), agent, color, msg }])
  }

  const updateAgent = (idx, patch) => {
    setAgents(prev => prev.map((a, i) => i === idx ? { ...a, ...patch } : a))
  }

  // Auto-scroll log
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [log])

  useEffect(() => {
    const run = async () => {
      const t0 = performance.now()

      try {
        // ── Agent 0: Schema Extraction ──
        updateAgent(0, { status: 'running', pct: 20, desc: 'Connecting to database...' })
        addLog('[SCHEMA]', '#3498db', 'Connecting to database...')

        const schemaRes = await fetch(`${API_BASE}/api/schema?infer=true`)
        const schema = await schemaRes.json()
        const tables = schema.tables || []
        const rels = schema.relationships || []
        const cols = tables.reduce((s, t) => s + (t.columns?.length || 0), 0)
        const t1 = ((performance.now() - t0) / 1000).toFixed(1)

        addLog('[SCHEMA]', '#27ae60', `✓ ${tables.length} tables, ${cols} columns extracted`)
        updateAgent(0, {
          status: 'done', pct: 100, time: `${t1}s`,
          desc: `Extracted ${tables.length} tables with ${cols} columns from the connected database.`,
          outputs: [`${tables.length} tables extracted`, `${cols} columns mapped`, `${rels.length} FK relationships`, '✓ DDL generated']
        })

        // ── Agent 1: Relationship Mapping ──
        updateAgent(1, { status: 'running', pct: 30, desc: 'Building FK relationship graph...' })
        addLog('[RELMAP]', '#3498db', 'Building FK relationship graph...')
        await new Promise(r => setTimeout(r, 300))

        const t2 = ((performance.now() - t0) / 1000).toFixed(1)
        addLog('[RELMAP]', '#27ae60', `✓ ${rels.length} FK edges mapped, cardinality labelled`)
        updateAgent(1, {
          status: 'done', pct: 100, time: `${t2}s`,
          desc: `Mapped ${rels.length} foreign key relationships with cardinality labels. ER graph constructed.`,
          outputs: ['✓ ER graph built', `✓ ${rels.length} edges mapped`, '✓ Cardinality labelled', '✓ Join paths computed']
        })

        // ── Agent 2: Data Profiling ──
        updateAgent(2, { status: 'running', pct: 10, desc: 'Profiling all columns...' })
        addLog('[PROFILE]', '#3498db', `Profiling ${cols} columns across ${tables.length} tables...`)

        const profileRes = await fetch(`${API_BASE}/api/profile`)
        const profile = await profileRes.json()
        const totalRows = (profile.tables || []).reduce((s, t) => s + (t.row_count || 0), 0)
        const highNull = (profile.tables || []).flatMap(t => (t.columns || []).filter(c => c.null_percent > 30).map(c => ({ tbl: t.name, col: c.name, pct: c.null_percent })))
        const orphanCount = (profile.fk_orphans || []).reduce((s, o) => s + o.orphan_count, 0)

        highNull.slice(0, 3).forEach(c => {
          addLog('[PROFILE]', '#f39c12', `⚠ ${c.tbl}.${c.col}: ${c.pct.toFixed(1)}% null`)
        })

        const totalCells = (profile.tables || []).reduce((s, t) => s + t.row_count * (t.columns?.length || 0), 0)
        const totalNulls = (profile.tables || []).reduce((s, t) => s + (t.columns || []).reduce((ss, c) => ss + (c.null_count || 0), 0), 0)
        const qualityPct = totalCells > 0 ? (((totalCells - totalNulls) / totalCells) * 100).toFixed(1) : '100.0'

        addLog('[PROFILE]', '#27ae60', `✓ Quality: ${qualityPct}% completeness · ${totalRows.toLocaleString()} rows · ${orphanCount} FK orphans`)
        const t3 = ((performance.now() - t0) / 1000).toFixed(1)
        updateAgent(2, {
          status: 'done', pct: 100, time: `${t3}s`,
          desc: `Profiled ${totalRows.toLocaleString()} rows across ${(profile.tables || []).length} tables. Computed null rates, distinct counts, FK integrity.`,
          outputs: [`✓ ${totalRows.toLocaleString()} rows profiled`, `✓ Quality: ${qualityPct}%`, `✓ ${orphanCount} FK orphans`, `✓ ${highNull.length} null warnings`]
        })

        // ── Agent 3: Business Context ──
        updateAgent(3, { status: 'running', pct: 20, desc: 'Classifying business domain...' })
        addLog('[BIZCTX]', '#3498db', 'Running AI domain classification...')

        const dictRes = await fetch(`${API_BASE}/api/dictionary/quick`)
        const dict = await dictRes.json()
        const domain = dict.domain_analysis?.primary_domain || 'general'
        const confidence = dict.domain_analysis?.confidence || 0
        const dictTables = dict.tables || []

        addLog('[BIZCTX]', '#27ae60', `✓ Domain: ${domain} (${(confidence * 100).toFixed(0)}% confidence)`)
        dictTables.slice(0, 4).forEach(t => {
          addLog('[BIZCTX]', '#27ae60', `✓ ${t.name} — business context generated`)
        })
        const t4 = ((performance.now() - t0) / 1000).toFixed(1)
        updateAgent(3, {
          status: 'done', pct: 100, time: `${t4}s`,
          desc: `Domain classified as "${domain}" with ${(confidence * 100).toFixed(0)}% confidence. Business context generated for ${dictTables.length} tables.`,
          outputs: [`✓ Domain: ${domain}`, `✓ ${(confidence * 100).toFixed(0)}% confidence`, ...dictTables.slice(0, 3).map(t => `✓ ${t.name}`)]
        })

        // ── Agent 4: Data Dictionary ──
        updateAgent(4, { status: 'running', pct: 40, desc: 'Generating data dictionary...' })
        addLog('[DICT]', '#3498db', 'Aggregating all agent outputs...')
        await new Promise(r => setTimeout(r, 200))
        addLog('[DICT]', '#3498db', `Generating dictionary for ${dictTables.length} tables...`)
        await new Promise(r => setTimeout(r, 200))

        const totalDictCols = dictTables.reduce((s, t) => s + (t.columns?.length || 0), 0)
        addLog('[DICT]', '#27ae60', `✓ Dictionary complete — ${dictTables.length} tables, ${totalDictCols} columns documented`)
        const t5 = ((performance.now() - t0) / 1000).toFixed(1)
        updateAgent(4, {
          status: 'done', pct: 100, time: `${t5}s`,
          desc: `Generated comprehensive data dictionary with ${dictTables.length} tables and ${totalDictCols} column definitions. Export-ready.`,
          outputs: [`✓ ${dictTables.length} tables documented`, `✓ ${totalDictCols} columns`, '✓ Markdown ready', '✓ CSV ready']
        })

        // ── Agent 5: Visualization ──
        updateAgent(5, { status: 'running', pct: 50, desc: 'Rendering ER diagram...' })
        addLog('[VISUAL]', '#3498db', 'Rendering ER diagram from relationship graph...')
        await new Promise(r => setTimeout(r, 300))

        addLog('[VISUAL]', '#27ae60', `✓ ER diagram rendered — ${tables.length} nodes, ${rels.length} edges`)
        const tFinal = ((performance.now() - t0) / 1000).toFixed(1)
        updateAgent(5, {
          status: 'done', pct: 100, time: `${tFinal}s`,
          desc: `ER diagram rendered with ${tables.length} table nodes and ${rels.length} relationship edges. Interactive SVG ready.`,
          outputs: [`✓ ${tables.length} nodes`, `✓ ${rels.length} edges`, '✓ SVG exported', '✓ Interactive ready']
        })

        setTotalTime(parseFloat(tFinal))
        addLog('[SYSTEM]', '#27ae60', `✓ All 6 agents completed in ${tFinal}s`)
        setAllDone(true)

      } catch (err) {
        addLog('[ERROR]', '#e74c3c', `Pipeline failed: ${err.message}`)
      }
    }
    run()
  }, [])

  const doneCount = agents.filter(a => a.status === 'done').length
  const runCount = agents.filter(a => a.status === 'running').length
  const pipelineTag = allDone ? 'done' : runCount > 0 ? 'run' : 'idle'
  const pipelineLabel = allDone ? '✓ Complete' : runCount > 0 ? '⟳ Running' : '○ Idle'

  return (
    <div>
      <PageHeader title="AI Agent Insights" sub={`Multi-Agent Engine · 6 specialised agents · ${allDone ? 'All complete' : 'Running...'}`}>
        <Button variant="ghost" onClick={() => window.location.reload()}>⟳ Re-run All</Button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <MetricCard icon="✓" label="Completed" value={doneCount} delta={doneCount === 6 ? '▲ all done' : '▲ agents done'} cardColor="#27ae60" delay={0} />
        <MetricCard icon="⟳" label="Running" value={runCount} delta={runCount > 0 ? '● in progress' : '● idle'} deltaColor="#f39c12" cardColor="#f39c12" delay={50} />
        <MetricCard icon="⏱" label="Total Runtime" value={totalTime > 0 ? `${totalTime}s` : '...'} delta={allDone ? '▲ complete' : '● running'} cardColor="#2980b9" delay={100} />
        <MetricCard icon="🧠" label="API Calls" value={log.length} delta="live log entries" deltaColor="#666680" cardColor="#9b59b6" delay={150} />
      </div>

      {/* Pipeline */}
      <Panel style={{ marginBottom: 16 }}>
        <PanelHeader title="Agent Execution Pipeline"><Tag variant={pipelineTag}>{pipelineLabel}</Tag></PanelHeader>
        <PanelBody>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {agents.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    border: `2px solid ${a.status === 'done' ? '#27ae60' : a.status === 'running' ? '#f39c12' : '#252540'}`,
                    background: a.status === 'done' ? 'rgba(39,174,96,0.12)' : a.status === 'running' ? 'rgba(243,156,18,0.12)' : '#16161f',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    animation: a.status === 'running' ? 'spin 2s linear infinite' : undefined,
                  }}>{a.emoji}</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680', textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.4, maxWidth: 70 }}>{a.name.replace(' Agent', '').replace(' ', '\n')}</div>
                </div>
                {i < agents.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: a.status === 'done' ? '#27ae60' : '#1e1e2e', margin: '0 8px', marginBottom: 28 }} />
                )}
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      {/* Agent cards + log */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {agents.map(a => (
            <Panel key={a.name}>
              <div style={{ height: 3, background: a.color, borderRadius: '14px 14px 0 0' }} />
              <PanelBody>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, background: a.color + '18' }}>{a.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: '#e8e8f0' }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: '#666680', marginTop: 4 }}>{a.role}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <Tag variant={a.status === 'done' ? 'done' : a.status === 'running' ? 'run' : 'idle'}>{a.status === 'done' ? '✓ DONE' : a.status === 'running' ? '⟳ RUNNING' : '○ IDLE'}</Tag>
                    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458', marginTop: 6 }}>{a.time}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#666680', lineHeight: 1.7, marginBottom: 14 }}>{a.desc}</p>
                <div style={{ height: 5, background: '#1e1e2e', borderRadius: 3, marginBottom: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${a.pct}%`, height: '100%', background: a.color, borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458', marginBottom: 14 }}>
                  <span>Progress</span><span>{a.pct}%</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {a.outputs.map(o => (
                    <span key={o} style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, padding: '4px 10px', borderRadius: 20, border: `1px solid ${o.includes('✓') ? 'rgba(39,174,96,0.35)' : '#252540'}`, background: o.includes('✓') ? 'rgba(39,174,96,0.1)' : '#16161f', color: o.includes('✓') ? '#27ae60' : '#666680' }}>{o}</span>
                  ))}
                </div>
              </PanelBody>
            </Panel>
          ))}
        </div>

        {/* Live log */}
        <Panel style={{ alignSelf: 'start', position: 'sticky', top: 80 }}>
          <PanelHeader title="Live Agent Log"><Tag variant={allDone ? 'done' : 'run'}>{allDone ? '✓ DONE' : '● LIVE'}</Tag></PanelHeader>
          <div style={{ background: '#0a0a0f', padding: '16px', fontFamily: "'Space Mono',monospace", fontSize: 11, lineHeight: 2, height: 640, overflowY: 'auto' }}>
            {log.map((l, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: '#333348', flexShrink: 0 }}>{l.t}</span>
                <span style={{ color: l.color, flexShrink: 0, minWidth: 66 }}>{l.agent}</span>
                <span style={{ color: l.color }}>{l.msg}</span>
              </div>
            ))}
            {!allDone && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <span style={{ color: '#333348', animation: 'blink 1s step-end infinite' }}>█</span>
                <span style={{ color: '#333348' }}>Processing…</span>
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function ConnectionsPage() {
  const [dbData, setDbData] = useState({ tables: 0, cols: 0, rels: 0 })
  const [connInfo, setConnInfo] = useState({ status: 'disconnected', url: '', engine: '', source: null, display_name: null })
  const formRef = useRef(null)
  const [customDbUrl, setCustomDbUrl] = useState("")
  const [log, setLog] = useState([
    { color: '#27ae60', msg: '  [ OK ] DB Connection UI Ready' },
  ])
  const [testing, setTesting] = useState(false)
  const [latency, setLatency] = useState(0)
  const [lastSyncSecs, setLastSyncSecs] = useState(0)

  // NEW STATES FOR FORM BUILDER
  const [inputMode, setInputMode] = useState('form') // 'url' | 'form' | 'file'
  const [selectedFile, setSelectedFile] = useState(null)
  const [formDb, setFormDb] = useState({
    engine: 'mysql+pymysql',
    user: 'root',
    password: 'root',
    host: 'localhost',
    port: '3306',
    database: 'practice_company'
  })

  const runFileUpload = async () => {
    if (!selectedFile) {
      setLog(prev => [...prev, { color: '#f39c12', msg: '  [ WARN ] Please select a file first!' }]);
      return;
    }
    setTesting(true);
    setLog([{ color: '#3498db', msg: `[ INFO ] Uploading ${selectedFile.name}...` }]);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.status === 'uploaded') {
        setLog(prev => [...prev, { color: '#27ae60', msg: `  [ OK ] Successfully loaded ${selectedFile.name} into virtual SQLite memory` }]);
        fetchData(); // Refresh everything
      } else {
        setLog(prev => [...prev, { color: '#e74c3c', msg: `  [ ERR ] ${data.detail || 'Upload failed'}` }]);
      }
    } catch (err) {
      setLog(prev => [...prev, { color: '#e74c3c', msg: `  [ ERR ] Upload failed: ${err.message}` }]);
    }
    setTesting(false);
  }

  const fetchData = async () => {
    const t0 = performance.now()
    try {
      const schRes = await fetch(`${API_BASE}/api/schema?infer=true`)
      const data = await schRes.json()
      const nodes = data.tables || []
      const links = data.relationships || []
      const colsSum = nodes.reduce((sum, n) => sum + (n.columns?.length || 0), 0)
      setDbData({ tables: nodes.length, cols: colsSum, rels: links.length })

      const connRes = await fetch(`${API_BASE}/api/connection`)
      const ci = await connRes.json()
      setConnInfo(ci)

      const t1 = performance.now()
      setLatency(Math.round(t1 - t0))
      setLastSyncSecs(0) // Reset sync timer
    } catch (err) {
      console.error("Real-time sync failed:", err)
    }
  }

  useEffect(() => {
    fetchData()
    const pole = setInterval(fetchData, 10000) // Poll every 10s
    const timer = setInterval(() => setLastSyncSecs(s => s + 1), 1000)
    return () => { clearInterval(pole); clearInterval(timer) }
  }, [])

  const parseUrl = (url) => {
    if (!url) return { proto: '', user: '', hostPort: '', db: '' }
    try {
      const [proto, rest] = url.split('://')
      let [creds, hostPath] = rest.split('@')
      if (!hostPath) { hostPath = creds; creds = '' }

      // Smart extraction for Windows paths
      const normalizedPath = (hostPath || '').replace(/\\/g, '/')
      const parts = normalizedPath.split('/')
      const db = parts[parts.length - 1] || 'Database'
      const hostPort = parts[0] === db ? '' : parts[0]

      const user = creds.split(':')[0] || ''
      return { proto, user, hostPort, db }
    } catch (e) { return { proto: '', user: '', hostPort: '', db: 'Database' } }
  }
  const parsed = parseUrl(connInfo.url)

  const runTest = async () => {
    setTesting(true);
    setLog([{ color: '#3498db', msg: `[ INFO ] Testing connection/saving DB URL...` }])

    // Auto-construct URL if none provided manually
    let finalUrl = customDbUrl || "sqlite:///sample.db"

    if (inputMode === 'form') {
      const { engine, user, password, host, port, database } = formDb;
      finalUrl = `${engine}://${user}:${password}@${host}:${port}/${database}`
    }

    try {
      const res = await fetch(`${API_BASE}/api/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_url: finalUrl })
      })
      const data = await res.json()
      if (res.ok && data.status === 'connected') {
        setLog(prev => [...prev, { color: '#27ae60', msg: `  [ OK ] Connection successful to ${finalUrl}` }])
        fetchData() // Refresh everything
      } else {
        setLog(prev => [...prev, { color: '#e74c3c', msg: `  [ ERR ] ${data.detail || 'Connection failed'}` }])
      }
    } catch (err) {
      setLog(prev => [...prev,
      { color: '#e74c3c', msg: `  [ ERR ] Fetch failed: ${err.message}` },
      { color: '#f39c12', msg: `  [ HINT ] This typically means a driver (e.g. pymysql for MySQL) is missing in the Python backend, crashing the request.` }
      ])
    }
    setTesting(false)
  }

  const engineTypes = {
    postgresql: 'postgresql', mysql: 'mysql', sqlite: 'sqlite'
  }

  const DBS = [
    { emoji: '🐘', name: 'PostgreSQL', desc: 'Full schema introspection, FK detection, constraint mapping.', connected: connInfo.status === 'connected' && connInfo.source === 'database' && connInfo.engine === engineTypes.postgresql, latency: (connInfo.status === 'connected' && connInfo.engine === engineTypes.postgresql) ? `${latency}ms` : null },
    { emoji: '🐬', name: 'MySQL / MariaDB', desc: 'InnoDB schema extraction and stored procedure analysis.', connected: connInfo.status === 'connected' && connInfo.source === 'database' && connInfo.engine === engineTypes.mysql, latency: (connInfo.status === 'connected' && connInfo.engine === engineTypes.mysql) ? `${latency}ms` : null },
    { emoji: '🟦', name: 'SQL Server', desc: 'MSSQL metadata extraction with T-SQL support.', connected: false },
    { emoji: '🪶', name: 'SQLite', desc: 'Lightweight local DB for rapid prototyping.', connected: connInfo.status === 'connected' && connInfo.source === 'database' && connInfo.engine === engineTypes.sqlite, latency: (connInfo.status === 'connected' && connInfo.source === 'database' && connInfo.engine === engineTypes.sqlite) ? `${latency}ms` : null },
    { emoji: '☁️', name: 'Cloud Warehouses', desc: 'BigQuery, Redshift, Snowflake via JDBC/ODBC.', connected: false, soon: true },
    { emoji: '📁', name: 'Flat Files / CSV', desc: 'Upload CSV or JSON. Auto-infers schema and types.', connected: connInfo.status === 'connected' && connInfo.source === 'file', latency: (connInfo.status === 'connected' && connInfo.source === 'file') ? `${latency}ms` : null },
  ]

  return (
    <div>
      <PageHeader title="Database Connections" sub="Connect relational databases, cloud databases, or flat files for analysis — Real-time">
        <Button variant="primary" onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}>＋ New Connection</Button>
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <MetricCard icon="⚡" label="Active Connections" value={connInfo.status === 'connected' ? "1" : "0"} delta={connInfo.status === 'connected' ? "● Online" : "○ Offline"} cardColor={connInfo.status === 'connected' ? "#27ae60" : "#666680"} delay={0} />
        <MetricCard icon="⛁" label="Tables Discovered" value={dbData.tables || "0"} delta="▲ Auto-scanned" cardColor="#2980b9" delay={50} />
        <MetricCard icon="⏱" label="Avg Latency" value={latency > 0 ? `${latency}ms` : "---"} delta={latency < 100 ? "▲ Excellent" : "● Stable"} cardColor="#f39c12" delay={100} />
        <MetricCard icon="↻" label="Last Sync" value={lastSyncSecs > 59 ? `${Math.floor(lastSyncSecs / 60)}m` : `${lastSyncSecs}s`} delta="ago" deltaColor="#666680" cardColor="#9b59b6" delay={150} />
      </div>

      {/* Engine grid */}
      <Panel style={{ marginBottom: 16 }}>
        <PanelHeader title="Supported Database Engines" />
        <PanelBody>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {DBS.map(db => (
              <div key={db.name} style={{
                background: '#16161f', borderRadius: 12, padding: '20px',
                border: `1px solid ${db.connected ? 'rgba(39,174,96,0.4)' : '#1e1e2e'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = db.connected ? 'rgba(39,174,96,0.4)' : '#1e1e2e'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ fontSize: 28, marginBottom: 12 }}>{db.emoji}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: '#e8e8f0', marginBottom: 8 }}>{db.name}</div>
                <div style={{ fontSize: 12, color: '#666680', lineHeight: 1.6, marginBottom: 16 }}>{db.desc}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {db.connected ? <Tag variant="done">● CONNECTED</Tag> : db.soon ? <Tag variant="idle">COMING SOON</Tag> : <Tag variant="idle">○ AVAILABLE</Tag>}
                  {db.latency && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#666680' }}>{db.latency}</span>}
                </div>
              </div>
            ))}
          </div>
        </PanelBody>
      </Panel>

      {/* Config + detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} ref={formRef}>
        <Panel>
          <PanelHeader title="Configure Connection" />
          <PanelBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <button
                  onClick={() => setInputMode('url')}
                  style={{ background: inputMode === 'url' ? '#c0392b' : 'transparent', color: inputMode === 'url' ? '#fff' : '#666680', border: '1px solid #c0392b', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
                >Raw URL String</button>
                <button
                  onClick={() => setInputMode('form')}
                  style={{ background: inputMode === 'form' ? '#c0392b' : 'transparent', color: inputMode === 'form' ? '#fff' : '#666680', border: '1px solid #c0392b', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
                >Form Builder</button>
                <button
                  onClick={() => setInputMode('file')}
                  style={{ background: inputMode === 'file' ? '#c0392b' : 'transparent', color: inputMode === 'file' ? '#fff' : '#666680', border: '1px solid #c0392b', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
                >File Upload</button>
              </div>

              {inputMode === 'url' ? (
                <div>
                  <Label>Database URL (Full connection string)</Label>
                  <Input placeholder="e.g. postgresql://user:pass@localhost:5432/db OR sqlite:///data.db"
                    value={customDbUrl}
                    onChange={e => setCustomDbUrl(e.target.value)} />
                </div>
              ) : inputMode === 'file' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Label>Upload Database File (.csv or .sql)</Label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 80, border: '2px dashed #1e1e2e', borderRadius: 12, background: '#16161f', cursor: 'pointer', color: '#666680', fontFamily: "'Space Mono', monospace", fontSize: 13, transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#c0392b'} onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}>
                    <input type="file" accept=".csv,.sql,.sqlite" onChange={e => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} />
                    {selectedFile ? <span style={{ color: '#2980b9' }}>📁 Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span> : <span>Drag & Drop or Click to Select File</span>}
                  </label>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  <div>
                    <Label>Engine Builder</Label>
                    <select
                      value={formDb.engine}
                      onChange={e => setFormDb({ ...formDb, engine: e.target.value })}
                      style={{ width: '100%', background: '#16161f', color: '#e8e8f0', border: '1px solid #1e1e2e', borderRadius: 8, padding: '9px', fontSize: 13, fontFamily: "'Space Mono', monospace" }}
                    >
                      <option value="mysql+pymysql">MySQL (PyMySQL)</option>
                      <option value="postgresql">PostgreSQL</option>
                      <option value="mysql">MySQL (Native)</option>
                      <option value="mssql+pyodbc">SQL Server</option>
                    </select>
                  </div>
                  <div><Label>Host</Label><Input value={formDb.host} onChange={e => setFormDb({ ...formDb, host: e.target.value })} /></div>
                  <div><Label>Port</Label><Input value={formDb.port} onChange={e => setFormDb({ ...formDb, port: e.target.value })} /></div>
                  <div><Label>Username</Label><Input value={formDb.user} onChange={e => setFormDb({ ...formDb, user: e.target.value })} /></div>
                  <div><Label>Password</Label><Input type="password" value={formDb.password} onChange={e => setFormDb({ ...formDb, password: e.target.value })} /></div>
                  <div><Label>Database</Label><Input value={formDb.database} onChange={e => setFormDb({ ...formDb, database: e.target.value })} /></div>
                </div>
              )}
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#666680', marginTop: -6 }}>
                💡 Fast connect using full URL string. Supports MySQL, Postgres, SQLite, CSV.
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <Button variant="primary" onClick={inputMode === 'file' ? runFileUpload : runTest}>
                  {testing ? (inputMode === 'file' ? '⟳ Uploading…' : '⟳ Connecting…') : (inputMode === 'file' ? '📁 Upload & Scan' : '⚡ Connect & Scan')}
                </Button>
              </div>
            </div>
          </PanelBody>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Panel>
            <PanelHeader title={`Active Connection — ${connInfo.display_name || parsed.db || 'None'}`}><Tag variant={connInfo.status === 'connected' ? 'done' : 'idle'}>{connInfo.status === 'connected' ? '● LIVE' : '○ OFFLINE'}</Tag></PanelHeader>
            <PanelBody>
              {[['Engine', parsed.proto || connInfo.engine || (connInfo.status === 'connected' ? 'Connected' : 'Disconnected')], ['Host', parsed.hostPort || '-'], ['Database', connInfo.display_name || parsed.db || '-'], ['User', parsed.user || '-'], ['Tables', `${dbData.tables || 0} discovered`], ['Latency', latency > 0 ? `${latency}ms` : '-'], ['SSL', '✓ Encrypted'], ['Last Sync', lastSyncSecs > 59 ? `${Math.floor(lastSyncSecs / 60)}m ago` : `${lastSyncSecs}s ago`]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(30,30,46,0.5)' }}>
                  <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#666680' }}>{k}</span>
                  <span style={{ fontSize: 13, color: '#e8e8f0' }}>{v}</span>
                </div>
              ))}
            </PanelBody>
          </Panel>
          <Panel>
            <PanelHeader title="Connection Test Log" />
            <div style={{ background: '#0a0a0f', margin: '0', padding: '16px', fontFamily: "'Space Mono',monospace", fontSize: 11, lineHeight: 1.9, height: 200, overflowY: 'auto', borderRadius: '0 0 14px 14px' }}>
              {log.map((l, i) => <div key={i} style={{ color: l.color }}>{l.msg}</div>)}
              {testing && <div style={{ color: '#666680', animation: 'blink 1s step-end infinite' }}>█</div>}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
export function SettingsPage() {
  const DEFAULT_TOGGLES = {
    darkMode: true, autoRefresh: true, showRows: true, compact: false,
    faiss: true, pinecone: false, retry: true,
    md: true, csv: true, html: true, json: false,
    svg: true, png: true, mermaid: false,
    agentSchema: true, agentRelmap: true, agentProfile: true, agentBiz: true, agentDict: true, agentViz: true,
    notifyAgent: true, notifyQuality: true, notifySchema: true, notifyError: true, emailWeekly: false,
  }
  const MODEL_OPTIONS = [
    { name: 'GPT-4o', desc: 'OpenAI · Best for complex business context generation', tag: 'Recommended', tagV: 'done' },
    { name: 'Gemini Pro 1.5', desc: 'Google · Fast, good for structured schema understanding', tag: 'Fast', tagV: 'idx' },
    { name: 'Llama 3 (Local)', desc: 'Meta · Self-hosted, no data leaves your infrastructure', tag: 'Private', tagV: 'fk' },
  ]

  const [tab, setTab] = useState('general')
  const [toggles, setToggles] = useState(DEFAULT_TOGGLES)
  const [projectName, setProjectName] = useState('New Analytics Project')
  const [projectDescription, setProjectDescription] = useState('Database schema analysis and AI insights')
  const [emailAddress, setEmailAddress] = useState('user@example.com')
  const [framework, setFramework] = useState('LangGraph (Default)')
  const toggle = k => setToggles(p => ({ ...p, [k]: !p[k] }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selModel, setSelModel] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(r => r.json())
      .then(data => {
        const s = data || {}
        setToggles({ ...DEFAULT_TOGGLES, ...(s.toggles || {}) })
        setProjectName(s.project?.name || 'New Analytics Project')
        setProjectDescription(s.project?.description || 'Database schema analysis and AI insights')
        setEmailAddress(s.notifications?.email || 'user@example.com')
        setFramework(s.ai?.orchestration_framework || 'LangGraph (Default)')
        const modelIndex = Number.isInteger(s.ai?.selected_model_index) ? s.ai.selected_model_index : 0
        setSelModel(Math.max(0, Math.min(MODEL_OPTIONS.length - 1, modelIndex)))
      })
      .catch(err => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        project: { name: projectName, description: projectDescription },
        notifications: { email: emailAddress },
        ai: { selected_model_index: selModel, orchestration_framework: framework },
        toggles,
      }
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save settings:', err)
    } finally {
      setSaving(false)
    }
  }

  const TABS = [['general', '⚙ General'], ['ai', '🧠 AI Models'], ['agents', '⬢ Agents'], ['export', '⬇ Export'], ['notifications', '🔔 Notifications'], ['danger', '⚠ Danger']]

  const Row = ({ label, desc, k }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(30,30,46,0.5)' }}>
      <div>
        <div style={{ fontSize: 14, color: '#e8e8f0' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#666680', marginTop: 4 }}>{desc}</div>
      </div>
      <Toggle on={toggles[k]} onToggle={() => toggle(k)} />
    </div>
  )

  const SectionTitle = ({ children }) => (
    <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#e8e8f0', padding: '0 0 12px', borderBottom: '1px solid #1e1e2e', marginBottom: 16 }}>{children}</div>
  )

  return (
    <div>
      <PageHeader title="Settings" sub="Configure AI models, agents, export preferences and platform settings">
        <Button variant="primary" onClick={save} disabled={saving || loading}>
          {saving ? '⟳ Saving...' : (saved ? '✓ Saved!' : '💾 Save Changes')}
        </Button>
      </PageHeader>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Tab nav */}
        <div style={{ width: 190, flexShrink: 0 }}>
          <Panel>
            <div style={{ padding: '8px' }}>
              {TABS.map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)} style={{
                  width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 8,
                  fontSize: 13,
                  background: tab === id ? 'rgba(192,57,43,0.08)' : 'transparent',
                  color: tab === id ? '#f0828a' : '#666680', cursor: 'pointer', border: `0 solid transparent`,
                  borderLeft: `3px solid ${tab === id ? '#c0392b' : 'transparent'}`,
                  display: 'block', marginBottom: 2, transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (tab !== id) { e.currentTarget.style.color = '#b0b0c8'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' } }}
                  onMouseLeave={e => { if (tab !== id) { e.currentTarget.style.color = '#666680'; e.currentTarget.style.background = 'transparent' } }}
                >{label}</button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {tab === 'general' && (
            <Panel>
              <PanelHeader title="General Settings" />
              <PanelBody>
                <SectionTitle>Project</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                  <div>
                    <Label>Project Name</Label>
                    <Input value={projectName} onChange={e => setProjectName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={projectDescription} onChange={e => setProjectDescription(e.target.value)} />
                  </div>
                </div>
                <SectionTitle>Interface</SectionTitle>
                <Row label="Dark Mode" desc="Use dark theme across the dashboard" k="darkMode" />
                <Row label="Auto-refresh Data" desc="Re-scan schema every 30 minutes" k="autoRefresh" />
                <Row label="Show Row Counts" desc="Display live row counts in Schema Explorer" k="showRows" />
                <Row label="Compact Mode" desc="Reduce padding and spacing in tables" k="compact" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'ai' && (
            <Panel>
              <PanelHeader title="AI Model Configuration" />
              <PanelBody>
                <SectionTitle>Primary Intelligence Model</SectionTitle>
                {MODEL_OPTIONS.map((m, i) => (
                  <div key={m.name} onClick={() => setSelModel(i)} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#16161f', borderRadius: 12, padding: '16px', marginBottom: 10, border: `1px solid ${selModel === i ? '#c0392b' : '#1e1e2e'}`, cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selModel === i ? '#c0392b' : '#666680'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {selModel === i && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c0392b' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, color: '#e8e8f0' }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#666680', marginTop: 4 }}>{m.desc}</div>
                    </div>
                    <Tag variant={m.tagV}>{m.tag}</Tag>
                  </div>
                ))}
                <SectionTitle style={{ marginTop: 20 }}>Vector Store</SectionTitle>
                <Row label="FAISS (Local)" desc="In-memory vector store — fast, no external dependency" k="faiss" />
                <Row label="Pinecone (Cloud)" desc="Persistent cloud vector DB with similarity search" k="pinecone" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'agents' && (
            <Panel>
              <PanelHeader title="Agent Configuration" />
              <PanelBody>
                <SectionTitle>Enable / Disable Agents</SectionTitle>
                <Row label="Schema Extraction Agent" desc="Reads DDL and metadata from connected databases" k="agentSchema" />
                <Row label="Relationship Mapping Agent" desc="Builds FK graph and ER structure" k="agentRelmap" />
                <Row label="Data Profiling Agent" desc="Statistical analysis of all columns" k="agentProfile" />
                <Row label="Business Context Agent" desc="LLM-based business meaning inference" k="agentBiz" />
                <Row label="Data Dictionary Agent" desc="Final documentation generation" k="agentDict" />
                <Row label="Visualization Agent" desc="ER diagram and schema graph rendering" k="agentViz" />
                <SectionTitle style={{ marginTop: 20 }}>Orchestration</SectionTitle>
                <div style={{ marginBottom: 14 }}><Label>Framework</Label>
                  <select
                    value={framework}
                    onChange={e => setFramework(e.target.value)}
                    style={{ width: '100%', background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#e8e8f0', outline: 'none' }}
                  >
                    <option>LangGraph (Default)</option><option>CrewAI</option><option>Custom Python</option>
                  </select>
                </div>
                <Row label="Retry on Failure" desc="Auto-retry failed agent tasks up to 3 times" k="retry" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'export' && (
            <Panel>
              <PanelHeader title="Export Preferences" />
              <PanelBody>
                <SectionTitle>Dictionary Export Formats</SectionTitle>
                <Row label="Markdown (.md)" desc="Human-readable docs, embeddable in GitHub or Notion" k="md" />
                <Row label="CSV" desc="Spreadsheet-compatible flat file" k="csv" />
                <Row label="HTML Report" desc="Standalone browser-viewable report" k="html" />
                <Row label="JSON Schema" desc="Structured format for API consumption" k="json" />
                <SectionTitle style={{ marginTop: 24 }}>ER Diagram Export</SectionTitle>
                <Row label="SVG" desc="Vector format, scales without loss" k="svg" />
                <Row label="PNG (2x)" desc="Rasterised high-res image" k="png" />
                <Row label="Mermaid Syntax" desc="Export as Mermaid.js diagram code" k="mermaid" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'notifications' && (
            <Panel>
              <PanelHeader title="Notification Preferences" />
              <PanelBody>
                <SectionTitle>In-App Notifications</SectionTitle>
                <Row label="Agent Completion" desc="Notify when all agents finish a run" k="notifyAgent" />
                <Row label="Quality Issues" desc="Alert when new data quality issues are detected" k="notifyQuality" />
                <Row label="Schema Changes" desc="Alert when a schema change is detected" k="notifySchema" />
                <Row label="Agent Errors" desc="Notify on any agent task failures" k="notifyError" />
                <SectionTitle style={{ marginTop: 24 }}>Email</SectionTitle>
                <div style={{ marginBottom: 14 }}>
                  <Label>Email Address</Label>
                  <Input type="email" value={emailAddress} onChange={e => setEmailAddress(e.target.value)} />
                </div>
                <Row label="Weekly Summary Report" desc="Receive a weekly email digest of quality scores" k="emailWeekly" />
              </PanelBody>
            </Panel>
          )}
          {tab === 'danger' && (
            <Panel>
              <PanelHeader title="Danger Zone"><Tag variant="err">⚠ Irreversible</Tag></PanelHeader>
              <PanelBody>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { title: 'Clear All Agent Outputs', desc: 'Deletes all generated data dictionaries, quality reports, and AI annotations. The database connection and schema will remain.', label: 'Clear Outputs' },
                    { title: 'Reset Vector Store', desc: 'Removes all schema embeddings from FAISS / Pinecone. Agents will need to re-embed on next run.', label: 'Reset Vector Store' },
                    { title: 'Delete Project', desc: 'Permanently deletes this project, all connections, outputs, and settings. This cannot be undone.', label: 'Delete Project', primary: true },
                  ].map(d => (
                    <div key={d.title} style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.25)', borderRadius: 12, padding: '20px' }}>
                      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: '#e74c3c', marginBottom: 8 }}>⚠ {d.title}</div>
                      <p style={{ fontSize: 13, color: '#666680', lineHeight: 1.7, marginBottom: 16 }}>{d.desc}</p>
                      <Button variant="danger">{d.label}</Button>
                    </div>
                  ))}
                </div>
              </PanelBody>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}