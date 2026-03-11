import React, { useEffect, useRef, useCallback } from 'react'
import * as d3Force from 'd3-force'
import * as d3Selection from 'd3-selection'
import * as d3Zoom from 'd3-zoom'
import { drag as d3Drag } from 'd3-drag'

interface GraphNode extends d3Force.SimulationNodeDatum {
  id: string
  name: string
  isActive: boolean
  isConnected: boolean
}

interface GraphLink extends d3Force.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
}

interface GraphViewProps {
  activeFile: string | null
  onNavigate: (filePath: string) => void
}

export const GraphView: React.FC<GraphViewProps> = ({ activeFile, onNavigate }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3Force.Simulation<GraphNode, GraphLink> | null>(null)

  const buildGraph = useCallback(async () => {
    if (!svgRef.current) return

    const allLinks = await window.api.getAllLinks()
    const noteNames = await window.api.getAllNoteNames()

    // Build node set
    const nodeMap = new Map<string, GraphNode>()

    // Get all note paths for node creation
    const allNotePaths = await window.api.listAllNotes(await window.api.getSavedVault() || '')

    for (const notePath of allNotePaths) {
      const name = notePath.split(/[/\\]/).pop()?.replace('.md', '') || notePath
      nodeMap.set(notePath, {
        id: notePath,
        name,
        isActive: notePath === activeFile,
        isConnected: false
      })
    }

    // Mark connected nodes
    const activeLinks = allLinks.filter(
      (l) => l.source === activeFile || l.target === activeFile
    )
    for (const link of activeLinks) {
      const n = nodeMap.get(link.source === activeFile ? link.target : link.source)
      if (n) n.isConnected = true
    }

    const nodes = Array.from(nodeMap.values())
    const links: GraphLink[] = allLinks
      .filter((l) => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map((l) => ({ source: l.source, target: l.target }))

    // Clear previous
    const svg = d3Selection.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = svgRef.current.clientWidth || 600
    const height = svgRef.current.clientHeight || 400

    const g = svg.append('g')

    // Zoom
    const zoom = d3Zoom.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })
    svg.call(zoom)

    // Simulation
    const simulation = d3Force.forceSimulation<GraphNode>(nodes)
      .force('link', d3Force.forceLink<GraphNode, GraphLink>(links).id((d) => d.id).distance(80))
      .force('charge', d3Force.forceManyBody().strength(-100))
      .force('center', d3Force.forceCenter(width / 2, height / 2))
      .force('collision', d3Force.forceCollide().radius(20))

    simulationRef.current = simulation

    // Links
    const linkElements = g
      .append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('class', (d) => {
        const s = typeof d.source === 'string' ? d.source : d.source.id
        const t = typeof d.target === 'string' ? d.target : d.target.id
        return `graph-link ${s === activeFile || t === activeFile ? 'active' : ''}`
      })

    // Nodes
    const nodeElements = g
      .append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', (d) => {
        let cls = 'graph-node'
        if (d.isActive) cls += ' active'
        else if (d.isConnected) cls += ' connected'
        return cls
      })
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        onNavigate(d.id)
      })

    nodeElements.append('circle').attr('r', (d) => (d.isActive ? 8 : 5))

    nodeElements
      .append('text')
      .text((d) => d.name)
      .attr('dy', -12)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', 'var(--fg-muted)')
      .style('pointer-events', 'none')

    // Drag
    nodeElements.call(
      d3Drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }) as any
    )

    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      nodeElements.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })
  }, [activeFile, onNavigate])

  useEffect(() => {
    buildGraph()
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
    }
  }, [buildGraph])

  return (
    <div className="graph-container">
      <svg ref={svgRef} />
    </div>
  )
}
