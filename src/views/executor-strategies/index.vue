<template>
  <div class="executor-page qd-workspace-page" :class="{ 'theme-dark': isDarkTheme, 'is-embedded': embedded }">
    <header v-if="!embedded" class="executor-header">
      <div>
        <div class="executor-kicker">{{ t('executorStrategies.kicker') }}</div>
        <h1>{{ t('executorStrategies.title') }}</h1>
        <p>{{ t('executorStrategies.subtitle') }}</p>
      </div>
      <div class="executor-header-actions">
        <a-button icon="reload" :loading="loadingTemplates" @click="loadTemplates">{{ t('executorStrategies.reload') }}</a-button>
        <a-button type="primary" icon="plus" :loading="creating" @click="createStrategy">{{ t('executorStrategies.create') }}</a-button>
      </div>
    </header>

    <main class="executor-workbench">
      <aside class="executor-catalog">
        <div class="panel-title panel-title--between">
          <span><b class="panel-step">1</b><a-icon type="appstore" />{{ t('executorStrategies.catalog') }}</span>
          <span v-if="embedded" class="safe-mode-pill">
            <a-icon type="safety-certificate" />
            {{ t('executorStrategies.compatibility.badge') }}
          </span>
        </div>
        <button
          v-for="item in executorCatalog"
          :key="item.key"
          type="button"
          class="catalog-item"
          :data-testid="`robot-template-${item.key}`"
          :class="{ active: form.executor_type === item.key, disabled: item.disabled }"
          :disabled="item.disabled"
          @click="selectExecutor(item.key)"
        >
          <span class="catalog-icon"><a-icon :type="item.icon" /></span>
          <span class="catalog-copy">
            <strong>{{ t(item.titleKey) }}</strong>
            <small>{{ t(item.descKey) }}</small>
          </span>
          <a-tag :color="item.disabled ? 'default' : undefined" :class="{ 'theme-accent-tag': !item.disabled }">
            {{ t(item.badgeKey) }}
          </a-tag>
        </button>
      </aside>

      <section class="executor-config-panel">
        <div class="panel-title panel-title--between">
          <span><b class="panel-step">2</b><a-icon type="setting" />{{ t('executorStrategies.config') }}</span>
          <a-tag class="theme-accent-tag">{{ executorTypeText(form.executor_type) }}</a-tag>
        </div>

        <div class="executor-config-scroll">
          <div class="section-title">{{ t('executorStrategies.section.market') }}</div>
          <div class="market-compact-grid">
            <div class="field-block">
              <label>{{ t('executorStrategies.symbol') }}</label>
              <a-select
                v-model="form.symbol"
                show-search
                option-filter-prop="children"
                :loading="loadingWatchlist"
                :not-found-content="t('executorStrategies.watchlistEmpty')"
                :dropdown-style="{ maxHeight: '360px', overflowY: 'auto' }"
                data-testid="robot-symbol-select"
                @dropdownVisibleChange="onSymbolDropdownVisibleChange">
                <a-select-option
                  v-for="item in watchlistOptions"
                  :key="`${item.market}:${item.symbol}`"
                  :value="item.symbol">
                  {{ item.symbol }}<span v-if="item.name"> · {{ item.name }}</span>
                </a-select-option>
              </a-select>
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.side') }}</label>
              <a-radio-group v-model="form.side" class="compact-segmented" button-style="solid" @change="handleSideChange">
                <a-radio-button value="long">{{ t('executorStrategies.long') }}</a-radio-button>
                <a-radio-button v-if="!isDca" value="short" :disabled="form.market_type === 'spot'">{{ t('executorStrategies.short') }}</a-radio-button>
                <a-radio-button
                  v-if="form.executor_type === 'grid'"
                  value="neutral"
                  :disabled="form.market_type === 'spot'">
                  {{ t('executorStrategies.neutral') }}
                </a-radio-button>
              </a-radio-group>
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.marketType') }}</label>
              <a-radio-group
                v-model="form.market_type"
                class="compact-segmented"
                button-style="solid"
                @change="handleMarketTypeChange">
                <a-radio-button v-if="!isDca" value="swap">{{ t('executorStrategies.swap') }}</a-radio-button>
                <a-radio-button value="spot">{{ t('executorStrategies.spot') }}</a-radio-button>
              </a-radio-group>
            </div>
          </div>
          <a-alert
            v-if="isDca"
            class="dca-market-notice"
            type="success"
            show-icon
            :message="t('executorStrategies.dcaSpotLongOnly')" />

          <div class="trigger-contract-card">
            <span class="trigger-contract-card__icon"><a-icon type="thunderbolt" /></span>
            <div>
              <strong>{{ triggerModeTitle }}</strong>
              <p>{{ triggerModeDescription }}</p>
              <div class="trigger-contract-card__tags">
                <a-tag color="blue">{{ t('executorStrategies.trigger.riskRealtime') }}</a-tag>
                <a-tag class="theme-accent-tag">{{ t('executorStrategies.trigger.fillReconciled') }}</a-tag>
              </div>
            </div>
          </div>

          <div v-if="!embedded" class="field-block">
            <label>{{ t('executorStrategies.executionMode') }}</label>
            <a-radio-group v-model="form.execution_mode" class="compact-segmented compact-segmented--auto" button-style="solid">
              <a-radio-button value="live">{{ t('executorStrategies.live') }}</a-radio-button>
              <a-radio-button value="signal">{{ t('executorStrategies.signal') }}</a-radio-button>
            </a-radio-group>
          </div>

          <div v-if="!embedded && form.execution_mode === 'live'" class="executor-live-account">
            <div class="field-block">
              <label>{{ t('trading-assistant.form.savedCredential') }}</label>
              <div class="executor-live-account__row">
                <a-select
                  v-model="form.credential_id"
                  allow-clear
                  show-search
                  option-filter-prop="children"
                  :loading="loadingCredentials"
                  :placeholder="t('trading-assistant.placeholders.selectSavedCredential')">
                  <a-select-option
                    v-for="credential in cryptoCredentials"
                    :key="credential.id"
                    :value="credential.id">
                    {{ credentialLabel(credential) }}
                  </a-select-option>
                </a-select>
                <a-button icon="bank" @click="$router.push('/broker-accounts')">
                  {{ t('menu.dashboard.brokerAccounts') }}
                </a-button>
              </div>
            </div>
            <a-alert
              v-if="!loadingCredentials && !cryptoCredentials.length"
              type="warning"
              show-icon
              :message="t('trading-assistant.noCredentialForLive.title')"
              :description="t('trading-assistant.noCredentialForLive.desc')" />
          </div>

          <div class="section-title">{{ t('executorStrategies.section.capitalRisk') }}</div>
          <div v-if="supportsTrailingTakeProfit" class="risk-layer-card cycle-risk-card">
            <div class="risk-layer-card__header">
              <div>
                <strong>{{ t('executorStrategies.cycleRiskTitle') }}</strong>
                <small>{{ t('executorStrategies.cycleRiskHint') }}</small>
              </div>
              <span class="risk-scope-badge">{{ t('executorStrategies.cycleRiskScope') }}</span>
            </div>

            <div class="profit-exit-mode">
              <label>{{ t('executorStrategies.cycleProfitExitMode') }}</label>
              <a-radio-group v-model="cycleProfitMode" button-style="solid" size="small">
                <a-radio-button value="fixed">
                  {{ t('executorStrategies.cycleProfitFixed') }}
                </a-radio-button>
                <a-radio-button value="trailing">
                  {{ t('executorStrategies.cycleProfitTrailing') }}
                </a-radio-button>
              </a-radio-group>
            </div>

            <div class="field-grid">
              <div v-if="cycleProfitMode === 'fixed'" class="field-block">
                <label>{{ t('executorStrategies.fixedTakeProfitPct') }}</label>
                <a-input-number
                  v-model="takeProfitPctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('take_profit_pct', value)" />
                <small class="field-hint">{{ t('executorStrategies.fixedTakeProfitHint') }}</small>
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.hardStopPct') }}</label>
                <a-input-number
                  v-model="hardStopPctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('hard_stop_pct', value)" />
                <small class="field-hint">{{ t('executorStrategies.hardStopHint') }}</small>
              </div>
            </div>

            <div v-if="cycleProfitMode === 'trailing'" class="trailing-config">
              <div class="trailing-config__intro">
                <strong>{{ t('executorStrategies.trailingTakeProfit') }}</strong>
                <small>{{ t('executorStrategies.trailingTakeProfitHint') }}</small>
              </div>
              <div class="field-grid">
                <div class="field-block">
                  <label>{{ t('executorStrategies.trailingActivationPct') }}</label>
                  <a-input-number
                    v-model="trailingActivationPctDisplay"
                    :min="0.01"
                    :max="100"
                    :step="0.1"
                    :precision="3"
                    style="width: 100%"
                    @change="value => setRatio('trailing_activation_pct', value)" />
                  <small class="field-hint">{{ t('executorStrategies.trailingActivationHint') }}</small>
                </div>
                <div class="field-block">
                  <label>{{ t('executorStrategies.trailingCallbackPct') }}</label>
                  <a-input-number
                    v-model="trailingCallbackPctDisplay"
                    :min="0.01"
                    :max="100"
                    :step="0.05"
                    :precision="3"
                    style="width: 100%"
                    @change="value => setRatio('trailing_callback_pct', value)" />
                  <small class="field-hint">{{ t('executorStrategies.trailingCallbackHint') }}</small>
                </div>
              </div>
            </div>
          </div>

          <div class="risk-layer-card equity-risk-card">
            <div class="risk-layer-card__header">
              <div>
                <strong>{{ t('executorStrategies.equityRiskTitle') }}</strong>
                <small>{{ t('executorStrategies.equityRiskHint') }}</small>
              </div>
              <span class="risk-scope-badge risk-scope-badge--stop">{{ t('executorStrategies.equityRiskScope') }}</span>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.equityTakeProfitPct') }}</label>
                <a-input-number
                  v-model="equityTakeProfitPctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.5"
                  :precision="2"
                  style="width: 100%"
                  @change="value => setRatio('equity_take_profit_pct', value)" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.equityStopLossPct') }}</label>
                <a-input-number
                  v-model="equityStopLossPctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.5"
                  :precision="2"
                  style="width: 100%"
                  @change="value => setRatio('equity_stop_loss_pct', value)" />
              </div>
            </div>
            <div class="risk-layer-card__header equity-trailing-toggle">
              <div>
                <strong>{{ t('executorStrategies.equityTrailingTitle') }}</strong>
                <small>{{ t('executorStrategies.equityTrailingHint') }}</small>
              </div>
              <a-switch v-model="form.equity_trailing_enabled" />
            </div>
            <div v-if="form.equity_trailing_enabled" class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.equityTrailingActivationPct') }}</label>
                <a-input-number
                  v-model="equityTrailingActivationPctDisplay"
                  :min="0.01"
                  :max="100"
                  :step="0.5"
                  :precision="2"
                  style="width: 100%"
                  @change="value => setRatio('equity_trailing_activation_pct', value)" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.equityTrailingCallbackPct') }}</label>
                <a-input-number
                  v-model="equityTrailingCallbackPctDisplay"
                  :min="0.01"
                  :max="100"
                  :step="0.5"
                  :precision="2"
                  style="width: 100%"
                  @change="value => setRatio('equity_trailing_callback_pct', value)" />
              </div>
            </div>
          </div>

          <a-alert
            v-if="isMartingale"
            class="martingale-budget-notice"
            type="info"
            show-icon
            :message="t('executorStrategies.martingaleFullBudgetTitle')"
            :description="t('executorStrategies.martingaleFullBudgetDesc')" />

          <div v-if="isMartingale" class="restart-after-stop-card">
            <div>
              <strong>{{ t('executorStrategies.restartAfterStop') }}</strong>
              <small>{{ t('executorStrategies.restartAfterStopHint') }}</small>
            </div>
            <a-switch v-model="form.restart_after_stop" />
          </div>

          <div class="section-title">{{ t('executorStrategies.section.executor') }}</div>
          <div v-if="!isDca || form.dca_price_filter_enabled" class="anchor-setting">
            <div>
              <label>{{ t(isDca ? 'executorStrategies.dcaAnchor' : 'executorStrategies.dynamicAnchor') }}</label>
              <small>{{ t(isDca ? 'executorStrategies.dcaAnchorHint' : 'executorStrategies.dynamicAnchorHint') }}</small>
            </div>
            <a-switch v-model="form.dynamic_anchor" />
          </div>
          <div v-if="form.executor_type === 'grid'" class="executor-specific">
            <div v-if="form.dynamic_anchor" class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.lowerOffsetPct') }}</label>
                <a-input-number
                  v-model="lowerOffsetPctDisplay"
                  :min="0.1"
                  :max="50"
                  :step="0.1"
                  :precision="2"
                  style="width: 100%"
                  @change="value => setRatio('lower_offset_pct', value)" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.upperOffsetPct') }}</label>
                <a-input-number
                  v-model="upperOffsetPctDisplay"
                  :min="0.1"
                  :max="50"
                  :step="0.1"
                  :precision="2"
                  style="width: 100%"
                  @change="value => setRatio('upper_offset_pct', value)" />
              </div>
            </div>
            <div v-else class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.startPrice') }}</label>
                <a-input-number v-model="form.start_price" :min="0" :step="100" :precision="4" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.endPrice') }}</label>
                <a-input-number v-model="form.end_price" :min="0" :step="100" :precision="4" style="width: 100%" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.gridCount') }}</label>
                <a-input-number
                  v-model="form.grid_count"
                  :min="2"
                  :max="200"
                  :step="form.side === 'neutral' ? 2 : 1"
                  style="width: 100%" />
              </div>
              <div class="field-block">
                <label>
                  {{ t('executorStrategies.initialPositionPct') }}
                  <a-tooltip :title="t('executorStrategies.initialPositionHint')"><a-icon type="info-circle" /></a-tooltip>
                </label>
                <a-input-number
                  v-model="initialPositionPctDisplay"
                  :min="0"
                  :max="100"
                  :step="5"
                  :precision="1"
                  :disabled="form.side === 'neutral'"
                  style="width: 100%"
                  @change="value => setRatio('initial_position_pct', value)" />
              </div>
            </div>
            <div class="field-grid field-grid--three">
              <div class="field-block">
                <label>{{ t('executorStrategies.maxOpenOrders') }}</label>
                <a-input-number
                  v-model="form.max_open_orders"
                  :min="1"
                  :max="200"
                  style="width: 100%"
                  @change="normalizeMaxOpenOrders" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.minSpread') }}</label>
                <a-input-number
                  v-model="minSpreadPctDisplay"
                  :min="0"
                  :max="20"
                  :step="0.01"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('min_spread_between_orders', value)" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.gridMode') }}</label>
                <a-radio-group v-model="form.grid_mode" class="compact-segmented" button-style="solid">
                  <a-radio-button value="arithmetic">{{ t('executorStrategies.arithmetic') }}</a-radio-button>
                  <a-radio-button value="geometric">{{ t('executorStrategies.geometric') }}</a-radio-button>
                </a-radio-group>
              </div>
            </div>
          </div>

          <div v-else-if="isDca" class="executor-specific">
            <a-alert
              class="dca-explainer"
              type="info"
              show-icon
              :message="t('executorStrategies.dcaExplainerTitle')"
              :description="t('executorStrategies.dcaExplainerDesc', {
                orders: form.dca_max_orders,
                interval: dcaIntervalText(form.dca_interval_minutes),
                allocation: fmtPct(dcaOrderPct)
              })" />
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.dcaMaxOrders') }}</label>
                <a-input-number v-model="form.dca_max_orders" :min="1" :max="100" style="width: 100%" />
                <small class="field-hint">{{ t('executorStrategies.dcaMaxOrdersHint') }}</small>
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.dcaInterval') }}</label>
                <a-select v-model="form.dca_interval_minutes">
                  <a-select-option
                    v-for="option in dcaIntervalOptions"
                    :key="option.value"
                    :value="option.value">
                    {{ option.label }}
                  </a-select-option>
                </a-select>
                <small class="field-hint">{{ t('executorStrategies.dcaIntervalHint') }}</small>
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.dcaTotalBudgetPct') }}</label>
                <a-input-number
                  v-model="dcaTotalBudgetPctDisplay"
                  :min="0.01"
                  :max="100"
                  :step="1"
                  :precision="2"
                  style="width: 100%"
                  @change="value => setRatio('dca_total_budget_pct', value)" />
                <small class="field-hint">{{ t('executorStrategies.dcaTotalBudgetPctHint') }}</small>
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.dcaOrderPct') }}</label>
                <a-input :value="fmtPct(dcaOrderPct)" disabled />
                <small class="field-hint">{{ t('executorStrategies.dcaOrderPctHint') }}</small>
              </div>
            </div>
            <div class="anchor-setting dca-filter-setting">
              <div>
                <label>{{ t('executorStrategies.dcaPriceFilter') }}</label>
                <small>{{ t('executorStrategies.dcaPriceFilterHint') }}</small>
              </div>
              <a-switch v-model="form.dca_price_filter_enabled" />
            </div>
            <div v-if="form.dca_price_filter_enabled" class="field-block">
              <label>{{ t('executorStrategies.dcaMaxAdversePricePct') }}</label>
              <a-input-number
                v-model="dcaMaxAdversePricePctDisplay"
                :min="0"
                :max="100"
                :step="0.1"
                :precision="2"
                style="width: 100%"
                @change="value => setRatio('dca_max_adverse_price_pct', value)" />
              <small class="field-hint">{{ t('executorStrategies.dcaMaxAdversePricePctHint') }}</small>
            </div>
          </div>

          <div v-else-if="form.executor_type === 'layered_martingale'" class="executor-specific">
            <a-alert
              class="layered-explainer"
              type="info"
              show-icon
              :message="t('executorStrategies.layeredExplainerTitle')"
              :description="t('executorStrategies.layeredExplainerDesc', {
                layers: form.layer_count,
                orders: form.orders_per_layer,
                total: Number(form.layer_count || 0) * Number(form.orders_per_layer || 0)
              })" />
            <div class="field-grid">
              <div v-if="!form.dynamic_anchor" class="field-block">
                <label>{{ t('executorStrategies.entryPrice') }}</label>
                <a-input-number v-model="form.entry_price" :min="0" :step="100" :precision="4" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.layerCount') }}</label>
                <a-input-number v-model="form.layer_count" :min="1" :max="20" style="width: 100%" />
                <small class="field-hint">{{ t('executorStrategies.layerCountHint') }}</small>
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.ordersPerLayer') }}</label>
                <a-input-number v-model="form.orders_per_layer" :min="1" :max="10" style="width: 100%" />
                <small class="field-hint">{{ t('executorStrategies.ordersPerLayerHint') }}</small>
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.baseOrder') }}</label>
                <a-input-number v-model="form.base_order_size" :min="0.01" :step="0.1" :precision="2" style="width: 100%" />
                <small class="field-hint">{{ t('executorStrategies.layeredBaseOrderHint') }}</small>
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.volumeMultiplier') }}</label>
                <a-input-number
                  v-model="form.volume_multiplier"
                  :min="1"
                  :max="10"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%" />
                <small class="field-hint">{{ t('executorStrategies.layeredVolumeMultiplierHint') }}</small>
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.intraSpacing1') }}</label>
                <a-input-number
                  v-model="intraSpacing1PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('intra_spacing_1_pct', value)" />
                <small class="field-hint">{{ t('executorStrategies.intraSpacing1Hint') }}</small>
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.intraSpacing2') }}</label>
                <a-input-number
                  v-model="intraSpacing2PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('intra_spacing_2_pct', value)" />
                <small class="field-hint">{{ t('executorStrategies.intraSpacing2Hint') }}</small>
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.interSpacing1') }}</label>
                <a-input-number
                  v-model="interSpacing1PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('inter_spacing_1_pct', value)" />
                <small class="field-hint">{{ t('executorStrategies.interSpacingHint') }}</small>
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.interSpacing2') }}</label>
                <a-input-number
                  v-model="interSpacing2PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('inter_spacing_2_pct', value)" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.interSpacing3') }}</label>
                <a-input-number
                  v-model="interSpacing3PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('inter_spacing_3_pct', value)" />
              </div>
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.interSpacing4') }}</label>
              <a-input-number
                v-model="interSpacing4PctDisplay"
                :min="0"
                :max="100"
                :step="0.1"
                :precision="3"
                style="width: 100%"
                @change="value => setRatio('inter_spacing_4_pct', value)" />
            </div>
          </div>

          <div v-else class="executor-specific">
            <div class="field-grid">
              <div v-if="!form.dynamic_anchor" class="field-block">
                <label>{{ t('executorStrategies.entryPrice') }}</label>
                <a-input-number v-model="form.entry_price" :min="0" :step="100" :precision="4" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.maxLayers') }}</label>
                <a-input-number v-model="form.max_layers" :min="1" :max="20" style="width: 100%" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.baseOrder') }}</label>
                <a-input-number v-model="form.base_order_size" :min="0.01" :step="0.1" :precision="2" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.safetyOrder') }}</label>
                <a-input-number v-model="form.safety_order_size" :min="0.01" :step="0.1" :precision="2" style="width: 100%" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.priceDeviationPct') }}</label>
                <a-input-number
                  v-model="priceDeviationPctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('price_deviation_pct', value)" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.volumeMultiplier') }}</label>
                <a-input-number
                  v-model="form.volume_multiplier"
                  :min="1"
                  :max="10"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%" />
              </div>
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.stepMultiplier') }}</label>
              <a-input-number
                v-model="form.step_multiplier"
                :min="1"
                :max="10"
                :step="0.1"
                :precision="3"
                style="width: 100%" />
            </div>
          </div>

          <a-collapse class="advanced-collapse" :bordered="false" default-active-key="advanced">
            <a-collapse-panel key="advanced" :header="t('executorStrategies.advanced')">
              <div class="field-grid">
                <div v-if="!isDca" class="field-block">
                  <label>{{ t('executorStrategies.samplingInterval') }}</label>
                  <a-select v-model="form.timeframe">
                    <a-select-option value="1m">1m</a-select-option>
                    <a-select-option value="5m">5m</a-select-option>
                    <a-select-option value="15m">15m</a-select-option>
                    <a-select-option value="1H">1H</a-select-option>
                  </a-select>
                </div>
                <div class="field-block">
                  <label>{{ t('executorStrategies.name') }}</label>
                  <a-input v-model="form.strategy_name" :placeholder="t('executorStrategies.namePlaceholder')" />
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>

        <div class="config-actions">
          <div class="config-actions__status" :class="{ 'has-error': !canCreate }" :title="primaryValidationText">
            <a-icon :type="canCreate ? 'check-circle' : 'exclamation-circle'" />
            <span>{{ primaryValidationText }}</span>
          </div>
          <div class="config-actions__buttons">
            <a-button icon="eye" :loading="previewing" @click="refreshPreview">{{ t('executorStrategies.preview') }}</a-button>
            <a-button type="primary" icon="code" :loading="creating" :disabled="!canCreate" @click="createStrategy">
              {{ t(embedded ? 'executorStrategies.generateCode' : 'executorStrategies.create') }}
            </a-button>
          </div>
        </div>
      </section>

      <section class="executor-preview-panel">
        <div class="panel-title panel-title--between">
          <span><b class="panel-step">3</b><a-icon type="profile" />{{ t(isDca ? 'executorStrategies.dcaPreviewTitle' : 'executorStrategies.previewTitle') }}</span>
          <a-tag v-if="preview.executor_type" class="theme-accent-tag">{{ executorTypeText(preview.executor_type) }}</a-tag>
        </div>

        <div class="summary-grid">
          <div v-for="item in summaryCards" :key="item.key" class="summary-cell">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <a-alert
          v-if="previewWarnings.length"
          class="warning-strip"
          type="warning"
          show-icon
          :message="previewWarnings.join(' · ')"
        />

        <a-alert
          v-for="(message, index) in riskDiagnosticMessages"
          :key="`risk-${index}`"
          class="risk-diagnostic"
          type="warning"
          show-icon
          :message="t('executorStrategies.riskDiagnosticTitle')"
          :description="message"
        />

        <a-table
          class="executor-level-table"
          size="small"
          :columns="columns"
          :data-source="levels"
          :pagination="false"
          row-key="level"
          :scroll="{ x: 860, y: 430 }"
        >
          <template slot="level" slot-scope="text">
            <span class="mono">#{{ text }}</span>
          </template>
          <template slot="action" slot-scope="text">
            <a-tag :color="text === 'add' ? 'blue' : 'green'">{{ actionText(text) }}</a-tag>
          </template>
          <template slot="side" slot-scope="text">
            <a-tag :color="text === 'short' ? 'red' : 'green'">{{ sideText(text) }}</a-tag>
          </template>
          <template slot="money" slot-scope="text">
            <span class="mono">{{ fmtWeight(text) }}</span>
          </template>
          <template slot="price" slot-scope="text">
            <span class="mono">{{ fmtPrice(text) }}</span>
          </template>
          <template slot="pct" slot-scope="text">
            <span class="mono">{{ fmtPct(text) }}</span>
          </template>
        </a-table>

      </section>
    </main>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import {
  createExecutorStrategy,
  generateExecutorStrategy,
  getExecutorTemplates,
  previewExecutorStrategy
} from '@/api/strategy'
import { listExchangeCredentials } from '@/api/credentials'
import { getWatchlist } from '@/api/market'
import { getExchangeDisplayName, isCryptoExchangeCredential } from '@/utils/exchangeCredential'

