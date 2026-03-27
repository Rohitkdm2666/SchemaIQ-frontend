import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react'

// Peter Chen ER Diagram D3 Renderer
export default function ClassicERDiagram({ nodes = [], links = [], svgRef: externalRef }) {
  const internalRef = useRef(null)
  const svgRef = externalRef || internalRef
  const wrapRef = useRef(null)
  const simRef = useRef(null)
  const zoomBehaviorRef = useRef(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap || nodes.length === 0) return

    const W = wrap.clientWidth
    const H = wrap.clientHeight

    // 1. Transform basic nodes/links into Classic ER Nodes/Links
    const simNodes = []
    const simLinks = []

    nodes.forEach(n => {
      // Entity Node
      const entId = `ent_${n.id}`
      simNodes.push({ id: entId, type: 'entity', label: n.label || n.name, color: n.color })

      // Attribute Nodes
      if (n.columns) {
        n.columns.forEach(col => {
          const attrId = `attr_${n.id}_${col.name}`
          const isPK = n.primaryKey && n.primaryKey.includes(col.name)
          simNodes.push({ id: attrId, type: 'attribute', label: col.name, isPK, color: n.color })
          simLinks.push({ source: entId, target: attrId, edgeType: 'entity-attr' })
        })
      }
    })

    links.forEach(l => {
      // Relationship Node
      const relId = `rel_${l.id}`
      let relLabel = l.via || 'Has'
      if (relLabel === 'unknown') relLabel = 'Connects'
      simNodes.push({ id: relId, type: 'relationship', label: relLabel, color: '#f39c12' }) // typically relationships are shown differently, we'll use a neutral color or source color

      // Source to Rel and Target to Rel
      const sId = `ent_${typeof l.source === 'object' ? l.source.id : l.source}`
      const tId = `ent_${typeof l.target === 'object' ? l.target.id : l.target}`

      simLinks.push({ source: sId, target: relId, edgeType: 'entity-rel', card: l.card ? l.card.split(':')[0] : 'N' })
      simLinks.push({ source: relId, target: tId, edgeType: 'rel-entity', card: l.card ? l.card.split(':')[1] : '1' })
    })

    const svg = d3.select(svgRef.current)
      .attr('width', '100%')
      .attr('height', '100%')

    svg.selectAll('*').remove()

    // ── Definitions ──
    const defs = svg.append('defs')
    defs.append('pattern').attr('id', 'bg-grid-classic')
      .attr('width', 40).attr('height', 40)
      .attr('patternUnits', 'userSpaceOnUse')
      .append('path').attr('d', 'M 40 0 L 0 0 0 40').attr('fill', 'none').attr('stroke', 'rgba(255,255,255,0.03)')

    // ── Grid & Layer ──
    svg.append('rect').attr('width', '100%').attr('height', '100%').attr('fill', 'url(#bg-grid-classic)')
    const g = svg.append('g').attr('class', 'main-canvas')

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', e => g.attr('transform', e.transform))

    svg.call(zoom).on('dblclick.zoom', null)
    zoomBehaviorRef.current = { zoom, svg, g, W, H }
    svg.call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(0.6))

    // ── Simulation ──
    const sim = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simLinks).id(d => d.id).distance(d => d.edgeType === 'entity-attr' ? 100 : 250).strength(d => d.edgeType === 'entity-attr' ? 0.8 : 0.4))
      .force('charge', d3.forceManyBody().strength(d => d.type === 'attribute' ? -300 : -1500).distanceMax(1200))
      .force('collide', d3.forceCollide().radius(d => {
        if (d.type === 'entity') return 90
        if (d.type === 'relationship') return 70
        return 50 // attribute
      }).strength(1))
      .force('x', d3.forceX(0).strength(0.02))
      .force('y', d3.forceY(0).strength(0.02))
      .alphaDecay(0.02)

    simRef.current = sim

    // ── Edges ──
    const linkGroup = g.append('g').attr('class', 'edges')
    const linkEl = linkGroup.selectAll('.link').data(simLinks).enter().append('g').attr('class', 'link')
    
    const lines = linkEl.append('line')
      .attr('stroke', '#666680').attr('stroke-width', 2).attr('stroke-opacity', 0.6)

    // Edge labels for cardinality
    const cardLabels = linkEl.filter(d => d.card).append('text')
      .attr('font-family', 'Space Mono, monospace').attr('font-size', 12)
      .attr('fill', '#b0b0c8')
      .text(d => d.card)

    // ── Nodes ──
    const nodeGroup = g.append('g').attr('class', 'nodes')
    const nodeEl = nodeGroup.selectAll('g.node').data(simNodes).enter()
      .append('g').attr('class', 'node')
      .attr('cursor', 'grab')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.1).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )

    // Draw Entities
    const entities = nodeEl.filter(d => d.type === 'entity')
    entities.append('rect')
      .attr('x', -70).attr('y', -30).attr('width', 140).attr('height', 60).attr('rx', 4).attr('ry', 4)
      .attr('fill', '#111118').attr('stroke', d => d.color).attr('stroke-width', 2)
    
    entities.append('text')
      .attr('text-anchor', 'middle').attr('dy', 5)
      .attr('font-family', 'Space Mono, monospace').attr('font-size', 14).attr('font-weight', 700)
      .attr('fill', '#e8e8f0')
      .text(d => d.label)

    // Draw Attributes
    const attributes = nodeEl.filter(d => d.type === 'attribute')
    attributes.append('ellipse')
      .attr('rx', 50).attr('ry', 25)
      .attr('fill', '#111118').attr('stroke', d => d.color).attr('stroke-width', d => d.isPK ? 3 : 1)
      .attr('stroke-dasharray', d => d.isPK ? 'none' : '4,2')
    
    attributes.append('text')
      .attr('text-anchor', 'middle').attr('dy', 4)
      .attr('font-family', 'Space Mono, monospace').attr('font-size', 10)
      .attr('fill', '#b0b0c8').attr('text-decoration', d => d.isPK ? 'underline' : 'none')
      .text(d => d.label)

    // Draw Relationships
    const relationships = nodeEl.filter(d => d.type === 'relationship')
    relationships.append('polygon')
      .attr('points', "0,-40 60,0 0,40 -60,0")
      .attr('fill', '#111118').attr('stroke', d => d.color || '#f39c12').attr('stroke-width', 2)
    
    relationships.append('text')
      .attr('text-anchor', 'middle').attr('dy', 4)
      .attr('font-family', 'Space Mono, monospace').attr('font-size', 11).attr('font-weight', 700)
      .attr('fill', '#f39c12')
      .text(d => d.label)

    sim.on('tick', () => {
      lines.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
           .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      
      cardLabels.attr('x', d => (d.source.x * 0.7 + d.target.x * 0.3))
                .attr('y', d => (d.source.y * 0.7 + d.target.y * 0.3) - 5)

      nodeEl.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    return () => {
      sim.stop()
      svg.selectAll('*').remove()
    }
  }, [nodes, links])

  const handleZoomIn = () => zoomBehaviorRef.current?.svg.transition().call(zoomBehaviorRef.current.zoom.scaleBy, 1.3)
  const handleZoomOut = () => zoomBehaviorRef.current?.svg.transition().call(zoomBehaviorRef.current.zoom.scaleBy, 0.7)
  const handleReset = () => {
    const { zoom, svg, W, H } = zoomBehaviorRef.current || {}
    if (svg) svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(0.6))
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', background: '#0f0f17', overflow: 'hidden' }}>
      <svg ref={svgRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: '50%', right: 20, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ background: '#16161f', border: '1px solid #252540', borderRadius: 12, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={handleZoomIn} style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#e8e8f0' }}><ZoomIn size={18} style={{ margin: '0 auto' }} /></button>
          <button onClick={handleReset} style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#e8e8f0' }}><Maximize size={18} style={{ margin: '0 auto' }} /></button>
          <button onClick={handleZoomOut} style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer', color: '#e8e8f0' }}><ZoomOut size={18} style={{ margin: '0 auto' }} /></button>
        </div>
      </div>
      {/* Legend Map for Classic ER */}
      <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(15,15,23,0.85)', border: '1px solid #252540', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 20, alignItems: 'center', pointerEvents: 'none' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 12, border: '1px solid #888', borderRadius: 2 }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#b0b0c8' }}>Entity</span>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 14, border: '1px solid #f39c12', transform: 'rotate(45deg)' }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#b0b0c8' }}>Relationship</span>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 10, border: '1px dashed #888', borderRadius: '50%' }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#b0b0c8' }}>Attribute</span>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 16, height: 10, border: '1px solid #888', borderRadius: '50%' }} />
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, color: '#b0b0c8' }}><u>PK</u></span>
         </div>
      </div>
    </div>
  )
}
