<template>
  <div class="quick-trade-panel-root">
    <component
      :is="embedded ? 'div' : 'a-drawer'"
      v-bind="containerProps"
      @close="handleClose"
      class="quick-trade-shell"
      :class="[embedded ? 'quick-trade-embedded' : 'quick-trade-drawer', { 'theme-dark': isDark, 'qt-embedded-ide': embedded && embeddedIde, 'qt-embedded-dock': embedded && embeddedDock }]"
    >
      <!-- Header (hidden in embedded mode since parent tab already shows title) -->
      <div v-if="!embedded" class="qt-header">
        <div class="qt-header-left">
          <a-icon type="thunderbolt" theme="filled" class="qt-icon" />
          <span class="qt-header-title">{{ $t('quickTrade.title') }}</span>
        </div>
        <a-icon type="close" class="qt-close" @click="handleClose" />
      </div>

      <!-- Symbol & Price Bar -->
      <div v-if="!embeddedDock" class="qt-symbol-bar">
        <div v-if="symbolLocked" class="qt-symbol-summary">
          <div class="qt-symbol-summary-main">
            <span class="qt-symbol-label">{{ $t('quickTrade.syncedWithChart') }}</span>
            <strong class="qt-symbol-name">{{ currentSymbol || '-' }}</strong>
          </div>
          <a-tag class="qt-market-tag">{{ priceMarketParam }}</a-tag>
        </div>
        <div v-else class="qt-symbol-selector">
          <a-select
            v-model="currentSymbol"
            show-search
            :placeholder="$t('quickTrade.selectSymbol')"
            style="width: 100%"
            :filter-option="false"
            :not-found-content="symbolSearching ? null : undefined"
            :get-popup-container="qtSelectPopupContainer"
            :dropdown-class-name="qtSelectDropdownClass"
            @search="handleSymbolSearch"
            @change="handleSymbolChange"
            @focus="handleSymbolFocus"
            :loading="symbolSearching"
          >
            <a-icon slot="suffixIcon" type="search" style="color: #999" />
            <a-select-option
              v-for="item in symbolSuggestions"
              :key="item.value"
              :value="item.value"
            >
              <div class="qt-symbol-option">
                <span class="qt-symbol-option-name">{{ item.symbol }}</span>
                <span v-if="item.name" class="qt-symbol-option-desc">{{ item.name }}</span>
              </div>
            </a-select-option>
          </a-select>
        </div>
        <div class="qt-price-display" :class="priceChangeClass">
          <span class="qt-price-label">{{ $t('quickTrade.syncedPrice') }}</span>
          <span class="qt-current-price">${{ formatPrice(currentPrice) }}</span>
        </div>
      </div>

      <div v-if="embeddedDock" class="qt-dock-header">
        <div class="qt-dock-account">
          <a-select
            v-model="selectedCredentialId"
            :placeholder="accountPlaceholder"
            :get-popup-container="qtSelectPopupContainer"
            :dropdown-class-name="qtSelectDropdownClass"
            :loading="credLoading"
            @change="onCredentialChange"
          >
            <a-select-option v-for="c in credentials" :key="c.id" :value="c.id">
              {{ formatCredentialOptionLabel(c) }}
            </a-select-option>
          </a-select>
          <a-button class="qt-dock-icon-btn" :title="$t('quickTrade.addAccountInline')" @click="handleAddAccountClick"><a-icon type="plus" /></a-button>
        </div>
        <div v-if="isCryptoMarket" class="qt-dock-segmented">
          <button type="button" :class="{ active: tradeMode === 'spot' }" @click="selectTradeMode('spot')">{{ $t('quickTrade.spot') }}</button>
          <button type="button" :class="{ active: tradeMode === 'swap' }" @click="selectTradeMode('swap')">{{ $t('quickTrade.contractBadge') }}</button>
        </div>
        <div v-if="isSwapMode" class="qt-dock-trade-settings">
          <div class="qt-dock-segmented qt-dock-margin-segmented">
            <button type="button" :class="{ active: marginMode === 'cross' }" @click="marginMode = 'cross'">{{ $t('quickTrade.crossMargin') }}</button>
            <button type="button" :class="{ active: marginMode === 'isolated' }" @click="marginMode = 'isolated'">{{ $t('quickTrade.isolatedMargin') }}</button>
          </div>
          <a-popover trigger="click" placement="bottom" overlay-class-name="qt-leverage-popover" :get-popup-container="qtSelectPopupContainer">
            <template slot="content">
              <div class="qt-leverage-editor">
                <a-slider v-model="leverage" :min="1" :max="125" :marks="leverageMarks" :tipFormatter="v => v + 'x'" />
                <div class="qt-leverage-presets">
                  <button v-for="value in leveragePresets" :key="value" type="button" :class="{ active: leverage === value }" @click="leverage = value">{{ value }}x</button>
                </div>
                <a-input-number v-model="leverage" :min="1" :max="125" :formatter="v => `${v}x`" :parser="v => String(v).replace('x', '')" />
              </div>
            </template>
            <button type="button" class="qt-dock-leverage-trigger">
              <span>{{ $t('quickTrade.leverage') }}</span><strong>{{ leverage }}x</strong><a-icon type="down" />
            </button>
          </a-popover>
        </div>
        <div class="qt-dock-balance">
          <span>{{ isStockMarket ? $t('quickTrade.buyingPower') : (isSwapMode ? $t('quickTrade.swapAvailable') : $t('quickTrade.spotAvailable')) }}</span>
          <strong>{{ balanceLoading ? '...' : `$${formatPrice(activeBalanceAvailable)}` }}</strong>
        </div>
        <div class="qt-dock-balance qt-dock-balance--secondary">
          <span>{{ $t('quickTrade.totalAssets') }}</span>
          <strong>${{ formatPrice(activeBalanceTotal) }}</strong>
        </div>
        <span class="qt-dock-status" :class="{ 'is-connected': selectedCredentialId }">
          <i></i>{{ selectedCredentialId ? $t('quickTrade.connected') : accountPlaceholder }}
        </span>
        <a-button class="qt-dock-icon-btn" :title="$t('common.refresh')" :loading="dockRefreshing" @click="refreshDockData"><a-icon type="reload" /></a-button>
      </div>

      <div :class="['qt-embedded-split', { 'qt-embedded-split--cols': embedded }]">
        <div class="qt-embedded-col qt-embedded-col-left">

          <!-- Credential Selector -->
          <div v-if="!embeddedDock" class="qt-section qt-account-section">
            <div class="qt-label">{{ accountLabel }} <span class="qt-crypto-hint">{{ accountHint }}</span></div>
            <a-select
              v-model="selectedCredentialId"
              :placeholder="accountPlaceholder"
              style="width: 100%"
              :get-popup-container="qtSelectPopupContainer"
              :dropdown-class-name="qtSelectDropdownClass"
              @change="onCredentialChange"
              :loading="credLoading"
              :notFoundContent="isStockMarket ? $t('quickTrade.noBrokerAccount') : $t('quickTrade.noExchange')"
            >
              <a-select-option v-for="c in credentials" :key="c.id" :value="c.id">
                {{ formatCredentialOptionLabel(c) }}
                <a-tag v-if="c.enable_demo_trading" color="orange" size="small" style="margin-left: 6px;">{{ credentialEnvironmentLabel(c) }}</a-tag>
                <a-tag v-if="c.market_type" size="small" style="margin-left: 6px;">{{ c.market_type }}</a-tag>
              </a-select-option>
            </a-select>
            <div class="qt-account-actions">
              <a-button type="primary" block size="small" class="qt-add-account-btn" @click="handleAddAccountClick">
                <a-icon type="plus" /> {{ $t('quickTrade.addAccountInline') }}
              </a-button>
            </div>
            <div class="qt-balance" v-if="selectedCredentialId">
              <template v-if="balanceLoading">
                <a-spin size="small" />
                <span class="qt-balance-label qt-balance-loading-text">{{ $t('quickTrade.available') }}...</span>
              </template>
              <template v-else>
                <template v-if="isStockMarket">
                  <div class="qt-balance-line qt-balance-line--active">
                    <span class="qt-balance-label">{{ $t('quickTrade.buyingPower') }}</span>
                    <span class="qt-balance-value">${{ formatPrice(activeBalanceAvailable) }}</span>
                  </div>
                </template>
                <template v-else>
                  <div
                    class="qt-balance-line"
                    :class="{ 'qt-balance-line--active': isSwapMode }"
                  >
                    <span class="qt-balance-label">{{ $t('quickTrade.swapAvailable') }}</span>
                    <span class="qt-balance-value">${{ formatPrice(swapBalanceAvailable) }}</span>
                  </div>
                  <div
                    class="qt-balance-line"
                    :class="{ 'qt-balance-line--active': !isSwapMode }"
                  >
                    <span class="qt-balance-label">{{ $t('quickTrade.spotAvailable') }}</span>
                    <span class="qt-balance-value">${{ formatPrice(spotBalanceAvailable) }}</span>
                  </div>
                </template>
                <div
                  v-if="balanceErrorMessage"
                  class="qt-balance-error-hint"
                  :title="balance.error"
                >
                  {{ balanceErrorMessage }}
                </div>
              </template>
            </div>
          </div>

          <div class="qt-order-entry-stack">
            <!-- Order Type -->
            <div class="qt-section qt-order-type-section">
              <a-radio-group v-model="orderType" button-style="solid" size="small" style="width: 100%;">
                <a-radio-button value="market" style="width: 50%; text-align: center;">
                  {{ $t('quickTrade.market') }}
                </a-radio-button>
                <a-radio-button value="limit" style="width: 50%; text-align: center;">
                  {{ $t('quickTrade.limit') }}
                </a-radio-button>
              </a-radio-group>
            </div>

            <!-- Limit Price -->
            <div class="qt-section qt-limit-section" v-if="orderType === 'limit'">
              <div class="qt-label">{{ $t('quickTrade.limitPrice') }}</div>
              <a-input-number
                v-model="limitPrice"
                :min="0"
                :step="priceStep"
                :precision="pricePrecision"
                style="width: 100%"
                :placeholder="$t('quickTrade.enterPrice')"
              />
            </div>

            <!-- Amount (USDT) -->
            <div class="qt-section qt-amount-block">
              <div class="qt-amount-label-row">
                <div class="qt-label">{{ amountLabel }} ({{ orderCurrency }})</div>
                <span
                  v-if="embeddedDock && isSwapMode"
                  class="qt-inline-notional"
                  :title="$t('quickTrade.marginNotionalFormula', {
                    margin: formatPrice(amount),
                    leverage: leverage,
                    notional: formatPrice(estimatedNotionalUsdt),
                    currency: orderCurrency
                  })"
                >≈ {{ formatPrice(estimatedNotionalUsdt) }} {{ orderCurrency }}</span>
              </div>
              <a-input-number
                v-model="amount"
                :min="1"
                :step="10"
                :precision="2"
                style="width: 100%"
                :placeholder="$t('quickTrade.enterAmount')"
              />
              <div v-if="isSwapMode && !embeddedDock" class="qt-notional-summary">
                {{ $t('quickTrade.marginNotionalFormula', {
                  margin: formatPrice(amount),
                  leverage: leverage,
                  notional: formatPrice(estimatedNotionalUsdt),
                  currency: orderCurrency
                }) }}
              </div>
            </div>
          </div>

          <!-- Mode & Leverage -->
          <div
            v-if="isCryptoMarket && !embeddedDock"
            class="qt-section qt-card qt-mode-card"
          >
            <div class="qt-section-title-row">
              <span class="qt-section-title">{{ isSwapMode ? $t('quickTrade.leverage') : $t('quickTrade.spotModeTitle') }}</span>
              <div class="qt-mode-toggle">
                <div
                  class="qt-mode-toggle-item"
                  :class="{ active: tradeMode === 'swap' }"
                  @click="tradeMode = 'swap'"
                >{{ $t('quickTrade.contractBadge') }}</div>
                <div
                  class="qt-mode-toggle-item"
                  :class="{ active: tradeMode === 'spot' }"
                  @click="tradeMode = 'spot'"
                >{{ $t('quickTrade.spotModeTitle') }}</div>
              </div>
            </div>
            <template v-if="isSwapMode">
              <div class="qt-leverage-row">
                <div class="qt-leverage-slider-wrap">
                  <a-slider
                    v-model="leverage"
                    :min="1"
                    :max="125"
                    :marks="leverageMarks"
                    :tipFormatter="v => v + 'x'"
                  />
                </div>
                <a-input-number
                  v-model="leverage"
                  :min="1"
                  :max="125"
                  :formatter="v => `${v}x`"
                  :parser="v => String(v).replace('x', '')"
                  class="qt-leverage-input"
                />
              </div>
              <div class="qt-label qt-label-spaced">{{ $t('quickTrade.marginMode') }}</div>
              <a-radio-group v-model="marginMode" size="small" button-style="solid" class="qt-margin-radio">
                <a-radio-button value="cross">{{ $t('quickTrade.crossMargin') }}</a-radio-button>
                <a-radio-button value="isolated">{{ $t('quickTrade.isolatedMargin') }}</a-radio-button>
              </a-radio-group>
              <div class="qt-hint-text">{{ $t('quickTrade.marginModeHint') }}</div>
            </template>
            <template v-else>
              <div class="qt-spot-info">
                <a-icon type="wallet" class="qt-spot-info-icon" />
                <span class="qt-hint-text">{{ $t('quickTrade.spotModeHint') }}</span>
              </div>
            </template>
          </div>
          <div v-else-if="!embeddedDock" class="qt-section qt-card qt-mode-card qt-stock-mode-card">
            <div class="qt-section-title-row">
              <span class="qt-section-title">{{ $t('quickTrade.alpacaAccount') }}</span>
              <span class="qt-optional-tag">1x</span>
            </div>
            <div class="qt-spot-info">
              <a-icon type="bank" class="qt-spot-info-icon" />
              <span class="qt-hint-text">{{ $t('quickTrade.stockSpotModeHint') }}</span>
            </div>
          </div>

          <div
            class="qt-risk-action-stack"
            :class="{ 'is-tpsl-open': embeddedDock && dockTpslEnabled }"
          >
            <div
              v-if="embeddedDock"
              class="qt-dock-tpsl-toggle"
            >
              <a-checkbox v-model="dockTpslEnabled">{{ $t('quickTrade.tpsl') }}</a-checkbox>
              <span>{{ $t('quickTrade.optional') }}</span>
            </div>
            <!-- TP / SL (optional, always expanded) -->
            <div v-show="!embeddedDock || dockTpslEnabled" class="qt-section qt-card qt-tpsl-card">
              <div v-if="!embeddedDock" class="qt-section-title-row">
                <span class="qt-section-title">{{ $t('quickTrade.tpsl') }}</span>
                <span class="qt-optional-tag">{{ $t('quickTrade.optional') }}</span>
              </div>
              <div class="qt-tpsl-row">
                <div class="qt-tpsl-item">
                  <span class="qt-label qt-tp-label">{{ $t('quickTrade.tp') }}</span>
                  <a-input-number
                    v-model="tpPrice"
                    :min="0"
                    :step="priceStep"
                    :precision="pricePrecision"
                    class="qt-input-full"
                    :placeholder="$t('quickTrade.tpPlaceholder')" />
                </div>
                <div class="qt-tpsl-item">
                  <span class="qt-label qt-sl-label">{{ $t('quickTrade.sl') }}</span>
                  <a-input-number
                    v-model="slPrice"
                    :min="0"
                    :step="priceStep"
                    :precision="pricePrecision"
                    class="qt-input-full"
                    :placeholder="$t('quickTrade.slPlaceholder')" />
                </div>
              </div>
              <div class="qt-hint-text qt-tpsl-record-hint">{{ $t('quickTrade.tpslRecordOnlyHint') }}</div>
            </div>

            <div v-if="!embeddedDock" class="qt-ai-filter-row">
              <div>
                <strong><a-icon type="safety" /> {{ $t('aiDecisionFilter.title') }}</strong>
                <span>{{ $t('aiDecisionFilter.quickTradeHint') }}</span>
              </div>
              <a-switch
                v-model="aiDecisionFilter"
                :aria-label="$t('aiDecisionFilter.title')"
                size="small"
              />
            </div>

            <!-- Submit Buttons -->
            <div class="qt-submit-section qt-submit-section--embedded-left">
              <a-button
                type="primary"
                size="large"
                :loading="submittingSide === 'buy'"
                :disabled="!canSubmit"
                @click="handleSubmit('buy')"
                class="qt-submit-btn qt-btn-long"
              >
                <a-icon type="arrow-up" />
                {{ buyActionText }}
              </a-button>
              <a-button
                type="danger"
                size="large"
                :loading="submittingSide === 'sell'"
                :disabled="!canSubmit || (!isSwapMode && currentPositions.length === 0)"
                @click="handleSubmit('sell')"
                class="qt-submit-btn qt-btn-short"
              >
                <a-icon type="arrow-down" />
                {{ sellActionText }}
              </a-button>
            </div>
          </div>

        </div>
        <div class="qt-embedded-col qt-embedded-col-right">

          <div v-if="embeddedDock" class="qt-dock-tabs">
            <button
              v-for="tab in dockTabItems"
              :key="tab.key"
              type="button"
              :class="{ active: activeDockTab === tab.key }"
              @click="activeDockTab = tab.key"
            >
              {{ tab.label }}<span v-if="tab.count">{{ tab.count }}</span>
            </button>
          </div>

          <!-- Current Positions -->
          <div v-show="!embeddedDock || activeDockTab === 'positions'" class="qt-position-section">
            <div v-if="!embeddedDock" class="qt-section-header">
              <a-icon type="wallet" /> {{ $t('quickTrade.currentPosition') }}
              <span v-if="currentPositions.length > 1" class="qt-position-count">({{ currentPositions.length }})</span>
            </div>
            <template v-if="currentPositions.length > 0">
              <div v-if="isSwapMode" class="qt-close-scope qt-close-scope-global">
                <a-radio-group v-model="closeScope" size="small" class="qt-close-scope-radio">
                  <a-radio-button value="full">{{ $t('quickTrade.closeScopeFull') }}</a-radio-button>
                  <a-radio-button value="system_tracked">{{ $t('quickTrade.closeScopeSystem') }}</a-radio-button>
                </a-radio-group>
                <div class="qt-hint-text">{{ $t('quickTrade.closeScopeSystemHint') }}</div>
              </div>
              <div
                v-for="(pos, idx) in currentPositions"
                :key="'pos-' + idx + '-' + (pos.side || '') + '-' + String(pos.size || '')"
                class="qt-position-card"
                :class="pos.side"
              >
                <div class="qt-pos-row qt-pos-row--side">
                  <span>{{ $t('quickTrade.side') }}</span>
                  <a-tag :color="pos.side === 'long' ? '#52c41a' : '#f5222d'" size="small">
                    {{ pos.side === 'long'
                      ? (isSwapMode ? $t('quickTrade.long') : $t('quickTrade.spotHold'))
                      : $t('quickTrade.short') }}
                  </a-tag>
                </div>
                <div class="qt-pos-row qt-pos-row--size">
                  <span>{{ $t('quickTrade.posSize') }}</span>
                  <span>{{ pos.size }}</span>
                </div>
                <div class="qt-pos-row qt-pos-row--value">
                  <span>{{ $t('quickTrade.positionValue') }}</span>
                  <span>{{ formatPrice(pos.notional_usdt) }} USDT</span>
                </div>
                <div class="qt-pos-row qt-pos-row--entry">
                  <span>{{ $t('quickTrade.entryPrice') }}</span>
                  <span>${{ formatPrice(pos.entry_price) }}</span>
                </div>
                <div class="qt-pos-row qt-pos-row--mark" v-if="pos.mark_price">
                  <span>{{ $t('quickTrade.markPrice') }}</span>
                  <span>${{ formatPrice(pos.mark_price) }}</span>
                </div>
                <div class="qt-pos-row qt-pos-row--leverage" v-if="pos.leverage && pos.leverage > 1">
                  <span>{{ $t('quickTrade.leverage') }}</span>
                  <span>{{ pos.leverage }}x</span>
                </div>
                <div class="qt-pos-row qt-pos-row--pnl">
                  <span>{{ $t('quickTrade.unrealizedPnl') }}</span>
                  <span :class="pos.unrealized_pnl >= 0 ? 'qt-green' : 'qt-red'">
                    ${{ formatPrice(pos.unrealized_pnl) }}
                  </span>
                </div>
                <a-button
                  type="danger"
                  size="small"
                  block
                  ghost
                  class="qt-position-close-btn"
                  @click="handleClosePosition(pos)"
                  :loading="closingPositionSide === pos.side"
                >
                  {{ isSwapMode ? $t('quickTrade.closePosition') : $t('quickTrade.sellSpot') }}
                </a-button>
              </div>
            </template>
            <div v-else class="qt-position-empty">
              <a-icon type="inbox" class="qt-empty-icon" />
              <span class="qt-empty-desc">{{ $t('quickTrade.noPositionHint') }}</span>
            </div>
          </div>

          <div v-if="embeddedDock && activeDockTab === 'aiDecisions'" class="qt-history-section qt-dock-history qt-ai-decision-history">
            <ai-decision-records
              source-type="quick_trade"
              :source-id="selectedCredentialId"
              :symbol="currentSymbol"
              :market-type="aiDecisionMarketType"
              :refresh-key="aiDecisionRefreshKey"
              :is-dark="isDark"
              compact
              @loaded="onAiDecisionsLoaded"
            />
          </div>

          <!-- Trade Records -->
          <div v-if="embeddedDock && ['openOrders', 'tradeRecords'].includes(activeDockTab)" class="qt-history-section qt-dock-history">
            <div v-if="dockTradeRows.length" class="qt-trade-list">
              <div class="qt-trade-item qt-trade-item--dock" v-for="t in dockTradeRows" :key="t.id">
                <div class="qt-trade-main">
                  <a-tag :color="t.side === 'buy' ? '#52c41a' : '#f5222d'" size="small">
                    {{ t.side === 'buy' ? $t('quickTrade.long') : $t('quickTrade.short') }}
                  </a-tag>
                  <span class="qt-trade-symbol">{{ t.symbol }}</span>
                  <span v-if="t.price" class="qt-trade-price">${{ formatPrice(t.price) }}</span>
                  <span class="qt-trade-amount">${{ formatPrice(t.display_amount) }}</span>
                  <a-tag :color="t.status === 'filled' ? '#52c41a' : ['failed', 'ai_rejected'].includes(t.status) ? '#f5222d' : '#faad14'" size="small">{{ t.status }}</a-tag>
                  <a-button
                    v-if="activeDockTab === 'openOrders' && canCancelTrade(t)"
                    type="link"
                    size="small"
                    class="qt-cancel-order-btn"
                    :loading="cancellingTradeId === t.id"
                    @click="handleCancelTrade(t)"
                  >{{ $t('brokerAccounts.cancelOrder') }}</a-button>
                  <span class="qt-trade-time">{{ formatTime(t.created_at) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="qt-position-empty">
              <a-icon type="inbox" class="qt-empty-icon" />
              <span class="qt-empty-desc">{{ dockEmptyText }}</span>
            </div>
          </div>

          <div class="qt-history-section" v-if="!embeddedDock && recentTrades.length > 0">
            <a-collapse :bordered="false" :activeKey="historyCollapsed ? [] : ['history']" @change="handleHistoryCollapse">
              <a-collapse-panel key="history" :showArrow="false" :style="collapseStyle">
                <template slot="header">
                  <div class="qt-section-header" style="margin: 0; padding: 0;">
                    <a-icon type="history" /> {{ $t('quickTrade.recentTrades') }}
                    <span class="qt-history-count">({{ recentTrades.length }})</span>
                  </div>
                </template>
                <div class="qt-trade-list">
                  <div class="qt-trade-item" v-for="t in recentTrades" :key="t.id">
                    <div class="qt-trade-main">
                      <a-tag :color="t.side === 'buy' ? '#52c41a' : '#f5222d'" size="small">
                        {{ t.side === 'buy' ? $t('quickTrade.long') : $t('quickTrade.short') }}
                      </a-tag>
                      <span class="qt-trade-symbol">{{ t.symbol }}</span>
                      <span class="qt-trade-amount">${{ formatPrice(t.amount) }}</span>
                    </div>
                    <div class="qt-trade-meta">
                      <a-tag :color="t.status === 'filled' ? '#52c41a' : ['failed', 'ai_rejected'].includes(t.status) ? '#f5222d' : '#faad14'" size="small">
                        {{ t.status }}
                      </a-tag>
                      <span class="qt-trade-time">{{ formatTime(t.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </a-collapse-panel>
            </a-collapse>
          </div>

        </div>
      </div>

    </component>
    <exchange-account-modal
      :visible.sync="showAddExchangeModal"
      :overlay-mount="() => qtOverlayMount()"
      @success="onExchangeAccountSaved"
    />
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { listExchangeCredentials } from '@/api/credentials'
import { formatExchangeCredentialLabel, isQuickTradeExchangeCredential } from '@/utils/exchangeCredential'
import ExchangeAccountModal from '@/components/ExchangeAccountModal/ExchangeAccountModal.vue'
import AiDecisionRecords from '@/views/strategy-center/components/AiDecisionRecords.vue'
import { placeQuickOrder, getQuickTradeBalance, getQuickTradePosition, getQuickTradeHistory, closeQuickTradePosition, cancelQuickTradeOrder } from '@/api/quick-trade'
import { searchSymbols, getWatchlist } from '@/api/market'
import { getUserInfo } from '@/api/login'
import request from '@/utils/request'
import { createVisibilityPolling } from '@/utils/visibilityPolling'
import { broker } from '@/api/broker'

export default {
  name: 'QuickTradePanel',
  components: { ExchangeAccountModal, AiDecisionRecords },
  props: {
    visible: { type: Boolean, default: false },
    symbol: { type: String, default: '' },
    presetSide: { type: String, default: '' }, // 'buy' or 'sell' 閳?pre-filled from AI signal
    presetPrice: { type: Number, default: 0 },
    source: { type: String, default: 'manual' }, // ai_radar / ai_analysis / indicator / manual
    marketType: { type: String, default: 'swap' }, // swap / spot
    market: { type: String, default: 'Crypto' },
    symbolLocked: { type: Boolean, default: false },
    embedded: { type: Boolean, default: false },
    embeddedIde: { type: Boolean, default: false },
    embeddedDock: { type: Boolean, default: false },
    aiDecisionFilterEnabled: { type: Boolean, default: false },
    overlayGetContainer: { type: Function, default: null }
  },
  data () {
    return {
      // exchange
      credentials: [],
      selectedCredentialId: undefined,
      credLoading: false,
      balanceLoading: false,
      balance: {
        available: 0,
        total: 0,
        swap: { available: 0, total: 0 },
        spot: { available: 0, total: 0 }
      },
      // order
      side: 'buy',
      orderType: 'market',
      limitPrice: 0,
      amount: 100,
      leverage: 5,
      tradeMode: 'swap',
      marginMode: 'cross',
      tpPrice: null,
      slPrice: null,
      aiDecisionFilter: this.aiDecisionFilterEnabled,
      // state
      submitting: false,
      submittingSide: '',
      closingPositionSide: null, // 'long' | 'short' | null
      currentPrice: 0,
      currentPositions: [],
      recentTrades: [],
      aiDecisionCount: 0,
      aiDecisionRefreshKey: 0,
      historyCollapsed: true,
      activeDockTab: 'positions',
      dockRefreshing: false,
      cancellingTradeId: null,
      dockTpslEnabled: false,
      closeScope: 'full', // full | system_tracked
      // symbol search
      currentSymbol: '',
      symbolSuggestions: [],
      symbolSearching: false,
      symbolSearchTimer: null,
      userId: null,
      leveragePresets: [1, 3, 5, 10, 20, 50, 100],
      // polling
      pollTimer: null,
      pricePoller: null,
      accountPoller: null,
      showAddExchangeModal: false
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDark () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    qtSelectDropdownClass () {
      return this.embeddedIde ? 'ide-qt-select-dropdown' : ''
    },
    normalizedMarket () {
      return String(this.market || '').trim() || 'Crypto'
    },
    isStockMarket () {
      return ['USStock', 'Stock', 'Stocks'].includes(this.normalizedMarket)
    },
    isCryptoMarket () {
      return this.normalizedMarket === 'Crypto'
    },
    tradableMarketSupported () {
      return this.isCryptoMarket || this.isStockMarket
    },
    priceMarketParam () {
      return this.isStockMarket ? 'USStock' : 'Crypto'
    },
    orderCurrency () {
      return this.isStockMarket ? 'USD' : 'USDT'
    },
    amountLabel () {
      return this.$t(this.isSwapMode ? 'quickTrade.marginAmount' : 'quickTrade.amount')
    },
    estimatedNotionalUsdt () {
      const amount = Math.max(0, Number(this.amount) || 0)
      return this.isSwapMode ? amount * Math.max(1, Number(this.leverage) || 1) : amount
    },
    accountLabel () {
      return this.isStockMarket ? this.$t('quickTrade.brokerAccount') : this.$t('quickTrade.exchange')
    },
    accountPlaceholder () {
      return this.isStockMarket ? this.$t('quickTrade.selectBrokerAccount') : this.$t('quickTrade.selectExchange')
    },
    accountHint () {
      return this.isStockMarket ? this.$t('quickTrade.usStockSpotOnly') : this.$t('quickTrade.cryptoAccountHint')
    },
    isSwapMode () {
      return this.isCryptoMarket && this.tradeMode === 'swap'
    },
    leverageMarks () {
      const keys = this.embeddedIde ? [1, 50, 125] : [1, 25, 50, 100, 125]
      return keys.reduce((acc, v) => {
        acc[v] = `${v}x`
        return acc
      }, {})
    },
    effectiveMarketType () {
      return this.isStockMarket ? 'spot' : this.tradeMode
    },
    aiDecisionMarketType () {
      return this.isStockMarket ? 'USStock' : this.effectiveMarketType
    },
    swapBalanceAvailable () {
      const leg = this.balance && this.balance.swap
      if (leg && leg.available != null) return parseFloat(leg.available) || 0
      if (!this.isSwapMode) return 0
      return parseFloat(this.balance.available) || 0
    },
    spotBalanceAvailable () {
      const leg = this.balance && this.balance.spot
      if (leg && leg.available != null) return parseFloat(leg.available) || 0
      if (this.isSwapMode) return 0
      return parseFloat(this.balance.available) || 0
    },
    activeBalanceAvailable () {
      return this.isSwapMode ? this.swapBalanceAvailable : this.spotBalanceAvailable
    },
    activeBalanceTotal () {
      if (this.isStockMarket) return parseFloat(this.balance.total) || this.activeBalanceAvailable
      const leg = this.isSwapMode ? this.balance.swap : this.balance.spot
      return parseFloat((leg && leg.total) || this.balance.total) || 0
    },
    scopedTradeRows () {
      const symbol = String(this.currentSymbol || '').toUpperCase()
      const marketType = String(this.effectiveMarketType || '').toLowerCase()
      return this.recentTrades
        .filter(item => !symbol || String(item.symbol || '').toUpperCase() === symbol)
        .filter(item => !item.market_type || String(item.market_type).toLowerCase() === marketType)
        .map(item => {
          const price = parseFloat(item.avg_fill_price || item.filled_avg_price || item.price || 0) || 0
          const filledAmount = parseFloat(item.filled_amount || item.filled_qty || item.filled || 0) || 0
          const executedNotional = price > 0 && filledAmount > 0 ? price * filledAmount : 0
          return {
            ...item,
            price,
            filled_amount: filledAmount,
            display_amount: executedNotional || (parseFloat(item.amount) || 0)
          }
        })
    },
    openOrderRows () {
      const activeStatuses = new Set(['new', 'open', 'pending', 'submitted', 'partially_filled', 'partially-filled', 'accepted', 'cancel_pending'])
      return this.scopedTradeRows.filter(item => activeStatuses.has(String(item.status || '').toLowerCase()))
    },
    dockTradeRows () {
      if (this.activeDockTab === 'openOrders') return this.openOrderRows
      return this.scopedTradeRows
    },
    dockEmptyText () {
      return this.$t(this.activeDockTab === 'openOrders' ? 'quickTrade.noOrders' : 'quickTrade.noTradeRecords')
    },
    dockTabItems () {
      return [
        { key: 'positions', label: this.$t('quickTrade.currentPosition'), count: this.currentPositions.length },
        { key: 'openOrders', label: this.$t('quickTrade.openOrders'), count: this.openOrderRows.length },
        { key: 'tradeRecords', label: this.$t('quickTrade.tradeRecords'), count: this.scopedTradeRows.length },
        { key: 'aiDecisions', label: this.$t('aiDecisionFilter.tab'), count: this.aiDecisionCount }
      ]
    },
    balanceErrorMessage () {
      const err = (this.balance && this.balance.error) || ''
      if (!err) return ''
      if (/40018|Invalid IP|invalid ip/i.test(err)) {
        const ip = (this.balance && this.balance.request_ip) || ''
        return this.$t('quickTrade.errorBitgetIpWhitelist', { ip: ip || '-' })
      }
      if (this.balance && this.balance.error_hint_key) {
        const key = this.balance.error_hint_key
        if (this.$te && this.$te(key)) return this.$t(key)
      }
      return err.length > 120 ? `${err.slice(0, 120)}...` : err
    },
    priceStep () {
      if (this.currentPrice > 10000) return 1
      if (this.currentPrice > 100) return 0.1
      if (this.currentPrice > 1) return 0.01
      return 0.0001
    },
    pricePrecision () {
      if (this.currentPrice > 10000) return 0
      if (this.currentPrice > 100) return 1
      if (this.currentPrice > 1) return 2
      return 4
    },
    canSubmit () {
      return this.tradableMarketSupported && this.selectedCredentialId && this.selectedCredential && this.currentSymbol && this.amount > 0 && !this.submitting
    },
    selectedCredential () {
      return this.credentials.find(c => c.id === this.selectedCredentialId)
    },
    priceChangeClass () {
      return ''
    },
    buyActionText () {
      return this.isSwapMode ? this.$t('quickTrade.buyLong') : this.$t('quickTrade.buySpot')
    },
    sellActionText () {
      return this.isSwapMode ? this.$t('quickTrade.sellShort') : this.$t('quickTrade.sellSpot')
    },
    collapseStyle () {
      return { background: 'transparent', borderRadius: '4px', border: 0, overflow: 'hidden' }
    },
    containerProps () {
      if (this.embedded) return {}
      return {
        title: null,
        width: 400,
        visible: this.visible,
        closable: false,
        bodyStyle: { padding: 0 },
        maskStyle: { background: 'rgba(0,0,0,0.45)' }
      }
    }
  },
  watch: {
    aiDecisionFilterEnabled (val) {
      this.aiDecisionFilter = Boolean(val)
    },
    visible (val) {
      if (this.embedded) {
        if (val) {
          this.init()
        } else {
          this.stopPolling()
        }
        return
      }
      if (val) {
        this.init()
      } else {
        this.stopPolling()
      }
    },
    symbol (val) {
      // Update currentSymbol when prop changes
      if (val) {
        this.currentSymbol = val
      }
    },
    currentSymbol (val) {
      // Reload price and position when symbol changes
      if (val) {
        this.loadPrice()
        if (this.selectedCredentialId) {
          this.loadPosition()
        }
        // Emit symbol change to parent
        if (!this.symbolLocked) this.$emit('update:symbol', val)
      }
    },
    market () {
      this.syncTradeModeFromProps()
      this.selectedCredentialId = undefined
      this.resetBalance()
      this.currentPositions = []
      this.recentTrades = []
      this.loadCredentials()
      this.loadWatchlistSymbols()
      if (this.currentSymbol) this.loadPrice()
    },
    marketType () {
      this.syncTradeModeFromProps()
    },
    selectedCredentialId (val) {
      this.resetBalance()
      this.currentPositions = []
      this.recentTrades = []
      // Reload position when credential changes
      if (val && this.currentSymbol) {
        this.loadPosition()
        this.loadHistory()
      }
    },
    presetSide (val) {
      if (val) this.side = val
    },
    presetPrice (val) {
      if (val > 0) {
        this.currentPrice = val
        this.limitPrice = val
      }
    },
    tradeMode (val) {
      if (this.isStockMarket && val !== 'spot') {
        this.tradeMode = 'spot'
        return
      }
      this.currentPositions = []
      this.recentTrades = []
      this.$nextTick(() => {
        if (this.selectedCredentialId) {
          this.loadBalance()
          this.loadPosition()
          this.loadHistory()
        }
      })
    }
  },
  mounted () {
    if (this.embedded) {
      if (this.visible) this.init()
    } else if (this.visible) {
      this.init()
    }
  },
  methods: {
    syncTradeModeFromProps () {
      const nextMode = this.isStockMarket ? 'spot' : (String(this.marketType || '').toLowerCase() === 'spot' ? 'spot' : 'swap')
      if (this.tradeMode !== nextMode) this.tradeMode = nextMode
    },
    selectTradeMode (mode) {
      const nextMode = mode === 'spot' ? 'spot' : 'swap'
      if (this.tradeMode !== nextMode) this.tradeMode = nextMode
      this.$emit('market-type-change', nextMode)
    },
    credentialEnvironmentLabel (credential) {
      const environment = String((credential && credential.environment) || '').toLowerCase()
      return this.$t(environment === 'testnet'
        ? 'profile.exchange.environmentTestnet'
        : 'profile.exchange.environmentDemo')
    },
    formatCredentialOptionLabel (cred) {
      if (cred && cred.type === 'broker') {
        return cred.name || this.$t('quickTrade.alpacaAccount')
      }
      return formatExchangeCredentialLabel(cred, {
        unnamed: this.$t('brokerAccounts.cryptoSection.unnamed')
      })
    },
    qtSelectPopupContainer (triggerNode) {
      if (typeof this.overlayGetContainer === 'function') {
        return this.overlayGetContainer(triggerNode)
      }
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const el = this.$el
      if (el && fs && typeof fs.contains === 'function' && fs.contains(el)) return fs
      return document.body
    },
    qtOverlayMount () {
      if (typeof this.overlayGetContainer === 'function') {
        const n = this.overlayGetContainer()
        return n || document.body
      }
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const el = this.$el
      if (el && fs && typeof fs.contains === 'function' && fs.contains(el)) return fs
      return document.body
    },
    async init () {
      // Initialize current symbol from prop
      this.currentSymbol = this.symbol || ''
      if (this.presetSide) this.side = this.presetSide
      this.syncTradeModeFromProps()
      if (this.presetPrice > 0) {
        this.currentPrice = this.presetPrice
        this.limitPrice = this.presetPrice
      }
      await this.loadCredentials()
      // Load user info to get userId
      await this.loadUserInfo()
      // Load watchlist crypto symbols for initial suggestions
      await this.loadWatchlistSymbols()
      // Load price for current symbol
      if (this.currentSymbol) {
        await this.loadPrice()
      }
      // Load position if credential and symbol are already available
      if (this.selectedCredentialId && this.currentSymbol) {
        await this.loadPosition()
      }
      this.loadHistory()
      this.startPolling()
    },
    async loadUserInfo () {
      try {
        // Try to get user info from store first
        const store = this.$store
        const storeUserInfo = store?.getters?.userInfo || {}
        if (storeUserInfo && storeUserInfo.id) {
          this.userId = storeUserInfo.id
          return
        }
        // If not in store, fetch from API
        const res = await getUserInfo()
        if (res && res.code === 1 && res.data) {
          this.userId = res.data.id
          // Update store
          if (store) {
            store.commit('SET_INFO', res.data)
          }
        }
      } catch (e) {
        console.warn('loadUserInfo error:', e)
      }
    },
    apiPayload (res) {
      if (!res) return {}
      if (res.data && typeof res.data === 'object') return res.data.data || res.data
      return res
    },
    apiSuccess (res) {
      return !!(res && (res.success === true || res.code === 1 || (res.data && res.data.success === true)))
    },
    normalizeBrokerSymbol (symbol) {
      return String(symbol || '').replace(/^USStock:/i, '').trim()
    },
    resetBalance () {
      this.balance = {
        available: 0,
        total: 0,
        swap: { available: 0, total: 0 },
        spot: { available: 0, total: 0 }
      }
    },
    toFiniteNumber (value, fallback = 0) {
      const n = parseFloat(value)
      return Number.isFinite(n) ? n : fallback
    },
    pickNumber (source, keys, fallback = 0) {
      const obj = source || {}
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          return this.toFiniteNumber(obj[key], fallback)
        }
      }
      return fallback
    },
    pickOptionalNumber (source, keys) {
      const obj = source || {}
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          return this.toFiniteNumber(obj[key], 0)
        }
      }
      return null
    },
    inferPositionSide (position, rawQty) {
      const rawSide = String(
        position.side ||
        position.position_side ||
        position.positionSide ||
        position.pos_side ||
        position.holdSide ||
        ''
      ).toLowerCase()
      if (rawSide.includes('short') || rawSide.includes('sell')) return 'short'
      if (rawSide.includes('long') || rawSide.includes('buy')) return 'long'
      return rawQty < 0 ? 'short' : 'long'
    },
    calculatePositionPnl (side, size, entryPrice, markPrice) {
      if (!(size > 0 && entryPrice > 0 && markPrice > 0)) return null
      return side === 'short'
        ? (entryPrice - markPrice) * size
        : (markPrice - entryPrice) * size
    },
    normalizePosition (position, options = {}) {
      const rawQty = this.pickNumber(position, ['size', 'qty', 'quantity', 'position', 'positionAmt', 'contracts'], 0)
      const size = Math.abs(rawQty)
      const side = this.inferPositionSide(position, rawQty)
      const entryPrice = this.pickNumber(position, ['entry_price', 'avg_entry_price', 'avgEntryPrice', 'entryPrice', 'average_price', 'avgPrice'], 0)
      const markPrice = this.pickNumber(position, ['mark_price', 'markPrice', 'current_price', 'currentPrice', 'last_price', 'lastPrice'], this.currentPrice || 0)
      const providedNotional = this.pickOptionalNumber(position, ['notional_usdt', 'notionalUsd', 'notional_usd', 'notional', 'positionValue', 'position_value', 'market_value', 'marketValue', 'value'])
      const notionalUsdt = providedNotional !== null && Math.abs(providedNotional) > 0
        ? Math.abs(providedNotional)
        : (size > 0 && markPrice > 0 ? size * markPrice : 0)
      const providedPnl = this.pickOptionalNumber(position, ['unrealized_pnl', 'unrealizedPnl', 'unrealized_pl', 'unrealizedPL', 'profit', 'pnl'])
      const computedPnl = this.calculatePositionPnl(side, size, entryPrice, markPrice)
      const shouldPreferComputed = options.preferComputedPnl || this.isStockMarket || this.effectiveMarketType === 'spot'
      const unrealizedPnl = shouldPreferComputed
        ? (computedPnl !== null ? computedPnl : (providedPnl !== null ? providedPnl : 0))
        : (providedPnl !== null ? providedPnl : (computedPnl !== null ? computedPnl : 0))
      return {
        ...position,
        side,
        size,
        entry_price: entryPrice,
        mark_price: markPrice,
        notional_usdt: notionalUsdt,
        unrealized_pnl: unrealizedPnl,
        leverage: this.pickNumber(position, ['leverage'], position.leverage || 1)
      }
    },
    applyNewPrice (price) {
      const parsed = parseFloat(price || 0)
      if (parsed > 0) {
        const oldPrice = this.currentPrice
        this.currentPrice = parsed
        if (this.limitPrice === 0 || this.limitPrice === this.presetPrice || this.limitPrice === oldPrice) {
          this.limitPrice = parsed
        }
      }
    },
    handleAddAccountClick () {
      if (this.isStockMarket) {
        this.$router.push('/broker-accounts')
        return
      }
      this.showAddExchangeModal = true
    },
    async loadWatchlistSymbols () {
      if (!this.userId) {
        // If no userId, try to load it first
        await this.loadUserInfo()
        if (!this.userId) {
          console.warn('Cannot load watchlist: userId not available')
          return
        }
      }
      try {
        const targetMarket = this.priceMarketParam.toLowerCase()
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) {
          const symbols = (res.data || []).filter(item =>
            (item.market || '').toLowerCase() === targetMarket
          ).map(item => ({
            value: item.symbol || '',
            symbol: item.symbol || '',
            name: item.name || ''
          })).filter(item => item.value)

          this.symbolSuggestions = symbols
        }
      } catch (e) {
        console.warn('loadWatchlistSymbols error:', e)
      }
    },
    handleSymbolSearch (value) {
      // Clear previous timer
      if (this.symbolSearchTimer) {
        clearTimeout(this.symbolSearchTimer)
      }

      if (!value || value.trim() === '') {
        // If empty, load watchlist symbols
        this.loadWatchlistSymbols()
        return
      }

      // Debounce search
      this.symbolSearchTimer = setTimeout(async () => {
        this.symbolSearching = true
        try {
          const res = await searchSymbols({ market: this.priceMarketParam, keyword: value.trim(), limit: 20 })
          if (res && res.code === 1 && res.data) {
            this.symbolSuggestions = (res.data.items || res.data || []).map(item => ({
              value: item.symbol || '',
              symbol: item.symbol || '',
              name: item.name || ''
            })).filter(item => item.value)
          } else {
            this.symbolSuggestions = []
          }
        } catch (e) {
          console.warn('handleSymbolSearch error:', e)
          this.symbolSuggestions = []
        } finally {
          this.symbolSearching = false
        }
      }, 300)
    },
    handleSymbolChange (value) {
      if (value && value !== this.currentSymbol) {
        this.currentSymbol = value
        // Load price for new symbol
        this.loadPrice()
        // Reload position for new symbol
        if (this.selectedCredentialId) {
          this.loadPosition()
        }
        // Emit to parent
        if (!this.symbolLocked) this.$emit('update:symbol', value)
      }
    },
    async loadPrice () {
      if (!this.currentSymbol) {
        this.currentPrice = 0
        return
      }
      try {
        const res = await request({
          url: '/api/market/price',
          method: 'get',
          params: {
            market: this.priceMarketParam,
            symbol: this.currentSymbol
          }
        })
        if (res && res.code === 1 && res.data) {
          this.applyNewPrice(res.data.price || res.data.latest || res.data.last)
          return
        }
        if (this.isStockMarket) {
          const quote = await broker.alpaca.quote(this.normalizeBrokerSymbol(this.currentSymbol), { marketType: 'USStock', credential_id: this.selectedCredentialId })
          const data = this.apiPayload(quote)
          this.applyNewPrice(data.price || data.latest || data.last || data.ask || data.bid)
        }
      } catch (e) {
        console.warn('loadPrice error:', e)
        if (this.isStockMarket) {
          try {
            const quote = await broker.alpaca.quote(this.normalizeBrokerSymbol(this.currentSymbol), { marketType: 'USStock', credential_id: this.selectedCredentialId })
            const data = this.apiPayload(quote)
            this.applyNewPrice(data.price || data.latest || data.last || data.ask || data.bid)
          } catch (stockErr) {
            console.warn('load stock price error:', stockErr)
          }
        }
        // Don't reset price on error, keep current value
      }
    },
    handleSymbolFocus () {
      // Load watchlist symbols when focusing if no suggestions
      if (this.symbolSuggestions.length === 0) {
        this.loadWatchlistSymbols()
      }
    },
    async loadCredentials () {
      this.credLoading = true
      try {
        if (this.isStockMarket) {
          const response = await broker.alpaca.accounts()
          const payload = this.apiPayload(response)
          this.credentials = (Array.isArray(payload) ? payload : []).map(account => ({
            id: Number(account.id),
            type: 'broker',
            broker_id: 'alpaca',
            exchange_id: 'alpaca',
            name: `${account.name} · ${account.api_key_hint} · #${account.id}`,
            market_type: 'USStock'
          }))
          if (this.selectedCredentialId && !this.credentials.some(c => c.id === this.selectedCredentialId)) {
            this.selectedCredentialId = undefined
            this.resetBalance()
            this.currentPositions = []
          }
          if (!this.selectedCredentialId && this.credentials.length > 0) {
            this.selectedCredentialId = this.credentials[0].id
            this.onCredentialChange(this.selectedCredentialId)
          }
          return
        }
        const res = await listExchangeCredentials()
        if (res.code === 1 && res.data) {
          const all = res.data.items || res.data || []
          this.credentials = all.filter(isQuickTradeExchangeCredential)
          if (this.selectedCredentialId && !this.credentials.some(c => c.id === this.selectedCredentialId)) {
            this.selectedCredentialId = undefined
            this.resetBalance()
            this.currentPositions = []
          }
          // Auto-select first if none selected
          if (!this.selectedCredentialId && this.credentials.length > 0) {
            this.selectedCredentialId = this.credentials[0].id
            this.onCredentialChange(this.selectedCredentialId)
          }
        }
      } catch (e) {
        console.error('loadCredentials error:', e)
      } finally {
        this.credLoading = false
      }
    },
    async onExchangeAccountSaved (data) {
      const prevId = this.selectedCredentialId
      await this.loadCredentials()
      const newId = data && (data.id || data.credential_id)
      if (newId && this.credentials.some(c => c.id === newId)) {
        this.selectedCredentialId = newId
        await this.onCredentialChange(newId)
      } else if (newId) {
        this.$message.warning(this.$t('quickTrade.noExchange'))
      } else if (!prevId && this.credentials.length === 1) {
        this.selectedCredentialId = this.credentials[0].id
        await this.onCredentialChange(this.selectedCredentialId)
      }
    },
    async onCredentialChange (credId) {
      if (!this.credentials.some(c => c.id === credId)) {
        this.selectedCredentialId = undefined
        this.$message.warning(this.isStockMarket ? this.$t('quickTrade.noBrokerAccount') : this.$t('quickTrade.noExchange'))
        return
      }
      this.selectedCredentialId = credId
      await this.loadBalance()
      await this.loadPosition()
    },
    async loadBalance () {
      if (!this.selectedCredentialId) return
      const credentialId = this.selectedCredentialId
      this.balanceLoading = true
      try {
        if (this.isStockMarket) {
          const res = await broker.alpaca.account({ credential_id: credentialId, include_counts: false })
          if (this.selectedCredentialId !== credentialId) return
          const d = this.apiPayload(res)
          const available = parseFloat(d.buying_power || d.buyingPower || d.cash || 0) || 0
          const total = parseFloat(d.equity || d.portfolio_value || d.portfolioValue || d.cash || available) || available
          this.balance = {
            available,
            total,
            currency: 'USD',
            swap: { available: 0, total: 0 },
            spot: { available, total }
          }
          return
        }
        const res = await getQuickTradeBalance({
          credential_id: this.selectedCredentialId,
          market_type: this.effectiveMarketType
        })
        if (res.code === 1 && res.data) {
          const d = res.data || {}
          const swap = d.swap && typeof d.swap === 'object' ? d.swap : {}
          const spot = d.spot && typeof d.spot === 'object' ? d.spot : {}
          const activeAvail = this.isSwapMode
            ? (parseFloat(swap.available) || parseFloat(d.available) || 0)
            : (parseFloat(spot.available) || parseFloat(d.available) || 0)
          this.balance = {
            available: activeAvail,
            total: parseFloat(d.total) || 0,
            currency: d.currency || 'USDT',
            swap: {
              available: parseFloat(swap.available) || 0,
              total: parseFloat(swap.total) || 0
            },
            spot: {
              available: parseFloat(spot.available) || 0,
              total: parseFloat(spot.total) || 0
            },
            error: d.error || swap.error || spot.error || '',
            error_hint_key: d.error_hint_key || '',
            request_ip: d.request_ip || ''
          }
          if (d.error && this.$message) {
            this.$message.warning(this.balanceErrorMessage || d.error, 6)
          }
        } else {
          this.resetBalance()
        }
      } catch (e) {
        console.warn('loadBalance error:', e)
        if (this.selectedCredentialId !== credentialId) return
        this.balance = {
          available: 0,
          total: 0,
          swap: { available: 0, total: 0 },
          spot: { available: 0, total: 0 },
          error: String(e.message || e)
        }
      } finally {
        this.balanceLoading = false
      }
    },
    async loadPosition () {
      const credentialId = this.selectedCredentialId
      const symbol = this.currentSymbol
      if (!this.selectedCredentialId || !this.currentSymbol) {
        console.log('loadPosition skipped:', { credentialId: this.selectedCredentialId, symbol: this.currentSymbol })
        return
      }
      try {
        if (this.isStockMarket) {
          const res = await broker.alpaca.positions({ credential_id: credentialId })
          if (this.selectedCredentialId !== credentialId || this.currentSymbol !== symbol) return
          const payload = this.apiPayload(res)
          const items = Array.isArray(payload) ? payload : (payload.positions || payload.items || payload.data || [])
          const target = this.normalizeBrokerSymbol(this.currentSymbol).toUpperCase()
          const matched = (items || []).filter(p => this.normalizeBrokerSymbol(p.symbol || p.asset_symbol || '').toUpperCase() === target)
          this.currentPositions = matched.map(p => this.normalizePosition({
            ...p,
            side: 'long',
            leverage: 1
          }, { preferComputedPnl: true }))
          return this.currentPositions.length > 0
        }
        console.log('Loading position:', { credential_id: this.selectedCredentialId, symbol: this.currentSymbol, market_type: this.effectiveMarketType })
        const res = await getQuickTradePosition({
          credential_id: this.selectedCredentialId,
          symbol: this.currentSymbol,
          market_type: this.effectiveMarketType
        })
        console.log('Position response:', res)
        if (res.code === 1 && res.data && res.data.positions && res.data.positions.length > 0) {
          this.currentPositions = res.data.positions.map(p => this.normalizePosition(p))
          console.log('Positions loaded:', this.currentPositions.length)
          return true
        } else {
          this.currentPositions = []
          console.log('No position found')
          return false
        }
      } catch (e) {
        console.error('loadPosition error:', e)
        if (this.selectedCredentialId !== credentialId || this.currentSymbol !== symbol) return
        this.currentPositions = []
        return false
      }
    },
    async loadPositionWithRetry (maxRetries = 3, delayMs = 2000) {
      // Try to load position immediately
      let found = await this.loadPosition()
      if (found) return

      // If not found, retry with delay (exchange may need time to update)
      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
        found = await this.loadPosition()
        if (found) {
          console.log(`Position found after ${i + 1} retry(ies)`)
          return
        }
      }
      console.log('Position not found after all retries')
    },
    async loadHistory () {
      const credentialId = this.selectedCredentialId
      try {
        if (this.isStockMarket) {
          if (!credentialId) return
          const res = await broker.alpaca.orders({ limit: 20, status: 'all', credential_id: credentialId })
          if (this.selectedCredentialId !== credentialId) return
          const payload = this.apiPayload(res)
          const items = Array.isArray(payload) ? payload : (payload.orders || payload.items || payload.data || [])
          this.recentTrades = (items || []).slice(0, 20).map(o => {
            const price = parseFloat(o.filled_avg_price || o.limit_price || 0) || 0
            const filledAmount = parseFloat(o.filled_qty || 0) || 0
            const requestedQty = parseFloat(o.qty || 0) || 0
            const notional = parseFloat(o.notional || 0) || ((filledAmount || requestedQty) * price)
            return {
              id: o.id || o.order_id || `${o.symbol}-${o.created_at || Date.now()}`,
              symbol: o.symbol || this.currentSymbol,
              side: o.side || 'buy',
              amount: notional,
              filled_amount: filledAmount,
              avg_fill_price: price,
              market_type: 'spot',
              order_type: o.order_type || o.type || 'market',
              exchange_order_id: o.id || o.order_id || '',
              status: o.status || '',
              created_at: o.created_at || o.submitted_at || o.updated_at
            }
          })
          return
        }
        if (!credentialId || !this.currentSymbol) return
        const symbol = this.currentSymbol
        const marketType = this.effectiveMarketType
        const res = await getQuickTradeHistory({
          limit: 50,
          credential_id: credentialId,
          symbol,
          market_type: marketType
        })
        if (
          this.selectedCredentialId !== credentialId ||
          this.currentSymbol !== symbol ||
          this.effectiveMarketType !== marketType
        ) return
        if (res.code === 1 && res.data) {
          this.recentTrades = res.data.trades || []
        }
      } catch (e) {
        console.warn('loadHistory error:', e)
      }
    },
    canCancelTrade (trade) {
      if (!trade) return false
      if (String(trade.order_type || '').toLowerCase() !== 'limit') return false
      const status = String(trade.status || '').toLowerCase().replace('-', '_')
      const active = ['new', 'open', 'pending', 'pending_new', 'pending_replace', 'held', 'submitted', 'partially_filled', 'accepted'].includes(status)
      return active && !!(this.isStockMarket ? trade.id : trade.exchange_order_id)
    },
    async handleCancelTrade (trade) {
      if (!this.canCancelTrade(trade) || this.cancellingTradeId) return
      this.cancellingTradeId = trade.id
      try {
        const res = this.isStockMarket
          ? await broker.alpaca.cancelOrder(trade.id, { credential_id: this.selectedCredentialId })
          : await cancelQuickTradeOrder({ trade_id: trade.id })
        const succeeded = this.isStockMarket
          ? !!(res && (res.success || (res.data && res.data.success)))
          : !!(res && res.code === 1)
        if (succeeded) {
          this.$message.success(this.$t('brokerAccounts.cancelRequested'))
          await this.loadHistory()
          await this.loadBalance()
          await this.loadPosition()
        } else {
          const hint = res && res.error_hint && this.$te(res.error_hint) ? this.$t(res.error_hint) : ''
          this.$notification.error({
            message: this.$t('brokerAccounts.cancelFailed'),
            description: hint
          })
        }
      } catch (e) {
        const rd = (e && e.response && e.response.data) || {}
        const hint = rd.error_hint && this.$te(rd.error_hint) ? this.$t(rd.error_hint) : ''
        this.$notification.error({
          message: this.$t('brokerAccounts.cancelFailed'),
          description: hint
        })
      } finally {
        this.cancellingTradeId = null
      }
    },
    async refreshDockData () {
      if (this.dockRefreshing) return
      this.dockRefreshing = true
      try {
        await Promise.all([
          this.loadPrice(),
          this.loadBalance(),
          this.loadPosition(),
          this.loadHistory()
        ])
        this.aiDecisionRefreshKey += 1
      } finally {
        this.dockRefreshing = false
      }
    },
    async handleSubmit (side = 'buy') {
      if (!this.canSubmit) return
      this.side = side
      this.submitting = true
      this.submittingSide = side
      try {
        if (this.isStockMarket) {
          await this.submitAlpacaOrder(side)
          return
        }
        const useProtectionPrices = !this.embeddedDock || this.dockTpslEnabled
        const payload = {
          credential_id: this.selectedCredentialId,
          symbol: this.currentSymbol,
          side,
          order_type: this.orderType,
          amount: this.amount,
          price: this.orderType === 'limit' ? this.limitPrice : 0,
          leverage: this.isSwapMode ? this.leverage : 1,
          market_type: this.effectiveMarketType,
          margin_mode: this.isSwapMode ? this.marginMode : undefined,
          tp_price: useProtectionPrices ? (this.tpPrice || 0) : 0,
          sl_price: useProtectionPrices ? (this.slPrice || 0) : 0,
          source: this.source,
          ai_decision_filter: this.aiDecisionFilter
        }
        const res = await placeQuickOrder(payload)
        if (res.code === 1) {
          // Emit event for parent component (parent will show success message)
          this.$emit('order-success', res.data)

          // Reload all data after successful order
          await this.loadBalance()
          await this.loadHistory()

          // Load position with retry mechanism (exchange may need time to update)
          await this.loadPositionWithRetry()
        } else {
          if (res.ai_rejected) {
            const decision = (res.data && res.data.ai_decision) || {}
            this.$notification.warning({
              message: this.$t('aiDecisionFilter.rejected'),
              description: this.aiDecisionReason(decision)
            })
            return
          }
          const hint = res.error_hint ? this.$t(res.error_hint) : ''
          this.$notification.error({
            message: this.$t('quickTrade.orderFailed'),
            description: hint || res.msg || ''
          })
        }
      } catch (e) {
        const rd = (e && e.response && e.response.data) || {}
        const hint = rd.error_hint ? this.$t(rd.error_hint) : ''
        this.$notification.error({
          message: this.$t('quickTrade.orderFailed'),
          description: hint || rd.msg || e.message || ''
        })
      } finally {
        if (this.aiDecisionFilter) this.aiDecisionRefreshKey += 1
        this.submitting = false
        this.submittingSide = ''
      }
    },
    async submitAlpacaOrder (side) {
      const price = this.orderType === 'limit' ? parseFloat(this.limitPrice || 0) : parseFloat(this.currentPrice || 0)
      if (!(price > 0)) {
        this.$notification.error({
          message: this.$t('quickTrade.orderFailed'),
          description: this.$t('quickTrade.enterPrice')
        })
        return
      }
      const quantity = Number((parseFloat(this.amount || 0) / price).toFixed(6))
      if (!(quantity > 0)) {
        this.$notification.error({
          message: this.$t('quickTrade.orderFailed'),
          description: this.$t('quickTrade.errorHints.invalidSize')
        })
        return
      }
      const payload = {
        credential_id: this.selectedCredentialId,
        symbol: this.normalizeBrokerSymbol(this.currentSymbol),
        side,
        quantity,
        marketType: 'USStock',
        orderType: this.orderType,
        price: this.orderType === 'limit' ? price : undefined,
        reference_price: price,
        source: this.source,
        ai_decision_filter: this.aiDecisionFilter
      }
      const res = await broker.alpaca.placeOrder(payload)
      if (this.apiSuccess(res)) {
        this.$emit('order-success', this.apiPayload(res))
        await this.loadBalance()
        await this.loadHistory()
        await this.loadPositionWithRetry()
      } else {
        const data = this.apiPayload(res)
        if (res && res.ai_rejected) {
          const decision = (data && data.ai_decision) || {}
          this.$notification.warning({
            message: this.$t('aiDecisionFilter.rejected'),
            description: this.aiDecisionReason(decision)
          })
          return
        }
        this.$notification.error({
          message: this.$t('quickTrade.orderFailed'),
          description: data.msg || data.message || ''
        })
      }
    },
    aiDecisionReason (decision) {
      const reason = String((decision && decision.reason) || '')
      const exactKey = `aiDecisionFilter.reason.${reason}`
      const exact = this.$t(exactKey)
      if (exact !== exactKey) return exact
      const baseKey = `aiDecisionFilter.reason.${reason.split(':')[0]}`
      const translated = this.$t(baseKey)
      return translated === baseKey ? (reason || this.$t('aiDecisionFilter.rejectedHint')) : translated
    },
    onAiDecisionsLoaded (rows) {
      this.aiDecisionCount = Array.isArray(rows) ? rows.length : 0
    },
    async handleClosePosition (pos) {
      if (!pos || !this.selectedCredentialId || !this.currentSymbol) return
      const leg = (pos.side || '').toLowerCase()
      this.closingPositionSide = leg || null
      try {
        if (this.isStockMarket) {
          const qty = parseFloat(pos.size || pos.qty || 0) || 0
          if (!(qty > 0)) return
          const res = await broker.alpaca.placeOrder({
            credential_id: this.selectedCredentialId,
            symbol: this.normalizeBrokerSymbol(this.currentSymbol),
            side: 'sell',
            quantity: Number(qty.toFixed(6)),
            marketType: 'USStock',
            orderType: 'market',
            source: 'manual'
          })
          if (this.apiSuccess(res)) {
            this.$message.success(this.$t('quickTrade.positionClosed'))
            await this.loadBalance()
            await this.loadHistory()
            await this.loadPositionWithRetry()
          } else {
            const data = this.apiPayload(res)
            this.$notification.error({
              message: this.$t('quickTrade.orderFailed'),
              description: data.msg || data.message || ''
            })
          }
          return
        }
        const payload = {
          credential_id: this.selectedCredentialId,
          symbol: this.currentSymbol,
          market_type: this.effectiveMarketType,
          size: 0,
          close_scope: this.isSwapMode ? this.closeScope : 'full',
          position_side: leg,
          source: 'manual'
        }
        const res = await closeQuickTradePosition(payload)
        if (res.code === 1) {
          this.$message.success(this.$t('quickTrade.positionClosed'))
          await this.loadBalance()
          await this.loadHistory()
          this.currentPositions = this.currentPositions.filter(p => (p.side || '').toLowerCase() !== leg)
          setTimeout(async () => {
            await this.loadPosition()
          }, 2000)
        } else {
          const hint = res.error_hint ? this.$t(res.error_hint) : ''
          this.$notification.error({
            message: this.$t('quickTrade.orderFailed'),
            description: hint || res.msg || ''
          })
        }
      } catch (e) {
        const rd = (e && e.response && e.response.data) || {}
        const hint = rd.error_hint ? this.$t(rd.error_hint) : ''
        this.$notification.error({
          message: this.$t('quickTrade.orderFailed'),
          description: hint || rd.msg || e.message || ''
        })
      } finally {
        this.closingPositionSide = null
      }
    },
    startPolling () {
      this.stopPolling()
      this.pricePoller = createVisibilityPolling(() => {
        if (this.currentSymbol) {
          this.loadPrice()
        }
      }, 10000, { immediate: false })
      this.accountPoller = createVisibilityPolling(() => {
        if (this.selectedCredentialId && this.currentSymbol) {
          this.loadBalance()
          this.loadPosition()
          this.loadHistory()
        }
      }, 15000, { immediate: false })
      this.pricePoller.start()
      this.accountPoller.start()
    },
    stopPolling () {
      if (this.pricePoller) {
        this.pricePoller.stop()
        this.pricePoller = null
      }
      if (this.accountPoller) {
        this.accountPoller.stop()
        this.accountPoller = null
      }
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
    },
    handleClose () {
      this.$emit('close')
      this.$emit('update:visible', false)
    },
    handleHistoryCollapse (activeKeys) {
      this.historyCollapsed = !activeKeys.includes('history')
    },
    formatPrice (val) {
      const v = parseFloat(val || 0)
      if (Math.abs(v) >= 10000) return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
      if (Math.abs(v) >= 100) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      if (Math.abs(v) >= 1) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      return v.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })
    },
    formatTime (ts) {
      if (!ts) return ''
      const d = new Date(ts)
      const pad = n => String(n).padStart(2, '0')
      return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  },
  beforeDestroy () {
    this.stopPolling()
  }
}
</script>

