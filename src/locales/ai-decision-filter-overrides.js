const coreKeys = [
  'aiDecisionFilter.title',
  'aiDecisionFilter.strategyHint',
  'aiDecisionFilter.unsupportedStrategy',
  'aiDecisionFilter.quickTradeHint',
  'aiDecisionFilter.rejected',
  'aiDecisionFilter.rejectedHint',
  'aiDecisionFilter.tab',
  'aiDecisionFilter.processTitle',
  'aiDecisionFilter.processHint',
  'aiDecisionFilter.noRecords',
  'aiDecisionFilter.provider',
  'aiDecisionFilter.model',
  'aiDecisionFilter.confidence',
  'aiDecisionFilter.decisionPass',
  'aiDecisionFilter.decisionReject',
  'aiDecisionFilter.decisionSkipped',
  'aiDecisionFilter.fallbackToLlm',
  'aiDecisionFilter.providerUnavailable'
]

const checkKeys = [
  'aiDecisionFilter.check.entry_decision',
  'aiDecisionFilter.check.risk_check',
  'aiDecisionFilter.check.data_quality',
  'aiDecisionFilter.check.signal_alignment',
  'aiDecisionFilter.check.market_regime',
  'aiDecisionFilter.check.execution_quality'
]

const resultKeys = [
  'aiDecisionFilter.checkResult.pass',
  'aiDecisionFilter.checkResult.reject',
  'aiDecisionFilter.checkResult.clear',
  'aiDecisionFilter.checkResult.caution',
  'aiDecisionFilter.checkResult.block',
  'aiDecisionFilter.checkResult.sufficient',
  'aiDecisionFilter.checkResult.partial',
  'aiDecisionFilter.checkResult.insufficient',
  'aiDecisionFilter.checkResult.aligned',
  'aiDecisionFilter.checkResult.mixed',
  'aiDecisionFilter.checkResult.conflict',
  'aiDecisionFilter.checkResult.favorable',
  'aiDecisionFilter.checkResult.neutral',
  'aiDecisionFilter.checkResult.adverse'
]

const reasonKeys = [
  'aiDecisionFilter.reason.jev_entry_approved',
  'aiDecisionFilter.reason.jev_entry_rejected',
  'aiDecisionFilter.reason.jev_entry_rejected:risk_block',
  'aiDecisionFilter.reason.jev_entry_rejected:entry_reject',
  'aiDecisionFilter.reason.jev_entry_rejected:execution_block',
  'aiDecisionFilter.reason.jev_entry_rejected:signal_conflict',
  'aiDecisionFilter.reason.filter_disabled',
  'aiDecisionFilter.reason.exit_orders_are_not_filtered',
  'aiDecisionFilter.reason.strategy_type_not_supported',
  'aiDecisionFilter.reason.ai_not_configured',
  'aiDecisionFilter.reason.ai_provider_unavailable'
]

const settingsKeys = [
  'settings.field.JEV_API_KEY',
  'settings.field.JEV_BASE_URL',
  'settings.field.JEV_MODEL',
  'settings.field.JEV_TIMEOUT_SECONDS',
  'settings.field.JEV_MIN_CONFIDENCE',
  'settings.desc.JEV_API_KEY',
  'settings.desc.JEV_BASE_URL',
  'settings.desc.JEV_MODEL',
  'settings.desc.JEV_TIMEOUT_SECONDS',
  'settings.desc.JEV_MIN_CONFIDENCE'
]

const experienceKeys = [
  'aiDecisionFilter.viewConfidenceDetails',
  'aiDecisionFilter.executionNotSubmitted',
  'aiDecisionFilter.executionReleased',
  'aiDecisionFilter.executionFailOpen',
  'aiDecisionFilter.selectedProbability',
  'aiDecisionFilter.fallbackConfidence',
  'aiDecisionFilter.fallbackAuthentication',
  'aiDecisionFilter.fallbackTimeout',
  'aiDecisionFilter.fallbackInvalidResponse',
  'aiDecisionFilter.fallbackRechecked',
  'aiDecisionFilter.fallbackTechnical',
  'quickTrade.tradeRecords',
  'quickTrade.noTradeRecords'
]

function assign (keys, values) {
  return keys.reduce((messages, key, index) => {
    messages[key] = values[index]
    return messages
  }, {})
}

function locale (core, checks, results, reasons, settings) {
  return {
    ...assign(coreKeys, core),
    ...assign(checkKeys, checks),
    ...assign(resultKeys, results),
    ...assign(reasonKeys, reasons),
    ...assign(settingsKeys, settings)
  }
}

const enUS = locale(
  [
    'AI Decision Filter',
    'JEV or the configured LLM reviews entries before exchange submission. Exit orders always proceed directly.',
    'Grid, DCA, and martingale strategies are not supported yet.',
    'Buy and short actions are reviewed before submission when enabled.',
    'AI blocked this trade',
    'The order did not pass the AI decision filter and was not sent to the exchange.',
    'AI Decisions',
    'AI decision history',
    'Review the provider, outcome, reason, confidence, and latency for every entry check.',
    'No AI decisions yet',
    'Provider', 'Model', 'Confidence', 'Passed', 'Rejected', 'Allowed',
    'JEV was unavailable, so the configured LLM made this decision.',
    'The configured AI provider was unavailable; the entry was allowed and audited.'
  ],
  ['Entry decision', 'Risk check', 'Evidence quality', 'Signal alignment', 'Market regime', 'Execution quality'],
  ['Pass', 'Reject', 'Clear', 'Caution', 'Block', 'Sufficient', 'Partial', 'Insufficient', 'Aligned', 'Mixed', 'Conflict', 'Favorable', 'Neutral', 'Adverse'],
  [
    'JEV found no concrete reason to block this entry.',
    'JEV found a material reason to block this entry.',
    "JEV's risk check found a material concern and blocked this entry.",
    "JEV's entry decision rejected this new exposure.",
    'JEV found a concrete execution issue and blocked this entry.',
    'JEV found a high-confidence conflict between the signal and market regime.',
    'The decision filter is disabled.',
    'Exit orders bypass AI filtering.',
    'This strategy type is not eligible for AI filtering.',
    'No JEV or LLM provider is configured, so the trade was allowed.',
    'AI providers were unavailable, so the trade was allowed under the fail-open policy.'
  ],
  [
    'JEV API Key', 'JEV API URL', 'JEV Model', 'JEV Decision Timeout (seconds)', 'JEV Minimum Confidence',
    'Used for structured pre-trade decisions. JEV is preferred when configured, with the current LLM as fallback.',
    'Base URL for the JEV System One API.',
    'JEV model identifier used for pre-trade decisions.',
    'Falls back to the LLM after this timeout. If all providers fail, the trade is allowed and audited.',
    'JEV results below this confidence use the configured LLM fallback instead of directly allowing or blocking an entry.'
  ]
)

