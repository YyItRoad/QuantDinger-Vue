import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { noticeMessageHtml } from '../../src/utils/noticeFormat.js'

const componentPath = fileURLToPath(
  new URL('../../src/components/NoticeIcon/NoticeIcon.vue', import.meta.url)
)
const componentSource = fs.readFileSync(componentPath, 'utf8')

const translate = key => key

function signalNotice () {
  return {
    payload: {
      display: {
        template: 'signal.trade',
        params: {
          action: 'OPEN',
          side: 'LONG',
          strategyName: 'Dual Moving Average',
          strategyId: 98,
          symbol: 'BTC/USDT',
          signalType: 'open_long',
          price: '76717.3',
          stake: '950',
          pendingOrderId: '134',
          mode: 'signal',
          timestampDisplay: '2026-09-17T15:58:04+00:00',
          timeLabel: 'Time (UTC)'
        }
      }
    }
  }
}

test('signal notification details flow through the grid without a forced empty row', () => {
  const html = noticeMessageHtml(signalNotice(), translate)
  const labels = [...html.matchAll(/qd-notice-card__metric/g)]
  const grid = html.match(/qd-notice-card__grid">([\s\S]*?)<\/div>\s*<\/div>$/)?.[1] || ''

  assert.equal(labels.length, 8)
  assert.doesNotMatch(html, /is-wide/)
  assert.ok(grid.indexOf('Dual Moving Average (#98)') < grid.indexOf('BTC/USDT'))
  assert.ok(grid.indexOf('signal') < grid.indexOf('2026-09-17T15:58:04\+00:00'))
})

test('signal notification grid uses three desktop columns and one mobile column', () => {
  assert.match(
    componentSource,
    /\.qd-notice-card--signal \.qd-notice-card__grid\s*\{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/
  )
  assert.match(
    componentSource,
    /\.qd-notice-card__grid,\s*\.notice-detail-modal \.qd-notice-card--signal \.qd-notice-card__grid\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/
  )
})
