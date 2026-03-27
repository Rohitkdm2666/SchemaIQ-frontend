import { useEffect, useState, useRef } from 'react'
import { Panel, PanelHeader, PanelBody, Button, Tag, Spinner } from '../components/ui.jsx'
import { API_BASE } from '../config.js'

const EMPTY_INSIGHTS = {
  overview_text: '',
  table_relationships_text: '',
  niche_columns: [],
  alternate_methods: [],
}

const IconBulb = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 9 4c-3.1 0-5.5 2.5-5.5 5.5 0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
    <path d="M9 18h6" /><path d="M10 22h4" />
  </svg>
)

const IconActivity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)

const IconDatabase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
)

const IconLayers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
  </svg>
)

export default function InsightsPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState(EMPTY_INSIGHTS)
  const [error, setError] = useState('')
  const hasLoaded = useRef(false)

  const loadInsights = async (force = false) => {
    const isForce = force === true
    if (loading && !isForce && insights.overview_text) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/insights?refresh=${isForce}`)
      const data = await res.json()
      setInsights({ ...EMPTY_INSIGHTS, ...data })
    } catch (err) {
      setError(err.message || 'Failed to sync insights')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasLoaded.current) {
      loadInsights()
      hasLoaded.current = true
    }
  }, [])

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Header Section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        marginBottom: 32,
        background: 'linear-gradient(90deg, #111118 0%, rgba(17,17,24,0) 100%)',
        padding: '24px 0',
        borderBottom: '1px solid rgba(30,30,46,0.5)'
      }}>
        <div>
          <h1 style={{ 
            fontFamily: "'Space Mono', monospace", 
            fontSize: 26, 
            fontWeight: 700, 
            color: '#e8e8f0', 
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            Architectural Insights
          </h1>
          <p style={{ fontSize: 13, color: '#666680', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#c0392b' }}>●</span> Standard deep-schema analysis for table semantics and relational integrity.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" onClick={() => loadInsights(true)} disabled={loading}>
            {loading ? <Spinner size={14} /> : '⟳ Sync Data'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ 
          height: '400px', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 16,
          color: '#666680',
          fontFamily: "'Space Mono', monospace",
          fontSize: 12
        }}>
          <Spinner size={32} />
          <span>Synchronizing with schema metadata...</span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          
          {/* Overview Section */}
          <Panel style={{ gridColumn: 'span 2', background: 'rgba(17,17,24,0.6)', backdropFilter: 'blur(10px)' }}>
            <PanelHeader title="Schema Narrative">
              <IconBulb />
            </PanelHeader>
            <PanelBody>
              <div style={{ 
                fontSize: 14, 
                color: '#b0b0c8', 
                lineHeight: 1.8, 
                whiteSpace: 'pre-wrap',
                maxWidth: '90%'
              }}>
                {insights.overview_text || 'No architectural overview available for this schema.'}
              </div>
            </PanelBody>
          </Panel>

          {/* Relationships Section */}
          <Panel style={{ background: 'rgba(17,17,24,0.6)', backdropFilter: 'blur(10px)' }}>
            <PanelHeader title="Data Flow & Cardinality">
              <IconActivity />
            </PanelHeader>
            <PanelBody>
              <div style={{ 
                fontSize: 13, 
                color: '#b0b0c8', 
                lineHeight: 1.7, 
                whiteSpace: 'pre-wrap'
              }}>
                {insights.table_relationships_text || 'Relational mapping currently unavailable.'}
              </div>
            </PanelBody>
          </Panel>

          {/* Alternate Methods Section */}
          <Panel style={{ background: 'rgba(17,17,24,0.6)', backdropFilter: 'blur(10px)' }}>
            <PanelHeader title="Scalability Optimization">
              <IconLayers />
            </PanelHeader>
            <PanelBody>
              {insights.alternate_methods?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {insights.alternate_methods.map((method, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ 
                        fontFamily: "'Space Mono', monospace", 
                        fontSize: 10, 
                        color: '#c0392b', 
                        padding: '2px 6px', 
                        background: 'rgba(192,57,43,0.1)', 
                        borderRadius: 4,
                        marginTop: 2
                      }}>
                        0{idx + 1}
                      </div>
                      <div style={{ fontSize: 13, color: '#b0b0c8', lineHeight: 1.5 }}>
                        {method}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#666680', fontSize: 12 }}>No optimization vectors identified.</div>
              )}
            </PanelBody>
          </Panel>

          {/* Niche Columns Section */}
          <Panel style={{ gridColumn: 'span 2', background: 'rgba(17,17,24,0.6)', backdropFilter: 'blur(10px)' }}>
            <PanelHeader title="High-Entropy Signal Detection">
              <IconDatabase />
            </PanelHeader>
            <PanelBody>
              {insights.niche_columns?.length > 0 ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
                  gap: 16 
                }}>
                  {insights.niche_columns.map((item, idx) => (
                    <div key={idx} style={{ 
                      background: '#16161f', 
                      border: '1px solid #1e1e2e', 
                      borderRadius: 12, 
                      padding: '16px',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#c0392b'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
                    >
                      <div style={{ 
                        fontFamily: "'Space Mono', monospace", 
                        fontSize: 11, 
                        color: '#f0828a', 
                        background: 'rgba(240,130,138,0.05)',
                        padding: '4px 8px',
                        borderRadius: 6,
                        display: 'inline-block',
                        marginBottom: 12
                      }}>
                        {item.table}.{item.column}
                      </div>
                      <div style={{ fontSize: 12, color: '#666680', lineHeight: 1.6 }}>
                        <strong style={{ color: '#b0b0c8', fontWeight: 600 }}>Architecture Value:</strong> {item.why_niche}
                      </div>
                      <div style={{ fontSize: 12, color: '#666680', lineHeight: 1.6, marginTop: 8 }}>
                        <strong style={{ color: '#b0b0c8', fontWeight: 600 }}>Analysis Target:</strong> {item.use_case}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#666680', fontSize: 12, padding: '20px 0' }}>No high-entropy columns flagged in the primary scan.</div>
              )}
            </PanelBody>
          </Panel>

          {error && (
            <div style={{ gridColumn: 'span 2', color: '#e74c3c', fontFamily: 'Space Mono', fontSize: 12, padding: 12, background: 'rgba(192,57,43,0.05)', borderRadius: 8, border: '1px solid rgba(192,57,43,0.2)' }}>
              Diagnostic Error: {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