const zhCN = locale(
  [
    'AI 决策过滤',
    '开仓和加仓信号将在送往交易所前由 JEV 或已配置的大模型复核；退出交易始终直接执行。',
    '网格、DCA 和马丁策略暂不支持 AI 决策过滤。',
    '开启后，买入或做空会先进行风险决策。',
    'AI 已拦截本次交易',
    '当前交易未通过 AI 决策过滤，订单未发送到交易所。',
    'AI 决策', 'AI 决策记录', '展示每次开仓过滤的模型、结论、理由、置信度和耗时。', '暂无 AI 决策记录',
    '决策服务', '模型', '置信度', '通过', '拒绝', '放行',
    'JEV 暂时不可用，本次判断已降级到系统配置的大模型。',
    '已配置的 AI 服务不可用，本次开仓已按故障放行规则执行并记录。'
  ],
  ['开仓判断', '风险检查', '证据质量', '信号一致性', '市场状态', '执行质量'],
  ['通过', '拒绝', '无明显风险', '谨慎', '阻断', '充足', '部分可用', '不足', '一致', '信号混合', '冲突', '有利', '中性', '不利'],
  [
    'JEV 判断当前开仓没有明确的阻断风险。', 'JEV 发现了需要阻断本次开仓的风险。', 'JEV 风险检查发现了实质风险，已阻断本次开仓。',
    'JEV 的开仓判断拒绝了本次新增风险敞口。', 'JEV 发现了明确的执行风险，已阻断本次开仓。', 'JEV 高置信度判断交易信号与当前市场状态冲突。',
    '决策过滤未开启。', '退出订单不参与 AI 过滤。', '该策略类型暂不参与 AI 过滤。', '未配置 JEV 或大模型，本次交易已正常放行。',
    'AI 服务暂不可用，本次交易按故障放行规则执行。'
  ],
  [
    'JEV API 密钥', 'JEV API 地址', 'JEV 模型', 'JEV 决策超时（秒）', 'JEV 最低置信度',
    '用于交易前结构化决策。配置后优先使用 JEV，未配置时自动降级到当前大模型。', 'JEV System One API 的基础地址。',
    '用于交易前决策的 JEV 模型标识。', '超过该时间后尝试大模型；全部不可用时放行并记录原因。',
    'JEV 结果低于该置信度时交给已配置的大模型复核，不直接放行或拦截。'
  ]
)

const zhTW = locale(
  [
    'AI 決策過濾', '開倉和加倉訊號送往交易所前會由 JEV 或已設定的大模型複核；退出交易一律直接執行。',
    '網格、DCA 與馬丁策略目前不支援 AI 決策過濾。', '啟用後，買入或做空會先接受風險決策。', 'AI 已攔截本次交易',
    '此訂單未通過 AI 決策過濾，因此未送往交易所。', 'AI 決策', 'AI 決策記錄', '查看每次開倉檢查的服務、結論、原因、置信度與耗時。',
    '尚無 AI 決策記錄', '決策服務', '模型', '置信度', '通過', '拒絕', '放行',
    'JEV 暫時無法使用，本次判斷已改由系統設定的大模型處理。', '已設定的 AI 服務無法使用，本次開倉已依故障放行規則執行並記錄。'
  ],
  ['開倉判斷', '風險檢查', '證據品質', '訊號一致性', '市場狀態', '執行品質'],
  ['通過', '拒絕', '無明顯風險', '謹慎', '阻斷', '充足', '部分可用', '不足', '一致', '訊號混合', '衝突', '有利', '中性', '不利'],
  [
    'JEV 判斷目前開倉沒有明確的阻斷風險。', 'JEV 發現需要阻斷本次開倉的重大風險。', 'JEV 風險檢查發現重大疑慮，已阻斷本次開倉。',
    'JEV 的開倉判斷拒絕了本次新增風險曝險。', 'JEV 發現明確的執行風險，已阻斷本次開倉。', 'JEV 高置信度判斷交易訊號與目前市場狀態衝突。',
    '決策過濾未啟用。', '退出訂單略過 AI 過濾。', '此策略類型不適用 AI 過濾。', '未設定 JEV 或大模型，本次交易已放行。',
    'AI 服務無法使用，本次交易依故障放行規則執行。'
  ],
  [
    'JEV API 金鑰', 'JEV API 位址', 'JEV 模型', 'JEV 決策逾時（秒）', 'JEV 最低置信度',
    '用於交易前結構化決策。設定後優先使用 JEV，並以目前的大模型作為備援。', 'JEV System One API 的基礎位址。',
    '交易前決策使用的 JEV 模型識別碼。', '超過此時間後改用大模型；全部服務失敗時將放行並記錄。',
    'JEV 結果低於此置信度時改由已設定的大模型複核，不直接放行或阻斷。'
  ]
)

