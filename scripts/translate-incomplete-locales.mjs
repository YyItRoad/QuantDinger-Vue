import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import {
  evaluateObject,
  extractObjectRange,
  isTranslatableText,
  loadCoreLocale,
  localeTargets,
  overrideModulePaths,
  placeholdersMatch,
  renderLocaleObject
} from './i18n-utils.mjs'

const root = resolve(process.cwd())
const langDir = join(root, 'src', 'locales', 'lang')
const outputPath = join(root, 'src', 'locales', 'generated-locale-overrides.js')
const authEndpoint = process.env.QUANTDINGER_TRANSLATE_AUTH_ENDPOINT ||
  'https://edge.microsoft.com/translate/auth'
const endpoint = process.env.QUANTDINGER_TRANSLATE_ENDPOINT ||
  'https://api-edge.cognitive.microsofttranslator.com/translate'
const requestDelayMs = Number(process.env.QUANTDINGER_TRANSLATE_DELAY_MS || 180)
const requestedProvider = process.env.QUANTDINGER_TRANSLATE_PROVIDER || 'auto'
const missingOnly = process.env.QUANTDINGER_TRANSLATE_MISSING_ONLY === '1'
const batchCharacterLimit = 3500
const batchItemLimit = 90
const bingBatchCharacterLimit = 850
const bingParallelTargets = Number(process.env.QUANTDINGER_TRANSLATE_PARALLEL_TARGETS || 3)
const existingGeneratedMessages = existsSync(outputPath)
  ? evaluateObject(
      readFileSync(outputPath, 'utf8'),
      'const messages =',
      'generated-locale-overrides.js'
    )
  : {}

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
let translationToken = ''
let activeProvider = requestedProvider
let bingSession = null

function protectText(value) {
  const protectedValues = []
  const text = value.replace(
    /<code\b[^>]*>.*?<\/code>|\{[^{}\n]+\}|%\([^)]+\)[sdif](?![A-Za-z])|%[sdif](?![A-Za-z])|<[^>\n]+>|`[^`\n]+`|https?:\/\/[A-Za-z0-9][A-Za-z0-9./?&=_:%#@+~-]*[A-Za-z0-9/#]/gi,
    match => {
      const token = `QDINGERPLACEHOLDER${String(protectedValues.length).padStart(6, '0')}TOKEN`
      protectedValues.push(match)
      return token
    }
  )
  return { text, protectedValues }
}

function restoreText(value, protectedValues) {
  let restored = value
  protectedValues.forEach((original, index) => {
    const token = `QDINGERPLACEHOLDER${String(index).padStart(6, '0')}TOKEN`
    if (!restored.includes(token)) {
      throw new Error(`Translation response lost protected token ${token}`)
    }
    restored = restored.split(token).join(original)
  })
  return restored.trim()
}

async function getTranslationToken(forceRefresh = false) {
  if (translationToken && !forceRefresh) return translationToken
  const response = await fetch(authEndpoint)
  if (!response.ok) {
    const error = new Error(`Translation auth failed with HTTP ${response.status}`)
    error.status = response.status
    throw error
  }
  translationToken = (await response.text()).trim()
  if (!translationToken) throw new Error('Translation auth returned an empty token')
  return translationToken
}

const bingHeaders = {
  'accept-language': 'en-US,en;q=0.9',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36'
}

async function getBingSession(forceRefresh = false) {
  if (bingSession && !forceRefresh && Date.now() - bingSession.createdAt < 45 * 60 * 1000) {
    return bingSession
  }
  const response = await fetch('https://www.bing.com/translator', { headers: bingHeaders })
  if (!response.ok) throw new Error(`Bing translation bootstrap failed with HTTP ${response.status}`)
  const html = await response.text()
  const ig = html.match(/IG:"([^"]+)"/)?.[1]
  const iid = html.match(/data-iid="([^"]+)"/)?.[1]
  const auth = html.match(/params_AbusePreventionHelper\s*=\s*\[(\d+),"([^"]+)"/)
  const cookies = (response.headers.getSetCookie?.() || [])
    .map(value => value.split(';', 1)[0])
    .join('; ')
  if (!ig || !iid || !auth) {
    throw new Error('Bing translation bootstrap parameters were not found')
  }
  bingSession = {
    ig,
    iid,
    key: auth[1],
    token: auth[2],
    cookies,
    createdAt: Date.now()
  }
  return bingSession
}

async function requestBingText(text, targetLanguage, attempt = 1) {
  const session = await getBingSession(attempt > 1 && attempt % 3 === 0)
  const body = new URLSearchParams({
    fromLang: 'en',
    to: targetLanguage,
    text,
    key: session.key,
    token: session.token
  })
  const response = await fetch(
    `https://www.bing.com/ttranslatev3?isVertical=1&IG=${session.ig}&IID=${session.iid}`,
    {
      method: 'POST',
      headers: {
        ...bingHeaders,
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        cookie: session.cookies,
        origin: 'https://www.bing.com',
        referer: 'https://www.bing.com/translator'
      },
      body
    }
  )
  if (!response.ok) {
    if (attempt >= 6) throw new Error(`Bing translation failed with HTTP ${response.status}`)
    if (response.status === 401 || response.status === 403) bingSession = null
    const baseDelay = response.status === 429 ? 5000 : 750
    await sleep(Math.min(baseDelay * (2 ** (attempt - 1)), 30000))
    return requestBingText(text, targetLanguage, attempt + 1)
  }
  const payload = await response.json()
  const translated = payload?.[0]?.translations?.[0]?.text
  if (typeof translated !== 'string') {
    throw new Error('Bing translation response did not contain translated text')
  }
  return translated
}

