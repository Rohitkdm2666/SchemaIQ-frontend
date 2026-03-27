import { useEffect, useRef, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { ZoomIn, ZoomOut, Maximize, GitMerge, Search } from 'lucide-react'

const NODE_W = 200
const HEADER_H = 34
const ROW_H = 20
const MAX_COLLAPSED_ROWS = 4

function getNodeH(d, expandedMap = {}) {
  const isExpanded = expandedMap[d.id]
  const count = isExpanded ? d.fields.length : Math.min(d.fields.length, MAX_COLLAPSED_ROWS)
  let baseHeight = HEADER_H + 14 + count * ROW_H
  if (!isExpanded && d.fields.length > MAX_COLLAPSED_ROWS) {
    baseHeight += 22 // Space for "+ X more"
  }
  return baseHeight
}

export default function ERDiagram({ nodes = [], links = [], onNodeClick, svgRef: externalRef }) {
  const internalRef = useRef(null)
  const svgRef = externalRef || internalRef
  const wrapRef = useRef(null)

  const simRef = useRef(null)
  const elementsRef = useRef({})
  const zoomBehaviorRef = useRef(null)

  const [selected, setSelected] = useState(null)
  const [hoverTitle, setHoverTitle] = useState(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState({})
  const [layoutMode, setLayoutMode] = useState('force') // force | dag
  const [minimapPos, setMinimapPos] = useState({ x: 0, y: 0, w: 0, h: 0 })

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  // INITIAL SETUP — runs only when distinct structural nodes/links arrive
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || nodes.length === 0) return

    const W = wrap.clientWidth
    const H = wrap.clientHeight

    const d3nodes = nodes.map(n => ({ ...n }))
    const d3links = links.map(l => ({ ...l }))

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')

    svg.selectAll('*').remove()

    // ── Definitions ──
    const defs = svg.append('defs')

    defs.append('pattern').attr('id', 'bg-grid')
      .attr('width', 30).attr('height', 30)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('circle').attr('cx', 15).attr('cy', 15).attr('r', 1)
      .attr('fill', 'rgba(255,255,255,0.06)')

    const markerColors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#9b59b6', '#e74c3c', '#8e44ad', '#d35400']
    const colorGet = d => {
      const srcId = typeof d.source === 'object' ? d.source.id : d.source
      return markerColors[Math.abs(String(srcId).charCodeAt(0) * 10) % markerColors.length]
    }

    d3links.forEach((l, i) => {
      defs.append('marker').attr('id', `arrow-${l.id}`)
        .attr('viewBox', '0 -5 10 10').attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 7).attr('markerHeight', 7).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-5L10,0L0,5').attr('fill', colorGet(l)).attr('opacity', 0.8)
    })

    const dropShadow = defs.append('filter').attr('id', 'shadow').attr('height', '130%')
    dropShadow.append('feDropShadow').attr('dx', 2).attr('dy', 8).attr('stdDeviation', 5).attr('flood-color', '#000').attr('flood-opacity', 0.6)

    const glow = defs.append('filter').attr('id', 'glow')
    glow.append('feGaussianBlur').attr('stdDeviation', 3).attr('result', 'coloredBlur')
    const femerge = glow.append('feMerge')
    femerge.append('feMergeNode').attr('in', 'coloredBlur')
    femerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // ── Grid & Zoom Layer ──
    svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#bg-grid)')
    const g = svg.append('g').attr('class', 'main-canvas')

    const zoom = d3.zoom()
      .scaleExtent([0.15, 3])
      .on('zoom', e => {
        g.attr('transform', e.transform)
        // Update minimap viewpoint math
        const vpW = W / e.transform.k
        const vpH = H / e.transform.k
        const vpX = -e.transform.x / e.transform.k
        const vpY = -e.transform.y / e.transform.k
        setMinimapPos({ x: vpX, y: vpY, w: vpW, h: vpH })
      })

    svg.call(zoom).on('dblclick.zoom', null)
    zoomBehaviorRef.current = { zoom, svg, g, W, H }

    // Initial Zoom
    svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2 - NODE_W / 2, Math.max(H / 4, 50)).scale(0.8))

    // ── Simulation ──
    const sim = d3.forceSimulation(d3nodes)
      .force('link', d3.forceLink(d3links).id(d => d.id).distance(320).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-1200).distanceMax(1200))
      .force('x', d3.forceX(W / 2).strength(0.05))
      .force('y', d3.forceY(H / 2).strength(0.05))
      // Custom rect collision mapping logic
      .force('collide', d3.forceCollide().radius(d => Math.max(NODE_W, getNodeH(d, expanded)) / 1.5 + 40).strength(1))
      .alphaDecay(0.04).velocityDecay(0.6)

    simRef.current = sim

    // ── Edges ──
    const linkGroup = g.append('g').attr('class', 'edges')
    const linkLine = linkGroup.selectAll('path.link').data(d3links).enter()
      .append('path').attr('class', 'link')
      .attr('fill', 'none').attr('stroke', d => colorGet(d))
      .attr('stroke-width', 2).attr('stroke-opacity', 0.6)
      .attr('stroke-dasharray', '8,4')
      .attr('marker-end', d => `url(#arrow-${d.id})`)
      // Interaction tooltip attached to edge
      .on('mouseenter', (e, d) => {
        d3.select(e.target).attr('stroke-width', 4).attr('stroke-opacity', 1).style('filter', 'url(#glow)')
        setHoverTitle(`FK: ${d.source} → ${d.target} via ${d.via} (${d.card})`)
      })
      .on('mouseleave', (e) => {
        d3.select(e.target).attr('stroke-width', 2).attr('stroke-opacity', 0.6).style('filter', 'none')
        setHoverTitle(null)
      })

    // Edge Labels (N:1 etc)
    const linkLabel = linkGroup.selectAll('g.linklabel').data(d3links).enter().append('g')
    linkLabel.append('rect').attr('rx', 4).attr('ry', 4).attr('fill', '#0f0f17')
      .attr('stroke', '#252540').attr('width', 52).attr('height', 20).attr('x', -26).attr('y', -10)
    linkLabel.append('text').attr('text-anchor', 'middle').attr('dy', 3).attr('font-family', 'Space Mono, monospace')
      .attr('font-size', 9).attr('fill', '#b0b0c8').attr('font-weight', 700).text(d => d.card)

    // ── Nodes ──
    const nodeGroup = g.append('g').attr('class', 'nodes')
    const nodeEl = nodeGroup.selectAll('g.node').data(d3nodes).enter()
      .append('g').attr('class', 'node').attr('id', d => `node-${d.id}`)
      .attr('cursor', 'grab').style('transition', 'opacity 0.3s ease')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.1).restart(); d.fx = d.x; d.fy = d.y; if (e.sourceEvent?.target?.closest) d3.select(e.sourceEvent.target.closest('.node')).attr('cursor', 'grabbing') })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = e.x; d.fy = e.y; if (e.sourceEvent?.target?.closest) d3.select(e.sourceEvent.target.closest('.node')).attr('cursor', 'grab') })
      )
      .on('click', (e, d) => {
        // Prevent click if hitting the expand toggle
        if (e.target.closest('.expander')) return
        setSelected(prev => prev === d.id ? null : d.id)
        if (onNodeClick) onNodeClick(d)
      })

    // Drop shadow
    nodeEl.append('rect').attr('class', 'shadow-rect')
      .attr('width', NODE_W).attr('rx', 12).attr('ry', 12)
      .attr('fill', '#111118').style('filter', 'url(#shadow)')
      .attr('stroke', d => d.color).attr('stroke-width', 2)

    // Header BG
    nodeEl.append('path').attr('class', 'header-bg')
      .attr('d', `M0,12 a12,12 0 0 1 12,-12 h${NODE_W - 24} a12,12 0 0 1 12,12 v${HEADER_H - 12} h-${NODE_W} Z`)
      .attr('fill', d => d.color).attr('opacity', 0.15)
    nodeEl.append('rect').attr('width', NODE_W).attr('height', 3)
      .attr('rx', 2).attr('fill', d => d.color)

    // Title
    nodeEl.append('text').attr('x', 14).attr('y', HEADER_H - 12)
      .attr('font-family', 'Space Mono, monospace').attr('font-size', 13).attr('font-weight', 700)
      .attr('fill', '#e8e8f0').text(d => d.label)

    // Rows text indicator
    nodeEl.append('text').attr('x', NODE_W - 32).attr('y', HEADER_H - 12)
      .attr('font-family', 'Space Mono, monospace').attr('font-size', 10).attr('fill', '#666680').attr('text-anchor', 'end')
      .text(d => d.rows !== 'N/A' ? `${d.rows}r` : '')

    // Expand toggle icon
    const expander = nodeEl.append('g').attr('class', 'expander')
      .attr('transform', `translate(${NODE_W - 24}, 8)`).attr('cursor', 'pointer')
      .on('click', (e, d) => toggleExpand(d.id))
    expander.append('rect').attr('width', 20).attr('height', 20).attr('rx', 4).attr('fill', 'transparent')
    expander.append('text').attr('class', 'exp-icon').attr('x', 10).attr('y', 14).attr('text-anchor', 'middle')
      .attr('fill', '#b0b0c8').attr('font-size', 12).text('+')

    // Columns Group
    nodeEl.append('g').attr('class', 'cols-group')

    // Tick layout algorithm with smart Orthogonal Paths
    function computeManhattan(src, tgt) {
      // Find intersection points on rectangular bounding boxes
      const srcH = getNodeH(src, expanded)
      const tgtH = getNodeH(tgt, expanded)

      const scx = src.x + NODE_W / 2; const scy = src.y + srcH / 2
      const tcx = tgt.x + NODE_W / 2; const tcy = tgt.y + tgtH / 2
      const dx = tcx - scx, dy = tcy - scy

      // Exit sides based on major direction
      const horizontal = Math.abs(dx) > Math.abs(dy)

      let p1 = { x: scx, y: scy }, p2 = { x: tcx, y: tcy }

      if (horizontal) {
        p1.x = dx > 0 ? src.x + NODE_W : src.x
        p2.x = dx > 0 ? tgt.x : tgt.x + NODE_W
      } else {
        p1.y = dy > 0 ? src.y + srcH : src.y
        p2.y = dy > 0 ? tgt.y : tgt.y + tgtH
      }

      // Three segment orthogonal route
      const mx = (p1.x + p2.x) / 2
      const my = (p1.y + p2.y) / 2

      let d = `M${p1.x},${p1.y}`
      if (horizontal) {
        d += ` L${mx},${p1.y} L${mx},${p2.y} L${p2.x},${p2.y}`
      } else {
        d += ` L${p1.x},${my} L${p2.x},${my} L${p2.x},${p2.y}`
      }
      return { path: d, mid: { x: mx, y: my } }
    }

    sim.on('tick', () => {
      // Confine inside massive bounding box so they don't fly forever
      d3nodes.forEach(d => {
        d.x = Math.max(-5000, Math.min(5000, d.x))
        d.y = Math.max(-5000, Math.min(5000, d.y))
      })

      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)

      linkLine.attr('d', d => computeManhattan(d.source, d.target).path)
      linkLabel.attr('transform', d => {
        const c = computeManhattan(d.source, d.target).mid
        return `translate(${c.x},${c.y})`
      })
    })

    sim.on('end', () => d3nodes.forEach(d => { d.fx = d.x; d.fy = d.y })) // Freeze when cooled

    // Store refs to safely mutate later without rebuilding simulation
    elementsRef.current = { nodeEl, linkLine, linkLabel, d3nodes, d3links, sim }

    return () => {
      sim.stop()
      svg.selectAll('*').remove()
    }
  }, [nodes, links]) // ONLY re-run when actual strictly new data structurally array changes

  // ── UPDATE CYCLE (Expansions & Highlights) ──
  useEffect(() => {
    if (!elementsRef.current.nodeEl) return
    const { nodeEl, linkLine, linkLabel, sim } = elementsRef.current

    // Update heights
    nodeEl.selectAll('.shadow-rect').transition().duration(250).attr('height', d => getNodeH(d, expanded))

    // Update expander icons
    nodeEl.selectAll('.exp-icon').text(d => expanded[d.id] ? '−' : '+')

    // Render inner fields dynamically
    nodeEl.each(function (d) {
      const gCols = d3.select(this).select('.cols-group')
      const isExp = expanded[d.id]
      const toShow = isExp ? d.fields : d.fields.slice(0, MAX_COLLAPSED_ROWS)

      // Data join rows
      const rows = gCols.selectAll('g.field-row').data(toShow, t => t)

      const rEnter = rows.enter().append('g').attr('class', 'field-row')
        .attr('transform', (t, i) => `translate(14, ${HEADER_H + 16 + i * ROW_H})`)
        .style('opacity', 0)

      rEnter.append('text').attr('font-family', 'Space Mono, monospace').attr('font-size', 11)
        .attr('fill', t => t.includes('(PK)') ? '#27ae60' : t.includes('(FK)') ? '#3498db' : '#a0a0b8')
        .text(t => (t.includes('(PK)') ? '🔑 ' : t.includes('(FK)') ? '🔗 ' : '   ') + t.replace(/ \(PK\)|\(FK\)/g, '').slice(0, 21))

      rEnter.merge(rows).transition().duration(250)
        .attr('transform', (t, i) => `translate(14, ${HEADER_H + 16 + i * ROW_H})`)
        .style('opacity', 1)

      rows.exit().transition().duration(150).style('opacity', 0).remove()

      // Render "+ X more" text
      const moreStr = !isExp && d.fields.length > MAX_COLLAPSED_ROWS ? `+ ${d.fields.length - MAX_COLLAPSED_ROWS} more` : ''
      let moreText = gCols.selectAll('text.more-txt').data(moreStr ? [moreStr] : [])

      moreText.enter().append('text').attr('class', 'more-txt')
        .attr('x', 14).attr('font-family', 'Space Mono, monospace').attr('font-size', 9).attr('fill', '#666680').style('opacity', 0)
        .merge(moreText).transition().duration(250)
        .attr('y', HEADER_H + 20 + MAX_COLLAPSED_ROWS * ROW_H).text(t => t).style('opacity', 1)

      moreText.exit().remove()
    })

    // Tickler: kick simulation gently because boxes changed size
    sim.force('collide').radius(d => Math.max(NODE_W, getNodeH(d, expanded)) / 1.5 + 20)
    sim.alphaTarget(0.02).restart()
    setTimeout(() => sim.alphaTarget(0), 400) // cool down

  }, [expanded, nodes])

  // ── UPDATE CYCLE (Search & Focus Highlights) ──
  useEffect(() => {
    if (!elementsRef.current.nodeEl) return
    const { nodeEl, linkLine, linkLabel, d3links } = elementsRef.current

    // Build connected lookup for focus mode
    const connected = new Set()
    if (selected) {
      connected.add(selected)
      d3links.forEach(l => {
        if (l.source.id === selected || l.source === selected) connected.add(l.target.id || l.target)
        if (l.target.id === selected || l.target === selected) connected.add(l.source.id || l.source)
      })
    }

    const s = search.toLowerCase()

    nodeEl.style('opacity', d => {
      if (s && !d.label.toLowerCase().includes(s)) return 0.2
      if (selected && !connected.has(d.id)) return 0.2
      return 1
    })

    // Highlight selected node stroke
    nodeEl.selectAll('.shadow-rect').transition().duration(200)
      .attr('stroke', d => selected === d.id ? '#ffffff' : d.color)
      .attr('stroke-width', d => selected === d.id ? 3 : 2)

    linkLine.style('opacity', d => {
      if (selected) {
        return (d.source.id === selected || d.target.id === selected) ? 1 : 0.1
      }
      return 0.6
    })

    linkLabel.style('opacity', d => {
      if (selected) return (d.source.id === selected || d.target.id === selected) ? 1 : 0.1
      return 1
    })

  }, [selected, search, nodes])

  // ── LAYOUT TOGGLE: Force vs Hierarchical DAG ──
  useEffect(() => {
    if (!elementsRef.current.sim) return
    const { sim, d3nodes, d3links } = elementsRef.current

    if (layoutMode === 'dag') {
      // Compute simple topographical layers for DAG left to right
      const levels = {}
      d3nodes.forEach(n => levels[n.id] = 0)
      for (let i = 0; i < 3; i++) { // simplistic max depth scan
        d3links.forEach(l => {
          const src = l.source.id || l.source
          const tgt = l.target.id || l.target
          if (levels[src] >= levels[tgt]) levels[tgt] = levels[src] + 1
        })
      }
      sim.force('x', d3.forceX(d => (levels[d.id] || 0) * 400).strength(0.3))
      sim.force('y', d3.forceY(0).strength(0.05))
    } else {
      sim.force('x', d3.forceX(0).strength(0.05))
      sim.force('y', d3.forceY(0).strength(0.05))
    }

    // Unfreeze all and reheat
    d3nodes.forEach(d => { d.fx = null; d.fy = null })
    sim.alpha(0.6).restart()

  }, [layoutMode])


  // Utility actions for overlay controls
  const handleZoomIn = () => zoomBehaviorRef.current?.svg.transition().call(zoomBehaviorRef.current.zoom.scaleBy, 1.3)
  const handleZoomOut = () => zoomBehaviorRef.current?.svg.transition().call(zoomBehaviorRef.current.zoom.scaleBy, 0.7)
  const handleReset = () => {
    const { zoom, svg, W, H } = zoomBehaviorRef.current || {}
    if (svg) svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - NODE_W / 2, H / 4).scale(0.8))
  }

  // Define SVG string for minimap background
  // Just use simple rects based on current d3nodes bound tracking
  const [minimapNodes, setMinimapNodes] = useState([])
  useEffect(() => {
    const t = setInterval(() => {
      if (elementsRef.current.d3nodes) {
        setMinimapNodes([...elementsRef.current.d3nodes])
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])
  // Compute bounds for minimap scale
  const mmB = useMemo(() => {
    if (!minimapNodes.length) return { scale: 1, minX: 0, minY: 0 }
    const padding = 400
    const xs = minimapNodes.map(n => n.x); const ys = minimapNodes.map(n => n.y)
    const minX = Math.min(...xs) - padding; const maxX = Math.max(...xs) + padding
    const minY = Math.min(...ys) - padding; const maxY = Math.max(...ys) + padding
    const w = maxX - minX; const h = maxY - minY
    // 200 is minimap container dimension
    const scale = Math.min(200 / w, 150 / h) || 1
    return { scale, minX, minY, w, h }
  }, [minimapNodes])

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#0f0f17', overflow: 'hidden' }} onClick={() => setSelected(null)}>
      {/* Search Bar Overlay */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', alignItems: 'center', background: '#16161f', borderRadius: 10, border: '1px solid #252540', padding: '6px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
        <Search size={16} color="#666680" />
        <input
          placeholder="Search tables..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e8e8f0', marginLeft: 10, fontSize: 13, width: 180, fontFamily: "'Space Mono',monospace" }}
        />
      </div>

      {/* Main SVG Container */}
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Edge Hover Tooltip */}
      {hoverTitle && (
        <div style={{ position: 'absolute', left: '50%', bottom: 30, transform: 'translateX(-50%)', background: 'rgba(192,57,43,0.95)', border: '1px solid #e74c3c', color: '#fff', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono',monospace", pointerEvents: 'none', boxShadow: '0 4px 16px rgba(192,57,43,0.4)', zIndex: 20 }}>
          {hoverTitle}
        </div>
      )}

      {/* Controls Toolbar Sidebar */}
      <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }} onClick={e => e.stopPropagation()}>
        <div style={{ background: '#16161f', border: '1px solid #252540', borderRadius: 12, padding: 6, display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 8px 16px rgba(0,0,0,0.5)' }}>
          <button onClick={handleZoomIn} title="Zoom In" style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#e8e8f0', borderRadius: 8 }} onMouseOver={e => e.currentTarget.style.background = '#252540'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}><ZoomIn size={18} style={{ margin: '0 auto' }} /></button>
          <button onClick={handleReset} title="Fit to Screen" style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#e8e8f0', borderRadius: 8 }} onMouseOver={e => e.currentTarget.style.background = '#252540'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}><Maximize size={18} style={{ margin: '0 auto' }} /></button>
          <button onClick={handleZoomOut} title="Zoom Out" style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#e8e8f0', borderRadius: 8 }} onMouseOver={e => e.currentTarget.style.background = '#252540'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}><ZoomOut size={18} style={{ margin: '0 auto' }} /></button>
        </div>

        <div style={{ background: '#16161f', border: '1px solid #252540', borderRadius: 12, padding: 6, boxShadow: '0 8px 16px rgba(0,0,0,0.5)' }}>
          <button onClick={() => setLayoutMode(p => p === 'force' ? 'dag' : 'force')} title={`Switch to ${layoutMode === 'force' ? 'DAG' : 'Force'} Layout`} style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: layoutMode === 'dag' ? '#27ae60' : '#e8e8f0', borderRadius: 8 }} onMouseOver={e => e.currentTarget.style.background = '#252540'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}><GitMerge size={18} style={{ margin: '0 auto' }} /></button>
        </div>
      </div>

      {/* Minimap Overlay */}
      {minimapNodes.length > 0 && (
        <div style={{ position: 'absolute', bottom: 20, right: 80, width: 200, height: 150, background: 'rgba(15,15,23,0.85)', border: '1px solid #252540', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.8)', cursor: 'crosshair' }} onClick={e => e.stopPropagation()}>
          <svg width="200" height="150" style={{ position: 'absolute', inset: 0 }}>
            <g transform={`scale(${mmB.scale}) translate(${-mmB.minX}, ${-mmB.minY})`}>
              {minimapNodes.map(n => <rect key={n.id} x={n.x} y={n.y} width={NODE_W} height={getNodeH(n, expanded)} fill={n.color} rx={16} opacity={0.6} />)}
              {/* the viewfinder */}
              <rect x={minimapPos.x} y={minimapPos.y} width={minimapPos.w} height={minimapPos.h} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.8)" strokeWidth={3 / mmB.scale} rx={10 / mmB.scale} />
            </g>
          </svg>
        </div>
      )}
    </div>
  )
}