const jaJP = locale(
  [
    'AI意思決定フィルター', '注文を取引所へ送信する前に、JEVまたは設定済みLLMが新規・追加エントリーを審査します。決済注文は常に直接実行されます。',
    'グリッド、DCA、マーチンゲール戦略は現在サポートされていません。', '有効にすると、買いまたはショート注文は送信前に審査されます。',
    'AIがこの取引を拒否しました', 'AI意思決定フィルターを通過しなかったため、注文は取引所へ送信されませんでした。',
    'AI意思決定', 'AI意思決定履歴', '各エントリー審査のプロバイダー、結果、理由、信頼度、処理時間を確認できます。', 'AI意思決定はまだありません',
    'プロバイダー', 'モデル', '信頼度', '承認', '拒否', '許可', 'JEVが利用できなかったため、設定済みLLMが判定しました。',
    '設定済みAIプロバイダーが利用できなかったため、エントリーを許可して監査記録に残しました。'
  ],
  ['エントリー判定', 'リスク確認', '証拠品質', 'シグナル整合性', '市場局面', '執行品質'],
  ['通過', '拒否', '問題なし', '注意', 'ブロック', '十分', '一部', '不十分', '整合', '混在', '競合', '有利', '中立', '不利'],
  [
    'JEVはこのエントリーを阻止する明確な理由を検出しませんでした。', 'JEVはこのエントリーを阻止すべき重大な理由を検出しました。',
    'JEVのリスク確認で重大な懸念が見つかり、このエントリーを阻止しました。', 'JEVのエントリー判定が新たなエクスポージャーを拒否しました。',
    'JEVは具体的な執行上の問題を検出し、このエントリーを阻止しました。', 'JEVはシグナルと市場局面の高信頼度な競合を検出しました。',
    '意思決定フィルターは無効です。', '決済注文はAIフィルターを経由しません。', 'この戦略タイプはAIフィルターの対象外です。',
    'JEVまたはLLMが設定されていないため、取引を許可しました。', 'AIプロバイダーが利用できなかったため、フェイルオープン方針で取引を許可しました。'
  ],
  [
    'JEV APIキー', 'JEV API URL', 'JEVモデル', 'JEV判定タイムアウト（秒）', 'JEV最小信頼度',
    '取引前の構造化判定に使用します。設定時はJEVを優先し、現在のLLMをフォールバックとして使用します。', 'JEV System One APIのベースURLです。',
    '取引前判定に使用するJEVモデル識別子です。', 'この時間を超えるとLLMへ切り替えます。すべて失敗した場合は取引を許可して記録します。',
    'JEVの信頼度がこの値を下回る場合、直接許可または拒否せず、設定済みLLMで再判定します。'
  ]
)

const koKR = locale(
  [
    'AI 의사결정 필터', '주문을 거래소에 보내기 전에 JEV 또는 설정된 LLM이 신규·추가 진입을 검토합니다. 청산 주문은 항상 바로 실행됩니다.',
    '그리드, DCA 및 마틴게일 전략은 아직 지원되지 않습니다.', '활성화하면 매수 또는 숏 주문을 전송 전에 검토합니다.', 'AI가 이 거래를 차단했습니다',
    'AI 의사결정 필터를 통과하지 못해 주문이 거래소로 전송되지 않았습니다.', 'AI 의사결정', 'AI 의사결정 기록',
    '각 진입 검토의 제공자, 결과, 사유, 신뢰도 및 지연 시간을 확인합니다.', '아직 AI 의사결정이 없습니다', '제공자', '모델', '신뢰도', '승인', '거부', '허용',
    'JEV를 사용할 수 없어 설정된 LLM이 이번 결정을 내렸습니다.', '설정된 AI 제공자를 사용할 수 없어 진입을 허용하고 감사 기록을 남겼습니다.'
  ],
  ['진입 판단', '위험 점검', '근거 품질', '신호 정합성', '시장 국면', '실행 품질'],
  ['통과', '거부', '이상 없음', '주의', '차단', '충분', '일부', '불충분', '정합', '혼재', '충돌', '유리', '중립', '불리'],
  [
    'JEV는 이 진입을 차단할 구체적인 이유를 찾지 못했습니다.', 'JEV는 이 진입을 차단해야 할 중대한 이유를 확인했습니다.',
    'JEV 위험 점검에서 중대한 우려를 확인해 이 진입을 차단했습니다.', 'JEV 진입 판단이 새로운 익스포저를 거부했습니다.',
    'JEV가 구체적인 실행 문제를 확인해 이 진입을 차단했습니다.', 'JEV가 신호와 시장 국면 사이의 높은 신뢰도 충돌을 확인했습니다.',
    '의사결정 필터가 비활성화되어 있습니다.', '청산 주문은 AI 필터를 거치지 않습니다.', '이 전략 유형은 AI 필터 대상이 아닙니다.',
    'JEV 또는 LLM이 설정되지 않아 거래를 허용했습니다.', 'AI 제공자를 사용할 수 없어 페일 오픈 정책에 따라 거래를 허용했습니다.'
  ],
  [
    'JEV API 키', 'JEV API URL', 'JEV 모델', 'JEV 결정 제한 시간(초)', 'JEV 최소 신뢰도',
    '거래 전 구조화된 의사결정에 사용합니다. 설정 시 JEV를 우선하며 현재 LLM을 대체 수단으로 사용합니다.', 'JEV System One API의 기본 URL입니다.',
    '거래 전 의사결정에 사용할 JEV 모델 식별자입니다.', '제한 시간을 넘으면 LLM으로 전환합니다. 모든 제공자가 실패하면 거래를 허용하고 기록합니다.',
    'JEV 결과가 이 신뢰도보다 낮으면 직접 허용하거나 차단하지 않고 설정된 LLM으로 재검토합니다.'
  ]
)

