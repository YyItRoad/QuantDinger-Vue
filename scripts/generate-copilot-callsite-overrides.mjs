import fs from 'node:fs'
import vm from 'node:vm'
import { resolve } from 'node:path'

import copilotOverrides from '../src/locales/copilot-overrides.js'
import {
  buildContextualFollowups,
  buildResearchStarterPrompts,
  researchModes,
  researchResponseContract
} from '../src/views/ai-analysis/components/copilotResearchPrompts.mjs'
import { loadCoreLocale, renderLocaleObject } from './i18n-utils.mjs'

const root = resolve(process.cwd())
const componentPath = resolve(root, 'src/views/ai-analysis/components/CopilotWorkbench.vue')
const outputPath = resolve(root, 'src/locales/copilot-callsite-overrides.js')
const source = fs.readFileSync(componentPath, 'utf8')

function callArgumentsAt(start) {
  const open = source.indexOf('(', start)
  let depth = 0
  let quote = ''
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = open; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (char === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '(' || char === '[' || char === '{') depth += 1
    if (char === ')' || char === ']' || char === '}') depth -= 1
    if (depth === 0) return source.slice(open + 1, index)
  }
  return ''
}

function splitArguments(value) {
  const result = []
  let start = 0
  let depth = 0
  let quote = ''
  let escaped = false
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '(' || char === '[' || char === '{') depth += 1
    if (char === ')' || char === ']' || char === '}') depth -= 1
    if (char === ',' && depth === 0) {
      result.push(value.slice(start, index).trim())
      start = index + 1
    }
  }
  result.push(value.slice(start).trim())
  return result
}

function evaluate(expression, isZh) {
  return vm.runInNewContext(expression.replaceAll('this.isZh', String(isZh)))
}

function extractCallsiteMessages(isZh) {
  const messages = {}
  for (const pattern of [/\bt\(/g, /i18nText\(/g]) {
    let match
    while ((match = pattern.exec(source)) !== null) {
      const args = splitArguments(callArgumentsAt(match.index))
      if (args.length < 2) continue
      try {
        let key = evaluate(args[0], isZh)
        if (pattern.source.startsWith('\\bt')) key = `aiAssetAnalysis.copilot.${key}`
        const fallback = evaluate(args[1], isZh)
        if (typeof key === 'string' && typeof fallback === 'string' && key && fallback) {
          messages[key] = fallback
        }
      } catch (_) {
        // Dynamic keys are registered explicitly below.
      }
    }
  }
  return messages
}

function normalizePlaceholders(text, isZh) {
  const comparison = isZh ? 'ALPHA、BETA、GAMMA' : 'ALPHA, BETA, GAMMA'
  return String(text)
    .replaceAll(comparison, '{comparison}')
    .replaceAll('ALPHA', '{symbol}')
}

function dynamicResearchMessages(isZh) {
  const messages = {}
  researchModes(isZh).forEach(item => {
    messages[`aiAssetAnalysis.copilot.researchModes.${item.key}`] = item.label
  })

  const variants = [
    buildResearchStarterPrompts({
      isZh,
      target: { market: 'USStock', symbol: 'ALPHA' },
      watchlist: [{ symbol: 'BETA' }, { symbol: 'GAMMA' }]
    }),
    buildResearchStarterPrompts({ isZh, target: null, watchlist: [] })
  ]
  variants.flat().forEach(item => {
    messages[`aiAssetAnalysis.copilot.starterPrompts.${item.key}.label`] = normalizePlaceholders(item.label, isZh)
    messages[`aiAssetAnalysis.copilot.starterPrompts.${item.key}.prompt`] = normalizePlaceholders(item.prompt, isZh)
  })

  buildContextualFollowups({
    isZh,
    target: { market: 'USStock', symbol: 'ALPHA' },
    intent: 'analysis',
    hasReport: true
  }).forEach(item => {
    messages[`aiAssetAnalysis.copilot.followups.${item.key}.label`] = normalizePlaceholders(item.label, isZh)
    messages[`aiAssetAnalysis.copilot.followups.${item.key}.prompt`] = normalizePlaceholders(item.prompt, isZh)
  })

  for (const mode of ['research', 'diagnosis', 'technical', 'plan', 'news', 'macro']) {
    messages[`aiAssetAnalysis.copilot.responseContracts.${mode}`] = researchResponseContract(mode, isZh)
  }
  return messages
}

function existingMessages(localeName) {
  return {
    ...loadCoreLocale(resolve(root, 'src/locales/lang'), localeName).locale,
    ...(copilotOverrides[localeName] || {})
  }
}

const englishExisting = existingMessages('en-US')
const chineseExisting = existingMessages('zh-CN')
const englishCandidates = {
  ...extractCallsiteMessages(false),
  ...dynamicResearchMessages(false)
}
const chineseCandidates = {
  ...extractCallsiteMessages(true),
  ...dynamicResearchMessages(true)
}
const english = Object.fromEntries(
  Object.entries(englishCandidates).filter(([key]) => englishExisting[key] === undefined)
)
const chinese = Object.fromEntries(
  Object.entries(chineseCandidates).filter(([key]) => chineseExisting[key] === undefined)
)

const renderBlock = (localeName, values) => {
  const lines = renderLocaleObject(values)
    .split('\n')
    .map(line => `    ${line.trimStart()}`)
    .join('\n')
  return `  ${JSON.stringify(localeName)}: {\n${lines}\n  }`
}
const output = [
  '// Generated by scripts/generate-copilot-callsite-overrides.mjs.',
  '// Register every static Copilot fallback and dynamic research prompt in the i18n schema.',
  'const messages = {',
  `${renderBlock('en-US', english)},`,
  renderBlock('zh-CN', chinese),
  '}',
  '',
  'export default messages',
  ''
].join('\n')

if (process.argv.includes('--check')) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : ''
  if (current !== output) {
    console.error('Copilot call-site locale registry is stale. Run: node scripts/generate-copilot-callsite-overrides.mjs')
    process.exit(1)
  }
  console.log(`Copilot call-site locale registry is current: ${Object.keys(english).length} English keys`)
} else {
  fs.writeFileSync(outputPath, output, 'utf8')
  console.log(`Wrote ${outputPath}: ${Object.keys(english).length} English keys, ${Object.keys(chinese).length} Chinese keys`)
}
