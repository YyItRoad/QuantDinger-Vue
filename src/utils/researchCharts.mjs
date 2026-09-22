const SUPPORTED_TYPES = new Set(['line', 'bar', 'area', 'pie', 'scatter', 'graph'])
const MAX_SERIES = 8
const MAX_POINTS = 240

const asText = value => String(value == null ? '' : value).trim()

const finiteNumber = value => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const cleanValues = values => (Array.isArray(values) ? values : [])
  .slice(0, MAX_POINTS)
  .map(value => {
    if (Array.isArray(value)) {
      const pair = value.slice(0, 2).map(finiteNumber)
      return pair.every(item => item !== null) ? pair : null
    }
    return finiteNumber(value)
  })
  .filter(value => value !== null)

const quotedText = value => asText(value).replace(/^['"]|['"]$/g, '')

export function normalizeResearchChartSpec (input, labels = {}) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const type = SUPPORTED_TYPES.has(asText(raw.type).toLowerCase()) ? asText(raw.type).toLowerCase() : ''
  if (!type) return null

  const fallbackSeries = asText(labels.series)
  const categories = (raw.categories || raw.labels || raw.xAxis || raw.x || [])
  const normalizedCategories = (Array.isArray(categories) ? categories : [])
    .slice(0, MAX_POINTS)
    .map(asText)

  if (type === 'graph') {
    const nodes = (Array.isArray(raw.nodes) ? raw.nodes : []).slice(0, 80).map(item => ({
      id: asText(item && item.id),
      name: asText(item && (item.name || item.label || item.id))
    })).filter(item => item.id && item.name)
    const nodeIds = new Set(nodes.map(item => item.id))
    const links = (Array.isArray(raw.links) ? raw.links : []).slice(0, 120).map(item => ({
      source: asText(item && item.source),
      target: asText(item && item.target),
      label: asText(item && (item.label || item.name))
    })).filter(item => nodeIds.has(item.source) && nodeIds.has(item.target))
    if (!nodes.length || !links.length) return null
    return {
      type,
      title: asText(raw.title),
      subtitle: asText(raw.subtitle),
      nodes,
      links
    }
  }

  if (type === 'pie') {
    const source = Array.isArray(raw.data)
      ? raw.data
      : (Array.isArray(raw.series) && raw.series[0] ? raw.series[0].data : [])
    const data = (Array.isArray(source) ? source : []).slice(0, MAX_POINTS).map((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const value = finiteNumber(item.value)
        return value === null ? null : { name: asText(item.name) || normalizedCategories[index] || String(index + 1), value }
      }
      const value = finiteNumber(item)
      return value === null ? null : { name: normalizedCategories[index] || String(index + 1), value }
    }).filter(Boolean)
    if (!data.length) return null
    return {
      type,
      title: asText(raw.title),
      subtitle: asText(raw.subtitle),
      unit: asText(raw.unit),
      series: [{ name: asText(raw.name) || fallbackSeries, data }]
    }
  }

  const rawSeries = Array.isArray(raw.series)
    ? raw.series
    : (Array.isArray(raw.data) ? [{ name: raw.name, data: raw.data }] : [])
  const series = rawSeries.slice(0, MAX_SERIES).map((item, index) => {
    const entry = item && typeof item === 'object' && !Array.isArray(item) ? item : { data: item }
    const data = cleanValues(entry.data)
    if (!data.length) return null
    return {
      name: asText(entry.name) || `${fallbackSeries} ${index + 1}`.trim(),
      data,
      type: SUPPORTED_TYPES.has(asText(entry.type).toLowerCase()) ? asText(entry.type).toLowerCase() : type
    }
  }).filter(Boolean)
  if (!series.length) return null

  const longest = Math.max(...series.map(item => item.data.length))
  const finalCategories = normalizedCategories.length
    ? normalizedCategories.slice(0, longest)
    : Array.from({ length: longest }, (_, index) => String(index + 1))
  return {
    type,
    title: asText(raw.title),
    subtitle: asText(raw.subtitle),
    unit: asText(raw.unit),
    categories: finalCategories,
    series
  }
}