function makeBingBatches(protectedItems) {
  const batches = []
  let current = []
  let characters = 0
  protectedItems.forEach((item, index) => {
    const marker = `QDINGERITEM${String(index).padStart(6, '0')}TOKEN`
    const size = marker.length + item.text.length + 2
    if (current.length && characters + size > bingBatchCharacterLimit) {
      batches.push(current)
      current = []
      characters = 0
    }
    current.push({ ...item, index, marker })
    characters += size
  })
  if (current.length) batches.push(current)
  return batches
}

function extractBingBatch(translatedText, batch) {
  const markerPattern = /QDINGERITEM(\d{6})TOKEN/g
  const matches = [...translatedText.matchAll(markerPattern)]
  if (matches.length !== batch.length) {
    throw new Error('Bing translation response lost an item separator')
  }
  const values = new Map()
  matches.forEach((match, index) => {
    const itemIndex = Number(match[1])
    const start = match.index + match[0].length
    const end = matches[index + 1]?.index ?? translatedText.length
    values.set(itemIndex, translatedText.slice(start, end).trim())
  })
  return values
}

async function requestBingTranslationMatrix(values, targetLanguages) {
  const protectedItems = values.map(protectText)
  const batches = makeBingBatches(protectedItems)
  const matrix = values.map(() => ({}))
  let nextTarget = 0

  async function translateTarget() {
    while (nextTarget < targetLanguages.length) {
      const targetLanguage = targetLanguages[nextTarget++]
      for (const batch of batches) {
        const joined = batch.map(item => `${item.marker}\n${item.text}`).join('\n')
        const translated = await requestBingText(joined, targetLanguage)
        let translatedItems
        try {
          translatedItems = extractBingBatch(translated, batch)
        } catch (error) {
          console.warn(
            `${targetLanguage}: ${error.message}; retrying ${batch.length} strings individually`
          )
          translatedItems = new Map()
          for (const item of batch) {
            translatedItems.set(
              item.index,
              await requestBingText(item.text, targetLanguage)
            )
            await sleep(requestDelayMs)
          }
        }
        for (const item of batch) {
          matrix[item.index][targetLanguage] = restoreText(
            translatedItems.get(item.index) || '',
            item.protectedValues
          )
        }
        await sleep(requestDelayMs)
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(bingParallelTargets, targetLanguages.length) },
      () => translateTarget()
    )
  )
  return matrix
}