<style lang="less" scoped>
.quick-trade-drawer {
  ::v-deep .ant-drawer-body {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }
}

/* Drawer / default: wrapper is transparent; columns flatten into normal flow */
.qt-embedded-split:not(.qt-embedded-split--cols) {
  display: contents;
}
.qt-embedded-split:not(.qt-embedded-split--cols) .qt-embedded-col-left,
.qt-embedded-split:not(.qt-embedded-split--cols) .qt-embedded-col-right {
  display: contents;
}
/* IDE tab: left / right columns */
.qt-embedded-split--cols {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
  padding: 2px 0 6px;
}
.qt-embedded-split--cols .qt-embedded-col-left,
.qt-embedded-split--cols .qt-embedded-col-right {
  flex: 1;
  min-width: 0;
}
.qt-embedded-split--cols .qt-embedded-col-right {
  border-left: 1px solid #f0f0f0;
  padding-left: 14px;
  padding-right: 4px;
  margin-left: 2px;
}
.qt-embedded-split--cols .qt-section {
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.quick-trade-embedded {
  display: flex;
  flex-direction: column;
  border: none;
  border-radius: 0;
  overflow: visible;
  background: transparent;
  .qt-embedded-split--cols {
    padding: 8px 18px 12px;
  }
  .qt-symbol-bar {
    padding: 8px 18px;
    background: transparent;
    flex-direction: row;
    align-items: center;
    .qt-symbol-selector { flex: 1; }
    .qt-price-display { margin-left: 12px; }
  }
  .qt-section { padding: 6px 0; }
  .qt-card { margin-left: 0; margin-right: 0; padding: 10px 12px; border-radius: 8px; }
  .qt-mode-card,
  .qt-tpsl-card {
    margin-left: 0;
    margin-right: 0;
  }
  .qt-mode-card { margin-top: 8px; }
  .qt-tpsl-card { margin-top: 8px; }

  .qt-mode-card .qt-section-title-row {
    margin-bottom: 14px;
  }
  .qt-mode-card .qt-leverage-row {
    margin-top: 8px;
    margin-bottom: 8px;
  }
  .qt-mode-card .qt-label-spaced {
    margin-top: 18px;
    margin-bottom: 10px;
  }
  .qt-mode-card .qt-margin-radio {
    margin-top: 6px;
  }
  .qt-mode-card .qt-hint-text {
    margin-top: 14px;
  }

  .qt-tpsl-card .qt-section-title-row {
    margin-bottom: 14px;
  }
  .qt-tpsl-card .qt-tpsl-row {
    gap: 16px;
  }
  .qt-tpsl-card .qt-tpsl-item .qt-label {
    display: block;
    margin-bottom: 10px;
  }
  .qt-tpsl-card .qt-tpsl-record-hint {
    margin-top: 16px;
  }

  .qt-submit-section--embedded-left {
    padding: 12px 0 4px;
    .qt-submit-btn { height: 40px; font-size: 14px; border-radius: 8px; }
  }

  .qt-position-section { padding: 0 0 10px; }
  .qt-history-section { padding: 0 0 10px; }
  .qt-ai-decision-history { overflow: auto; }

  .qt-direction-toggle .qt-dir-btn { padding: 8px; font-size: 13px; border-radius: 6px; }
  .qt-quick-amounts { margin-top: 6px; margin-bottom: 2px; }
  .qt-amount-block { padding-bottom: 6px; }
  .qt-account-actions .qt-add-account-btn { height: 30px; }
}

.quick-trade-embedded.qt-embedded-ide {
  .qt-embedded-split--cols {
    // Child cards already use the same 14px outer margin as the symbol bar.
    // Extra horizontal padding here made every section below it 24px narrower.
    padding: 0 0 12px;
    gap: 14px;
  }
  .qt-embedded-split--cols .qt-embedded-col-left,
  .qt-embedded-split--cols .qt-embedded-col-right {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding-left: 0 !important;
    padding-right: 0 !important;
    margin-left: 0 !important;
  }
  .qt-embedded-split--cols .qt-section {
    padding-left: 14px !important;
    padding-right: 14px !important;
  }
  .qt-symbol-bar {
    margin: 0 14px 12px;
    padding: 12px 14px;
    border-radius: 12px;
    background: linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%);
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    ::v-deep .ant-select-selection {
      border-radius: 8px;
      border-color: #e2e8f0;
    }
    .qt-current-price {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
  }
  .qt-section:not(.qt-card) {
    padding: 10px 14px;
    margin: 0 14px 8px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  }
  .qt-card {
    margin-left: 14px;
    margin-right: 14px;
    margin-bottom: 8px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  }
  .qt-mode-card,
  .qt-tpsl-card {
    margin-left: 14px;
    margin-right: 14px;
  }
  .qt-submit-section--embedded-left {
    padding: 8px 14px 4px;
    margin: 0 14px;
  }
  .qt-position-section {
    margin: 0 14px;
    padding: 12px 14px 10px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-sizing: border-box;
  }
  .qt-history-section {
    margin: 0 14px 8px;
    padding: 8px 14px 12px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-sizing: border-box;
  }
  .qt-position-empty {
    border-radius: 10px;
  }
  .qt-position-card {
    border-radius: 10px;
  }
}

.qt-risk-action-stack {
  display: contents;
}

/* Indicator chart dock: keep the complete order path visible below the K-line. */
.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock {
  min-width: 0;

  .qt-embedded-split--cols {
    display: grid;
    grid-template-columns: minmax(260px, 0.9fr) minmax(300px, 1.05fr) minmax(340px, 1.25fr);
    align-items: stretch;
    gap: 10px;
    padding: 8px 12px 12px;
  }
  .qt-embedded-split--cols .qt-embedded-col-left,
  .qt-embedded-split--cols .qt-embedded-col-right {
    display: contents;
  }
  .qt-embedded-split--cols .qt-embedded-col-right {
    border: 0;
  }

  .qt-account-section,
  .qt-mode-card,
  .qt-risk-action-stack,
  .qt-position-section,
  .qt-history-section {
    width: auto;
    min-width: 0;
    height: 100%;
    margin: 0 !important;
    box-sizing: border-box;
  }

  .qt-account-section {
    grid-column-start: 1;
    grid-column-end: -1;
    display: grid;
    grid-template-columns: auto minmax(240px, 420px) auto minmax(260px, 1fr);
    align-items: center;
    gap: 10px;
    height: auto;
    padding: 8px 10px !important;
  }
  .qt-account-section > .qt-label {
    margin: 0;
    white-space: nowrap;
  }
  .qt-account-section .qt-account-actions {
    margin: 0;
  }
  .qt-account-section .qt-add-account-btn {
    width: auto;
    min-width: 104px;
    padding: 0 14px;
  }
  .qt-account-section .qt-balance {
    min-width: 0;
    margin: 0;
    padding: 5px 10px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
  }
  .qt-account-section .qt-balance-line {
    flex: 0 1 190px;
    min-width: 0;
  }
  .qt-account-section .qt-balance-error-hint {
    margin: 0;
  }

  .qt-order-entry-stack {
    min-width: 0;
    height: 100%;
    padding: 8px 10px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
    box-sizing: border-box;
  }
  .qt-order-entry-stack .qt-section:not(.qt-card) {
    margin: 0 !important;
    padding: 4px !important;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .qt-order-entry-stack .qt-order-type-section {
    padding-top: 0 !important;
  }
  .qt-order-entry-stack .qt-amount-block {
    padding-bottom: 0 !important;
  }

  .qt-mode-card {
    padding: 10px 12px;
  }
  .qt-mode-card .qt-section-title-row,
  .qt-tpsl-card .qt-section-title-row {
    margin-bottom: 8px;
  }
  .qt-mode-card .qt-label-spaced,
  .qt-mode-card .qt-hint-text,
  .qt-tpsl-card .qt-tpsl-record-hint {
    margin-top: 8px;
  }
  .qt-mode-card .qt-leverage-row {
    margin: 2px 0 4px;
  }
  .qt-tpsl-card .qt-tpsl-row {
    gap: 8px;
  }
  .qt-tpsl-card .qt-tpsl-item .qt-label {
    margin-bottom: 4px;
  }

  .qt-risk-action-stack {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.06);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  }
  .qt-risk-action-stack .qt-tpsl-card {
    width: 100%;
    height: auto;
    margin: 0 !important;
    padding: 0 !important;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .qt-risk-action-stack .qt-submit-section--embedded-left {
    width: 100%;
    min-height: 0;
    margin: auto 0 0 !important;
    padding: 10px 0 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }
  .qt-risk-action-stack .qt-submit-btn {
    min-width: 0;
    height: 42px;
    padding: 0 8px;
    font-size: 13px;
  }

  .qt-position-section,
  .qt-history-section {
    grid-column-start: 1;
    grid-column-end: -1;
  }
  .qt-position-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
    height: auto;
    padding: 10px 12px;
  }
  .qt-position-section .qt-section-header,
  .qt-position-section .qt-close-scope,
  .qt-position-section .qt-position-empty {
    grid-column-start: 1;
    grid-column-end: -1;
  }
  .qt-position-section .qt-section-header {
    margin-bottom: 0;
  }
  .qt-position-section .qt-position-empty {
    min-height: 50px;
    flex-direction: row;
    gap: 10px;
  }
  .qt-position-section .qt-position-empty .qt-empty-icon {
    margin: 0;
    font-size: 22px;
  }
  .qt-position-card + .qt-position-card {
    margin-top: 0;
  }
  .qt-position-card {
    grid-column-start: 1;
    grid-column-end: -1;
    display: grid;
    grid-template-columns: repeat(7, minmax(96px, 1fr)) minmax(112px, auto);
    align-items: center;
    gap: 10px 18px;
    min-height: 64px;
    padding: 10px 12px;
  }
  .qt-position-card .qt-pos-row {
    min-width: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 3px;
  }
  .qt-position-card .qt-pos-row > span,
  .qt-position-card .qt-pos-row > .ant-tag {
    max-width: 100%;
  }
  .qt-position-card .qt-pos-row > span:last-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .qt-position-card .qt-position-close-btn {
    align-self: center;
    justify-self: center;
    width: 148px;
    max-width: 100%;
    min-width: 112px;
    margin: 0;
  }
}

@media (max-width: 1280px) {
  .quick-trade-embedded.qt-embedded-ide.qt-embedded-dock {
    .qt-embedded-split--cols {
      grid-template-columns: repeat(2, minmax(280px, 1fr));
    }
    .qt-account-section {
      grid-template-columns: auto minmax(220px, 1fr) auto;
    }
    .qt-account-section .qt-balance {
      grid-column-start: 1;
      grid-column-end: -1;
      justify-content: flex-start;
    }
    .qt-risk-action-stack {
      grid-column-start: 1;
      grid-column-end: -1;
    }
    .qt-position-card {
      grid-template-columns: repeat(4, minmax(100px, 1fr));
    }
    .qt-position-card .qt-position-close-btn {
      min-height: 34px;
    }
  }
}

@media (max-width: 760px) {
  .quick-trade-embedded.qt-embedded-ide.qt-embedded-dock {
    .qt-embedded-split--cols,
    .qt-account-section {
      grid-template-columns: 1fr;
    }
    .qt-account-section > .qt-label,
    .qt-account-section .qt-account-actions,
    .qt-account-section .qt-balance {
      grid-column: 1;
    }
    .qt-account-section .qt-add-account-btn {
      width: 100%;
    }
    .qt-account-section .qt-balance {
      flex-wrap: wrap;
    }
  }
}

.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock {
  height: 100%;
  overflow: hidden;

  .qt-dock-header {
    flex: 0 0 auto;
  }
  .qt-embedded-split--cols {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(340px, 32%) minmax(0, 1fr);
    gap: 10px;
    padding: 10px 12px 12px;
    overflow: hidden;
  }
  .qt-embedded-split--cols .qt-embedded-col-left,
  .qt-embedded-split--cols .qt-embedded-col-right {
    display: flex;
    min-width: 0;
    min-height: 0;
    width: auto;
    max-width: none;
    margin: 0 !important;
    box-sizing: border-box;
  }
  .qt-embedded-split--cols .qt-embedded-col-left {
    flex-direction: column;
    gap: 0;
    overflow-y: auto;
    padding: 6px 8px !important;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 10px;
    background: #fff;
  }
  .qt-embedded-split--cols .qt-embedded-col-right {
    flex-direction: column;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
    padding: 0 !important;
  }
  .qt-order-entry-stack,
  .qt-mode-card {
    width: 100%;
    height: auto;
    flex: 0 0 auto;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }
  .qt-risk-action-stack {
    width: 100%;
    height: auto;
    flex: 0 0 auto;
    border-right: 0 !important;
    border-bottom: 0 !important;
    border-left: 0 !important;
    border-radius: 0 !important;
    background: #fff !important;
    box-shadow: none !important;
  }
  .qt-mode-card {
    padding: 4px 8px !important;
    border-top: 1px solid rgba(15, 23, 42, 0.08) !important;
  }
  .qt-order-entry-stack {
    padding: 6px 8px;
  }
  .qt-order-entry-stack .qt-section:not(.qt-card) {
    padding: 2px !important;
  }
  .qt-order-entry-stack .qt-quick-amounts {
    gap: 5px;
    margin: 5px 0 2px;
  }
  .qt-order-entry-stack .qt-quick-amounts button {
    height: 24px;
    padding: 0 4px;
    font-size: 10px;
  }
  .qt-order-entry-stack .qt-notional-summary {
    margin-top: 5px;
    padding: 4px 7px;
    font-size: 10px;
    line-height: 1.3;
  }
  .qt-amount-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .qt-inline-notional {
    color: #16a34a;
    font-size: 10px;
    font-weight: 600;
    white-space: nowrap;
  }
  .qt-risk-action-stack {
    position: sticky;
    bottom: 0;
    z-index: 2;
    margin-top: 0 !important;
    padding: 4px 8px 6px;
    border-top: 1px solid rgba(15, 23, 42, 0.08) !important;
  }
  .qt-risk-action-stack.is-tpsl-open {
    position: relative;
    bottom: auto;
    z-index: 1;
  }
  .qt-risk-action-stack .qt-submit-section--embedded-left {
    margin-top: 0 !important;
    padding-top: 4px;
  }
  .qt-risk-action-stack .qt-submit-btn {
    height: 36px;
  }
  .qt-risk-action-stack .qt-tpsl-record-hint {
    display: none;
  }
  .qt-risk-action-stack .qt-tpsl-card {
    margin-top: 4px !important;
    padding: 4px !important;
  }
  .qt-risk-action-stack.is-tpsl-open .qt-tpsl-card {
    margin: 4px 0 2px !important;
    padding: 8px !important;
    border: 1px solid rgba(15, 23, 42, 0.08) !important;
    border-radius: 8px !important;
    background: #f8fafc !important;
  }
  .qt-risk-action-stack .qt-tpsl-row {
    gap: 6px;
  }
  .qt-risk-action-stack .qt-tpsl-item .qt-label {
    margin-bottom: 2px;
    font-size: 9px;
  }
  .qt-position-section,
  .qt-history-section {
    display: block;
    width: auto;
    height: auto;
    flex: 1;
    min-height: 0;
    margin: 0 !important;
    padding: 10px 12px !important;
    border: 0;
    border-radius: 0;
    overflow: auto;
    background: transparent;
  }
  .qt-position-card {
    grid-column: auto;
    grid-template-columns: repeat(4, minmax(92px, 1fr));
    gap: 10px 18px;
    margin-top: 8px;
  }
  .qt-position-card .qt-position-close-btn {
    width: 100%;
  }
}

.qt-dock-trade-settings {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.qt-dock-segmented {
  height: 30px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  button {
    min-width: 46px;
    flex: 1;
    height: 22px;
    padding: 0 9px;
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
    line-height: 22px;
    white-space: nowrap;
    border: 0;
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.16s ease, color 0.16s ease;
  }
  button:hover { color: #334155; }
  button.active {
    color: #fff;
    background: var(--primary-color, #52c41a);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.18);
  }
}
.qt-dock-margin-segmented button { min-width: 54px; }
.qt-dock-leverage-trigger {
  height: 30px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  color: #64748b;
  font-size: 11px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  white-space: nowrap;
  cursor: pointer;
  strong { color: #0f172a; font-size: 12px; }
  .anticon { color: #94a3b8; font-size: 9px; }
  &:hover { border-color: var(--primary-color, #52c41a); }
}
.qt-dock-tpsl-toggle {
  height: 28px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
  color: #64748b;
  font-size: 11px;
  > span {
    color: #94a3b8;
    font-size: 9px;
  }
}

.qt-dock-header {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
}
.qt-dock-title-block {
  min-width: 146px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.qt-dock-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 700;
  .anticon { color: #faad14; }
}
.qt-dock-symbol {
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
}
.qt-dock-account {
  width: clamp(220px, 24vw, 360px);
  min-width: 220px;
  max-width: 360px;
  flex: 0 1 360px;
  display: flex;
  gap: 6px;
  ::v-deep .ant-select { flex: 1; min-width: 0; }
}
.qt-dock-icon-btn {
  flex: 0 0 auto;
  padding: 0 9px;
  border-radius: 7px;
}
.qt-dock-balance {
  min-width: 106px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.25;
  span { color: #94a3b8; font-size: 10px; }
  strong { color: #16a34a; font-size: 13px; }
}
.qt-dock-balance--secondary strong { color: #334155; }
.qt-dock-trade-settings + .qt-dock-balance,
.qt-dock-segmented + .qt-dock-balance {
  margin-left: auto;
}
.qt-dock-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 120px;
  color: #94a3b8;
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  i {
    width: 7px;
    height: 7px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: #cbd5e1;
  }
  &.is-connected { color: #16a34a; }
  &.is-connected i { background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12); }
}
.qt-dock-tabs {
  flex: 0 0 38px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding: 0 10px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  button {
    position: relative;
    height: 38px;
    padding: 0 12px;
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  button::after {
    position: absolute;
    right: 10px;
    bottom: -1px;
    left: 10px;
    height: 2px;
    content: '';
    background: transparent;
  }
  button.active { color: var(--primary-color, #52c41a); }
  button.active::after { background: var(--primary-color, #52c41a); }
  button span {
    min-width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-left: 5px;
    padding: 0 4px;
    border-radius: 999px;
    color: #64748b;
    font-size: 10px;
    background: #e2e8f0;
  }
}
.qt-trade-item--dock {
  padding: 8px 4px !important;
  .qt-trade-main { width: 100%; }
  .qt-trade-price { margin-left: auto; color: #64748b; font-size: 12px; }
  .qt-trade-amount { margin-left: 0 !important; min-width: 72px; text-align: right; }
  .qt-trade-time { min-width: 88px; color: #94a3b8; font-size: 11px; text-align: right; }
  .qt-cancel-order-btn {
    height: 24px;
    padding: 0 4px;
    color: #f5222d;
    font-size: 11px;
  }
}

@media (max-width: 1180px) {
  .qt-dock-balance--secondary,
  .qt-dock-status { display: none; }
  .quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-embedded-split--cols {
    grid-template-columns: minmax(320px, 36%) minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .qt-dock-header { flex-wrap: wrap; }
  .qt-dock-title-block { min-width: 120px; }
  .qt-dock-account { min-width: 180px; }
  .quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-embedded-split--cols {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
}

.qt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
  .qt-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    .qt-icon {
      font-size: 20px;
      color: #595959;
    }
    .qt-header-title {
      font-size: 16px;
      font-weight: 600;
    }
  }
  .qt-close {
    font-size: 16px;
    cursor: pointer;
    color: #999;
    &:hover { color: #333; }
  }
}

.qt-symbol-bar {
  padding: 12px 20px;
  background: linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  .qt-symbol-selector {
    width: 100%;
    ::v-deep .ant-select {
      width: 100%;
    }
    ::v-deep .ant-select-selection {
      border-radius: 6px;
      border: 1px solid #d9d9d9;
    }
  }
  .qt-symbol-summary {
    width: 100%;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(15, 23, 42, 0.08);
  }
  .qt-symbol-summary-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .qt-symbol-label {
    font-size: 10px;
    color: #8c8c8c;
  }
  .qt-symbol-name {
    color: #262626;
    font-size: 14px;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .qt-market-tag {
    flex-shrink: 0;
    margin-right: 0;
    border-radius: 999px;
    font-size: 11px;
  }
  .qt-price-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 2px;
    white-space: nowrap;
    .qt-price-label {
      font-size: 10px;
      color: #8c8c8c;
    }
    .qt-current-price {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
  }
}

.qt-symbol-option {
  display: flex;
  align-items: center;
  gap: 8px;
  .qt-symbol-option-name {
    font-weight: 600;
    font-size: 14px;
  }
  .qt-symbol-option-desc {
    color: #999;
    font-size: 12px;
  }
}

.qt-section {
  padding: 8px 20px;
  .qt-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 4px;
    font-weight: 500;
  }
  .qt-crypto-hint {
    font-size: 10px;
    color: #faad14;
    background: rgba(250, 173, 20, 0.1);
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: 4px;
  }
}

.qt-balance {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  font-size: 12px;

  .qt-balance-label {
    color: #8c8c8c;
    flex-shrink: 0;
  }
  .qt-balance-loading-text { margin-left: 4px; }
  .qt-balance-value {
    color: #52c41a;
    font-weight: 600;
    margin-left: auto;
  }
  .qt-balance-error { color: #faad14; cursor: help; }
}

.qt-balance-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 0;
  opacity: 0.72;

  &--active {
    opacity: 1;
    .qt-balance-label {
      color: #595959;
      font-weight: 600;
    }
    .qt-balance-value {
      color: #389e0d;
    }
  }
}

.qt-balance-error-hint {
  font-size: 11px;
  line-height: 1.45;
  color: #cf1322;
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 77, 79, 0.08);
  border: 1px solid rgba(255, 77, 79, 0.25);
}

.qt-account-actions {
  margin-top: 8px;
}

.qt-add-account-btn {
  height: 32px;
  border-radius: 6px;
  font-weight: 600;
}

.qt-direction-toggle {
  display: flex;
  gap: 8px;
  .qt-dir-btn {
    flex: 1;
    padding: 10px;
    text-align: center;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    user-select: none;
  }
  .qt-dir-long {
    color: #52c41a;
    background: rgba(82, 196, 26, 0.06);
    border-color: rgba(82, 196, 26, 0.2);
    &.active {
      background: #52c41a;
      color: #fff;
      border-color: #52c41a;
      box-shadow: 0 4px 12px rgba(82, 196, 26, 0.3);
    }
    &:hover:not(.active) {
      border-color: #52c41a;
    }
  }
  .qt-dir-short {
    color: #f5222d;
    background: rgba(245, 34, 45, 0.06);
    border-color: rgba(245, 34, 45, 0.2);
    &.active {
      background: #f5222d;
      color: #fff;
      border-color: #f5222d;
      box-shadow: 0 4px 12px rgba(245, 34, 45, 0.3);
    }
    &:hover:not(.active) {
      border-color: #f5222d;
    }
  }
}

.qt-amount-block {
  padding-bottom: 14px;
}

.qt-quick-amounts {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  margin-bottom: 4px;
  button { flex: 1; font-size: 12px; }
}

.qt-notional-summary {
  margin-top: 8px;
  padding: 7px 9px;
  border-radius: 6px;
  color: #389e0d;
  background: rgba(82, 196, 26, 0.08);
  font-size: 12px;
  line-height: 1.45;
}

.qt-leverage-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.qt-leverage-slider-wrap {
  flex: 1;
  min-width: 0;
  padding: 4px 6px 26px;

  ::v-deep .ant-slider {
    margin: 8px 6px 0;
  }

  ::v-deep .ant-slider-rail,
  ::v-deep .ant-slider-track,
  ::v-deep .ant-slider-step {
    height: 4px;
  }

  ::v-deep .ant-slider-handle {
    width: 14px;
    height: 14px;
    margin-top: -5px;
  }

  ::v-deep .ant-slider-mark {
    top: 14px;
  }

  ::v-deep .ant-slider-mark-text {
    font-size: 11px;
    color: #8c8c8c;
    white-space: nowrap;
    transform: translateX(-50%);
  }

  ::v-deep .ant-slider-mark-text-active {
    color: var(--primary-color, #1890ff);
    font-weight: 600;
  }

  ::v-deep .ant-slider-mark:first-child .ant-slider-mark-text {
    transform: translateX(0);
  }

  ::v-deep .ant-slider-mark:last-child .ant-slider-mark-text {
    transform: translateX(-100%);
  }
}

.qt-leverage-input {
  width: 72px;
  flex-shrink: 0;
  margin-top: 2px;
}

.qt-card {
  margin-left: 16px;
  margin-right: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
}

.qt-mode-card {
  margin-top: 16px;
}

.qt-tpsl-card {
  margin-top: 16px;
}

.qt-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.qt-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.qt-badge-contract {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #ebebeb;
  color: #595959;
  border: 1px solid #d9d9d9;
}

.qt-optional-tag {
  font-size: 10px;
  color: #8c8c8c;
  background: #f0f0f0;
  padding: 1px 8px;
  border-radius: 4px;
}

.qt-label-spaced {
  margin-top: 10px;
}

.qt-margin-radio {
  width: 100%;
  display: flex;
  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
    padding: 0 4px;
  }
}

.qt-hint-text {
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.45;
  margin-top: 8px;
}

.qt-hint-inline {
  margin-top: 6px;
}

.qt-mode-toggle {
  display: flex;
  background: #f0f0f0;
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}
.qt-mode-toggle-item {
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 500;
  color: #8c8c8c;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
  &:hover { color: #595959; }
  &.active {
    background: #fff;
    color: var(--primary-color, #1890ff);
    font-weight: 600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
}
.qt-spot-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0 2px;
}
.qt-spot-info-icon {
  font-size: 18px;
  color: #52c41a;
  flex-shrink: 0;
}
.qt-spot-info .qt-hint-text {
  margin-top: 0;
}

.qt-tpsl-row {
  display: flex;
  gap: 12px;
  .qt-tpsl-item { flex: 1; }
}

.qt-tpsl-record-hint {
  margin-top: 10px;
  margin-bottom: 0;
}

.qt-close-scope {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #e8e8e8;
}

.qt-label-close-scope {
  margin-bottom: 6px;
}

.qt-close-scope-radio {
  width: 100%;
  display: flex;
  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
    padding: 0 4px;
    font-size: 12px;
  }
}

.qt-tp-label {
  color: #389e0d !important;
}

.qt-sl-label {
  color: #cf1322 !important;
}

.qt-input-full {
  width: 100%;
}

.qt-dir-btn.qt-dir-disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}

.qt-direction-toggle--spot .qt-dir-btn--solo {
  flex: 1 1 100%;
  max-width: 100%;
}

.qt-empty-icon {
  font-size: 28px;
  color: #d9d9d9;
  margin-bottom: 8px;
}

.qt-empty-desc {
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.5;
}

.qt-submit-section {
  padding: 12px 20px;
  display: flex;
  gap: 10px;
  .qt-submit-btn {
    flex: 1;
    height: 48px;
    font-size: 16px;
    font-weight: 700;
    border-radius: 8px;
    letter-spacing: 0.5px;
  }
  .qt-btn-long {
    background: #52c41a !important;
    border-color: #52c41a !important;
    &:hover { background: #73d13d !important; }
    &:active { background: #389e0d !important; }
  }
  .qt-btn-short {
    background: #f5222d !important;
    border-color: #f5222d !important;
    &:hover { background: #ff4d4f !important; }
    &:active { background: #cf1322 !important; }
  }
}

.qt-ai-filter-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 20px;
  padding: 10px 12px;
  border: 1px solid rgba(24, 144, 255, .22);
  border-radius: 8px;
  background: rgba(24, 144, 255, .06);
  transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
  &:hover,
  &:focus-within {
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 52%, transparent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent);
  }
  strong, span { display: block; }
  strong { font-size: 13px; }
  span { margin-top: 2px; color: #8c8c8c; font-size: 11px; }
}

.qt-stock-mode-card {
  border-color: rgba(45, 140, 255, 0.18);
  background: linear-gradient(135deg, rgba(45, 140, 255, 0.08), rgba(82, 196, 26, 0.06));
}

.qt-position-section {
  padding: 8px 20px 12px;
  .qt-section-header {
    font-size: 13px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .qt-position-count {
    font-size: 12px;
    color: #999;
    font-weight: 400;
  }
  .qt-close-scope-global {
    margin-bottom: 10px;
  }
}

.qt-history-section {
  padding: 8px 20px 12px;
  ::v-deep .ant-collapse {
    background: transparent;
    border: none;
  }
  ::v-deep .ant-collapse-item {
    border: none;
  }
  ::v-deep .ant-collapse-header {
    padding: 0 !important;
    cursor: pointer;
    &:hover {
      opacity: 0.8;
    }
  }
  ::v-deep .ant-collapse-content {
    border: none;
    background: transparent;
  }
  ::v-deep .ant-collapse-content-box {
    padding: 8px 0 0 0 !important;
  }
  .qt-section-header {
    font-size: 13px;
    font-weight: 600;
    color: #666;
    display: flex;
    align-items: center;
    gap: 6px;
    user-select: none;
  }
  .qt-history-count {
    font-size: 12px;
    color: #999;
    font-weight: 400;
  }
}

.qt-position-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
  border-left: 3px solid #d9d9d9;
  & + .qt-position-card {
    margin-top: 10px;
  }
  &.long { border-left-color: #52c41a; }
  &.short { border-left-color: #f5222d; }
  .qt-pos-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 2px 0;
    span:first-child { color: #999; }
  }
}

.qt-position-empty {
  background: #fafafa;
  border-radius: 8px;
  padding: 20px 12px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qt-green { color: #52c41a !important; }
.qt-red   { color: #f5222d !important; }

.qt-trade-list {
  .qt-trade-item {
    padding: 6px 0;
    border-bottom: 1px solid #f5f5f5;
    &:last-child { border-bottom: none; }
    .qt-trade-main {
      display: flex;
      align-items: center;
      gap: 6px;
      .qt-trade-symbol { font-weight: 600; font-size: 13px; }
      .qt-trade-amount { margin-left: auto; font-size: 13px; }
    }
    .qt-trade-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2px;
      .qt-trade-time { font-size: 11px; color: #bbb; }
    }
  }
}

/* ======== Dark Theme ======== */
  .theme-dark {
  .qt-embedded-split--cols .qt-embedded-col-right {
    border-left-color: #303030;
  }
  &.quick-trade-embedded {
    background: transparent;
    border-color: transparent;
    .qt-symbol-bar {
      background: transparent;
    }
  }
  &.quick-trade-embedded.qt-embedded-ide {
    .qt-symbol-bar {
      background: linear-gradient(135deg, #262626 0%, #1c1c1c 100%);
      border-color: #363636;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      ::v-deep .ant-select-selection {
        border-color: #434343;
      }
    }
    .qt-section:not(.qt-card) {
      background: #1f1f1f;
      border-color: #363636;
      box-shadow: none;
    }
    .qt-card {
      background: #1f1f1f;
      border-color: #404040;
      box-shadow: none;
    }
    .qt-position-section,
    .qt-history-section {
      background: #1f1f1f;
      border-color: #363636;
    }
    &.qt-embedded-dock {
      .qt-order-entry-stack,
      .qt-risk-action-stack {
        background: #1f1f1f;
        border-color: #363636;
        box-shadow: none;
      }
      .qt-order-entry-stack .qt-section:not(.qt-card) {
        background: transparent;
        border-color: transparent;
      }
      .qt-risk-action-stack .qt-tpsl-card,
      .qt-risk-action-stack .qt-submit-section--embedded-left {
        background: transparent;
        border-color: transparent;
      }
    }
  }
  .qt-header {
    border-bottom-color: #303030;
    .qt-icon { color: #a3a3a3; }
    .qt-header-title { color: #e0e0e0; }
    .qt-close { color: #666; &:hover { color: #bbb; } }
  }
  .qt-symbol-bar {
    background: linear-gradient(180deg, #262626 0%, #1f1f1f 100%);
    .qt-symbol-summary {
      background: rgba(20, 20, 20, 0.64);
      border-color: #363636;
    }
    .qt-symbol-label,
    .qt-price-label {
      color: #8c8c8c;
    }
    .qt-symbol-name {
      color: #f0f0f0;
    }
    .qt-market-tag {
      background: #2a2a2a;
      color: #d9d9d9;
      border-color: #434343;
    }
    .qt-current-price { color: #e0e0e0; }
    ::v-deep .ant-select-selection {
      background: #262626;
      border-color: #303030;
      color: #e0e0e0;
    }
    ::v-deep .ant-select-selection__placeholder {
      color: #666;
    }
  }
  .qt-ai-filter-row {
    border-color: #29465d;
    background: #111820;
    strong { color: rgba(255, 255, 255, .88); }
    span { color: rgba(255, 255, 255, .56); }
    &:hover,
    &:focus-within {
      border-color: color-mix(in srgb, var(--primary-color, #52c41a) 48%, #29465d);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color, #52c41a) 12%, transparent);
    }
  }
  .qt-symbol-option {
    .qt-symbol-option-name { color: #e0e0e0; }
    .qt-symbol-option-desc { color: #999; }
  }
  .qt-section {
    .qt-label { color: #777; }
  }
  .qt-position-section {
    .qt-section-header { color: #ccc; }
    .qt-position-count { color: #888; }
  }
  .qt-position-card {
    background: #262626;
    .qt-pos-row span:first-child { color: #777; }
    .qt-pos-row span:last-child { color: #ccc; }
  }
  .qt-history-section {
    .qt-section-header {
      color: #ccc;
    }
    .qt-history-count {
      color: #888;
    }
    ::v-deep .ant-collapse {
      background: transparent !important;
      color: #ccc;
      .ant-collapse-header {
        color: #ccc !important;
        &:hover {
          opacity: 0.8;
        }
      }
      .ant-collapse-content {
        background: transparent;
        color: #ccc;
      }
    }
  }
  .qt-trade-item {
    border-bottom-color: #2a2a2a !important;
    .qt-trade-symbol { color: #e0e0e0; }
    .qt-trade-amount { color: #ccc; }
  }
  ::v-deep .ant-collapse {
    background: transparent !important;
    color: #ccc;
    .ant-collapse-header { color: #ccc !important; }
    .ant-collapse-content { background: transparent; color: #ccc; }
  }
  ::v-deep .ant-drawer-content {
    background: #141414;
  }
  ::v-deep .ant-select-selection,
  ::v-deep .ant-input-number {
    background: #262626;
    border-color: #303030;
    color: #e0e0e0;
  }
  ::v-deep .ant-radio-group .ant-radio-button-wrapper {
    background: #262626;
    border-color: #303030;
    color: #ccc;
    &.ant-radio-button-wrapper-checked {
      background: #434343;
      border-color: #595959;
      color: #fff;
    }
  }
  ::v-deep .ant-slider-rail { background: #303030; }
  ::v-deep .ant-slider-track { background: #737373; }
  .qt-leverage-slider-wrap ::v-deep .ant-slider-mark-text {
    color: #8c8c8c;
  }
  .qt-leverage-slider-wrap ::v-deep .ant-slider-mark-text-active {
    color: #58a6ff;
  }
  .qt-balance {
    background: #262626;
    border-color: #363636;
    .qt-balance-label { color: #8c8c8c; }
    .qt-balance-line--active .qt-balance-label { color: #d9d9d9; }
    .qt-balance-value { color: #73d13d; }
    .qt-balance-line--active .qt-balance-value { color: #95de64; }
  }
  .qt-add-account-btn {
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.22);
  }
  .qt-card {
    background: #262626;
    border-color: #3a3a3a;
  }
  .qt-section-title {
    color: #e8e8e8;
  }
  .qt-badge-contract {
    background: #333;
    color: #bfbfbf;
    border-color: #434343;
  }
  .qt-optional-tag {
    background: #2a2a2a;
    color: #888;
  }
  .qt-hint-text {
    color: #777;
  }
  .qt-mode-toggle {
    background: #2a2a2a;
  }
  .qt-mode-toggle-item {
    color: #777;
    &:hover { color: #bbb; }
    &.active {
      background: #3a3a3a;
      color: #58a6ff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }
  }
  .qt-spot-info-icon {
    color: #73d13d;
  }
  .qt-tp-label {
    color: #95de64 !important;
  }
  .qt-sl-label {
    color: #ff7875 !important;
  }
  .qt-close-scope {
    border-top-color: #3a3a3a;
  }
  .qt-dock-header {
    background: #1a1a1a;
    border-bottom-color: #303030;
  }
  .qt-dock-title { color: rgba(255, 255, 255, 0.92); }
  .qt-dock-symbol,
  .qt-dock-balance span,
  .qt-dock-leverage-trigger,
  .qt-dock-tpsl-toggle { color: rgba(255, 255, 255, 0.42); }
  .qt-dock-balance--secondary strong { color: rgba(255, 255, 255, 0.78); }
  .qt-dock-segmented { background: #222; border-color: #3a3a3a; }
  .qt-dock-segmented button { color: rgba(255, 255, 255, 0.56); }
  .qt-dock-segmented button:hover { color: rgba(255, 255, 255, 0.86); }
  .qt-dock-segmented button.active { color: #fff; background: var(--primary-color, #52c41a); }
  .qt-dock-leverage-trigger {
    color: rgba(255, 255, 255, 0.5);
    background: #242424;
    border-color: #3a3a3a;
    strong { color: rgba(255, 255, 255, 0.9); }
  }
  .qt-dock-icon-btn { background: #242424; border-color: #3a3a3a; color: #bfbfbf; }
  .qt-dock-tabs {
    background: #191919;
    border-bottom-color: #303030;
    button { color: rgba(255, 255, 255, 0.48); }
    button.active { color: var(--primary-color, #52c41a); }
    button.active::after { background: var(--primary-color, #52c41a); }
    button span { color: #bfbfbf; background: #333; }
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-embedded-split--cols .qt-embedded-col-right {
    background: #1f1f1f;
    border-color: #363636;
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-embedded-split--cols .qt-embedded-col-left {
    background: #1f1f1f;
    border-color: #363636;
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-mode-card,
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-risk-action-stack {
    border-top-color: #363636 !important;
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-risk-action-stack {
    background: #1f1f1f !important;
  }
  &.quick-trade-embedded.qt-embedded-ide.qt-embedded-dock .qt-risk-action-stack.is-tpsl-open .qt-tpsl-card {
    border-color: #3a3a3a !important;
    background: #242424 !important;
  }
  .qt-trade-item--dock .qt-trade-price,
  .qt-trade-item--dock .qt-trade-time { color: rgba(255, 255, 255, 0.42); }

  .qt-position-empty {
    background: #262626;
    border-color: #303030;
  }
  .qt-empty-icon {
    color: #434343;
  }
  .qt-empty-desc {
    color: #888;
  }
}
</style>

<style lang="less">
.qt-leverage-popover {
  .ant-popover-inner { border-radius: 10px; }
  .ant-popover-inner-content { width: 286px; padding: 14px 16px; }
  .qt-leverage-editor {
    .ant-slider { margin: 8px 6px 25px; }
    .ant-input-number { width: 100%; }
  }
  .qt-leverage-presets {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 10px;
    button {
      height: 26px;
      padding: 0;
      color: #64748b;
      font-size: 10px;
      border: 1px solid #e2e8f0;
      border-radius: 5px;
      background: #f8fafc;
      cursor: pointer;
    }
    button:hover,
    button.active {
      color: #fff;
      border-color: var(--primary-color, #52c41a);
      background: var(--primary-color, #52c41a);
    }
  }
}
body.dark .qt-leverage-popover,
body.realdark .qt-leverage-popover,
.realdark-theme .qt-leverage-popover,
.dark-theme .qt-leverage-popover {
  .ant-popover-inner {
    background: #1f1f1f;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }
  .ant-popover-arrow { border-top-color: #1f1f1f; border-left-color: #1f1f1f; }
  .ant-input-number {
    color: rgba(255, 255, 255, 0.88);
    background: #141414;
    border-color: #434343;
  }
  .ant-input-number-input { color: rgba(255, 255, 255, 0.88); }
  .ant-slider-mark-text { color: rgba(255, 255, 255, 0.45); }
  .qt-leverage-presets button {
    color: rgba(255, 255, 255, 0.62);
    border-color: #3a3a3a;
    background: #262626;
  }
  .qt-leverage-presets button:hover,
  .qt-leverage-presets button.active {
    color: #fff;
    border-color: var(--primary-color, #52c41a);
    background: var(--primary-color, #52c41a);
  }
}
</style>
