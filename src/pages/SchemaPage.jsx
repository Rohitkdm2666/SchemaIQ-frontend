import { useState, useEffect } from 'react'
import { Panel, PanelHeader, PanelBody, Tag, Button } from '../components/ui.jsx'
import ERDiagram from '../components/ERDiagram.jsx'
import { schemaToGraph } from '../utils/schemaToGraph.js'
import { API_BASE } from '../config.js'

const TV = { PK: 'pk', FK: 'fk', IDX: 'idx', 'NOT NULL': 'nn', NULLABLE: 'warn' }

function ColCard({ col }) {
  const nullPct = parseFloat(col.nullPct) || 0
  const nullColor = nullPct > 50 ? '#e74c3c' : nullPct > 0 ? '#f39c12' : '#27ae60'
  return (
    <div style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 10, padding: '16px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(192,57,43,0.5)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#f0828a' }}>{col.name}</span>
        {col.tags.map(t => <Tag key={t} variant={TV[t] || 'default'}>{t}</Tag>)}
      </div>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: '#3498db', marginBottom: 8 }}>{col.type}</div>
      <p style={{ fontSize: 12, color: '#666680', lineHeight: 1.6, marginBottom: 12 }}>{col.desc}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: '#111118', borderRadius: 7, padding: '8px 12px' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#444458', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Null %</div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, color: nullColor }}>{col.nullPct}</div>
        </div>
        <div style={{ background: '#111118', borderRadius: 7, padding: '8px 12px' }}>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#444458', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Distinct</div>
          <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, color: '#b0b0c8' }}>{col.distinct}</div>
        </div>
      </div>
    </div>
  )
}