const deDE = locale(
  [
    'KI-Entscheidungsfilter', 'JEV oder das konfigurierte LLM prüft Einstiege vor der Übermittlung an die Börse. Ausstiegsaufträge werden immer direkt ausgeführt.',
    'Grid-, DCA- und Martingale-Strategien werden noch nicht unterstützt.', 'Wenn aktiviert, werden Kauf- und Short-Aufträge vor dem Senden geprüft.',
    'KI hat diesen Trade blockiert', 'Der Auftrag hat den KI-Entscheidungsfilter nicht bestanden und wurde nicht an die Börse gesendet.',
    'KI-Entscheidungen', 'Verlauf der KI-Entscheidungen', 'Prüfen Sie Anbieter, Ergebnis, Begründung, Konfidenz und Latenz jeder Einstiegsprüfung.',
    'Noch keine KI-Entscheidungen', 'Anbieter', 'Modell', 'Konfidenz', 'Genehmigt', 'Abgelehnt', 'Zugelassen',
    'JEV war nicht verfügbar; das konfigurierte LLM hat diese Entscheidung getroffen.', 'Der konfigurierte KI-Anbieter war nicht verfügbar; der Einstieg wurde zugelassen und protokolliert.'
  ],
  ['Einstiegsentscheidung', 'Risikoprüfung', 'Evidenzqualität', 'Signalausrichtung', 'Marktregime', 'Ausführungsqualität'],
  ['Bestanden', 'Ablehnen', 'Unbedenklich', 'Vorsicht', 'Blockieren', 'Ausreichend', 'Teilweise', 'Unzureichend', 'Ausgerichtet', 'Gemischt', 'Konflikt', 'Günstig', 'Neutral', 'Ungünstig'],
  [
    'JEV fand keinen konkreten Grund, diesen Einstieg zu blockieren.', 'JEV fand einen wesentlichen Grund, diesen Einstieg zu blockieren.',
    'Die Risikoprüfung von JEV erkannte ein wesentliches Problem und blockierte den Einstieg.', 'Die Einstiegsentscheidung von JEV lehnte das neue Risiko ab.',
    'JEV erkannte ein konkretes Ausführungsproblem und blockierte den Einstieg.', 'JEV erkannte mit hoher Konfidenz einen Konflikt zwischen Signal und Marktregime.',
    'Der Entscheidungsfilter ist deaktiviert.', 'Ausstiegsaufträge umgehen den KI-Filter.', 'Dieser Strategietyp ist nicht für den KI-Filter geeignet.',
    'Es ist weder JEV noch ein LLM konfiguriert; der Trade wurde zugelassen.', 'KI-Anbieter waren nicht verfügbar; der Trade wurde gemäß Fail-open-Richtlinie zugelassen.'
  ],
  [
    'JEV-API-Schlüssel', 'JEV-API-URL', 'JEV-Modell', 'JEV-Entscheidungszeitlimit (Sekunden)', 'Minimale JEV-Konfidenz',
    'Für strukturierte Entscheidungen vor dem Trade. Wenn konfiguriert, wird JEV bevorzugt und das aktuelle LLM als Rückfall verwendet.', 'Basis-URL der JEV System One API.',
    'Kennung des JEV-Modells für Entscheidungen vor dem Trade.', 'Nach diesem Zeitlimit wird auf das LLM zurückgegriffen. Fallen alle Anbieter aus, wird der Trade zugelassen und protokolliert.',
    'JEV-Ergebnisse unterhalb dieser Konfidenz werden vom konfigurierten LLM erneut geprüft, statt direkt zuzulassen oder zu blockieren.'
  ]
)

const frFR = locale(
  [
    'Filtre de décision IA', "JEV ou le LLM configuré vérifie les entrées avant leur envoi à la plateforme. Les ordres de sortie sont toujours exécutés directement.",
    'Les stratégies Grid, DCA et martingale ne sont pas encore prises en charge.', "Lorsqu'il est activé, les ordres d'achat et de vente à découvert sont vérifiés avant envoi.",
    'L’IA a bloqué cette transaction', "L’ordre n’a pas réussi le filtre de décision IA et n’a pas été envoyé à la plateforme.",
    'Décisions IA', 'Historique des décisions IA', 'Consultez le fournisseur, le résultat, la raison, la confiance et la latence de chaque contrôle d’entrée.',
    'Aucune décision IA', 'Fournisseur', 'Modèle', 'Confiance', 'Approuvé', 'Refusé', 'Autorisé',
    'JEV était indisponible ; le LLM configuré a pris cette décision.', "Le fournisseur d’IA configuré était indisponible ; l’entrée a été autorisée et auditée."
  ],
  ["Décision d’entrée", 'Contrôle du risque', 'Qualité des éléments', 'Alignement du signal', 'Régime de marché', "Qualité d’exécution"],
  ['Validé', 'Refuser', 'Sans alerte', 'Prudence', 'Bloquer', 'Suffisant', 'Partiel', 'Insuffisant', 'Aligné', 'Mixte', 'Conflit', 'Favorable', 'Neutre', 'Défavorable'],
  [
    'JEV n’a trouvé aucune raison concrète de bloquer cette entrée.', 'JEV a trouvé une raison importante de bloquer cette entrée.',
    'Le contrôle du risque de JEV a détecté un problème important et a bloqué cette entrée.', "La décision d’entrée de JEV a refusé cette nouvelle exposition.",
    "JEV a détecté un problème d’exécution concret et a bloqué cette entrée.", 'JEV a détecté avec une forte confiance un conflit entre le signal et le régime de marché.',
    'Le filtre de décision est désactivé.', 'Les ordres de sortie contournent le filtre IA.', "Ce type de stratégie n’est pas admissible au filtre IA.",
    'Aucun fournisseur JEV ou LLM n’est configuré ; la transaction a été autorisée.', 'Les fournisseurs d’IA étaient indisponibles ; la transaction a été autorisée selon la politique de tolérance aux pannes.'
  ],
  [
    'Clé API JEV', 'URL API JEV', 'Modèle JEV', 'Délai de décision JEV (secondes)', 'Confiance minimale JEV',
    'Utilisé pour les décisions structurées avant transaction. JEV est prioritaire lorsqu’il est configuré, avec le LLM actuel en secours.', 'URL de base de l’API JEV System One.',
    'Identifiant du modèle JEV utilisé pour les décisions avant transaction.', 'Après ce délai, le LLM prend le relais. Si tous les fournisseurs échouent, la transaction est autorisée et auditée.',
    'Les résultats JEV sous ce seuil de confiance sont revérifiés par le LLM configuré au lieu d’être directement autorisés ou bloqués.'
  ]
)

