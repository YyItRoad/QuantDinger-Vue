const normalizeTarget = target => {
  const symbol = String((target && target.symbol) || '').trim()
  if (!symbol) return null
  return {
    market: String((target && target.market) || '').trim(),
    symbol
  }
}

const uniqueSymbols = (watchlist = [], target = null, limit = 3) => {
  const targetSymbol = String((target && target.symbol) || '').toUpperCase()
  const seen = new Set(targetSymbol ? [targetSymbol] : [])
  return watchlist
    .map(item => String((item && item.symbol) || '').trim())
    .filter(symbol => {
      const key = symbol.toUpperCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

const item = (key, mode, icon, label, prompt, priority = 0) => ({
  key,
  mode,
  icon,
  label,
  prompt,
  priority
})

export const researchModes = isZh => [
  { key: 'research', icon: 'global', label: isZh ? '市场研究' : 'Market research' },
  { key: 'diagnosis', icon: 'line-chart', label: isZh ? '标的诊断' : 'Symbol diagnosis' },
  { key: 'technical', icon: 'fund', label: isZh ? '技术分析' : 'Technical analysis' },
  { key: 'plan', icon: 'profile', label: isZh ? '交易计划' : 'Trading plan' },
  { key: 'news', icon: 'notification', label: isZh ? '新闻事件' : 'News & events' },
  { key: 'macro', icon: 'bank', label: isZh ? '宏观数据' : 'Macro data' }
]

export function researchResponseContract (mode = 'research', isZh = false) {
  const shared = isZh
    ? '先给一句话结论，再给证据和数据；注明数据截止时间与时区，明确区分事实、推断与数据缺口。只报告当前资产类别真正适用的数据：例如美股不把资金费率或未平仓合约当作缺口。没有回测或样本证据时，不得声称胜率、成功概率或统计优势。涉及方向性交易时同时列出看多、看空和观望条件，不把超买直接等同于适合做空。当至少有 3 个可比较数据点且图形明显比文字更清晰时，可附加一个 ```chart JSON 代码块；仅使用 type（line、bar、area、pie、scatter）、title、unit、categories 和 series（name、data）字段，不得编造缺失数据。'
    : 'Lead with a one-sentence conclusion, then evidence and data. State the data cutoff time and timezone, and separate facts, inference, and missing data. Report only fields relevant to the active asset class; for example, do not call funding rate or open interest a data gap for a US stock. Never claim a win rate, success probability, or statistical edge without an actual backtest or sample. For directional trades, include bull, bear, and stay-out conditions; do not equate overbought with a short signal. When at least three comparable data points exist and a visual is clearer than prose, you may append one ```chart JSON code block using only type (line, bar, area, pie, scatter), title, unit, categories, and series (name, data). Never invent missing values.'
  const contracts = {
    diagnosis: isZh
      ? '按“结论、趋势与动量、关键价位、风险、下一步验证”组织；关键价位和可比数据优先使用紧凑表格。'
      : 'Organize as: conclusion, trend and momentum, key levels, risks, and next checks. Prefer a compact table for key levels and comparable data.',
    technical: isZh
      ? '按“趋势、动量、量价、支撑阻力、触发与失效条件”组织，关键数据优先使用表格。'
      : 'Organize as: trend, momentum, price/volume, support/resistance, triggers, and invalidation. Prefer tables for comparable data.',
    plan: isZh
      ? '按“市场偏向、入场触发、止损、止盈、风险收益比、仓位风险、观望条件”组织。最终方向和入场/止损/止盈确定后，按 BUY/SELL 方向重新计算风险收益比；低于 1 时明确警告。不得通过拉远止盈制造高风险收益比，也不得补造缺失价位。'
      : 'Organize as: bias, entry trigger, stop, target, risk/reward, position risk, and stay-out conditions. Once direction and final entry/stop/target are known, recompute risk/reward using the correct BUY or SELL geometry and warn clearly when it is below 1. Never inflate risk/reward by stretching a target or invent missing levels.',
    news: isZh
      ? '按“已确认事实、市场解读、潜在影响、仍需验证、时间窗口”组织，并标明来源时间。'
      : 'Organize as: confirmed facts, market interpretation, potential impact, items to verify, and time window. Include source timing.',
    macro: isZh
      ? '按“事件/数据、时间、预期与前值、影响资产、情景分析、波动风险”组织，适合时使用表格。'
      : 'Organize as: event/data, timing, forecast and previous, affected assets, scenarios, and volatility risk. Use a table when useful.',
    research: isZh
      ? '按“结论、核心证据、对比表、风险与反例、下一步研究”组织。'
      : 'Organize as: conclusion, core evidence, comparison table, risks and counterpoints, and next research steps.'
  }
  return `${shared} ${contracts[mode] || contracts.research}`
}

export function buildResearchStarterPrompts ({ isZh = false, target = null, watchlist = [], activeMode = 'research' } = {}) {
  const normalized = normalizeTarget(target)
  const related = uniqueSymbols(watchlist, normalized, 2)
  const symbol = normalized && normalized.symbol
  const market = String((normalized && normalized.market) || '')
  const comparison = [symbol, ...related].filter(Boolean).join('、')
  const marketIsCrypto = market.toLowerCase() === 'crypto'

  const targeted = symbol
    ? [
        item('diagnose', 'diagnosis', 'line-chart', isZh ? `分析 ${symbol} 当前趋势和关键价位` : `Analyze ${symbol}'s trend and key levels`, isZh
          ? `使用系统行情数据，分析 ${symbol} 当前趋势、动量、成交量、支撑阻力、流动性和主要风险。明确说明当前更适合行动还是等待。`
          : `Use system market data to analyze ${symbol}: trend, momentum, volume, support/resistance, liquidity, and major risks. State clearly whether action or patience is more appropriate.`, 100),
        item('risk', 'diagnosis', 'safety-certificate', isZh ? `${symbol} 现在的主要风险是什么？` : `What are the main risks for ${symbol}?`, isZh
          ? `梳理 ${symbol} 当前最重要的下行风险、上涨失效条件、波动风险和需要继续观察的数据，不要只给笼统风险提示。`
          : `Identify ${symbol}'s most important downside risks, bullish invalidation conditions, volatility risks, and the data that still needs monitoring. Avoid generic warnings.`, 84),
        item('news', 'news', 'notification', isZh ? `最近哪些新闻可能影响 ${symbol}？` : `Which recent events may affect ${symbol}?`, isZh
          ? `检索最近可能影响 ${symbol} 的公司、行业和宏观新闻。区分已确认事实、市场解读和仍不确定的信息，并说明潜在影响方向。`
          : `Research recent company, industry, and macro news that may affect ${symbol}. Separate confirmed facts, market interpretation, and uncertainty, then explain likely directional impact.`, 82),
        item('trade_plan', 'plan', 'profile', isZh ? `为 ${symbol} 制定一份交易计划` : `Create a trading plan for ${symbol}`, isZh
          ? `基于系统行情为 ${symbol} 制定可执行但非强制的交易计划：市场偏向、关键价位、触发条件、止损、止盈、风险收益比、仓位风险和观望条件。`
          : `Use system market data to create a practical but non-prescriptive plan for ${symbol}: bias, key levels, triggers, stop, target, risk/reward, position risk, and stay-out conditions.`, 80),
        item('compare', 'research', 'swap', comparison
          ? (isZh ? `比较 ${comparison} 的近期强弱` : `Compare the recent strength of ${comparison.replaceAll('、', ', ')}`)
          : (isZh ? `将 ${symbol} 与同类标的比较` : `Compare ${symbol} with peers`), isZh
          ? `比较 ${comparison || symbol} 最近 5 个交易日的收益、波动率、成交量和趋势质量，用表格排名并解释差异。`
          : `Compare ${comparison || symbol} over the last five trading days by return, volatility, volume, and trend quality. Rank them in a table and explain the differences.`, 76),
        item('radar', 'research', 'radar-chart', isZh ? `扫描 ${symbol} 未来 24 小时机会` : `Scan ${symbol} for the next 24 hours`, isZh
          ? `扫描 ${symbol} 未来 24 小时可能出现的做多、做空和观望场景，列出触发条件、失效条件、风险和优先级。`
          : `Scan ${symbol} for long, short, and wait scenarios over the next 24 hours, including triggers, invalidation, risks, and priority.`, marketIsCrypto ? 88 : 72)
      ]
    : [
        item('compare_benchmarks', 'research', 'swap', isZh ? '比较 SPY、QQQ、IWM 最近表现' : 'Compare SPY, QQQ, and IWM', isZh
          ? '比较 SPY、QQQ、IWM 最近 5 个交易日的收益、波动率、成交量和相对强弱，用表格展示并解释市场风格。'
          : 'Compare SPY, QQQ, and IWM over the last five trading days by return, volatility, volume, and relative strength. Use a table and explain the market style.', 100),
        item('watchlist_scan', 'research', 'star', isZh ? '关注列表中哪个标的最强？' : 'Which watchlist symbol is strongest?', isZh
          ? '扫描我的关注列表，按趋势、动量、成交量、风险收益质量进行排名，说明数据不足项，并给出最值得继续研究的三个标的。'
          : 'Scan my watchlist and rank symbols by trend, momentum, volume, and risk/reward quality. Identify missing data and the top three names worth further research.', watchlist.length ? 96 : 58),
        item('macro', 'macro', 'bank', isZh ? '本周有哪些重要宏观事件？' : 'What macro events matter this week?', isZh
          ? '梳理本周重要宏观事件和经济数据，列出时间、预期关注点、可能影响的资产以及事件前后需要注意的波动风险。'
          : 'Review this week’s important macro events and releases, including timing, expectations, affected assets, and volatility risks around each event.', 86),
        item('sector_strength', 'research', 'rise', isZh ? '最近哪些行业正在走强？' : 'Which sectors are strengthening?', isZh
          ? '研究近期行业相对强弱，区分持续趋势和短期反弹，列出领先行业、代表标的和主要风险。'
          : 'Research recent sector relative strength, separating durable trends from short rebounds. List leading sectors, representative names, and major risks.', 78),
        item('crypto_activity', 'technical', 'fund', isZh ? '扫描加密市场异常成交量' : 'Scan unusual crypto volume', isZh
          ? '扫描加密市场近期异常成交量、持仓和价格联动，列出值得关注的标的、触发原因和数据限制。'
          : 'Scan crypto markets for unusual volume, positioning, and price interaction. List noteworthy assets, triggers, and data limitations.', 74),
        item('opportunity_scan', 'research', 'radar-chart', isZh ? '查看未来 24 小时潜在机会' : 'Find potential opportunities in the next 24 hours', isZh
          ? '扫描未来 24 小时潜在市场机会，分别给出做多、做空和观望候选，说明触发条件、失效条件和风险。'
          : 'Scan potential market opportunities over the next 24 hours. Provide long, short, and wait candidates with triggers, invalidation, and risks.', 70)
      ]

  return targeted
    .map((entry, index) => ({
      ...entry,
      priority: entry.priority + (entry.mode === activeMode ? 30 : 0) - index
    }))
    .sort((a, b) => b.priority - a.priority)
}

export function buildContextualFollowups ({ isZh = false, target = null, intent = '', hasReport = false } = {}) {
  const normalized = normalizeTarget(target)
  const symbol = (normalized && normalized.symbol) || (isZh ? '当前标的' : 'the current symbol')
  const normalizedIntent = String(intent || '').toLowerCase()
  const base = [
    item('followup_levels', 'technical', 'column-height', isZh ? '展开关键支撑阻力' : 'Expand key support and resistance', isZh
      ? `继续分析 ${symbol}，展开关键支撑位、阻力位、突破确认条件和失效条件。`
      : `Continue the analysis of ${symbol}: expand key support, resistance, breakout confirmation, and invalidation conditions.`),
    item('followup_scenarios', 'diagnosis', 'branches', isZh ? '列出多空触发条件' : 'List bull and bear triggers', isZh
      ? `基于刚才的结论，为 ${symbol} 分别列出看多、看空和继续观望的触发条件，不要把超买直接等同于适合做空。`
      : `Based on the previous answer, list bullish, bearish, and stay-out triggers for ${symbol}. Do not equate overbought conditions with a short signal.`),
    item('followup_plan', 'plan', 'profile', isZh ? '整理成交易计划' : 'Turn this into a trading plan', isZh
      ? `把刚才关于 ${symbol} 的分析整理成交易计划：入场触发、止损、止盈、风险收益比、仓位风险和观望条件。`
      : `Turn the previous analysis of ${symbol} into a trading plan: entry trigger, stop, target, risk/reward, position risk, and stay-out conditions.`),
    item('followup_news', 'news', 'notification', isZh ? '检查最新新闻影响' : 'Check recent news impact', isZh
      ? `检查最新公司、行业和宏观事件是否会改变刚才对 ${symbol} 的判断，区分事实、推断和不确定性。`
      : `Check whether recent company, industry, or macro events change the previous view on ${symbol}. Separate facts, inference, and uncertainty.`),
    item('followup_monitor', 'research', 'clock-circle', isZh ? '设置定时跟踪' : 'Set scheduled tracking', isZh
      ? `为 ${symbol} 设置定时分析，重点跟踪刚才提到的关键价位、趋势变化和风险事件。`
      : `Set scheduled analysis for ${symbol}, focusing on the key levels, trend changes, and risk events mentioned above.`)
  ]
  if (hasReport || normalizedIntent.includes('analysis')) return base
  if (normalizedIntent.includes('news') || normalizedIntent.includes('event')) {
    return [base[1], base[2], base[0], base[4]]
  }
  if (normalizedIntent.includes('macro')) {
    return [base[3], base[1], base[4], base[2]]
  }
  return base.slice(0, 5)
}

export function rankPromptsByUsage (prompts = [], usage = {}) {
  const counts = usage && typeof usage === 'object' ? usage : {}
  return prompts
    .map((entry, index) => ({
      ...entry,
      usageScore: Number(counts[entry.key] || 0),
      originalIndex: index
    }))
    .sort((a, b) => (b.priority + Math.min(b.usageScore, 20)) - (a.priority + Math.min(a.usageScore, 20)) || a.originalIndex - b.originalIndex)
}