export default {
  name: 'ExecutorStrategies',
  props: {
    embedded: { type: Boolean, default: false }
  },
  data () {
    return {
      loadingTemplates: false,
      loadingCredentials: false,
      loadingWatchlist: false,
      previewing: false,
      previewRequestId: 0,
      creating: false,
      templates: [],
      compatibility: {},
      credentials: [],
      watchlist: [],
      preview: {},
      form: this.defaultForm()
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    userId () {
      const user = this.$store && this.$store.state && this.$store.state.user
      return (user && (user.id || user.userId || user.user_id || (user.info && (user.info.id || user.info.user_id)))) || 1
    },
    watchlistOptions () {
      const rows = (this.watchlist || []).filter(item => {
        const market = String((item && item.market) || '').toLowerCase()
        return item && item.symbol && (market === 'crypto' || String(item.symbol).includes('/'))
      })
      if (this.form.symbol && !rows.some(item => item.symbol === this.form.symbol)) {
        rows.unshift({ market: 'Crypto', symbol: this.form.symbol, name: '' })
      }
      return rows
    },
    executorCatalog () {
      return [
        { key: 'grid', icon: 'table', titleKey: 'executorStrategies.type.grid', descKey: 'executorStrategies.catalog.grid', badgeKey: 'executorStrategies.supported' },
        { key: 'dca', icon: 'ordered-list', titleKey: 'executorStrategies.type.dca', descKey: 'executorStrategies.catalog.dca', badgeKey: 'executorStrategies.supported' },
        { key: 'martingale', icon: 'rise', titleKey: 'executorStrategies.type.martingale', descKey: 'executorStrategies.catalog.martingale', badgeKey: 'executorStrategies.supported' },
        { key: 'layered_martingale', icon: 'cluster', titleKey: 'executorStrategies.type.layered_martingale', descKey: 'executorStrategies.catalog.layered_martingale', badgeKey: 'executorStrategies.supported' }
      ]
    },
    isDca () {
      return this.form.executor_type === 'dca'
    },
    supportsTrailingTakeProfit () {
      return ['dca', 'martingale', 'layered_martingale'].includes(this.form.executor_type)
    },
    cycleProfitMode: {
      get () {
        return this.form.trailing_take_profit_enabled ? 'trailing' : 'fixed'
      },
      set (value) {
        this.form.trailing_take_profit_enabled = value === 'trailing'
      }
    },
    isMartingale () {
      return ['martingale', 'layered_martingale'].includes(this.form.executor_type)
    },
    triggerModeTitle () {
      return this.t(`executorStrategies.trigger.${this.form.executor_type}.title`)
    },
    triggerModeDescription () {
      return this.t(`executorStrategies.trigger.${this.form.executor_type}.description`)
    },
    summary () {
      return (this.preview && this.preview.summary) || {}
    },
    levels () {
      return (this.preview && this.preview.levels) || []
    },
    previewWarnings () {
      return ((this.preview && this.preview.warnings) || []).map(item => this.warningText(item))
    },
    riskDiagnosticMessages () {
      return ((this.preview && this.preview.risk_diagnostics) || [])
        .filter(item => item && item.code === 'hard_stop_blocks_level')
        .map(item => this.t('executorStrategies.riskDiagnosticHardStop', {
          level: Number(item.before_level || 0),
          configured: this.fmtPct(item.configured_stop_pct),
          required: this.fmtPct(item.required_stop_pct),
          suggested: this.fmtPct(item.suggested_stop_pct)
        }))
    },
    dcaOrderPct () {
      const orders = Math.max(1, Number(this.form.dca_max_orders || 1))
      return Math.max(0, Number(this.form.dca_total_budget_pct || 0)) / orders
    },
    dcaIntervalOptions () {
      return [
        { value: 60, label: this.t('executorStrategies.dcaInterval.hour1') },
        { value: 240, label: this.t('executorStrategies.dcaInterval.hour4') },
        { value: 720, label: this.t('executorStrategies.dcaInterval.hour12') },
        { value: 1440, label: this.t('executorStrategies.dcaInterval.day1') },
        { value: 10080, label: this.t('executorStrategies.dcaInterval.week1') },
        { value: 20160, label: this.t('executorStrategies.dcaInterval.week2') },
        { value: 43200, label: this.t('executorStrategies.dcaInterval.day30') }
      ]
    },
    summaryCards () {
      if (this.isDca) {
        const config = (this.preview && this.preview.config) || {}
        return [
          { key: 'orders', label: this.t('executorStrategies.summary.orders'), value: Number(this.summary.level_count || 0) },
          { key: 'budget', label: this.t('executorStrategies.summary.budget'), value: this.fmtPct(config.dca_total_budget_pct) },
          { key: 'interval', label: this.t('executorStrategies.summary.interval'), value: this.dcaIntervalText(config.dca_interval_minutes) },
          { key: 'perOrder', label: this.t('executorStrategies.summary.perOrder'), value: this.fmtPct(config.dca_order_pct) }
        ]
      }
      if (this.form.executor_type === 'grid' && this.form.side === 'neutral') {
        const total = Number(this.summary.total_amount_quote || 0)
        const longAmount = Number(this.summary.long_amount_quote || 0)
        const shortAmount = Number(this.summary.short_amount_quote || 0)
        const split = total > 0
          ? `${((longAmount / total) * 100).toFixed(0)}% / ${((shortAmount / total) * 100).toFixed(0)}%`
          : '0% / 0%'
        return [
          { key: 'levels', label: this.t('executorStrategies.summary.gridCells'), value: Number(this.summary.level_count || 0) },
          { key: 'legs', label: this.t('executorStrategies.summary.longShortCells'), value: `${Number(this.summary.long_level_count || 0)} / ${Number(this.summary.short_level_count || 0)}` },
          { key: 'split', label: this.t('executorStrategies.summary.longShortBudget'), value: split },
          { key: 'range', label: this.t('executorStrategies.summary.priceRange'), value: `${this.fmtPrice(this.summary.first_price)} — ${this.fmtPrice(this.summary.last_price)}` }
        ]
      }
      return [
        { key: 'levels', label: this.t('executorStrategies.summary.levels'), value: Number(this.summary.level_count || 0) },
        { key: 'amount', label: this.t('executorStrategies.summary.amount'), value: '100%' },
        { key: 'first', label: this.t('executorStrategies.summary.first'), value: this.fmtPrice(this.summary.first_price) },
        { key: 'last', label: this.t('executorStrategies.summary.last'), value: this.fmtPrice(this.summary.last_price) }
      ]
    },
    cryptoCredentials () {
      return (this.credentials || []).filter(isCryptoExchangeCredential)
    },
    selectedCredential () {
      return this.cryptoCredentials.find(item => String(item.id) === String(this.form.credential_id || '')) || null
    },
    canCreate () {
      const hasSymbol = Boolean(String(this.form.symbol || '').trim())
      const hasLiveCredential = this.embedded || this.form.execution_mode !== 'live' || Boolean(this.selectedCredential)
      return hasSymbol && hasLiveCredential && this.validationIssues.length === 0
    },
    validationIssues () {
      const issues = []
      if (!String(this.form.symbol || '').trim()) issues.push('symbol')
      if (this.form.executor_type === 'grid') {
        const start = Number(this.form.start_price || 0)
        const end = Number(this.form.end_price || 0)
        if (start <= 0 || end <= 0 || start === end) issues.push('priceBounds')
      } else if (this.isDca) {
        if (Number(this.form.dca_max_orders || 0) < 1) issues.push('dcaMaxOrders')
        if (Number(this.form.dca_interval_minutes || 0) < 1) issues.push('dcaInterval')
        const budget = Number(this.form.dca_total_budget_pct || 0)
        if (budget <= 0 || budget > 1) issues.push('dcaBudget')
        if (this.form.dca_price_filter_enabled && Number(this.form.dca_max_adverse_price_pct || 0) < 0) {
          issues.push('dcaPriceFilter')
        }
      } else {
        if (Number(this.form.entry_price || 0) <= 0) issues.push('entryPrice')
        if (Number(this.form.base_order_size || 0) <= 0) issues.push('baseOrder')
      }
      if (!this.embedded && this.form.execution_mode === 'live' && !this.selectedCredential) issues.push('credential')
      if (this.supportsTrailingTakeProfit && this.form.trailing_take_profit_enabled) {
        const activation = Number(this.form.trailing_activation_pct || 0)
        const callback = Number(this.form.trailing_callback_pct || 0)
        if (activation <= 0 || callback <= 0 || callback >= activation) issues.push('trailingTakeProfit')
      }
      if (this.form.equity_trailing_enabled) {
        const activation = Number(this.form.equity_trailing_activation_pct || 0)
        const callback = Number(this.form.equity_trailing_callback_pct || 0)
        if (activation <= 0 || callback <= 0 || callback >= activation) issues.push('equityTrailingTakeProfit')
      }
      return issues
    },
    primaryValidationText () {
      const issue = this.validationIssues[0]
      return this.t(issue ? `executorStrategies.validation.${issue}` : 'executorStrategies.validation.ready')
    },
    takeProfitPctDisplay: {
      get () { return Number(this.form.take_profit_pct || 0) * 100 },
      set (value) { this.setRatio('take_profit_pct', value) }
    },
    priceDeviationPctDisplay: {
      get () { return Number(this.form.price_deviation_pct || 0) * 100 },
      set (value) { this.setRatio('price_deviation_pct', value) }
    },
    hardStopPctDisplay: {
      get () { return Number(this.form.hard_stop_pct || 0) * 100 },
      set (value) { this.setRatio('hard_stop_pct', value) }
    },
    trailingActivationPctDisplay: {
      get () { return Number(this.form.trailing_activation_pct || 0) * 100 },
      set (value) { this.setRatio('trailing_activation_pct', value) }
    },
    trailingCallbackPctDisplay: {
      get () { return Number(this.form.trailing_callback_pct || 0) * 100 },
      set (value) { this.setRatio('trailing_callback_pct', value) }
    },
    equityTakeProfitPctDisplay: {
      get () { return Number(this.form.equity_take_profit_pct || 0) * 100 },
      set (value) { this.setRatio('equity_take_profit_pct', value) }
    },
    equityStopLossPctDisplay: {
      get () { return Number(this.form.equity_stop_loss_pct || 0) * 100 },
      set (value) { this.setRatio('equity_stop_loss_pct', value) }
    },
    equityTrailingActivationPctDisplay: {
      get () { return Number(this.form.equity_trailing_activation_pct || 0) * 100 },
      set (value) { this.setRatio('equity_trailing_activation_pct', value) }
    },
    equityTrailingCallbackPctDisplay: {
      get () { return Number(this.form.equity_trailing_callback_pct || 0) * 100 },
      set (value) { this.setRatio('equity_trailing_callback_pct', value) }
    },
    dcaTotalBudgetPctDisplay: {
      get () { return Number(this.form.dca_total_budget_pct || 0) * 100 },
      set (value) { this.setRatio('dca_total_budget_pct', value) }
    },
    dcaMaxAdversePricePctDisplay: {
      get () { return Number(this.form.dca_max_adverse_price_pct || 0) * 100 },
      set (value) { this.setRatio('dca_max_adverse_price_pct', value) }
    },
    minSpreadPctDisplay: {
      get () { return Number(this.form.min_spread_between_orders || 0) * 100 },
      set (value) { this.setRatio('min_spread_between_orders', value) }
    },
    initialPositionPctDisplay: {
      get () { return Number(this.form.initial_position_pct || 0) * 100 },
      set (value) { this.setRatio('initial_position_pct', value) }
    },
    lowerOffsetPctDisplay: {
      get () { return Math.abs(1 - Number(this.form.start_price || 0)) * 100 },
      set (value) { this.setRatio('lower_offset_pct', value) }
    },
    upperOffsetPctDisplay: {
      get () { return Math.abs(Number(this.form.end_price || 0) - 1) * 100 },
      set (value) { this.setRatio('upper_offset_pct', value) }
    },
    intraSpacing1PctDisplay: {
      get () { return Number(this.form.intra_spacing_1_pct || 0) * 100 },
      set (value) { this.setRatio('intra_spacing_1_pct', value) }
    },
    intraSpacing2PctDisplay: {
      get () { return Number(this.form.intra_spacing_2_pct || 0) * 100 },
      set (value) { this.setRatio('intra_spacing_2_pct', value) }
    },
    interSpacing1PctDisplay: {
      get () { return Number(this.form.inter_spacing_1_pct || 0) * 100 },
      set (value) { this.setRatio('inter_spacing_1_pct', value) }
    },
    interSpacing2PctDisplay: {
      get () { return Number(this.form.inter_spacing_2_pct || 0) * 100 },
      set (value) { this.setRatio('inter_spacing_2_pct', value) }
    },
    interSpacing3PctDisplay: {
      get () { return Number(this.form.inter_spacing_3_pct || 0) * 100 },
      set (value) { this.setRatio('inter_spacing_3_pct', value) }
    },
    interSpacing4PctDisplay: {
      get () { return Number(this.form.inter_spacing_4_pct || 0) * 100 },
      set (value) { this.setRatio('inter_spacing_4_pct', value) }
    },
    columns () {
      if (this.isDca) {
        return [
          { title: this.t('executorStrategies.table.order'), dataIndex: 'order_index', width: 90 },
          { title: this.t('executorStrategies.table.action'), dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 110 },
          { title: this.t('executorStrategies.table.side'), dataIndex: 'side', scopedSlots: { customRender: 'side' }, width: 100 },
          { title: this.t('executorStrategies.table.amount'), dataIndex: 'amount_quote', scopedSlots: { customRender: 'money' }, width: 150 },
          { title: this.t('executorStrategies.table.scheduledTime'), dataIndex: 'scheduled_offset_minutes', customRender: (value, row) => this.dcaScheduledText(value, row), width: 160 },
          { title: this.t('executorStrategies.table.cumulativeBudget'), dataIndex: 'cumulative_amount_quote', customRender: value => this.fmtPct(value), width: 170 }
        ]
      }
      return [
        { title: this.t('executorStrategies.table.level'), dataIndex: 'level', scopedSlots: { customRender: 'level' }, width: 80 },
        { title: this.t('executorStrategies.table.layer'), dataIndex: 'layer_index', width: 90 },
        { title: this.t('executorStrategies.table.order'), dataIndex: 'order_index', width: 90 },
        { title: this.t('executorStrategies.table.action'), dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 110 },
        { title: this.t('executorStrategies.table.side'), dataIndex: 'side', scopedSlots: { customRender: 'side' }, width: 100 },
        { title: this.t('executorStrategies.table.price'), dataIndex: 'price', scopedSlots: { customRender: 'price' }, width: 140 },
        { title: this.t('executorStrategies.table.amount'), dataIndex: 'amount_quote', scopedSlots: { customRender: 'money' }, width: 140 },
        { title: this.t(this.supportsTrailingTakeProfit && this.form.trailing_take_profit_enabled ? 'executorStrategies.table.trailingActivation' : 'executorStrategies.table.takeProfit'), dataIndex: 'take_profit_price', scopedSlots: { customRender: 'price' }, width: 150 },
        { title: this.t('executorStrategies.table.trigger'), dataIndex: 'trigger_pct', scopedSlots: { customRender: 'pct' }, width: 130 }
      ]
    }
  },
  watch: {
    form: {
      deep: true,
      handler () {
        window.clearTimeout(this._previewTimer)
        this._previewTimer = window.setTimeout(() => this.refreshPreview(), 260)
      }
    }
  },
  mounted () {
    this.loadTemplates()
    this.loadCredentials()
    this.loadWatchlist()
    this.refreshPreview()
  },
  beforeDestroy () {
    window.clearTimeout(this._previewTimer)
  },
  methods: {
    t (key, params) {
      return this.$t(key, params)
    },
    defaultForm () {
      return {
        executor_type: 'grid',
        strategy_name: '',
        credential_id: undefined,
        symbol: 'BTC/USDT',
        timeframe: '1m',
        side: 'long',
        market_type: 'swap',
        execution_mode: 'live',
        dynamic_anchor: true,
        start_price: 0.98,
        end_price: 1.02,
        limit_price: 0.97,
        grid_count: 8,
        max_open_orders: 4,
        grid_mode: 'arithmetic',
        total_amount_quote: 8,
        initial_position_pct: 0.6,
        min_spread_between_orders: 0.0005,
        entry_price: 1,
        dca_interval_minutes: 1440,
        dca_max_orders: 5,
        dca_total_budget_pct: 1,
        dca_price_filter_enabled: false,
        dca_max_adverse_price_pct: 0.05,
        base_order_size: 1,
        safety_order_size: 1.2,
        max_layers: 5,
        layer_count: 5,
        orders_per_layer: 3,
        price_deviation_pct: 0.015,
        intra_spacing_1_pct: 0.005,
        intra_spacing_2_pct: 0.008,
        inter_spacing_1_pct: 0.012,
        inter_spacing_2_pct: 0.015,
        inter_spacing_3_pct: 0.018,
        inter_spacing_4_pct: 0.022,
        step_multiplier: 1.2,
        volume_multiplier: 1.15,
        take_profit_pct: 0,
        trailing_take_profit_enabled: true,
        trailing_activation_pct: 0.006,
        trailing_callback_pct: 0.002,
        hard_stop_pct: 0.12,
        equity_take_profit_pct: 0.10,
        equity_stop_loss_pct: 0.06,
        equity_trailing_enabled: true,
        equity_trailing_activation_pct: 0.05,
        equity_trailing_callback_pct: 0.03,
        restart_after_stop: false,
        final_level_uses_remaining_budget: true,
        max_entry_drift_pct: 0.03
      }
    },
    async loadTemplates () {
      this.loadingTemplates = true
      try {
        const res = await getExecutorTemplates()
        const data = res && (res.data || res)
        this.templates = ((data && data.items) || (data && data.data && data.data.items) || [])
        this.compatibility = (data && data.compatibility) || (data && data.data && data.data.compatibility) || {}
      } finally {
        this.loadingTemplates = false
      }
    },
    async loadCredentials () {
      this.loadingCredentials = true
      try {
        const res = await listExchangeCredentials()
        this.credentials = res && res.code === 1 && res.data ? (res.data.items || []) : []
      } catch (error) {
        this.credentials = []
      } finally {
        this.loadingCredentials = false
      }
    },
    async loadWatchlist () {
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: this.userId })
        this.watchlist = res && Array.isArray(res.data) ? res.data : []
      } catch (error) {
        this.watchlist = []
      } finally {
        this.loadingWatchlist = false
      }
    },
    onSymbolDropdownVisibleChange (visible) {
      if (!visible || this.loadingWatchlist) return
      this.loadWatchlist().catch(error => {
        console.warn('Refresh robot watchlist failed:', error)
      })
    },
    credentialLabel (credential) {
      const exchange = getExchangeDisplayName(credential && credential.exchange_id)
      const name = String((credential && credential.name) || '').trim()
      const hint = String((credential && credential.api_key_hint) || '').trim()
      return [exchange, name, hint].filter(Boolean).join(' · ')
    },
    templateForType (type) {
      return (this.templates || []).find(item => item.executor_type === type)
    },
    selectExecutor (type) {
      if (!['grid', 'dca', 'martingale', 'layered_martingale'].includes(type)) return
      this.form.executor_type = type
      if (type !== 'grid' && this.form.side === 'neutral') this.form.side = 'long'
      this.applyTypeDefaults()
      this.enforceDcaConstraints()
    },
    applyTypeDefaults () {
      const template = this.templateForType(this.form.executor_type)
      if (template && template.defaults) {
        this.form = {
          ...this.form,
          ...template.defaults,
          executor_type: this.form.executor_type,
          strategy_name: this.form.strategy_name,
          symbol: this.form.symbol,
          timeframe: this.form.executor_type === 'dca'
            ? (template.defaults.timeframe || '1H')
            : (this.form.timeframe || '1m')
        }
      }
      if (this.form.executor_type === 'martingale') {
        this.form.volume_multiplier = Math.max(Number(this.form.volume_multiplier || 1), 1.5)
      }
      if (this.form.executor_type === 'layered_martingale') {
        this.form.volume_multiplier = Math.max(Number(this.form.volume_multiplier || 1), 1.8)
      }
      this.enforceDcaConstraints()
    },
    enforceDcaConstraints () {
      if (!this.isDca) return
      this.form.side = 'long'
      this.form.market_type = 'spot'
      this.form.timeframe = '1H'
    },
    handleMarketTypeChange () {
      if (this.form.market_type === 'spot') {
        this.form.side = 'long'
      }
    },
    handleSideChange () {
      if (this.form.side === 'neutral') {
        this.form.initial_position_pct = 0
        const count = Math.max(2, Number(this.form.grid_count || 2))
        if (count % 2) this.form.grid_count = count + 1
      } else if (this.form.executor_type === 'grid' && Number(this.form.initial_position_pct || 0) === 0) {
        this.form.initial_position_pct = 0.6
      }
    },
    normalizeMaxOpenOrders (value) {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return
      const normalized = Math.min(200, Math.max(1, Math.trunc(parsed)))
      if (normalized !== this.form.max_open_orders) {
        this.form.max_open_orders = normalized
      }
    },
    setRatio (field, value) {
      const ratio = Number(value || 0) / 100
      if (field === 'lower_offset_pct') {
        this.form.start_price = 1 - ratio
      } else if (field === 'upper_offset_pct') {
        this.form.end_price = 1 + ratio
      } else {
        this.form[field] = ratio
      }
    },
    payload () {
      const credential = this.form.execution_mode === 'live' ? this.selectedCredential : null
      const templateConfig = { ...this.form }
      if (this.isDca) {
        templateConfig.side = 'long'
        templateConfig.market_type = 'spot'
        templateConfig.timeframe = '1H'
      }
      delete templateConfig.initial_capital
      delete templateConfig.leverage
      return {
        ...templateConfig,
        exchange_config: credential
          ? { credential_id: credential.id, exchange_id: credential.exchange_id }
          : {}
      }
    },
    async refreshPreview () {
      const requestId = ++this.previewRequestId
      this.previewing = true
      try {
        const res = await previewExecutorStrategy(this.payload())
        const body = res && (res.data || res)
        if (requestId !== this.previewRequestId) return
        this.preview = body && body.data ? body.data : body
      } catch (err) {
        if (requestId !== this.previewRequestId) return
        this.preview = { levels: [], summary: {}, warnings: ['preview_failed'] }
      } finally {
        if (requestId === this.previewRequestId) this.previewing = false
      }
    },
    async createStrategy () {
      if (!this.canCreate) {
        this.$message.warning(this.primaryValidationText)
        return
      }
      this.creating = true
      try {
        if (this.embedded) {
          const res = await generateExecutorStrategy({
            ...this.payload(),
            execution_mode: 'signal',
            exchange_config: {}
          })
          const body = res && (res.data || res)
          const generated = body && body.data ? body.data : body
          if (!generated || !generated.code) {
            throw new Error((body && body.msg) || this.t('executorStrategies.createFailed'))
          }
          this.$emit('generated', generated)
          return
        }
        const res = await createExecutorStrategy(this.payload())
        const body = res && (res.data || res)
        if (body && Number(body.code) === 0) {
          throw new Error(body.msg || this.t('executorStrategies.createFailed'))
        }
        const strategyId = Number(body && body.id)
        this.$message.success(this.t('executorStrategies.createSuccess'))
        this.$router.push({
          path: '/strategy-center',
          query: {
            tab: 'strategy',
            ...(strategyId ? { strategyId: String(strategyId) } : {})
          }
        })
      } catch (err) {
        this.$message.error((err && err.message) || this.t('executorStrategies.createFailed'))
      } finally {
        this.creating = false
      }
    },
    executorTypeText (value) {
      return this.t(`executorStrategies.type.${value || 'grid'}`)
    },
    sideText (value) {
      if (value === 'neutral') return this.t('executorStrategies.neutral')
      return value === 'short' ? this.t('executorStrategies.short') : this.t('executorStrategies.long')
    },
    actionText (value) {
      return value === 'add' ? this.t('executorStrategies.action.add') : this.t('executorStrategies.action.open')
    },
    warningText (value) {
      const key = `executorStrategies.warning.${value}`
      const translated = this.t(key)
      return translated === key ? String(value || '') : translated
    },
    fmtMoney (value) {
      const number = Number(value || 0)
      return number.toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    fmtWeight (value) {
      const total = Number(this.summary.total_amount_quote || 0)
      if (total <= 0) return '0.00%'
      return `${((Number(value || 0) / total) * 100).toFixed(2)}%`
    },
    fmtPrice (value) {
      const number = Number(value || 0)
      const maximumFractionDigits = Math.abs(number) >= 1000 ? 2 : (Math.abs(number) >= 1 ? 4 : 8)
      return number.toLocaleString(undefined, { maximumFractionDigits })
    },
    fmtPct (value) {
      return `${(Number(value || 0) * 100).toFixed(2)}%`
    },
    dcaIntervalText (value) {
      const minutes = Number(value || 0)
      const option = this.dcaIntervalOptions.find(item => item.value === minutes)
      return option ? option.label : this.t('executorStrategies.dcaInterval.custom', { minutes })
    },
    dcaDurationText (value) {
      const minutes = Math.max(0, Number(value || 0))
      if (minutes >= 10080 && minutes % 10080 === 0) {
        return this.t('executorStrategies.dcaDuration.weeks', { count: minutes / 10080 })
      }
      if (minutes >= 1440 && minutes % 1440 === 0) {
        return this.t('executorStrategies.dcaDuration.days', { count: minutes / 1440 })
      }
      if (minutes >= 60 && minutes % 60 === 0) {
        return this.t('executorStrategies.dcaDuration.hours', { count: minutes / 60 })
      }
      return this.t('executorStrategies.dcaDuration.minutes', { count: minutes })
    },
    dcaScheduledText (value, row) {
      if (Number((row && row.order_index) || 0) <= 1) {
        return this.t('executorStrategies.table.scheduledImmediately')
      }
      return this.t('executorStrategies.table.scheduledAfter', {
        interval: this.dcaDurationText(value)
      })
    }
  }
}
</script>