export function parseMermaidResearchChart (source, labels = {}) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).filter(Boolean)
  if (!lines.length) return null

  if (/^pie\b/i.test(lines[0])) {
    let title = ''
    const data = []
    lines.slice(1).forEach(line => {
      const titleMatch = line.match(/^title\s+(.+)$/i)
      if (titleMatch) {
        title = quotedText(titleMatch[1])
        return
      }
      const valueMatch = line.match(/^(?:"([^"]+)"|'([^']+)'|([^:]+))\s*:\s*(-?\d+(?:\.\d+)?)$/)
      if (valueMatch) data.push({ name: asText(valueMatch[1] || valueMatch[2] || valueMatch[3]), value: Number(valueMatch[4]) })
    })
    return normalizeResearchChartSpec({ type: 'pie', title, data }, labels)
  }

  if (/^xychart(?:-beta)?\b/i.test(lines[0])) {
    let title = ''
    let unit = ''
    let categories = []
    const series = []
    let lineIndex = 0
    let barIndex = 0
    lines.slice(1).forEach(line => {
      const titleMatch = line.match(/^title\s+(.+)$/i)
      if (titleMatch) {
        title = quotedText(titleMatch[1])
        return
      }
      const xMatch = line.match(/^x-axis(?:\s+"[^"]*")?\s*\[([^\]]+)\]/i)
      if (xMatch) {
        categories = xMatch[1].split(',').map(quotedText)
        return
      }
      const yMatch = line.match(/^y-axis\s+(?:"([^"]*)"\s+)?/i)
      if (yMatch) {
        unit = asText(yMatch[1])
        return
      }
      const seriesMatch = line.match(/^(line|bar)\s*\[([^\]]+)\]/i)
      if (!seriesMatch) return
      const seriesType = seriesMatch[1].toLowerCase()
      const index = seriesType === 'line' ? ++lineIndex : ++barIndex
      const prefix = asText(labels[seriesType]) || asText(labels.series)
      series.push({
        name: `${prefix} ${index}`.trim(),
        type: seriesType,
        data: seriesMatch[2].split(',').map(value => value.trim())
      })
    })
    return normalizeResearchChartSpec({ type: series[0] ? series[0].type : 'line', title, unit, categories, series }, labels)
  }

  if (/^(?:flowchart|graph)\b/i.test(lines[0])) {
    const nodeMap = new Map()
    const links = []
    const readNode = raw => {
      const match = asText(raw).match(/^([\w.-]+)(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?$/)
      if (!match) return null
      const explicitName = asText(match[2] || match[3] || match[4])
      const existing = nodeMap.get(match[1])
      const node = { id: match[1], name: explicitName || (existing && existing.name) || match[1] }
      if (!existing || explicitName) nodeMap.set(node.id, node)
      return node
    }
    lines.slice(1).forEach(line => {
      const edge = line.match(/^(.+?)\s*--+>\s*(?:\|([^|]+)\|\s*)?(.+)$/)
      if (!edge) return
      const sourceNode = readNode(edge[1])
      const targetNode = readNode(edge[3])
      if (!sourceNode || !targetNode) return
      links.push({ source: sourceNode.id, target: targetNode.id, label: asText(edge[2]) })
    })
    return normalizeResearchChartSpec({ type: 'graph', nodes: Array.from(nodeMap.values()), links }, labels)
  }

  return null
}

export function parseResearchChartBlock (language, source, labels = {}) {
  const kind = asText(language).toLowerCase()
  if (kind === 'mermaid') return parseMermaidResearchChart(source, labels)
  if (!['chart', 'echarts', 'qd-chart'].includes(kind)) return null
  try {
    return normalizeResearchChartSpec(JSON.parse(String(source || '')), labels)
  } catch (_) {
    return null
  }
}