const ruRU = locale(
  [
    'Фильтр решений ИИ', 'JEV или настроенная LLM проверяет входы до отправки на биржу. Приказы на выход всегда исполняются напрямую.',
    'Сеточные стратегии, DCA и мартингейл пока не поддерживаются.', 'При включении покупки и короткие позиции проверяются до отправки.',
    'ИИ заблокировал сделку', 'Ордер не прошёл фильтр решений ИИ и не был отправлен на биржу.', 'Решения ИИ', 'История решений ИИ',
    'Просматривайте поставщика, результат, причину, уверенность и задержку каждой проверки входа.', 'Решений ИИ пока нет', 'Поставщик', 'Модель', 'Уверенность',
    'Одобрено', 'Отклонено', 'Разрешено', 'JEV был недоступен, поэтому решение приняла настроенная LLM.',
    'Настроенный поставщик ИИ был недоступен; вход разрешён и записан в журнал аудита.'
  ],
  ['Решение о входе', 'Проверка риска', 'Качество данных', 'Согласованность сигнала', 'Режим рынка', 'Качество исполнения'],
  ['Пройдено', 'Отклонить', 'Без замечаний', 'Осторожно', 'Блокировать', 'Достаточно', 'Частично', 'Недостаточно', 'Согласовано', 'Смешано', 'Конфликт', 'Благоприятно', 'Нейтрально', 'Неблагоприятно'],
  [
    'JEV не обнаружил конкретной причины блокировать этот вход.', 'JEV обнаружил существенную причину блокировать этот вход.',
    'Проверка риска JEV выявила существенную проблему и заблокировала вход.', 'Решение JEV о входе отклонило новую экспозицию.',
    'JEV выявил конкретную проблему исполнения и заблокировал вход.', 'JEV с высокой уверенностью выявил конфликт сигнала с режимом рынка.',
    'Фильтр решений отключён.', 'Приказы на выход обходят фильтр ИИ.', 'Этот тип стратегии не поддерживает фильтрацию ИИ.',
    'JEV или LLM не настроены, поэтому сделка разрешена.', 'Поставщики ИИ были недоступны, поэтому сделка разрешена по политике fail-open.'
  ],
  [
    'Ключ API JEV', 'URL API JEV', 'Модель JEV', 'Тайм-аут решения JEV (секунды)', 'Минимальная уверенность JEV',
    'Используется для структурированных решений до сделки. При настройке приоритет имеет JEV, а текущая LLM служит резервом.', 'Базовый URL API JEV System One.',
    'Идентификатор модели JEV для решений до сделки.', 'После этого тайм-аута используется LLM. Если все поставщики недоступны, сделка разрешается и записывается.',
    'Результаты JEV ниже этого порога уверенности передаются настроенной LLM для повторной проверки, а не разрешаются или блокируются напрямую.'
  ]
)

const arSA = locale(
  [
    'مرشح قرارات الذكاء الاصطناعي', 'يراجع JEV أو نموذج اللغة المُعدّ أوامر الدخول قبل إرسالها إلى المنصة، بينما تُنفذ أوامر الخروج مباشرة دائماً.',
    'استراتيجيات الشبكة وDCA والمارتينجال غير مدعومة حالياً.', 'عند التفعيل، تُراجع أوامر الشراء والبيع على المكشوف قبل إرسالها.',
    'حظر الذكاء الاصطناعي هذه الصفقة', 'لم يجتز الأمر مرشح قرارات الذكاء الاصطناعي، لذلك لم يُرسل إلى المنصة.',
    'قرارات الذكاء الاصطناعي', 'سجل قرارات الذكاء الاصطناعي', 'راجع المزود والنتيجة والسبب والثقة وزمن الاستجابة لكل فحص دخول.',
    'لا توجد قرارات بعد', 'المزود', 'النموذج', 'الثقة', 'مقبول', 'مرفوض', 'مسموح',
    'تعذر استخدام JEV، لذا اتخذ نموذج اللغة المُعدّ هذا القرار.', 'تعذر استخدام مزود الذكاء الاصطناعي المُعدّ؛ سُمح بالدخول وسُجل للتدقيق.'
  ],
  ['قرار الدخول', 'فحص المخاطر', 'جودة الأدلة', 'توافق الإشارة', 'حالة السوق', 'جودة التنفيذ'],
  ['اجتاز', 'رفض', 'سليم', 'حذر', 'حظر', 'كافٍ', 'جزئي', 'غير كافٍ', 'متوافق', 'مختلط', 'متعارض', 'ملائم', 'محايد', 'غير ملائم'],
  [
    'لم يجد JEV سبباً واضحاً لحظر هذا الدخول.', 'وجد JEV سبباً جوهرياً لحظر هذا الدخول.', 'كشف فحص المخاطر في JEV عن مشكلة جوهرية وحظر الدخول.',
    'رفض قرار الدخول في JEV هذا التعرض الجديد.', 'كشف JEV عن مشكلة تنفيذ واضحة وحظر الدخول.', 'كشف JEV بثقة عالية عن تعارض بين الإشارة وحالة السوق.',
    'مرشح القرارات معطل.', 'أوامر الخروج تتجاوز مرشح الذكاء الاصطناعي.', 'نوع الاستراتيجية هذا غير مؤهل للترشيح بالذكاء الاصطناعي.',
    'لم يتم إعداد JEV أو نموذج لغة، لذلك سُمح بالصفقة.', 'تعذر استخدام مزودي الذكاء الاصطناعي، لذلك سُمح بالصفقة وفق سياسة السماح عند التعطل.'
  ],
  [
    'مفتاح JEV API', 'عنوان JEV API', 'نموذج JEV', 'مهلة قرار JEV (ثوانٍ)', 'الحد الأدنى لثقة JEV',
    'يُستخدم للقرارات المنظمة قبل التداول. تكون الأولوية لـ JEV عند إعداده، مع نموذج اللغة الحالي كخيار احتياطي.', 'عنوان الأساس لواجهة JEV System One API.',
    'معرّف نموذج JEV المستخدم لقرارات ما قبل التداول.', 'بعد انتهاء المهلة يُستخدم نموذج اللغة. إذا فشل جميع المزودين، تُسمح الصفقة وتُسجل.',
    'تُرسل نتائج JEV الأقل من هذا الحد إلى نموذج اللغة المُعدّ للمراجعة بدلاً من السماح أو الحظر مباشرة.'
  ]
)