<style lang="less" scoped>
.executor-page {
  min-height: calc(100vh - 64px);
  padding: 16px 20px;
  background: #f4f6f8;
  color: #1f2933;
  overflow-x: hidden;
}

.executor-page.is-embedded {
  min-height: 0;
  height: 100%;
  padding: 0;
  background: transparent;
}

.panel-step {
  width: 24px;
  height: 24px;
  display: inline-flex;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  border: 1px solid #d0d5dd;
  border-radius: 50%;
  color: #667085;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 800;
}

.panel-step {
  border-color: var(--primary-color, #1890ff);
  color: #fff;
  background: var(--primary-color, #1890ff);
}

.executor-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.executor-kicker {
  color: var(--primary-color, #1890ff);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.executor-header h1 {
  margin: 2px 0 3px;
  font-size: 24px;
  font-weight: 800;
}

.executor-header p {
  margin: 0;
  color: #667085;
}

.executor-header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.executor-workbench {
  display: grid;
  grid-template-columns: minmax(460px, 520px) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.is-embedded .executor-workbench {
  height: calc(100% - 64px);
  grid-template-rows: auto minmax(0, 1fr);
  align-items: stretch;
}

.executor-catalog {
  grid-column-start: 1;
  grid-column-end: -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.executor-catalog .panel-title {
  grid-column-start: 1;
  grid-column-end: -1;
  margin-bottom: 2px;
}

.executor-catalog,
.executor-config-panel,
.executor-preview-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.is-embedded .executor-config-panel,
.is-embedded .executor-preview-panel {
  height: auto;
  min-height: 0;
  overflow: hidden;
}

.is-embedded .executor-preview-panel {
  overflow-y: auto;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
  font-size: 15px;
  font-weight: 800;
}

.panel-title--between {
  justify-content: space-between;
}

.panel-title--between > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.safe-mode-pill {
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 34%, transparent);
  border-radius: 999px;
  color: var(--primary-color, #1890ff);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff);
  font-size: 10px;
  font-weight: 700;
}

.catalog-item {
  width: 100%;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 54px;
  padding: 7px 9px;
  margin-bottom: 0;
  border: 1px solid #edf0f3;
  border-radius: 8px;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s, background 0.16s;
}

.catalog-item.active {
  border-color: var(--primary-color, #1890ff);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff);
}

.catalog-item.disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.catalog-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #fff;
  color: var(--primary-color, #1890ff);
}

.theme-accent-tag {
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 34%, transparent);
  color: var(--primary-color, #1890ff);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff);
}

.catalog-copy {
  min-width: 0;
}

.catalog-copy strong,
.catalog-copy small {
  display: block;
}

.catalog-copy small {
  overflow: hidden;
  margin-top: 1px;
  color: #667085;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.executor-config-panel,
.executor-preview-panel {
  height: calc(100vh - 246px);
  min-height: 620px;
  overflow: auto;
}

.executor-config-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.executor-config-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
}

.section-title {
  margin: 10px 0 6px;
  color: var(--primary-color, #1890ff);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.field-block {
  margin-bottom: 8px;
}

.field-block label {
  display: block;
  margin-bottom: 4px;
  color: #475467;
  font-size: 12px;
  font-weight: 700;
}

.field-hint {
  display: block;
  margin-top: 4px;
  color: #667085;
  font-size: 11px;
  line-height: 1.45;
}

.trigger-contract-card {
  display: flex;
  gap: 10px;
  margin: 10px 0 14px;
  padding: 12px;
  border: 1px solid #d8dee6;
  border-radius: 10px;
  background: #f8fafc;
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--primary-color, #1890ff) 72%, transparent);
}

.trigger-contract-card__icon {
  display: inline-flex;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 30%, transparent);
  color: var(--primary-color, #1890ff);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, #fff);
}

.trigger-contract-card strong { color: #1f2937; font-size: 13px; }
.trigger-contract-card p { margin: 4px 0 8px; color: #667085; font-size: 11px; line-height: 1.5; }
.trigger-contract-card__tags { display: flex; flex-wrap: wrap; gap: 4px; }

.risk-layer-card {
  margin: 6px 0 10px;
  padding: 12px;
  border: 1px solid #d8dee6;
  border-radius: 10px;
  background: #fff;
}

.risk-layer-card__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.risk-layer-card__header strong,
.risk-layer-card__header small,
.trailing-config__intro strong,
.trailing-config__intro small {
  display: block;
}

.risk-layer-card__header small,
.trailing-config__intro small {
  margin-top: 3px;
  color: #667085;
  font-size: 11px;
  line-height: 1.45;
}

.risk-layer-card .field-grid {
  margin-top: 10px;
}

.risk-scope-badge {
  flex: 0 0 auto;
  padding: 2px 8px;
  border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 34%, transparent);
  border-radius: 999px;
  color: var(--primary-color, #1890ff);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, #fff);
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  white-space: nowrap;
}

.risk-scope-badge--stop {
  border-color: rgba(255, 77, 79, 0.28);
  color: #cf1322;
  background: #fff1f0;
}

.profit-exit-mode {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(71, 84, 103, 0.14);
}

.profit-exit-mode > label {
  display: block;
  margin-bottom: 6px;
  color: #344054;
  font-size: 11px;
  font-weight: 700;
}

.profit-exit-mode /deep/ .ant-radio-group {
  display: flex;
  width: 100%;
}

.profit-exit-mode /deep/ .ant-radio-button-wrapper {
  display: flex;
  flex: 1 1 50%;
  min-height: 32px;
  height: auto;
  padding: 0 8px;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.25;
  white-space: normal;
}

.trailing-config {
  margin-top: 10px;
  padding: 10px;
  border-radius: 8px;
  background: #f8fafc;
}

.equity-risk-card {
  background: #f8fafc;
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--primary-color, #1890ff) 72%, transparent);
}

.equity-trailing-toggle {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(71, 84, 103, 0.18);
}

.martingale-budget-notice {
  margin: 4px 0 10px;
}

.restart-after-stop-card {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0 10px;
  padding: 10px;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  background: #fffbe6;
}

.restart-after-stop-card strong,
.restart-after-stop-card small {
  display: block;
}

.restart-after-stop-card small {
  margin-top: 2px;
  color: #667085;
  font-size: 11px;
  line-height: 1.45;
}

.dca-market-notice,
.layered-explainer,
.dca-explainer {
  margin-bottom: 10px;
}

.dca-market-notice {
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 32%, transparent);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 7%, #fff);

  /deep/ .ant-alert-icon,
  /deep/ .ant-alert-message {
    color: var(--primary-color, #1890ff);
  }
}

.dca-filter-setting {
  margin-top: 2px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.field-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.field-grid--four-compact {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.anchor-setting {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 9px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.anchor-setting label,
.anchor-setting small {
  display: block;
}

.anchor-setting label {
  color: #344054;
  font-size: 12px;
  font-weight: 700;
}

.anchor-setting small {
  margin-top: 2px;
  color: #667085;
  font-size: 11px;
}

.market-compact-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) minmax(0, 0.82fr);
  gap: 8px;
}

.compact-segmented {
  width: 100%;
  display: flex;
  flex-wrap: nowrap;
}

.compact-segmented /deep/ .ant-radio-button-wrapper {
  min-width: 0;
  flex: 1 1 0;
  padding-right: 7px;
  padding-left: 7px;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact-segmented--auto {
  width: auto;
  display: inline-flex;
}

.compact-segmented--auto /deep/ .ant-radio-button-wrapper {
  min-width: 72px;
  flex: 0 0 auto;
}

.is-embedded .executor-config-scroll {
  padding-right: 2px;
}

.is-embedded .section-title {
  margin: 6px 0 4px;
}

.is-embedded .field-block {
  margin-bottom: 6px;
}

.is-embedded .field-block label {
  margin-bottom: 3px;
}

.is-embedded .field-grid,
.is-embedded .market-compact-grid {
  gap: 6px;
}

.executor-live-account {
  margin: 4px 0 16px;
  padding: 14px;
  border: 1px solid #ffe0b2;
  border-radius: 10px;
  background: #fffaf2;
}

.executor-live-account__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.advanced-collapse {
  margin-top: 6px;
  background: transparent;
}

.advanced-collapse /deep/ .ant-collapse-item {
  border: 0;
}

.advanced-collapse /deep/ .ant-collapse-header {
  padding: 8px 0 !important;
  color: #667085 !important;
  font-weight: 700;
}

.config-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  z-index: 2;
  margin: 0 -12px -12px;
  padding: 10px 12px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

.config-actions__status {
  display: flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  color: var(--primary-color, #1890ff);
  font-size: 11px;
  font-weight: 700;
}

.config-actions__status.has-error {
  color: #d46b08;
}

.config-actions__status span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.config-actions__buttons {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.summary-cell {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.summary-cell span {
  display: block;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.summary-cell strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
}

.warning-strip {
  margin-bottom: 14px;
}

.risk-diagnostic {
  margin-bottom: 14px;
}

.executor-level-table {
  margin-top: 4px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.theme-dark.executor-page {
  background: #0e0f11;
  color: #f3f4f6;
}

.theme-dark .executor-header h1,
.theme-dark .panel-title,
.theme-dark .catalog-copy strong,
.theme-dark .summary-cell strong {
  color: #f3f4f6;
}

.theme-dark .executor-header p,
.theme-dark .field-block label,
.theme-dark .summary-cell span,
.theme-dark .catalog-copy small {
  color: #9aa4b2;
}

.theme-dark .executor-catalog,
.theme-dark .executor-config-panel,
.theme-dark .executor-preview-panel {
  background: #17191c;
  border-color: #262a2f;
  box-shadow: none;
}

.theme-dark .catalog-item,
.theme-dark .summary-cell {
  background: #111315;
  border-color: #2a2f35;
}

.theme-dark .catalog-item.active {
  background: color-mix(in srgb, var(--primary-color, #1890ff) 14%, #111315);
  border-color: var(--primary-color, #1890ff);
}

.theme-dark .catalog-icon {
  background: #0f1113;
}

.theme-dark .anchor-setting {
  border-color: #2a2f35;
  background: #111315;
}

.theme-dark .risk-layer-card {
  border-color: #343a40;
  background: #151719;
}

.theme-dark .risk-layer-card__header strong,
.theme-dark .trailing-config__intro strong {
  color: #f3f4f6;
}

.theme-dark .equity-risk-card {
  background: #111315;
}

.theme-dark .trailing-config {
  background: #0f1113;
}

.theme-dark .profit-exit-mode {
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .profit-exit-mode > label {
  color: #f3f4f6;
}

.theme-dark .risk-scope-badge {
  background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, #111315);
}

.theme-dark .risk-scope-badge--stop {
  border-color: rgba(255, 120, 117, 0.32);
  color: #ff7875;
  background: rgba(255, 77, 79, 0.1);
}

.theme-dark .trigger-contract-card {
  border-color: #343a40;
  background: #111315;
}

.theme-dark .dca-market-notice {
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 34%, #262a2f);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, #111315);
}

.theme-dark .trigger-contract-card__icon {
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 34%, #262a2f);
  color: var(--primary-color, #1890ff);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, #111315);
}

.theme-dark .trigger-contract-card strong { color: #f3f4f6; }
.theme-dark .trigger-contract-card p { color: #9aa4b2; }

.theme-dark .restart-after-stop-card {
  border-color: #614700;
  background: #2b2111;
}

.theme-dark .field-hint,
.theme-dark .risk-layer-card__header small,
.theme-dark .trailing-config__intro small,
.theme-dark .restart-after-stop-card small {
  color: #9aa4b2;
}

.theme-dark .anchor-setting label {
  color: #f3f4f6;
}

.theme-dark .anchor-setting small {
  color: #9aa4b2;
}

.theme-dark .config-actions {
  border-color: #262a2f;
  background: #17191c;
}

.theme-dark .safe-mode-pill {
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 34%, #262a2f);
  color: var(--primary-color, #1890ff);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, #111315);
}

.theme-dark .theme-accent-tag {
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 34%, #262a2f);
  color: var(--primary-color, #1890ff);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, #111315);
}

@media (max-width: 1500px) {
  .executor-workbench {
    grid-template-columns: minmax(430px, 480px) minmax(0, 1fr);
  }
}

@media (max-width: 980px) {
  .executor-workbench {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .executor-catalog {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .executor-catalog .panel-title {
    grid-column-start: 1;
    grid-column-end: -1;
  }

  .catalog-item {
    min-width: 0;
    margin-bottom: 0;
  }

  .executor-config-panel,
  .executor-preview-panel {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .is-embedded .executor-workbench {
    height: auto;
  }

}

@media (max-width: 720px) {
  .executor-page {
    padding: 14px;
  }

  .executor-header {
    flex-direction: column;
  }

  .field-grid,
  .market-compact-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
