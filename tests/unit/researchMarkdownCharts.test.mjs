import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import {
  buildResearchChartOption,
  normalizeResearchChartSpec,
  parseMermaidResearchChart,
  parseResearchChartBlock
} from '../../src/utils/researchCharts.mjs'

const workbenchSource = fs.readFileSync(new URL('../../src/views/ai-analysis/components/CopilotWorkbench.vue', import.meta.url), 'utf8')
const promptSource = fs.readFileSync(new URL('../../src/views/ai-analysis/components/copilotResearchPrompts.mjs', import.meta.url), 'utf8')

test('research chart schema normalizes supported statistical series', () => {
  const chart = normalizeResearchChartSpec({
    type: 'area',
    title: 'Relative return',
    categories: ['Mon', 'Tue', 'Wed'],
    series: [{ name: 'AAPL', data: [1.2, 2.1, 1.8] }]
  }, { series: 'Series' })

  assert.equal(chart.type, 'area')
  assert.deepEqual(chart.categories, ['Mon', 'Tue', 'Wed'])
  assert.deepEqual(chart.series[0].data, [1.2, 2.1, 1.8])
  assert.equal(normalizeResearchChartSpec({ type: 'gauge', data: [1] }), null)
})

test('research chart schema caps untrusted response sizes', () => {
  const chart = normalizeResearchChartSpec({
    type: 'line',
    categories: Array.from({ length: 400 }, (_, index) => index),
    series: Array.from({ length: 12 }, (_, seriesIndex) => ({
      name: `S${seriesIndex}`,
      data: Array.from({ length: 400 }, (_, index) => index)
    }))
  }, { series: 'Series' })

  assert.equal(chart.series.length, 8)
  assert.equal(chart.series[0].data.length, 240)
  assert.equal(chart.categories.length, 240)
})

test('Mermaid pie and xychart blocks become native chart specs', () => {
  const pie = parseMermaidResearchChart('pie\ntitle Allocation\n"Stocks" : 65\n"Cash" : 35', { series: 'Series' })
  assert.equal(pie.type, 'pie')
  assert.deepEqual(pie.series[0].data, [
    { name: 'Stocks', value: 65 },
    { name: 'Cash', value: 35 }
  ])

  const xy = parseResearchChartBlock('mermaid', 'xychart-beta\ntitle "Returns"\nx-axis [Mon, Tue, Wed]\ny-axis "%" -2 --> 3\nline [1, 2, 1.5]\nbar [0.5, 1, 2]', { series: 'Series', line: 'Line', bar: 'Bar' })
  assert.equal(xy.type, 'line')
  assert.equal(xy.unit, '%')
  assert.equal(xy.series.length, 2)

  const flow = parseResearchChartBlock('mermaid', 'flowchart LR\nA[Research] --> B{Validate}\nB -->|Pass| C[Execute]', { series: 'Series' })
  assert.equal(flow.type, 'graph')
  assert.deepEqual(flow.nodes.map(item => item.name), ['Research', 'Validate', 'Execute'])
  assert.equal(flow.links[1].label, 'Pass')
})

test('chart option follows the supplied theme palette', () => {
  const spec = normalizeResearchChartSpec({ type: 'bar', categories: ['A', 'B'], data: [2, 3] }, { series: 'Series' })
  const option = buildResearchChartOption(spec, { accent: '#111111', text: '#eeeeee', tooltip: '#090909' })
  assert.equal(option.color[0], '#111111')
  assert.equal(option.textStyle.color, '#eeeeee')
  assert.equal(option.tooltip.backgroundColor, '#090909')
  assert.equal(option.series[0].type, 'bar')
})

test('AI research conversation mounts and disposes interactive markdown charts', () => {
  assert.match(workbenchSource, /parseResearchChartBlock\(label, code, chartLabels\)/)
  assert.match(workbenchSource, /data-qd-chart=/)
  assert.match(workbenchSource, /echarts\.init\(canvas/)
  assert.match(workbenchSource, /this\._markdownCharts\.forEach\(chart => chart\.dispose\(\)\)/)
  assert.match(promptSource, /```chart JSON/)
})