const thTH = locale(
  [
    'ตัวกรองการตัดสินใจด้วย AI', 'JEV หรือ LLM ที่กำหนดจะตรวจสอบการเข้าเทรดก่อนส่งไปยังตลาด ส่วนคำสั่งออกจะดำเนินการโดยตรงเสมอ',
    'ยังไม่รองรับกลยุทธ์ Grid, DCA และ Martingale', 'เมื่อเปิดใช้งาน คำสั่งซื้อและเปิดชอร์ตจะถูกตรวจสอบก่อนส่ง',
    'AI บล็อกการซื้อขายนี้', 'คำสั่งไม่ผ่านตัวกรองการตัดสินใจด้วย AI จึงไม่ได้ส่งไปยังตลาด', 'การตัดสินใจของ AI', 'ประวัติการตัดสินใจของ AI',
    'ตรวจสอบผู้ให้บริการ ผลลัพธ์ เหตุผล ความมั่นใจ และเวลาแฝงของการตรวจสอบแต่ละครั้ง', 'ยังไม่มีการตัดสินใจของ AI', 'ผู้ให้บริการ', 'โมเดล',
    'ความมั่นใจ', 'อนุมัติ', 'ปฏิเสธ', 'อนุญาต', 'JEV ใช้งานไม่ได้ จึงใช้ LLM ที่กำหนดในการตัดสินใจครั้งนี้',
    'ผู้ให้บริการ AI ที่กำหนดใช้งานไม่ได้ จึงอนุญาตการเข้าเทรดและบันทึกไว้เพื่อตรวจสอบ'
  ],
  ['การตัดสินใจเข้าเทรด', 'ตรวจสอบความเสี่ยง', 'คุณภาพหลักฐาน', 'ความสอดคล้องของสัญญาณ', 'สภาวะตลาด', 'คุณภาพการดำเนินการ'],
  ['ผ่าน', 'ปฏิเสธ', 'ปกติ', 'ระวัง', 'บล็อก', 'เพียงพอ', 'บางส่วน', 'ไม่เพียงพอ', 'สอดคล้อง', 'ผสม', 'ขัดแย้ง', 'เอื้ออำนวย', 'เป็นกลาง', 'ไม่เอื้ออำนวย'],
  [
    'JEV ไม่พบเหตุผลชัดเจนที่จะบล็อกการเข้าเทรดนี้', 'JEV พบเหตุผลสำคัญที่จะบล็อกการเข้าเทรดนี้', 'การตรวจสอบความเสี่ยงของ JEV พบข้อกังวลสำคัญและบล็อกการเข้าเทรด',
    'การตัดสินใจเข้าเทรดของ JEV ปฏิเสธความเสี่ยงใหม่นี้', 'JEV พบปัญหาการดำเนินการที่ชัดเจนและบล็อกการเข้าเทรด', 'JEV พบความขัดแย้งที่มีความมั่นใจสูงระหว่างสัญญาณกับสภาวะตลาด',
    'ตัวกรองการตัดสินใจถูกปิดใช้งาน', 'คำสั่งออกไม่ผ่านตัวกรอง AI', 'กลยุทธ์ประเภทนี้ไม่รองรับตัวกรอง AI',
    'ไม่ได้กำหนด JEV หรือ LLM จึงอนุญาตการซื้อขาย', 'ผู้ให้บริการ AI ใช้งานไม่ได้ จึงอนุญาตการซื้อขายตามนโยบาย fail-open'
  ],
  [
    'คีย์ JEV API', 'URL ของ JEV API', 'โมเดล JEV', 'เวลารอการตัดสินใจ JEV (วินาที)', 'ความมั่นใจขั้นต่ำของ JEV',
    'ใช้สำหรับการตัดสินใจก่อนเทรดแบบมีโครงสร้าง เมื่อกำหนดแล้วจะใช้ JEV ก่อน และใช้ LLM ปัจจุบันเป็นตัวสำรอง', 'URL พื้นฐานของ JEV System One API',
    'ตัวระบุโมเดล JEV สำหรับการตัดสินใจก่อนเทรด', 'เมื่อหมดเวลาจะเปลี่ยนไปใช้ LLM หากผู้ให้บริการทั้งหมดล้มเหลว จะอนุญาตการซื้อขายและบันทึกไว้',
    'ผลลัพธ์ JEV ที่ต่ำกว่าความมั่นใจนี้จะส่งให้ LLM ที่กำหนดตรวจสอบ แทนการอนุญาตหรือบล็อกโดยตรง'
  ]
)