async function requestTranslationMatrix(values, targetLanguages, attempt = 1) {
  if (activeProvider === 'bing') {
    return requestBingTranslationMatrix(values, targetLanguages)
  }
  const protectedItems = values.map(protectText)
  const query = new URLSearchParams({
    'api-version': '3.0',
    from: 'en',
    textType: 'plain'
  })
  targetLanguages.forEach(targetLanguage => query.append('to', targetLanguage))
  try {
    const token = await getTranslationToken()
    const response = await fetch(`${endpoint}?${query}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json;charset=UTF-8'
      },
      body: JSON.stringify(protectedItems.map(item => ({ Text: item.text })))
    })
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`)
      error.status = response.status
      throw error
    }
    const payload = await response.json()
    if (!Array.isArray(payload) || payload.length !== values.length) {
      throw new Error('Translation response item count mismatch')
    }
    return payload.map((item, index) => {
      const translations = {}
      for (const translated of item.translations || []) {
        try {
          translations[translated.to] = restoreText(
            translated.text || '',
            protectedItems[index].protectedValues
          )
        } catch (error) {
          console.warn(
            `Preserving source for ${translated.to} item ${index}: ${error.message}`
          )
          translations[translated.to] = values[index]
        }
      }
      return translations
    })
  } catch (error) {
    if (activeProvider === 'auto' && (
      error.status === 401 || error.status === 403 || error.status === 404
    )) {
      activeProvider = 'bing'
      console.warn(`${error.message}; falling back to Bing Translator`)
      return requestBingTranslationMatrix(values, targetLanguages)
    }
    if (attempt >= 8) throw error
    if (error.status === 401 || error.status === 403) {
      await getTranslationToken(true)
    }
    const baseDelay = error.status === 429 ? 5000 : 1000
    await sleep(Math.min(baseDelay * (2 ** (attempt - 1)), 60000))
    return requestTranslationMatrix(values, targetLanguages, attempt + 1)
  }
}

function makeBatches(entries) {
  const batches = []
  let current = []
  let characters = 0
  for (const entry of entries) {
    const size = entry.source.length + 20
    if (current.length && (
      current.length >= batchItemLimit ||
      characters + size > batchCharacterLimit
    )) {
      batches.push(current)
      current = []
      characters = 0
    }
    current.push(entry)
    characters += size
  }
  if (current.length) batches.push(current)
  return batches
}

async function translateCandidateMatrix(candidateEntries, verifiedSame, phaseName) {
  const sourceByKey = new Map()
  const candidateKeys = {}
  const translatedByLocale = {}

  for (const [localeName, entries] of Object.entries(candidateEntries)) {
    candidateKeys[localeName] = new Set(entries.map(entry => entry.key))
    translatedByLocale[localeName] = {}
    entries.forEach(entry => sourceByKey.set(entry.key, entry.source))
  }

  const unionEntries = [...sourceByKey].map(([key, source]) => ({ key, source }))
  const batches = makeBatches(unionEntries)
  let completed = 0
  for (const batch of batches) {
    const activeLocales = Object.keys(localeTargets).filter(localeName => (
      batch.some(entry => candidateKeys[localeName].has(entry.key))
    ))
    const targetLanguages = activeLocales.map(localeName => localeTargets[localeName])
    const matrix = await requestTranslationMatrix(
      batch.map(entry => entry.source),
      targetLanguages
    )
    batch.forEach((entry, index) => {
      for (const localeName of activeLocales) {
        if (!candidateKeys[localeName].has(entry.key)) continue
        const targetLanguage = localeTargets[localeName]
        const value = matrix[index][targetLanguage]
        if (typeof value !== 'string') {
          throw new Error(`${localeName}:${entry.key} missing from translation response`)
        }
        if (!placeholdersMatch(entry.source, value)) {
          throw new Error(`${localeName}:${entry.key} changed interpolation placeholders`)
        }
        translatedByLocale[localeName][entry.key] = value
        if (value === entry.source) verifiedSame[localeName].add(entry.key)
      }
    })
    completed += batch.length
    console.log(`${phaseName}: translated ${completed}/${unionEntries.length} unique strings`)
    await sleep(requestDelayMs)
  }
  return translatedByLocale
}