export function buildResearchChartOption (spec, palette = {}) {
  const textColor = palette.text || '#334155'
  const mutedColor = palette.muted || '#64748b'
  const borderColor = palette.border || 'rgba(148, 163, 184, 0.28)'
  const tooltipBackground = palette.tooltip || '#ffffff'
  const accent = palette.accent || '#1677ff'
  const colors = Array.isArray(palette.colors) && palette.colors.length
    ? palette.colors
    : [accent, '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b', '#ec4899']
  const common = {
    animationDuration: 420,
    color: colors,
    textStyle: { color: textColor, fontFamily: 'inherit' },
    title: spec.title
      ? {
          text: spec.title,
          subtext: spec.subtitle || '',
          left: 12,
          top: 8,
          textStyle: { color: textColor, fontSize: 14, fontWeight: 700 },
          subtextStyle: { color: mutedColor, fontSize: 11 }
        }
      : undefined,
    tooltip: {
      trigger: spec.type === 'pie' ? 'item' : 'axis',
      confine: true,
      backgroundColor: tooltipBackground,
      borderColor,
      textStyle: { color: textColor }
    }
  }

  if (spec.type === 'pie') {
    return {
      ...common,
      legend: { type: 'scroll', bottom: 4, textStyle: { color: mutedColor } },
      series: [{
        name: spec.series[0].name,
        type: 'pie',
        radius: ['38%', '66%'],
        center: ['50%', spec.title ? '51%' : '46%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: tooltipBackground, borderWidth: 2 },
        label: { color: textColor, formatter: '{b}: {d}%' },
        data: spec.series[0].data
      }]
    }
  }

  if (spec.type === 'graph') {
    return {
      ...common,
      tooltip: { ...common.tooltip, trigger: 'item' },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        symbolSize: 48,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 7,
        label: { show: true, color: textColor, width: 100, overflow: 'break' },
        edgeLabel: { show: true, color: mutedColor, formatter: params => (params.data && params.data.label) || '' },
        lineStyle: { color: borderColor, width: 1.5, curveness: 0.08 },
        force: { repulsion: 260, edgeLength: 100, gravity: 0.08 },
        data: spec.nodes.map((item, index) => ({ ...item, itemStyle: { color: colors[index % colors.length] } })),
        links: spec.links
      }]
    }
  }

  const isScatter = spec.type === 'scatter'
  const pointCount = Math.max(...spec.series.map(item => item.data.length))
  return {
    ...common,
    legend: spec.series.length > 1 ? { type: 'scroll', top: spec.title ? 48 : 8, right: 10, textStyle: { color: mutedColor } } : undefined,
    grid: { left: 16, right: 18, top: spec.title ? 72 : 38, bottom: pointCount > 20 ? 54 : 28, containLabel: true },
    xAxis: isScatter
      ? { type: 'value', axisLabel: { color: mutedColor }, splitLine: { lineStyle: { color: borderColor } } }
      : { type: 'category', data: spec.categories, boundaryGap: spec.type === 'bar', axisLabel: { color: mutedColor, hideOverlap: true }, axisLine: { lineStyle: { color: borderColor } } },
    yAxis: { type: 'value', name: spec.unit || '', nameTextStyle: { color: mutedColor }, axisLabel: { color: mutedColor }, splitLine: { lineStyle: { color: borderColor } } },
    dataZoom: !isScatter && pointCount > 20 ? [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 8, borderColor, textStyle: { color: mutedColor } }] : undefined,
    series: spec.series.map(item => {
      const seriesType = item.type === 'area' ? 'line' : (item.type || spec.type)
      return {
        name: item.name,
        type: seriesType,
        data: item.data,
        smooth: seriesType === 'line',
        symbolSize: isScatter ? 8 : 5,
        showSymbol: pointCount <= 40,
        areaStyle: item.type === 'area' || spec.type === 'area' ? { opacity: 0.16 } : undefined,
        emphasis: { focus: 'series' }
      }
    })
  }
}