const viVN = locale(
  [
    'Bộ lọc quyết định AI', 'JEV hoặc LLM đã cấu hình sẽ đánh giá lệnh vào trước khi gửi tới sàn. Lệnh thoát luôn được thực hiện trực tiếp.',
    'Chiến lược Grid, DCA và Martingale hiện chưa được hỗ trợ.', 'Khi bật, lệnh mua và mở vị thế bán sẽ được đánh giá trước khi gửi.',
    'AI đã chặn giao dịch này', 'Lệnh không vượt qua bộ lọc quyết định AI nên không được gửi tới sàn.', 'Quyết định AI', 'Lịch sử quyết định AI',
    'Xem nhà cung cấp, kết quả, lý do, độ tin cậy và độ trễ của mỗi lần kiểm tra lệnh vào.', 'Chưa có quyết định AI', 'Nhà cung cấp', 'Mô hình',
    'Độ tin cậy', 'Đã duyệt', 'Từ chối', 'Cho phép', 'JEV không khả dụng nên LLM đã cấu hình đã đưa ra quyết định này.',
    'Nhà cung cấp AI đã cấu hình không khả dụng; lệnh vào được cho phép và ghi lại để kiểm tra.'
  ],
  ['Quyết định vào lệnh', 'Kiểm tra rủi ro', 'Chất lượng bằng chứng', 'Độ đồng thuận tín hiệu', 'Trạng thái thị trường', 'Chất lượng khớp lệnh'],
  ['Đạt', 'Từ chối', 'Không có cảnh báo', 'Thận trọng', 'Chặn', 'Đủ', 'Một phần', 'Không đủ', 'Đồng thuận', 'Hỗn hợp', 'Xung đột', 'Thuận lợi', 'Trung lập', 'Bất lợi'],
  [
    'JEV không tìm thấy lý do cụ thể để chặn lệnh vào này.', 'JEV tìm thấy lý do quan trọng để chặn lệnh vào này.', 'Kiểm tra rủi ro của JEV phát hiện vấn đề đáng kể và đã chặn lệnh vào.',
    'Quyết định vào lệnh của JEV đã từ chối mức phơi nhiễm mới này.', 'JEV phát hiện vấn đề khớp lệnh cụ thể và đã chặn lệnh vào.', 'JEV phát hiện xung đột có độ tin cậy cao giữa tín hiệu và trạng thái thị trường.',
    'Bộ lọc quyết định đang tắt.', 'Lệnh thoát bỏ qua bộ lọc AI.', 'Loại chiến lược này không đủ điều kiện dùng bộ lọc AI.',
    'Chưa cấu hình JEV hoặc LLM nên giao dịch được cho phép.', 'Các nhà cung cấp AI không khả dụng nên giao dịch được cho phép theo chính sách fail-open.'
  ],
  [
    'Khóa JEV API', 'URL JEV API', 'Mô hình JEV', 'Thời gian chờ quyết định JEV (giây)', 'Độ tin cậy tối thiểu của JEV',
    'Dùng cho quyết định có cấu trúc trước giao dịch. Khi được cấu hình, JEV được ưu tiên và LLM hiện tại là phương án dự phòng.', 'URL cơ sở của JEV System One API.',
    'Mã mô hình JEV dùng cho quyết định trước giao dịch.', 'Sau thời gian này hệ thống chuyển sang LLM. Nếu mọi nhà cung cấp đều thất bại, giao dịch được cho phép và ghi lại.',
    'Kết quả JEV dưới ngưỡng tin cậy này sẽ được LLM đã cấu hình đánh giá lại thay vì cho phép hoặc chặn trực tiếp.'
  ]
)