function replaceLocaleObject(source, locale, fileName) {
  const range = extractObjectRange(source, 'const locale =', fileName)
  const objectSource = `{\n${renderLocaleObject(locale)}\n}`
  return `${source.slice(0, range.start)}${objectSource}${source.slice(range.end)}`
}

async function loadOverrideModules() {
  return Promise.all(
    overrideModulePaths.map(modulePath => import(new URL(modulePath, import.meta.url)))
  )
}

function composeOverrides(modules, localeName) {
  return Object.assign({}, ...modules.map(module => module.default?.[localeName] || {}))
}

function renderGeneratedOverrides(messages, verifiedSame) {
  const renderedMessages = Object.entries(messages)
    .map(([localeName, locale]) => {
      const body = renderLocaleObject(locale)
        .split('\n')
        .map(line => `    ${line.trimStart()}`)
        .join('\n')
      return `  ${JSON.stringify(localeName)}: {\n${body}\n  }`
    })
    .join(',\n')

  const renderedVerified = Object.entries(verifiedSame)
    .map(([localeName, keys]) => (
      `  ${JSON.stringify(localeName)}: ${JSON.stringify([...keys].sort())}`
    ))
    .join(',\n')

  return `// Generated by scripts/translate-incomplete-locales.mjs.\n` +
    `// Machine-generated strings are reviewed by placeholder and completeness audits.\n` +
    `const messages = {\n${renderedMessages}\n}\n\n` +
    `export const verifiedSameTranslations = {\n${renderedVerified}\n}\n\n` +
    `export default messages\n`
}

if (process.env.QUANTDINGER_TRANSLATE_REBUILD_VERIFIED_ONLY === '1') {
  const generatedSource = readFileSync(outputPath, 'utf8')
  const generatedMessages = evaluateObject(
    generatedSource,
    'const messages =',
    'generated-locale-overrides.js'
  )
  const modules = await loadOverrideModules()
  const english = {
    ...loadCoreLocale(langDir, 'en-US').locale,
    ...composeOverrides(modules, 'en-US')
  }
  const verified = Object.fromEntries(
    Object.keys(localeTargets).map(localeName => {
      const effective = {
        ...loadCoreLocale(langDir, localeName).locale,
        ...composeOverrides(modules, localeName),
        ...(generatedMessages[localeName] || {})
      }
      const keys = Object.entries(english)
        .filter(([key, source]) => (
          typeof source === 'string' &&
          isTranslatableText(source) &&
          effective[key] === source
        ))
        .map(([key]) => key)
      return [localeName, new Set(keys)]
    })
  )
  writeFileSync(outputPath, renderGeneratedOverrides(generatedMessages, verified), 'utf8')
  console.log(`Rebuilt verified same-language entries in ${outputPath}`)
  process.exit(0)
}

const coreLocales = {}
const verifiedSame = Object.fromEntries(
  Object.keys(localeTargets).map(localeName => [localeName, new Set()])
)
const enCore = loadCoreLocale(langDir, 'en-US').locale
coreLocales['en-US'] = enCore
const coreWork = {}
const coreCandidates = {}