export default function SchemaPage() {
  const [activeTable, setActiveTable] = useState('')
  const [filter, setFilter] = useState('')

  const [schemaTables, setSchemaTables] = useState({})
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch schema structure
    fetch(`${API_BASE}/api/schema?infer=true`)
      .then(r => r.json())
      .then(schemaData => {
        setGraphData(schemaToGraph(schemaData));
        
        // Fetch AI dictionary data for row counts and enhanced info
        return fetch(`${API_BASE}/api/dictionary/quick`)
          .then(r => r.json())
          .then(dictData => {
            const tData = {};
            
            if (schemaData.tables) {
              schemaData.tables.forEach(t => {
                // Find matching table in dictionary data for row count
                const dictTable = dictData.tables?.find(dt => dt.name === t.name);
                
                tData[t.name] = {
                  rows: dictTable ? dictTable.row_count.toLocaleString() : 'N/A', 
                  cols: t.columns.length, 
                  pk: t.primary_key ? t.primary_key[0] : null,
                  fks: t.foreign_keys ? t.foreign_keys.map(fk => `${fk.column} → ${fk.references.table}`) : [],
                  summary: dictTable ? dictTable.business_purpose || dictTable.description : 'Loaded dynamically from Schema Intelligence Engine.',
                  columns: t.columns.map(c => {
                    const tags = [];
                    if (t.primary_key && t.primary_key.includes(c.name)) tags.push('PK');
                    if (t.foreign_keys && t.foreign_keys.some(f => f.column === c.name)) tags.push('FK');
                    
                    // Find matching column in dictionary data
                    const dictCol = dictTable?.columns?.find(dc => dc.name === c.name);
                    
                    return {
                      name: c.name, 
                      type: c.type, 
                      tags, 
                      nullPct: dictCol ? `${(dictCol.null_percentage || 0).toFixed(1)}%` : 'N/A', 
                      distinct: dictCol ? (dictCol.unique_count || 'N/A') : 'N/A', 
                      desc: dictCol ? (dictCol.description || dictCol.business_context || '') : ''
                    };
                  })
                };
              });
              setSchemaTables(tData);
              if (schemaData.tables.length > 0) setActiveTable(schemaData.tables[0].name);
            }
            setLoading(false);
          });
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [])

  if (loading) return <div style={{ color: '#e8e8f0', padding: 20 }}>Loading schema...</div>;
  if (Object.keys(schemaTables).length === 0) return <div style={{ color: '#e8e8f0', padding: 20 }}>No tables found.</div>;

  const t = schemaTables[activeTable] || Object.values(schemaTables)[0]
  if (!t) return null

  const filteredCols = t.columns.filter(c => !filter || c.name.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: '#e8e8f0', margin: 0 }}>Schema Explorer</h1>
        <p style={{ fontSize: 14, color: '#666680', marginTop: 6 }}>Browse all {Object.keys(schemaTables).length} tables · Live from active DB connection</p>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Left: table list */}
        <div style={{ width: 250, flexShrink: 0 }}>
          <Panel>
            <PanelHeader title={`Tables (${Object.keys(schemaTables).length})`} />
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '72vh', overflowY: 'auto' }}>
              {Object.entries(schemaTables).map(([name, info]) => (
                <button key={name} onClick={() => setActiveTable(name)} style={{
                  background: activeTable === name ? 'rgba(192,57,43,0.08)' : '#16161f',
                  border: `1px solid ${activeTable === name ? '#c0392b' : '#1e1e2e'}`,
                  borderLeft: `3px solid ${activeTable === name ? '#c0392b' : 'transparent'}`,
                  borderRadius: 10, padding: '13px 14px', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s', width: '100%',
                }}
                  onMouseEnter={e => { if (activeTable !== name) { e.currentTarget.style.borderLeftColor = 'rgba(192,57,43,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' } }}
                  onMouseLeave={e => { if (activeTable !== name) { e.currentTarget.style.borderLeftColor = 'transparent'; e.currentTarget.style.background = '#16161f' } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, fontWeight: 700, color: '#f0828a' }}>{name}</span>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680' }}>{info.cols}c</span>
                  </div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#444458', marginBottom: 8 }}>{info.rows} rows</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {info.pk && <Tag variant="pk">PK</Tag>}
                    {info.fks.slice(0, 2).map((_, i) => <Tag key={i} variant="fk">FK</Tag>)}
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right: detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Info boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Columns', value: t.cols },
              { label: 'Rows', value: t.rows },
              { label: 'FK Links', value: t.fks.length },
              { label: 'Primary Key', value: t.pk || '—', small: true },
            ].map(b => (
              <div key={b.label} style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 12, padding: '16px' }}>
                <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, color: '#666680', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{b.label}</div>
                <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, color: '#e8e8f0', fontSize: b.small ? 14 : 22 }}>{b.value}</div>
              </div>
            ))}
          </div>

          {/* Columns */}
          <Panel style={{ marginBottom: 14 }}>
            <PanelHeader title={`${activeTable} — Columns`} subtitle={`${t.cols} columns`}>
              <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter columns…"
                style={{ background: '#16161f', border: '1px solid #1e1e2e', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#e8e8f0', outline: 'none', fontFamily: "'Space Mono',monospace", width: 160, transition: 'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor = '#c0392b'} onBlur={e => e.target.style.borderColor = '#1e1e2e'}
              />
              <Button variant="ghost">⬇ DDL</Button>
            </PanelHeader>
            <PanelBody>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {filteredCols.map(col => <ColCard key={col.name} col={col} />)}
              </div>
            </PanelBody>
          </Panel>

          {/* ER Diagram */}
          <Panel style={{ marginBottom: 14 }}>
            <PanelHeader title="Entity Relationship Diagram" />
            <div style={{ height: 500, background: '#0f0f17', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
              <ERDiagram nodes={graphData.nodes} links={graphData.links} />
            </div>
          </Panel>

          {/* AI summary */}
          <Panel>
            <PanelHeader title="🧠 AI Business Summary"><Tag variant="done">AI Generated</Tag></PanelHeader>
            <PanelBody>
              <p style={{ fontSize: 14, color: '#b0b0c8', lineHeight: 1.8 }}>{t.summary}</p>
              {t.fks.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                  {t.fks.map((fk, i) => <Tag key={i} variant="fk">🔗 {fk}</Tag>)}
                </div>
              )}
            </PanelBody>
          </Panel>
        </div>
      </div>
    </div>
  )
}