const experience = {
  'en-US': ['Confidence details', 'Not sent to exchange', 'Released to order pipeline', 'Allowed by fallback policy', 'Selected probability', 'JEV confidence was below the configured threshold, so the LLM rechecked this decision.', 'JEV authentication failed. Check the saved API key and account access.', 'JEV exceeded the configured timeout, so the LLM rechecked this decision.', 'JEV returned an invalid or incomplete structured response, so the LLM rechecked this decision.', 'JEV did not produce a directly usable result, so the LLM rechecked this decision.', 'Technical reason', 'Trade Records', 'No trade records'],
  'zh-CN': ['置信度详情', '未提交交易所', '已放行至下单流程', '按降级策略放行', '选项概率', 'JEV 置信度低于当前阈值，本次已交由系统大模型复核。', 'JEV 鉴权失败，请检查已保存的 API 密钥和账户权限。', 'JEV 超过了配置的超时时间，本次已交由系统大模型复核。', 'JEV 返回的结构化结果无效或不完整，本次已交由系统大模型复核。', 'JEV 未产生可直接采纳的结果，本次已交由系统大模型复核。', '技术原因', '交易记录', '暂无交易记录'],
  'zh-TW': ['置信度詳情', '未送往交易所', '已放行至下單流程', '依降級策略放行', '選項機率', 'JEV 置信度低於目前門檻，本次已交由系統大模型複核。', 'JEV 驗證失敗，請檢查已儲存的 API 金鑰與帳戶權限。', 'JEV 超過設定的逾時時間，本次已交由系統大模型複核。', 'JEV 回傳的結構化結果無效或不完整，本次已交由系統大模型複核。', 'JEV 未產生可直接採用的結果，本次已交由系統大模型複核。', '技術原因', '交易記錄', '暫無交易記錄'],
  'ja-JP': ['信頼度の詳細', '取引所へ未送信', '注文処理へ送信済み', 'フォールバック方針で許可', '選択確率', 'JEVの信頼度が設定値を下回ったため、LLMが再確認しました。', 'JEV認証に失敗しました。保存済みAPIキーと権限を確認してください。', 'JEVが設定タイムアウトを超えたため、LLMが再確認しました。', 'JEVの構造化応答が無効または不完全なため、LLMが再確認しました。', 'JEVから直接採用できる結果が得られなかったため、LLMが再確認しました。', '技術的な理由', '取引記録', '取引記録はありません'],
  'ko-KR': ['신뢰도 세부 정보', '거래소로 전송되지 않음', '주문 절차로 전달됨', '대체 정책에 따라 허용', '선택 확률', 'JEV 신뢰도가 설정 임계값보다 낮아 LLM이 다시 검토했습니다.', 'JEV 인증에 실패했습니다. 저장된 API 키와 권한을 확인하세요.', 'JEV가 설정된 제한 시간을 초과해 LLM이 다시 검토했습니다.', 'JEV 구조화 응답이 유효하지 않거나 불완전하여 LLM이 다시 검토했습니다.', 'JEV가 직접 사용할 수 있는 결과를 만들지 못해 LLM이 다시 검토했습니다.', '기술적 사유', '거래 기록', '거래 기록이 없습니다'],
  'de-DE': ['Konfidenzdetails', 'Nicht an die Börse gesendet', 'An den Orderprozess freigegeben', 'Durch Fallback-Regel zugelassen', 'Auswahlwahrscheinlichkeit', 'Die JEV-Konfidenz lag unter dem Grenzwert; das LLM prüfte erneut.', 'JEV-Authentifizierung fehlgeschlagen. API-Schlüssel und Berechtigungen prüfen.', 'JEV überschritt das Zeitlimit; das LLM prüfte erneut.', 'JEV lieferte eine ungültige oder unvollständige strukturierte Antwort; das LLM prüfte erneut.', 'JEV lieferte kein direkt nutzbares Ergebnis; das LLM prüfte erneut.', 'Technischer Grund', 'Handelsprotokoll', 'Keine Handelsdaten'],
  'fr-FR': ['Détails de confiance', 'Non envoyé à la plateforme', "Transmis au flux d'ordre", 'Autorisé par la règle de repli', 'Probabilité choisie', 'La confiance JEV était sous le seuil configuré ; le LLM a revérifié la décision.', "L’authentification JEV a échoué. Vérifiez la clé API et les droits du compte.", 'JEV a dépassé le délai configuré ; le LLM a revérifié la décision.', 'JEV a renvoyé une réponse structurée invalide ou incomplète ; le LLM a revérifié la décision.', 'JEV n’a pas produit de résultat directement exploitable ; le LLM a revérifié la décision.', 'Raison technique', 'Historique des transactions', 'Aucune transaction'],
  'ru-RU': ['Детали уверенности', 'Не отправлено на биржу', 'Передано в контур исполнения', 'Разрешено резервной политикой', 'Вероятность выбора', 'Уверенность JEV была ниже порога, поэтому LLM перепроверила решение.', 'Ошибка аутентификации JEV. Проверьте API-ключ и права аккаунта.', 'JEV превысил тайм-аут, поэтому LLM перепроверила решение.', 'JEV вернул некорректный или неполный структурированный ответ, поэтому LLM перепроверила решение.', 'JEV не выдал пригодный для прямого использования результат, поэтому LLM перепроверила решение.', 'Техническая причина', 'История сделок', 'Нет записей о сделках'],
  'ar-SA': ['تفاصيل الثقة', 'لم يُرسل إلى المنصة', 'تم تمريره إلى مسار الأوامر', 'مسموح وفق سياسة التراجع', 'احتمال الخيار', 'كانت ثقة JEV دون الحد المحدد، لذا أعاد نموذج اللغة التحقق من القرار.', 'فشلت مصادقة JEV. تحقق من مفتاح API وصلاحيات الحساب.', 'تجاوز JEV المهلة المحددة، لذا أعاد نموذج اللغة التحقق من القرار.', 'أعاد JEV استجابة منظمة غير صالحة أو غير مكتملة، لذا أعاد نموذج اللغة التحقق.', 'لم ينتج JEV نتيجة قابلة للاستخدام مباشرة، لذا أعاد نموذج اللغة التحقق.', 'السبب التقني', 'سجل التداول', 'لا توجد سجلات تداول'],
  'th-TH': ['รายละเอียดความมั่นใจ', 'ไม่ได้ส่งไปยังตลาด', 'ส่งต่อไปยังกระบวนการสั่งซื้อแล้ว', 'อนุญาตตามนโยบายสำรอง', 'ความน่าจะเป็นที่เลือก', 'ความมั่นใจของ JEV ต่ำกว่าเกณฑ์ที่กำหนด จึงให้ LLM ตรวจสอบอีกครั้ง', 'การยืนยันตัวตน JEV ล้มเหลว โปรดตรวจสอบคีย์ API และสิทธิ์บัญชี', 'JEV ใช้เวลาเกินกำหนด จึงให้ LLM ตรวจสอบอีกครั้ง', 'JEV ส่งผลลัพธ์แบบมีโครงสร้างที่ไม่ถูกต้องหรือไม่ครบ จึงให้ LLM ตรวจสอบอีกครั้ง', 'JEV ไม่ได้สร้างผลลัพธ์ที่ใช้ได้โดยตรง จึงให้ LLM ตรวจสอบอีกครั้ง', 'เหตุผลทางเทคนิค', 'บันทึกการซื้อขาย', 'ไม่มีบันทึกการซื้อขาย'],
  'vi-VN': ['Chi tiết độ tin cậy', 'Chưa gửi tới sàn', 'Đã chuyển sang quy trình đặt lệnh', 'Được cho phép theo chính sách dự phòng', 'Xác suất lựa chọn', 'Độ tin cậy JEV thấp hơn ngưỡng cấu hình nên LLM đã đánh giá lại.', 'Xác thực JEV thất bại. Hãy kiểm tra khóa API và quyền tài khoản.', 'JEV vượt quá thời gian chờ cấu hình nên LLM đã đánh giá lại.', 'JEV trả về phản hồi có cấu trúc không hợp lệ hoặc chưa đầy đủ nên LLM đã đánh giá lại.', 'JEV không tạo được kết quả có thể dùng trực tiếp nên LLM đã đánh giá lại.', 'Lý do kỹ thuật', 'Lịch sử giao dịch', 'Chưa có lịch sử giao dịch']
}

function withExperience (localeCode, messages) {
  return { ...messages, ...assign(experienceKeys, experience[localeCode]) }
}

export default {
  'ar-SA': withExperience('ar-SA', arSA),
  'de-DE': withExperience('de-DE', deDE),
  'en-US': withExperience('en-US', enUS),
  'fr-FR': withExperience('fr-FR', frFR),
  'ja-JP': withExperience('ja-JP', jaJP),
  'ko-KR': withExperience('ko-KR', koKR),
  'ru-RU': withExperience('ru-RU', ruRU),
  'th-TH': withExperience('th-TH', thTH),
  'vi-VN': withExperience('vi-VN', viVN),
  'zh-CN': withExperience('zh-CN', zhCN),
  'zh-TW': withExperience('zh-TW', zhTW)
}