for (const localeName of Object.keys(localeTargets)) {
  const filePath = join(langDir, `${localeName}.js`)
  const loaded = loadCoreLocale(langDir, localeName)
  const locale = { ...loaded.locale }
  const entries = Object.entries(enCore)
    .filter(([key, source]) => (
      isTranslatableText(source) &&
      (
        typeof locale[key] !== 'string' ||
        (!missingOnly && locale[key] === source) ||
        !placeholdersMatch(source, locale[key])
      )
    ))
    .map(([key, source]) => ({ key, source }))

  console.log(`${localeName}: ${entries.length} core strings need translation`)
  coreCandidates[localeName] = entries
  coreWork[localeName] = { filePath, loaded, locale }
}

const coreTranslations = await translateCandidateMatrix(
  coreCandidates,
  verifiedSame,
  'core locales'
)

for (const localeName of Object.keys(localeTargets)) {
  const { filePath, loaded, locale } = coreWork[localeName]
  Object.assign(locale, coreTranslations[localeName])
  for (const [key, source] of Object.entries(enCore)) {
    if (locale[key] === undefined) locale[key] = source
  }

  const localeOnly = evaluateObject(loaded.source, 'const locale =', `${localeName}.js`)
  const mergedLocaleOnly = { ...localeOnly, ...locale }
  writeFileSync(
    filePath,
    replaceLocaleObject(loaded.source, mergedLocaleOnly, `${localeName}.js`),
    'utf8'
  )
  coreLocales[localeName] = locale
}

const overrideModules = await loadOverrideModules()
translationToken = ''
const enOverrides = composeOverrides(overrideModules, 'en-US')
const finalEnglish = { ...enCore, ...enOverrides }
const generatedMessages = {}
const generatedSeeds = {}
const overrideCandidates = {}

for (const localeName of Object.keys(localeTargets)) {
  const existingOverrides = composeOverrides(overrideModules, localeName)
  const retainedGenerated = missingOnly
    ? (existingGeneratedMessages[localeName] || {})
    : {}
  const current = {
    ...coreLocales[localeName],
    ...existingOverrides,
    ...retainedGenerated
  }
  const generated = { ...retainedGenerated }
  const entries = []

  for (const [key, source] of Object.entries(finalEnglish)) {
    const target = current[key]
    if (typeof source !== 'string') {
      if (target === undefined) generated[key] = source
      continue
    }
    if (typeof target !== 'string') {
      if (isTranslatableText(source)) {
        entries.push({ key, source })
      } else {
        generated[key] = source
      }
    } else if (!placeholdersMatch(source, target)) {
      if (isTranslatableText(source)) {
        entries.push({ key, source })
      } else {
        generated[key] = source
      }
    } else if (!missingOnly && target === source && isTranslatableText(source)) {
      entries.push({ key, source })
    }
  }

  console.log(`${localeName}: ${entries.length} effective override strings need translation`)
  generatedSeeds[localeName] = generated
  overrideCandidates[localeName] = entries
}

const overrideTranslations = await translateCandidateMatrix(
  overrideCandidates,
  verifiedSame,
  'effective overrides'
)

for (const localeName of Object.keys(localeTargets)) {
  generatedMessages[localeName] = {
    ...generatedSeeds[localeName],
    ...overrideTranslations[localeName]
  }

  // Rebuild the allow-list from the final effective locale instead of relying
  // only on values translated during this process. This also preserves
  // intentional technical terms when a missing-only run skips existing text.
  const finalLocale = {
    ...coreLocales[localeName],
    ...composeOverrides(overrideModules, localeName),
    ...generatedMessages[localeName]
  }
  for (const [key, source] of Object.entries(finalEnglish)) {
    if (
      typeof source === 'string' &&
      isTranslatableText(source) &&
      finalLocale[key] === source
    ) {
      verifiedSame[localeName].add(key)
    }
  }
}

writeFileSync(outputPath, renderGeneratedOverrides(generatedMessages, verifiedSame), 'utf8')
console.log(`Wrote complete locale overrides to ${outputPath}`)
