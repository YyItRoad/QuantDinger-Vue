<template>
  <a-modal
    :visible="visible"
    :title="null"
    :footer="null"
    :width="modalWidth"
    :body-style="{ padding: 0 }"
    :wrap-class-name="modalWrapClass"
    @cancel="$emit('close')"
    class="indicator-detail-modal"
  >
    <a-spin :spinning="loading">
      <div v-if="detail" class="detail-container indicator-detail-modal" :class="{ 'is-dark': isDarkTheme }">
        <div class="detail-header" :style="headerStyle">
          <div class="header-cover" v-if="detail.preview_image">
            <img :src="detail.preview_image" :alt="detail.name" @error="imageError = true" />
          </div>
          <div class="header-cover default-cover" v-else>
            <span class="cover-initials">{{ indicatorInitials }}</span>
          </div>
          <div class="header-info">
            <div class="strategy-title-row">
              <h2 class="indicator-name">{{ detail.name }}</h2>
              <a-tag v-if="isStrategyAsset" class="strategy-api-badge">
                {{ $t('community.strategyApiV2') }}
              </a-tag>
            </div>
            <div class="indicator-meta">
              <div class="author-info">
                <a-avatar :src="detail.author.avatar" :size="32" />
                <span class="author-name">{{ detail.author.nickname || detail.author.username }}</span>
              </div>
              <div class="publish-time">
                {{ $t('community.publishedAt') }}: {{ formatDate(detail.created_at) }}
              </div>
            </div>
            <div class="indicator-stats">
              <a-statistic :title="$t('community.downloads')" :value="detail.purchase_count || 0">
                <template #prefix>
                  <a-icon type="download" />
                </template>
              </a-statistic>
              <a-statistic :title="$t('community.rating')">
                <template #formatter>
                  <span
                    role="img"
                    :aria-label="`${$t('community.rating')}: ${Number(detail.avg_rating || 0).toFixed(1)}`"
                  >
                    <a-rate aria-hidden="true" :value="detail.avg_rating" disabled allow-half :style="{ fontSize: '14px' }" />
                  </span>
                  <span class="rating-text">({{ detail.rating_count || 0 }})</span>
                </template>
              </a-statistic>
              <a-statistic :title="$t('community.views')" :value="detail.view_count || 0">
                <template #prefix>
                  <a-icon type="eye" />
                </template>
              </a-statistic>
            </div>
          </div>
        </div>

        <div class="detail-body">
          <div class="section">
            <h3>{{ isStrategyAsset ? $t('community.strategyOverview') : $t('community.description') }}</h3>
            <p class="description">{{ detail.description || $t('community.noDescription') }}</p>
          </div>

          <div v-if="isStrategyAsset && strategyContract" class="section strategy-contract-section">
            <div class="section-heading-row">
              <div>
                <h3>{{ $t('community.strategyContract') }}</h3>
                <p>{{ $t('community.strategyContractHint') }}</p>
              </div>
              <div class="section-heading-actions">
                <span class="source-controlled-badge">
                  <a-icon type="safety-certificate" />
                  {{ $t('community.sourceControlled') }}
                </span>
                <a-tag :color="bindingMode === 'parameterized' ? 'green' : bindingMode === 'fixed' ? 'orange' : 'blue'">
                  {{ $t(`community.binding.${bindingMode}`) }}
                </a-tag>
              </div>
            </div>

            <div class="contract-grid">
              <div v-for="item in strategyContractItems" :key="item.key" class="contract-card">
                <div class="contract-card__icon"><a-icon :type="item.icon" /></div>
                <div class="contract-card__body">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <small v-if="item.hint">{{ item.hint }}</small>
                </div>
              </div>
            </div>

            <div class="contract-logic-grid">
              <div class="contract-logic-card">
                <span class="contract-logic-card__label"><a-icon type="branches" />{{ $t('community.contractSignals') }}</span>
                <div class="contract-tags">
                  <a-tag v-for="name in strategyDependencies" :key="`dep-${name}`">{{ name }}</a-tag>
                  <span v-if="!strategyDependencies.length" class="contract-empty contract-empty--meaningful">
                    <a-icon type="check-circle" />{{ $t('community.noExternalSignalDependencies') }}
                  </span>
                </div>
              </div>
              <div class="contract-logic-card">
                <span class="contract-logic-card__label"><a-icon type="database" />{{ $t('community.contractData') }}</span>
                <div class="contract-tags">
                  <a-tag v-for="name in (strategyContract.data_fields || [])" :key="`field-${name}`">{{ name.toUpperCase() }}</a-tag>
                  <span v-if="!(strategyContract.data_fields || []).length" class="contract-empty contract-empty--meaningful">
                    <a-icon type="info-circle" />{{ $t('community.noDeclaredMarketData') }}
                  </span>
                </div>
              </div>
              <div class="contract-logic-card contract-logic-card--warmup">
                <span class="contract-logic-card__label"><a-icon type="hourglass" />{{ $t('community.contractWarmup') }}</span>
                <strong>{{ $t('community.contractWarmupBars', { count: strategyContract.warmup_bars || 0 }) }}</strong>
              </div>
            </div>

            <div v-if="strategyParameters.length" class="parameter-panel">
              <div class="parameter-panel__head">
                <div>
                  <strong>{{ $t('community.contractParameters') }}</strong>
                  <span>{{ $t('community.contractParametersHint') }}</span>
                </div>
                <span class="parameter-count">{{ strategyParameters.length }}</span>
              </div>
              <div class="parameter-grid">
                <div v-for="param in visibleStrategyParameters" :key="param.name" class="parameter-item">
                  <div class="parameter-item__name">
                    <strong>{{ parameterName(param) }}</strong>
                    <code>{{ param.name }}</code>
                  </div>
                  <div class="parameter-item__value">
                    <span>{{ $t('community.parameterDefault') }}</span>
                    <strong>{{ formatContractValue(param.default, param.type) }}</strong>
                  </div>
                  <div class="parameter-item__range">
                    <span>{{ $t('community.parameterRange') }}</span>
                    <strong>{{ formatParameterRange(param) }}</strong>
                  </div>
                </div>
              </div>
              <a-button
                v-if="strategyParameters.length > parameterPreviewLimit"
                type="link"
                class="parameter-toggle"
                @click="showAllParameters = !showAllParameters">
                {{ showAllParameters ? $t('community.showFewerParameters') : $t('community.showAllParameters', { count: strategyParameters.length }) }}
                <a-icon :type="showAllParameters ? 'up' : 'down'" />
              </a-button>
            </div>
          </div>

          <div class="section strategy-performance-section" v-if="isStrategyAsset">
            <div class="section-heading-row evidence-heading">
              <div>
                <h3>{{ $t('community.backtestEvidence') }}</h3>
                <p>{{ $t('community.backtestEvidenceHint') }}</p>
              </div>
            </div>
            <div v-if="performance && Number(performance.sample_size || 0) > 0">
              <div v-if="performance.best_run_meta" class="evidence-context">
                <span class="evidence-context__label">{{ $t('community.representativeRun') }}</span>
                <div class="evidence-context__tags">
                  <a-tag v-if="performance.best_run_meta.symbol" class="tag-symbol">{{ performance.best_run_meta.symbol }}</a-tag>
                  <a-tag v-if="performance.best_run_meta.timeframe" class="tag-tf">{{ performance.best_run_meta.timeframe }}</a-tag>
                  <a-tag v-if="performance.best_run_meta.market_type" class="tag-market">
                    {{ formatMarketType(performance.best_run_meta.market_type) }}
                  </a-tag>
                  <a-tag v-if="performance.best_run_meta.leverage" class="tag-leverage">{{ formatLeverage(performance.best_run_meta.leverage) }}</a-tag>
                  <a-tag v-if="performance.best_run_meta.duration_days" class="tag-duration">{{ formatBacktestDuration(performance.best_run_meta.duration_days) }}</a-tag>
                </div>
                <div class="evidence-context__quality">
                  <span>{{ $t('community.backtestSamplesCount', { count: performance.sample_size || 0 }) }}</span>
                  <span :class="Number(performance.live_trade_count || 0) > 0 ? 'has-live' : 'no-live'">
                    <a-icon :type="Number(performance.live_trade_count || 0) > 0 ? 'check-circle' : 'info-circle'" />
                    {{ Number(performance.live_trade_count || 0) > 0 ? $t('community.liveEvidenceCount', { count: performance.live_trade_count }) : $t('community.noLiveEvidence') }}
                  </span>
                </div>
              </div>
              <div class="performance-grid">
                <div class="perf-item perf-item--score">
                  <div class="perf-label">
                    {{ $t('community.compositeScore') }}
                    <a-tooltip :title="$t('community.scoreTooltipBase')">
                      <a-icon type="info-circle" />
                    </a-tooltip>
                  </div>
                  <div class="perf-value">
                    {{ formatScore(performance.score) }}
                    <span class="perf-unit">/ 100</span>
                  </div>
                </div>
                <div class="perf-item">
                  <div class="perf-label">{{ $t('community.totalReturn') }}</div>
                  <div class="perf-value" :class="toneClass(performance.total_return)">
                    {{ formatPercent(performance.total_return) }}
                  </div>
                </div>
                <div class="perf-item">
                  <div class="perf-label">{{ $t('community.sharpe') }}</div>
                  <div class="perf-value" :class="toneClass(performance.sharpe, 1)">
                    {{ formatNumber(performance.sharpe, 2) }}
                  </div>
                </div>
                <div class="perf-item">
                  <div class="perf-label">{{ $t('community.maxDrawdown') }}</div>
                  <div class="perf-value negative">
                    {{ formatPercent(performance.max_drawdown) }}
                  </div>
                </div>
                <div class="perf-item">
                  <div class="perf-label">
                    {{ $t('strategyCenter.backtest.payoffRatio') }}
                    <a-tooltip :title="payoffRatioTooltip(performance)">
                      <a-icon
                        type="info-circle"
                        :class="{ 'payoff-warning': isPayoffRatioUnstable(performance) }"
                      />
                    </a-tooltip>
                  </div>
                  <div class="perf-value" :class="toneClass((performance.profit_loss_ratio || 0) - 1)">
                    {{ formatPayoffRatio(performance) }}
                  </div>
                </div>
                <div class="perf-item">
                  <div class="perf-label">{{ $t('community.winRate') }}</div>
                  <div class="perf-value" :class="Number(performance.win_rate || 0) >= 50 ? 'positive' : 'negative'">
                    {{ formatNumber(performance.win_rate, 2) }}%
                  </div>
                </div>
              </div>
            </div>
            <a-alert
              v-else
              type="warning"
              show-icon
              :message="$t('community.admin.noBacktestData')"
            />
            <div v-if="hasEquityCurve" class="equity-card">
              <div class="equity-card__head">
                <div class="equity-card__title">{{ $t('community.equityCurveTitle') }}</div>
                <div v-if="performance.best_run_meta" class="equity-card__meta">
                  <span :class="toneClass(performance.best_run_meta.total_return)">
                    {{ formatPercent(performance.best_run_meta.total_return) }}
                  </span>
                  <span class="equity-card__meta-sep">·</span>
                  <span class="negative">
                    {{ $t('community.maxDrawdown') }}
                    {{ formatPercent(performance.best_run_meta.max_drawdown) }}
                  </span>
                </div>
              </div>
              <div ref="equityChart" class="equity-card__chart"></div>
              <div class="equity-card__hint">
                {{ $t('community.equityCurveHint') }}
              </div>
            </div>
            <a-alert
              v-else-if="performance && Number(performance.sample_size || 0) > 0"
              type="info"
              show-icon
              :message="$t('community.equityCurveMissing')"
              style="margin-top: 16px;"
            />
          </div>

          <div class="section indicator-profile-section" v-if="isIndicatorAsset">
            <h3>{{ $t('community.indicatorProfile') }}</h3>
            <div class="indicator-profile-grid">
              <div
                v-for="item in indicatorProfileItems"
                :key="item.key"
                class="profile-item"
              >
                <div class="profile-item__icon" :class="item.tone ? 'profile-item__icon--' + item.tone : ''">
                  <a-icon :type="item.icon" />
                </div>
                <div class="profile-item__body">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </div>
            <div class="visual-showcase">
              <div class="visual-showcase__copy">
                <strong>{{ $t('community.chartOnlyIndicator') }}</strong>
                <span>{{ $t('community.chartOnlyIndicatorHint') }}</span>
              </div>
              <div class="visual-showcase__bars" aria-hidden="true">
                <span class="visual-line visual-line--fast"></span>
                <span class="visual-line visual-line--slow"></span>
                <span class="visual-zone"></span>
                <span class="visual-dot visual-dot--buy"></span>
                <span class="visual-dot visual-dot--sell"></span>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>{{ $t('community.reviews') }} ({{ comments.total || 0 }})</h3>
            <comment-list
              :comments="comments.items"
              :loading="commentsLoading"
              :can-comment="detail.is_purchased && !detail.is_own && !myComment"
              :current-user-id="currentUserId"
              :my-comment="myComment"
              :total="comments.total"
              @add-comment="handleAddComment"
              @update-comment="handleUpdateComment"
              @load-more="loadMoreComments"
            />
          </div>
        </div>

        <div class="detail-footer">
          <div class="price-info">
            <a-tag v-if="detail.vip_free" color="gold" style="margin-right: 8px;">
              {{ $t('community.vipFree') }}
            </a-tag>
            <!--
              For already-purchased users we show the price the buyer actually
              paid (your_purchase_price from the API) as the primary number,
              and mark the current price as a secondary "current price"
              caption underneath. This avoids the confusing case where the
              indicator has since been re-priced and the buyer thinks they
              were charged the wrong amount.
            -->
            <template v-if="showYourPurchasePrice">
              <div class="price-line price-line--primary">
                <span class="price-line__label">{{ $t('community.yourPurchasePrice') }}:</span>
                <span class="price-badge price-badge--paid">
                  {{ formatPrice(detail.your_purchase_price) }} {{ $t('community.credits') }}
                </span>
              </div>
              <div
                v-if="detail.pricing_type !== 'free' && Number(detail.price) > 0"
                class="price-line price-line--secondary"
              >
                <span class="price-line__label">{{ $t('community.currentPrice') }}:</span>
                <span class="price-current-aside">{{ detail.price }} {{ $t('community.credits') }}</span>
              </div>
            </template>
            <template v-else>
              <span v-if="detail.pricing_type === 'free' || detail.price <= 0" class="free-badge">
                {{ $t('community.free') }}
              </span>
              <span v-else class="price-badge">
                {{ detail.price }} {{ $t('community.credits') }}
              </span>
            </template>
          </div>
          <div class="action-buttons">
            <a-button v-if="detail.is_own" disabled>
              {{ isStrategyAsset ? $t('community.myStrategy') : $t('community.myIndicator') }}
            </a-button>
            <template v-else-if="detail.is_purchased">
              <template v-if="isStrategyAsset && !localCopyMissing">
                <a-button type="primary" :disabled="!purchasedStrategySourceId" @click="deployPurchasedStrategy">
                  <a-icon type="rocket" />
                  {{ $t('community.deployLive') }}
                </a-button>
                <a-button
                  v-if="!codeHidden"
                  :disabled="!purchasedStrategySourceId"
                  @click="viewPurchasedStrategyCode"
                >
                  <a-icon type="code" />
                  {{ $t('community.viewCode') }}
                </a-button>
              </template>
              <template v-else>
                <a-tooltip :title="syncActionTooltip" placement="top">
                  <a-badge :dot="!!detail.has_update && !localCopyMissing" :offset="[-4, 4]">
                    <a-button
                      :type="localCopyMissing ? 'primary' : 'default'"
                      :loading="syncing"
                      @click="handleSyncCode"
                    >
                      <a-icon :type="localCopyMissing ? 'cloud-download' : 'sync'" />
                      {{ syncing ? syncActionLoadingLabel : syncActionLabel }}
                      <a-tag
                        v-if="detail.has_update && !syncing && !localCopyMissing"
                        color="orange"
                        class="update-tag"
                      >{{ $t('community.hasUpdate') }}</a-tag>
                    </a-button>
                  </a-badge>
                </a-tooltip>
                <a-button v-if="!localCopyMissing" type="primary" @click="goToUse">
                  <a-icon type="code" />
                  {{ $t('community.useNow') }}
                </a-button>
              </template>
            </template>
            <a-button
              v-else
              type="primary"
              :loading="purchasing"
              @click="handlePurchase"
            >
              <a-icon type="shopping-cart" />
              {{ purchaseActionLabel }}
            </a-button>
          </div>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>

<script>
import { mapState } from 'vuex'
import CommentList from './CommentList.vue'
import request from '@/utils/request'

export default {
  name: 'IndicatorDetail',
  components: {
    CommentList
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    indicatorId: {
      type: Number,
      default: null
    },
    currentUserId: {
      type: [Number, String],
      default: null
    }
  },
  data () {
    return {
      loading: false,
      purchasing: false,
      syncing: false,
      commentsLoading: false,
      detail: null,
      performance: null,
      comments: {
        items: [],
        total: 0,
        page: 1
      },
      myComment: null,
      imageError: false,
      equityChartInst: null,
      equityResizeHandler: null,
      showAllParameters: false,
      parameterPreviewLimit: 4
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    /** Stable wrap class for the portaled <a-modal>. Pairs with the
     * non-scoped style block at the bottom of this file to deliver
     * dark theme rules without relying on `body.dark` ancestor
     * selectors (which the modal isn't a descendant of). */
    modalWrapClass () {
      const base = 'qd-indicator-detail-modal-wrap'
      return this.isDarkTheme ? `${base} ${base}--dark` : base
    },
    /** True only when the buyer paid >0 credits; we don't want to
     * show "your purchase price: 0" on free indicators (would look
     * like a bug). The free badge in the price-info block already
     * conveys "this is free". */
    showYourPurchasePrice () {
      return !!(this.detail && this.detail.is_purchased &&
        Number(this.detail.your_purchase_price || 0) > 0)
    },
    isStrategyAsset () {
      const assetType = String((this.detail && this.detail.asset_type) || '').toLowerCase()
      return assetType === 'script_template' || assetType === 'script' || assetType === 'strategy'
    },
    isIndicatorAsset () {
      return !this.isStrategyAsset
    },
    modalWidth () {
      return this.isStrategyAsset ? 860 : 720
    },
    strategyContract () {
      const contract = (this.detail && (this.detail.marketplace_contract || this.detail.strategy_contract)) ||
        (this.performance && (this.performance.marketplace_contract || this.performance.strategy_contract))
      return contract && typeof contract === 'object' ? contract : null
    },
    bindingMode () {
      return (this.detail && this.detail.binding_mode) || (this.strategyContract && this.strategyContract.binding_mode) || 'unknown'
    },
    strategyParameters () {
      return this.strategyContract && Array.isArray(this.strategyContract.parameters)
        ? this.strategyContract.parameters
        : []
    },
    visibleStrategyParameters () {
      return this.showAllParameters
        ? this.strategyParameters
        : this.strategyParameters.slice(0, this.parameterPreviewLimit)
    },
    strategyDependencies () {
      if (!this.strategyContract) return []
      return [...new Set([
        ...(this.strategyContract.factor_dependencies || []),
        ...(this.strategyContract.fundamental_dependencies || [])
      ].filter(Boolean))]
    },
    strategyContractItems () {
      if (!this.strategyContract) return []
      const contract = this.strategyContract
      const instruments = contract.instruments || []
      const instrumentValue = instruments.length
        ? instruments.map(item => item.symbol || item.instrument_id).filter(Boolean).join(' · ')
        : (contract.universe_reference || this.$t('community.dynamicUniverse'))
      const markets = [...new Set(instruments.map(item => item.market).filter(Boolean))]
      const marketTypes = [...new Set(instruments.map(item => item.market_type).filter(Boolean))]
      const strategyTypeKey = contract.strategy_type === 'portfolio' ? 'portfolio' : 'cta'
      return [
        {
          key: 'instrument',
          icon: 'global',
          label: this.$t('community.contractInstrument'),
          value: instrumentValue,
          hint: markets.join(' · ') || this.$t(`community.strategyType.${strategyTypeKey}`)
        },
        {
          key: 'marketType',
          icon: 'bank',
          label: this.$t('community.contractMarketType'),
          value: marketTypes.length
            ? marketTypes.map(value => this.formatMarketType(value)).join(' · ')
            : this.$t('community.marketTypeUnspecified'),
          hint: this.$t(`community.strategyType.${strategyTypeKey}`)
        },
        {
          key: 'executionMode',
          icon: 'clock-circle',
          label: this.$t('community.executionMode'),
          value: this.formatExecutionMode(contract.execution_mode),
          hint: this.$t('community.marketplaceMetadataOnly')
        },
        {
          key: 'executionFrequency',
          icon: 'play-circle',
          label: this.$t('community.executionFrequency'),
          value: contract.execution_frequency || contract.primary_frequency || '—',
          hint: this.$t('community.sourceControlled')
        },
        {
          key: 'confirmationFrequencies',
          icon: 'check-circle',
          label: this.$t('community.confirmationFrequencies'),
          value: Array.isArray(contract.confirmation_frequencies) && contract.confirmation_frequencies.length
            ? contract.confirmation_frequencies.join(' · ')
            : this.$t('community.noConfirmationFrequency'),
          hint: this.$t('community.sourceControlled')
        },
        {
          key: 'leverage',
          icon: 'dashboard',
          label: this.$t('community.contractLeverage'),
          value: contract.leverage_allowed
            ? this.$t('community.contractMaxLeverage', { value: this.formatLeverage(contract.max_leverage) })
            : this.$t('community.contractNoLeverage'),
          hint: contract.leverage_allowed
            ? this.$t('community.leverageDeclared')
            : this.$t('community.spotRiskBoundary')
        }
      ]
    },
    purchaseActionLabel () {
      const isFree = this.detail && (this.detail.pricing_type === 'free' || this.detail.price <= 0)
      if (!this.isStrategyAsset) {
        return isFree ? this.$t('community.getFree') : this.$t('community.buyNow')
      }
      return isFree ? this.$t('community.getStrategy') : this.$t('community.buyStrategy')
    },
    codeHidden () {
      const d = this.detail || {}
      return !!(d.code_hidden || d.codeHidden || d.hide_code || d.hideCode || d.is_encrypted)
    },
    parameterCount () {
      const raw = (this.detail && (this.detail.param_count || this.detail.parameter_count || this.detail.params_count)) || 0
      const n = Number(raw)
      return Number.isFinite(n) && n > 0 ? n : 0
    },
    parameterLabel () {
      return this.parameterCount > 0
        ? this.$t('community.paramCount', { n: this.parameterCount })
        : this.$t('community.adjustableParams')
    },
    ratingLabel () {
      const rating = Number((this.detail && this.detail.avg_rating) || 0)
      const count = Number((this.detail && this.detail.rating_count) || 0)
      return rating > 0 ? `${rating.toFixed(1)} / ${count}` : this.$t('community.noRatings')
    },
    indicatorProfileItems () {
      const d = this.detail || {}
      return [
        {
          key: 'source',
          icon: this.codeHidden ? 'lock' : 'unlock',
          tone: this.codeHidden ? 'warning' : 'success',
          label: this.$t('community.codeVisibility'),
          value: this.codeHidden ? this.$t('community.codeHidden') : this.$t('community.codeVisible')
        },
        {
          key: 'params',
          icon: 'sliders',
          tone: 'primary',
          label: this.$t('community.parameters'),
          value: this.parameterLabel
        },
        {
          key: 'markers',
          icon: 'environment',
          tone: 'success',
          label: this.$t('community.chartMarkers'),
          value: this.$t('community.visualSignals')
        },
        {
          key: 'layers',
          icon: 'block',
          tone: 'gold',
          label: this.$t('community.overlayLayers'),
          value: this.$t('community.chartAnnotations')
        },
        {
          key: 'downloads',
          icon: 'download',
          label: this.$t('community.downloads'),
          value: String(d.purchase_count || 0)
        },
        {
          key: 'rating',
          icon: 'star',
          tone: 'gold',
          label: this.$t('community.rating'),
          value: this.ratingLabel
        }
      ]
    },
    localCopyMissing () {
      return !!(this.detail && this.detail.is_purchased && this.detail.local_copy_missing)
    },
    purchasedStrategySourceId () {
      const d = this.detail || {}
      return d.script_source_id || d.purchased_script_source_id || ''
    },
    syncActionLabel () {
      return this.localCopyMissing ? this.$t('community.restoreCopy') : this.$t('community.syncCode')
    },
    syncActionLoadingLabel () {
      return this.localCopyMissing ? this.$t('community.restoringCopy') : this.$t('community.syncingCode')
    },
    syncActionTooltip () {
      return this.localCopyMissing ? this.$t('community.restoreCopyTooltip') : this.$t('community.syncCodeTooltip')
    },
    hasEquityCurve () {
      return this.performance && Array.isArray(this.performance.equity_curve) &&
        this.performance.equity_curve.length > 1
    },
    headerStyle () {
      if (!this.detail) return {}
      const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'
      ]
      const index = (this.detail.id || 0) % gradients.length
      return { background: gradients[index] }
    },
    indicatorInitials () {
      if (!this.detail) return ''
      const name = this.detail.name || 'I'
      if (/[\u4e00-\u9fa5]/.test(name)) {
        return name.slice(0, 2)
      }
      const words = name.split(/\s+/)
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase()
      }
      return name.slice(0, 2).toUpperCase()
    }
  },
  watch: {
    visible (val) {
      if (val && this.indicatorId) {
        this.loadDetail()
        this.loadComments(1)
        this.loadMyComment()
      } else {
        this.resetData()
      }
    },
    isDarkTheme () {
      if (this.hasEquityCurve && this.equityChartInst) {
        this.$nextTick(() => this.renderEquityChart())
      }
    }
  },
  beforeDestroy () {
    this.disposeEquityChart()
  },
  methods: {
    resetData () {
      this.detail = null
      this.performance = null
      this.comments = { items: [], total: 0, page: 1 }
      this.myComment = null
      this.showAllParameters = false
      this.disposeEquityChart()
    },

    async loadDetail () {
      this.loading = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}`,
          method: 'get'
        })
        if (res.code === 1) {
          this.detail = res.data
          if (this.isStrategyAsset) {
            this.loadPerformance()
          } else {
            this.performance = null
          }
        } else {
          this.$message.error(res.msg || this.$t('community.loadFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('community.loadFailed'))
      } finally {
        this.loading = false
      }
    },

    async loadPerformance () {
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/performance`,
          method: 'get'
        })
        if (res.code === 1) {
          this.performance = res.data || null
          this.$nextTick(() => {
            if (this.hasEquityCurve) this.renderEquityChart()
          })
        }
      } catch (e) {
        console.error('Load performance failed:', e)
        this.performance = null
      }
    },

    async renderEquityChart () {
      const el = this.$refs.equityChart
      if (!el || !this.performance) return
      try {
        const echarts = await import('echarts')
        this.disposeEquityChart()
        const inst = echarts.init(el)
        const points = this.performance.equity_curve || []
        const xs = points.map((p, i) => {
          if (typeof p === 'object' && p !== null) {
            return p.time || p.date || p.timestamp || String(i)
          }
          return String(i)
        })
        const ys = points.map(p => {
          if (typeof p === 'object' && p !== null) {
            return parseFloat(p.equity != null ? p.equity : p.value) || 0
          }
          return parseFloat(p) || 0
        })
        const baseline = ys.length ? ys[0] : 0
        const dark = this.isDarkTheme
        const axisLabelColor = dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
        const splitLineColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
        const axisLineColor = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
        inst.setOption({
          backgroundColor: 'transparent',
          grid: { left: 50, right: 16, top: 16, bottom: 32 },
          tooltip: {
            trigger: 'axis',
            confine: true,
            backgroundColor: dark ? 'rgba(38,38,38,0.96)' : undefined,
            borderColor: dark ? '#434343' : undefined,
            textStyle: dark ? { color: 'rgba(255,255,255,0.85)' } : undefined,
            axisPointer: { type: 'cross' }
          },
          xAxis: {
            type: 'category',
            data: xs,
            boundaryGap: false,
            axisLabel: { fontSize: 11, color: axisLabelColor },
            axisLine: { lineStyle: { color: axisLineColor } },
            splitLine: { show: false }
          },
          yAxis: {
            type: 'value',
            scale: true,
            axisLabel: { fontSize: 11, color: axisLabelColor },
            axisLine: { lineStyle: { color: axisLineColor } },
            splitLine: { lineStyle: { color: splitLineColor } }
          },
          series: [{
            name: this.$t('community.equityCurveTitle'),
            type: 'line',
            smooth: true,
            showSymbol: false,
            data: ys,
            lineStyle: { width: 2, color: 'var(--primary-color, #1890ff)' },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(24, 144, 255, 0.32)' },
                  { offset: 1, color: 'rgba(24, 144, 255, 0.02)' }
                ]
              },
              origin: baseline
            }
          }]
        })
        this.equityChartInst = inst
        this.equityResizeHandler = () => inst.resize()
        window.addEventListener('resize', this.equityResizeHandler)
      } catch (e) {
        console.error('Equity chart render failed:', e)
      }
    },

    disposeEquityChart () {
      if (this.equityResizeHandler) {
        window.removeEventListener('resize', this.equityResizeHandler)
        this.equityResizeHandler = null
      }
      if (this.equityChartInst) {
        try { this.equityChartInst.dispose() } catch (e) {}
        this.equityChartInst = null
      }
    },

    async loadComments (page = 1) {
      this.commentsLoading = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/comments`,
          method: 'get',
          params: { page, page_size: 10 }
        })
        if (res.code === 1) {
          if (page === 1) {
            this.comments.items = res.data.items
          } else {
            this.comments.items = [...this.comments.items, ...res.data.items]
          }
          this.comments.total = res.data.total
          this.comments.page = page
        }
      } catch (e) {
        console.error('Load comments failed:', e)
      } finally {
        this.commentsLoading = false
      }
    },

    loadMoreComments () {
      if (this.comments.items.length < this.comments.total) {
        this.loadComments(this.comments.page + 1)
      }
    },

    async loadMyComment () {
      if (!this.currentUserId) return
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/my-comment`,
          method: 'get'
        })
        if (res.code === 1) {
          this.myComment = res.data
        }
      } catch (e) {
        console.error('Load my comment failed:', e)
      }
    },

    async handleAddComment (data) {
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/comments`,
          method: 'post',
          data
        })
        if (res.code === 1) {
          this.$message.success(this.$t('community.commentSuccess'))
          this.loadComments(1)
          this.loadMyComment()
          this.loadDetail()
        } else {
          const msgKey = `community.${res.msg}`
          this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : res.msg)
        }
      } catch (e) {
        this.$message.error(this.$t('community.commentFailed'))
      }
    },

    async handleUpdateComment (data) {
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/comments/${data.comment_id}`,
          method: 'put',
          data: {
            rating: data.rating,
            content: data.content
          }
        })
        if (res.code === 1) {
          this.$message.success(this.$t('community.commentUpdateSuccess'))
          this.loadComments(1)
          this.loadMyComment()
          this.loadDetail()
        } else {
          const msgKey = `community.${res.msg}`
          this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : res.msg)
        }
      } catch (e) {
        this.$message.error(this.$t('community.commentUpdateFailed'))
      }
    },

    async handlePurchase () {
      this.purchasing = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/purchase`,
          method: 'post'
        })
        if (res.code === 1) {
          const assetType = res.data && res.data.asset_type
          let successKey = 'community.purchaseSuccess'
          if (assetType === 'script_template') {
            successKey = 'community.scriptTemplatePurchased'
          }
          this.$message.success(this.$t(successKey))
          this.loadDetail()
          this.$emit('purchased')
        } else {
          this.$message.error(this.formatPurchaseError(res))
        }
      } catch (e) {
        this.$message.error(this.formatPurchaseError(e))
      } finally {
        this.purchasing = false
      }
    },

    formatPurchaseError (source) {
      const envelope = (source && source.response && source.response.data) || source || {}
      const code = envelope.msg || envelope.message || envelope.error || ''
      const details = envelope.data || {}
      if (code === 'insufficient_credits') {
        const required = Number(details.required || 0)
        const current = Number(details.current || 0)
        const shortage = Math.max(required - current, 0)
        return this.$t('community.insufficientCreditsDetail', {
          required: this.formatPrice(required),
          current: this.formatPrice(current),
          shortage: this.formatPrice(shortage)
        })
      }
      const msgKey = code ? `community.${code}` : ''
      if (msgKey && this.$te(msgKey)) return this.$t(msgKey)
      return (source && source.backendMessage) || code || this.$t('community.purchaseFailed')
    },

    goToUse () {
      const localId = this.detail && (
        this.detail.local_copy_id ||
        this.detail.purchased_indicator_id ||
        this.detail.indicator_id
      )
      if (!localId) {
        this.$message.error(this.$t('community.restoreCopyFailed'))
        return
      }
      this.$emit('close')
      this.$router.push({
        path: '/indicator-ide',
        query: { indicator_id: String(localId) }
      }).catch(() => {})
    },

    deployPurchasedStrategy () {
      if (!this.purchasedStrategySourceId) return
      this.$emit('close')
      this.$router.push({
        path: '/strategy-center',
        query: {
          mode: 'create',
          sourceId: String(this.purchasedStrategySourceId)
        }
      }).catch(() => {})
    },

    viewPurchasedStrategyCode () {
      if (this.codeHidden || !this.purchasedStrategySourceId) return
      this.$emit('close')
      this.$router.push({
        path: '/strategy-ide',
        query: { sourceId: String(this.purchasedStrategySourceId) }
      }).catch(() => {})
    },

    handleSyncCode () {
      if (this.syncing) return
      this.$confirm({
        title: this.localCopyMissing ? this.$t('community.restoreCopyConfirmTitle') : this.$t('community.syncCodeConfirmTitle'),
        content: this.localCopyMissing ? this.$t('community.restoreCopyConfirmContent') : this.$t('community.syncCodeConfirmContent'),
        okText: this.localCopyMissing ? this.$t('community.restoreCopy') : this.$t('community.syncCode'),
        cancelText: this.$t('community.cancelEdit'),
        onOk: () => this.doSyncCode()
      })
    },

    async doSyncCode () {
      this.syncing = true
      try {
        const res = await request({
          url: `/api/community/indicators/${this.indicatorId}/sync`,
          method: 'post'
        })
        if (res.code === 1) {
          // Backend returns `already_latest` when nothing had to be copied.
          if (res.msg === 'already_latest') {
            this.$message.info(this.$t('community.already_latest'))
          } else if (res.msg === 'restored') {
            this.$message.success(this.$t('community.restoreCopySuccess'))
          } else if (res.msg === 'listing_unpublished_no_update' || res.msg === 'listing_deleted_no_update') {
            const msgKey = `community.${res.msg}`
            this.$message.info(this.$te(msgKey) ? this.$t(msgKey) : this.$t('community.already_latest'))
          } else {
            this.$message.success(this.$t('community.syncCodeSuccess'))
          }
          // Refresh detail so the "Update available" badge clears immediately.
          this.loadDetail()
          this.$emit('synced')
        } else {
          const msgKey = `community.${res.msg}`
          this.$message.error(this.$te(msgKey) ? this.$t(msgKey) : (res.msg || this.$t('community.syncCodeFailed')))
        }
      } catch (e) {
          // request interceptor may surface backend msg directly; fall back to a generic one
        const backendMsg = e && e.response && e.response.data && e.response.data.msg
        const msgKey = backendMsg ? `community.${backendMsg}` : ''
        if (msgKey && this.$te(msgKey)) {
          this.$message.error(this.$t(msgKey))
        } else {
          this.$message.error(this.$t('community.syncCodeFailed'))
        }
      } finally {
        this.syncing = false
      }
    },

    formatDate (dateStr) {
      if (!dateStr) return '-'
      const d = new Date(dateStr)
      return d.toLocaleDateString()
    },
    /** Format the price the buyer paid. Integers print without decimals;
     * fractional credits keep up to 2 dp. Mirrors index.vue's helper. */
    formatPrice (val) {
      const n = parseFloat(val)
      if (isNaN(n)) return '0'
      return Number.isInteger(n) ? String(n) : n.toFixed(2)
    },
    formatNumber (val, digits) {
      const v = parseFloat(val)
      if (isNaN(v)) return '—'
      return v.toFixed(digits == null ? 2 : digits)
    },
    formatPayoffRatio (performance) {
      if (!performance || Number(performance.losing_trades || 0) <= 0) return '—'
      return this.formatNumber(performance.profit_loss_ratio, 2)
    },
    isPayoffRatioUnstable (performance) {
      const losses = Number(performance && performance.losing_trades) || 0
      return losses > 0 && losses < 3
    },
    payoffRatioTooltip (performance) {
      const wins = Number(performance && performance.winning_trades) || 0
      const losses = Number(performance && performance.losing_trades) || 0
      const sampleWarning = this.isPayoffRatioUnstable(performance)
        ? `${this.$t('backtest-center.audit.lowSample')} · `
        : ''
      return `${sampleWarning}${this.$t('strategyCenter.backtest.winningTrades')}: ${wins} · ${this.$t('strategyCenter.backtest.losingTrades')}: ${losses}`
    },
    formatPercent (val) {
      const v = parseFloat(val)
      if (isNaN(v)) return '—'
      const sign = v > 0 ? '+' : ''
      return `${sign}${v.toFixed(2)}%`
    },
    formatScore (val) {
      const v = parseFloat(val)
      if (isNaN(v)) return '—'
      return v.toFixed(0)
    },
    formatMarketType (val) {
      const type = String(val || '').toLowerCase()
      if (type === 'spot') return this.$t('trading-assistant.form.marketTypeSpot')
      if (type === 'swap') return this.$t('trading-assistant.form.marketTypeFutures')
      return type || '—'
    },
    formatExecutionMode (val) {
      const mode = String(val || 'bar').toLowerCase()
      const key = `community.executionModeValue.${mode}`
      return this.$te(key) ? this.$t(key) : mode
    },
    formatLeverage (val) {
      const v = parseFloat(val)
      if (isNaN(v) || v <= 0) return '1x'
      return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)}x`
    },
    formatBacktestDuration (val) {
      const days = parseInt(val, 10)
      if (!days || days <= 0) return ''
      return this.$t('community.backtestDurationDays', { days })
    },
    parameterName (param) {
      if (param.label_key && this.$te(param.label_key)) return this.$t(param.label_key)
      return param.label || param.name
    },
    formatContractValue (value, type) {
      if (value === null || value === undefined || value === '') return '—'
      if (type === 'boolean') {
        return value ? this.$t('community.parameterEnabled') : this.$t('community.parameterDisabled')
      }
      const number = Number(value)
      if (type === 'percent' && Number.isFinite(number)) {
        return `${(number * 100).toFixed(Number.isInteger(number * 100) ? 0 : 2)}%`
      }
      if (Number.isFinite(number)) {
        return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(6)))
      }
      return String(value)
    },
    formatParameterRange (param) {
      const hasMin = param.min !== null && param.min !== undefined
      const hasMax = param.max !== null && param.max !== undefined
      if (!hasMin && !hasMax) return this.$t('community.parameterNoRange')
      const min = hasMin ? this.formatContractValue(param.min, param.type) : '—'
      const max = hasMax ? this.formatContractValue(param.max, param.type) : '—'
      return `${min} – ${max}`
    },
    // Generic tone class. ``positiveThreshold`` lets callers say "Sharpe
    // is only good if >= 1" without re-implementing the rule.
    toneClass (val, positiveThreshold = 0) {
      const v = parseFloat(val)
      if (isNaN(v)) return ''
      if (v > positiveThreshold) return 'positive'
      if (v < 0) return 'negative'
      return ''
    }
  }
}
</script>

<style lang="less" scoped>
.indicator-detail-modal {
  .detail-container {
    display: flex;
    flex-direction: column;
    max-height: 80vh;
  }

  .detail-header {
    display: flex;
    gap: 16px;
    padding: 16px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;

    .header-cover {
      width: 156px;
      height: 100px;
      border-radius: 8px;
      overflow: hidden;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      &.default-cover {
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid rgba(255, 255, 255, 0.3);

        .cover-initials {
          font-size: 42px;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          letter-spacing: 2px;
        }
      }
    }

    .header-info {
      flex: 1;

      .strategy-title-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;

        .indicator-name {
          margin-bottom: 0;
        }

        .strategy-api-badge {
          margin: 0;
          border-color: rgba(255, 255, 255, 0.32);
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
        }
      }

      .indicator-name {
        font-size: 20px;
        font-weight: 600;
        margin: 0 0 12px 0;
        color: #fff;
      }

      .indicator-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;

        .author-info {
          display: flex;
          align-items: center;
          gap: 8px;

          .author-name {
            font-size: 14px;
          }
        }

        .publish-time {
          font-size: 12px;
          opacity: 0.8;
        }
      }

      .indicator-stats {
        display: flex;
        gap: 20px;

        ::v-deep .ant-statistic {
          .ant-statistic-title {
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
          }

          .ant-statistic-content {
            color: #fff;
            font-size: 16px;
          }
        }

        .rating-text {
          font-size: 12px;
          margin-left: 4px;
          opacity: 0.8;
        }
      }
    }
  }

  .detail-body {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px 20px;

    .section {
      margin-bottom: 18px;

      h3 {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid #f0f0f0;
      }

      .description {
        font-size: 14px;
        line-height: 1.8;
        color: rgba(0, 0, 0, 0.65);
        white-space: pre-wrap;
      }
    }

    .indicator-profile-section {
      h3 {
        margin-bottom: 14px;
      }
    }

    .indicator-profile-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .profile-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      padding: 12px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 8px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0.025));
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);

      &__icon {
        width: 34px;
        height: 34px;
        flex: 0 0 34px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 7px;
        background: rgba(24, 144, 255, 0.1);
        color: var(--primary-color, #1890ff);

        &--success {
          background: rgba(82, 196, 26, 0.12);
          color: #389e0d;
        }

        &--warning,
        &--gold {
          background: rgba(250, 173, 20, 0.14);
          color: #d48806;
        }
      }

      &__body {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;

        span {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.45);
        }

        strong {
          font-size: 14px;
          color: rgba(0, 0, 0, 0.82);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }

    .visual-showcase {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-top: 12px;
      padding: 14px 16px;
      border-radius: 8px;
      border: 1px solid rgba(24, 144, 255, 0.12);
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.06), rgba(82, 196, 26, 0.06));

      &__copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;

        strong {
          color: rgba(0, 0, 0, 0.82);
        }

        span {
          color: rgba(0, 0, 0, 0.52);
          font-size: 12px;
          line-height: 1.6;
        }
      }

      &__bars {
        flex: 0 0 180px;
        position: relative;
        height: 58px;
        overflow: hidden;
        border-radius: 8px;
        border: 1px solid rgba(24, 144, 255, 0.14);
        background:
          linear-gradient(rgba(24, 144, 255, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(24, 144, 255, 0.08) 1px, transparent 1px),
          rgba(0, 0, 0, 0.025);
        background-size: 100% 18px, 36px 100%, auto;

        .visual-line,
        .visual-zone {
          position: absolute;
          left: 16px;
          right: 16px;
          height: 2px;
          border-radius: 999px;
          transform-origin: left center;
        }

        .visual-line--fast {
          top: 20px;
          background: linear-gradient(90deg, #1890ff, #52c41a);
          transform: rotate(-8deg);
        }

        .visual-line--slow {
          top: 38px;
          background: rgba(250, 173, 20, 0.9);
          transform: rotate(5deg);
        }

        .visual-zone {
          top: 28px;
          height: 14px;
          background: linear-gradient(90deg, rgba(24, 144, 255, 0.18), rgba(82, 196, 26, 0.14));
        }

        .visual-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.18);

          &--buy {
            left: 46px;
            top: 18px;
            background: #52c41a;
          }

          &--sell {
            right: 42px;
            top: 36px;
            background: #faad14;
          }
        }
      }
    }

    .section-heading-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;

      h3 {
        margin-bottom: 4px;
        padding-bottom: 0;
        border-bottom: 0;
      }

      p {
        margin: 0;
        color: rgba(0, 0, 0, 0.52);
        font-size: 12px;
        line-height: 1.6;
      }
    }

    .section-heading-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      flex-wrap: wrap;

      .ant-tag {
        margin: 0;
      }
    }

    .strategy-contract-section {
      padding: 16px;
      border: 1px solid rgba(24, 144, 255, 0.16);
      border-radius: 10px;
      background: linear-gradient(145deg, rgba(24, 144, 255, 0.055), rgba(82, 196, 26, 0.025));
    }

    .source-controlled-badge {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(82, 196, 26, 0.1);
      color: #389e0d;
      font-size: 12px;
      font-weight: 600;
    }

    .contract-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .contract-card {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      min-width: 0;
      padding: 12px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.78);

      &__icon {
        flex: 0 0 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 7px;
        background: rgba(24, 144, 255, 0.1);
        color: var(--primary-color, #1890ff);
      }

      &__body {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;

        span,
        small {
          color: rgba(0, 0, 0, 0.45);
          font-size: 11px;
          line-height: 1.4;
        }

        strong {
          overflow: hidden;
          color: rgba(0, 0, 0, 0.85);
          font-size: 14px;
          line-height: 1.45;
          text-overflow: ellipsis;
        }
      }
    }

    .contract-logic-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr) 140px;
      gap: 10px;
      margin-top: 10px;
    }

    .contract-logic-card {
      display: flex;
      min-height: 70px;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
      padding: 11px 12px;
      border: 1px solid rgba(0, 0, 0, 0.055);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.025);

      &__label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-bottom: 7px;
        color: rgba(0, 0, 0, 0.48);
        font-size: 11px;
      }

      &--warmup strong {
        color: rgba(0, 0, 0, 0.82);
        font-size: 14px;
      }
    }

    .contract-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;

      .ant-tag {
        margin: 0;
        border: 0;
        background: rgba(24, 144, 255, 0.09);
        color: #096dd9;
        font-size: 11px;
      }
    }

    .contract-empty {
      color: rgba(0, 0, 0, 0.3);

      &--meaningful {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: rgba(0, 0, 0, 0.55);
        font-size: 11px;

        .anticon {
          color: #52c41a;
        }
      }
    }

    .parameter-panel {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(24, 144, 255, 0.12);

      &__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;

        > div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        strong {
          color: rgba(0, 0, 0, 0.85);
          font-size: 13px;
        }

        span {
          color: rgba(0, 0, 0, 0.46);
          font-size: 11px;
        }

        .parameter-count {
          min-width: 26px;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(24, 144, 255, 0.1);
          color: var(--primary-color, #1890ff);
          text-align: center;
          font-weight: 600;
        }
      }
    }

    .parameter-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .parameter-item {
      display: grid;
      grid-template-columns: minmax(120px, 1.35fr) minmax(70px, 0.65fr) minmax(100px, 1fr);
      align-items: center;
      gap: 8px;
      min-width: 0;
      padding: 10px 11px;
      border: 1px solid rgba(0, 0, 0, 0.055);
      border-radius: 7px;
      background: rgba(255, 255, 255, 0.58);

      &__name,
      &__value,
      &__range {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      &__name strong,
      &__value strong,
      &__range strong {
        overflow: hidden;
        color: rgba(0, 0, 0, 0.8);
        font-size: 12px;
        line-height: 1.4;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      &__name code,
      &__value span,
      &__range span {
        overflow: hidden;
        color: rgba(0, 0, 0, 0.4);
        font-size: 10px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .parameter-toggle {
      display: block;
      height: auto;
      margin: 8px auto 0;
      padding: 2px 8px;
      font-size: 12px;
    }

    .evidence-heading {
      margin-bottom: 10px;
    }

    .evidence-context {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
      padding: 10px 12px;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.025);

      &__label {
        color: rgba(0, 0, 0, 0.62);
        font-size: 12px;
        font-weight: 600;
      }

      &__tags,
      &__quality {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      &__tags .ant-tag {
        margin: 0;
        border: 0;
        font-size: 11px;
      }

      &__quality {
        justify-content: flex-end;
        color: rgba(0, 0, 0, 0.48);
        font-size: 11px;

        .has-live { color: #389e0d; }
        .no-live { color: #d48806; }
      }

      .tag-symbol { background: rgba(24, 144, 255, 0.08); color: #096dd9; }
      .tag-tf { background: rgba(82, 196, 26, 0.09); color: #389e0d; }
      .tag-market { background: rgba(19, 194, 194, 0.1); color: #08979c; }
      .tag-leverage { background: rgba(250, 140, 22, 0.11); color: #d46b08; }
      .tag-duration { background: rgba(47, 84, 235, 0.09); color: #2f54eb; }
    }

    .performance-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;

      .perf-item {
        text-align: center;
        padding: 12px 8px;
        background: #f5f5f5;
        border-radius: 8px;

        .perf-label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.55);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex-wrap: wrap;

          .anticon {
            font-size: 12px;
            color: rgba(0, 0, 0, 0.35);
          }

          .payoff-warning {
            color: #faad14;
          }
        }

        .perf-value {
          font-size: 18px;
          font-weight: 600;
          color: rgba(0, 0, 0, 0.85);

          .perf-unit {
            font-size: 11px;
            font-weight: 400;
            color: rgba(0, 0, 0, 0.45);
            margin-left: 2px;
          }

          &.positive { color: #52c41a; }
          &.negative { color: #f5222d; }
        }

        &--score {
          background: linear-gradient(135deg, rgba(245, 175, 25, 0.12) 0%, rgba(241, 39, 17, 0.08) 100%);

          .perf-value {
            color: #d4380d;
          }
        }
      }
    }

    .applicable-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 12px;

      &__label {
        flex-shrink: 0;
        color: rgba(0, 0, 0, 0.5);
        width: 80px;
      }

      &__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;

        .ant-tag {
          margin: 0;
          font-size: 11px;
          border: none;
        }

        .tag-symbol {
          background: rgba(24, 144, 255, 0.08);
          color: var(--primary-color, #1890ff);
        }

        .tag-tf {
          background: rgba(82, 196, 26, 0.08);
          color: #389e0d;
        }
      }

      &__empty {
        color: rgba(0, 0, 0, 0.3);
      }
    }

    .equity-card {
      margin-top: 16px;
      padding: 16px;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 8px;

      &__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        flex-wrap: wrap;
        gap: 8px;
      }

      &__title {
        font-size: 14px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.85);
      }

      &__meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        flex-wrap: wrap;

        .ant-tag {
          margin: 0;
          font-size: 11px;
          border: none;
        }

        .tag-symbol { background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff); }
        .tag-tf { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
        .tag-market--spot { background: rgba(19, 194, 194, 0.1); color: #08979c; }
        .tag-market--swap { background: rgba(114, 46, 209, 0.1); color: #722ed1; }
        .tag-leverage { background: rgba(250, 140, 22, 0.12); color: #d46b08; }
        .tag-duration { background: rgba(47, 84, 235, 0.1); color: #2f54eb; }
        .positive { color: #52c41a; font-weight: 600; }
        .negative { color: #f5222d; font-weight: 600; }
      }

      &__meta-sep {
        color: rgba(0, 0, 0, 0.25);
      }

      &__chart {
        width: 100%;
        height: 220px;
      }

      &__hint {
        margin-top: 4px;
        font-size: 11px;
        color: rgba(0, 0, 0, 0.4);
        line-height: 1.6;
      }
    }

  }

  .detail-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;

    .price-info {
      .free-badge {
        font-size: 20px;
        font-weight: 600;
        color: #52c41a;
      }

      .price-badge {
        font-size: 20px;
        font-weight: 600;
        color: #f5222d;
      }
    }

    .action-buttons {
      display: flex;
      gap: 12px;
      align-items: center;

      .update-tag {
        margin-left: 6px;
        margin-right: 0;
        font-size: 11px;
        line-height: 18px;
        padding: 0 6px;
      }

      ::v-deep .ant-badge {
        display: inline-block;
      }
    }
  }
}

// Styles for the new "your purchase price" footer line.
// Placed inside the scoped block because the elements live inside the
// modal body (which Ant *does* keep within the component scope for
// content; only the outer wrapper is portaled).
.indicator-detail-modal {
  .detail-footer {
    .price-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .price-line {
        display: flex;
        align-items: baseline;
        gap: 8px;

        &__label {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.45);
        }
      }

      .price-line--primary .price-badge--paid {
        font-size: 20px;
        font-weight: 600;
        color: #f5222d;
      }

      .price-line--secondary .price-current-aside {
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);
        text-decoration: line-through;
      }
    }
  }
}

// Dark theme: scoped overrides beat the light-theme rules above because
// `.is-dark` adds an extra class on the same [data-v] subtree.
.detail-container.is-dark {
  .detail-body {
    background: #1a1a1a;

    .section h3 {
      color: rgba(255, 255, 255, 0.88);
      border-color: #303030;
    }

    .description {
      color: rgba(255, 255, 255, 0.72);
    }

    .section-heading-row p {
      color: rgba(255, 255, 255, 0.5);
    }

    .strategy-contract-section {
      border-color: #373d37;
      background: linear-gradient(145deg, #202320, #202020);
    }

    .source-controlled-badge {
      background: rgba(82, 196, 26, 0.16);
      color: #95de64;
    }

    .contract-card,
    .parameter-item {
      border-color: #383838;
      background: #292929;
    }

    .contract-card__body {
      span,
      small { color: rgba(255, 255, 255, 0.45); }
      strong { color: rgba(255, 255, 255, 0.88); }
    }

    .contract-card__icon {
      background: rgba(82, 196, 26, 0.12);
      color: #8fd96a;
    }

    .contract-logic-card,
    .evidence-context {
      border-color: #363636;
      background: #262626;
    }

    .contract-logic-card {
      &__label { color: rgba(255, 255, 255, 0.48); }
      &--warmup strong { color: rgba(255, 255, 255, 0.86); }
    }

    .contract-empty--meaningful {
      color: rgba(255, 255, 255, 0.62);

      .anticon {
        color: #95de64;
      }
    }

    .contract-tags .ant-tag {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.72);
    }

    .parameter-panel {
      border-color: rgba(255, 255, 255, 0.09);

      &__head {
        strong { color: rgba(255, 255, 255, 0.88); }
        span { color: rgba(255, 255, 255, 0.46); }
        .parameter-count { background: rgba(82, 196, 26, 0.14); color: #95de64; }
      }
    }

    .parameter-item {
      &__name strong,
      &__value strong,
      &__range strong { color: rgba(255, 255, 255, 0.82); }

      &__name code,
      &__value span,
      &__range span { color: rgba(255, 255, 255, 0.4); }
    }

    .evidence-context {
      &__label { color: rgba(255, 255, 255, 0.7); }
      &__quality { color: rgba(255, 255, 255, 0.46); }
      .tag-symbol { background: rgba(24, 144, 255, 0.16); color: #69c0ff; }
      .tag-tf { background: rgba(82, 196, 26, 0.16); color: #95de64; }
      .tag-market { background: rgba(19, 194, 194, 0.18); color: #5cdbd3; }
      .tag-leverage { background: rgba(250, 140, 22, 0.18); color: #ffc069; }
      .tag-duration { background: rgba(47, 84, 235, 0.2); color: #85a5ff; }
      .has-live { color: #95de64; }
      .no-live { color: #ffd666; }
    }

    .indicator-profile-grid .profile-item {
      background: rgba(255, 255, 255, 0.04);
      border-color: #303030;

      &__body {
        span {
          color: rgba(255, 255, 255, 0.5);
        }

        strong {
          color: rgba(255, 255, 255, 0.86);
        }
      }
    }

    .profile-item__icon {
      background: rgba(24, 144, 255, 0.16);
      color: #69c0ff;

      &--success {
        background: rgba(82, 196, 26, 0.16);
        color: #95de64;
      }

      &--warning,
      &--gold {
        background: rgba(250, 173, 20, 0.18);
        color: #ffd666;
      }
    }

    .visual-showcase {
      border-color: rgba(255, 255, 255, 0.08);
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.12), rgba(82, 196, 26, 0.08));

      &__copy {
        strong {
          color: rgba(255, 255, 255, 0.88);
        }

        span {
          color: rgba(255, 255, 255, 0.56);
        }
      }

      &__bars {
        border-color: rgba(255, 255, 255, 0.1);
        background:
          linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
          rgba(0, 0, 0, 0.18);
        background-size: 100% 18px, 36px 100%, auto;
      }
    }

    .performance-grid .perf-item {
      background: #262626;

      .perf-label {
        color: rgba(255, 255, 255, 0.55);

        .anticon {
          color: rgba(255, 255, 255, 0.35);
        }
      }

      .perf-value {
        color: rgba(255, 255, 255, 0.88);

        .perf-unit {
          color: rgba(255, 255, 255, 0.45);
        }

        &.positive { color: #95de64; }
        &.negative { color: #ff7875; }
      }

      &--score {
        background: linear-gradient(135deg, rgba(245, 175, 25, 0.18) 0%, rgba(241, 39, 17, 0.12) 100%);

        .perf-value {
          color: #ffa940;
        }
      }
    }

    .applicable-row {
      &__label {
        color: rgba(255, 255, 255, 0.65);
      }

      &__empty {
        color: rgba(255, 255, 255, 0.3);
      }

      &__tags {
        .tag-symbol {
          background: rgba(24, 144, 255, 0.16);
          color: #69c0ff;
        }

        .tag-tf {
          background: rgba(82, 196, 26, 0.16);
          color: #95de64;
        }
      }
    }

    .equity-card {
      background: #262626;
      border-color: #303030;

      &__title {
        color: rgba(255, 255, 255, 0.88);
      }

      &__meta {
        .tag-symbol {
          background: rgba(24, 144, 255, 0.16);
          color: #69c0ff;
        }

        .tag-tf {
          background: rgba(82, 196, 26, 0.16);
          color: #95de64;
        }

        .tag-market--spot { background: rgba(19, 194, 194, 0.18); color: #5cdbd3; }
        .tag-market--swap { background: rgba(114, 46, 209, 0.22); color: #b37feb; }
        .tag-leverage { background: rgba(250, 140, 22, 0.18); color: #ffc069; }
        .tag-duration { background: rgba(47, 84, 235, 0.2); color: #85a5ff; }
        .positive { color: #95de64; }
        .negative { color: #ff7875; }
      }

      &__meta-sep {
        color: rgba(255, 255, 255, 0.25);
      }

      &__hint {
        color: rgba(255, 255, 255, 0.45);
      }
    }

  }

  .detail-footer {
    background: #1f1f1f;
    border-color: #303030;

    .price-info {
      .price-line__label {
        color: rgba(255, 255, 255, 0.45);
      }

      .price-line--secondary .price-current-aside {
        color: rgba(255, 255, 255, 0.35);
      }
    }
  }
}

@media (max-width: 760px) {
  .indicator-detail-modal {
    .detail-header {
      .header-cover {
        width: 112px;
        height: 96px;
      }

      .indicator-meta,
      .indicator-stats {
        flex-wrap: wrap;
      }
    }

    .detail-body {
      .contract-grid,
      .performance-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .contract-logic-grid,
      .parameter-grid {
        grid-template-columns: 1fr;
      }

      .evidence-context {
        grid-template-columns: 1fr;

        &__quality {
          justify-content: flex-start;
        }
      }
    }
  }
}

</style>

<!--
  Non-scoped global style block.

  Ant Modal portals its DOM out to <body>, so the scoped rules above
  cannot reach the modal via class scoping alone (the modal wrapper
  has no `[data-v-xxxxx]` attribute, so scoped selectors silently miss).
  We give the modal a stable wrap class (`qd-indicator-detail-modal-wrap`)
  and style it globally. Pairing the wrap class with the `[--dark]`
  modifier lets us deliver the dark theme reliably without depending
  on a `body.dark` ancestor selector (the modal isn't a descendant of
  the dark-themed page container).
-->
<style lang="less">
.qd-indicator-detail-modal-wrap--dark {
  .ant-modal-content {
    background: #1f1f1f;
    color: rgba(255, 255, 255, 0.85);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }

  .ant-modal-close {
    color: rgba(255, 255, 255, 0.65);

    &:hover {
      color: rgba(255, 255, 255, 0.92);
    }
  }

  .detail-body {
    background: #1a1a1a;
    scrollbar-color: #434343 #1a1a1a;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #1a1a1a;
    }

    &::-webkit-scrollbar-thumb {
      background: #434343;
      border-radius: 4px;

      &:hover {
        background: #595959;
      }
    }

    .section h3 {
      color: rgba(255, 255, 255, 0.88);
      border-color: #303030;
    }

    .description {
      color: rgba(255, 255, 255, 0.65);
    }

    .indicator-profile-grid .profile-item {
      background: rgba(255, 255, 255, 0.04);
      border-color: #303030;

      &__body {
        span { color: rgba(255, 255, 255, 0.5); }
        strong { color: rgba(255, 255, 255, 0.86); }
      }
    }

    .profile-item__icon {
      background: rgba(24, 144, 255, 0.16);
      color: #69c0ff;

      &--success {
        background: rgba(82, 196, 26, 0.16);
        color: #95de64;
      }

      &--warning,
      &--gold {
        background: rgba(250, 173, 20, 0.18);
        color: #ffd666;
      }
    }

    .visual-showcase {
      border-color: rgba(255, 255, 255, 0.08);
      background: linear-gradient(135deg, rgba(24, 144, 255, 0.12), rgba(82, 196, 26, 0.08));

      &__copy {
        strong { color: rgba(255, 255, 255, 0.88); }
        span { color: rgba(255, 255, 255, 0.56); }
      }

      &__bars {
        border-color: rgba(255, 255, 255, 0.1);
        background:
          linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
          rgba(0, 0, 0, 0.18);
        background-size: 100% 18px, 36px 100%, auto;
      }
    }

    .performance-grid .perf-item {
      background: #262626 !important;

      .perf-label {
        color: rgba(255, 255, 255, 0.55);
        .anticon { color: rgba(255, 255, 255, 0.35); }
      }

      .perf-value {
        color: rgba(255, 255, 255, 0.88);
        .perf-unit { color: rgba(255, 255, 255, 0.45); }
        &.positive { color: #95de64; }
        &.negative { color: #ff7875; }
      }

      &--score {
        background: linear-gradient(135deg, rgba(245, 175, 25, 0.18) 0%, rgba(241, 39, 17, 0.12) 100%) !important;
        .perf-value { color: #ffa940; }
      }
    }

    .applicable-row {
      &__label { color: rgba(255, 255, 255, 0.5); }
      &__tags {
        .tag-symbol { background: rgba(24, 144, 255, 0.16); color: #69c0ff; }
        .tag-tf { background: rgba(82, 196, 26, 0.16); color: #95de64; }
      }
      &__empty { color: rgba(255, 255, 255, 0.3); }
    }

    .equity-card {
      background: #262626 !important;
      border-color: #303030;

      &__title { color: rgba(255, 255, 255, 0.88); }
      &__meta {
        .tag-symbol { background: rgba(24, 144, 255, 0.16); color: #69c0ff; }
        .tag-tf { background: rgba(82, 196, 26, 0.16); color: #95de64; }
        .tag-market--spot { background: rgba(19, 194, 194, 0.18); color: #5cdbd3; }
        .tag-market--swap { background: rgba(114, 46, 209, 0.22); color: #b37feb; }
        .tag-leverage { background: rgba(250, 140, 22, 0.18); color: #ffc069; }
        .tag-duration { background: rgba(47, 84, 235, 0.2); color: #85a5ff; }
        .positive { color: #95de64; }
        .negative { color: #ff7875; }
      }
      &__meta-sep { color: rgba(255, 255, 255, 0.25); }
      &__hint { color: rgba(255, 255, 255, 0.4); }
    }

    .ant-alert-info {
      background: rgba(24, 144, 255, 0.12);
      border-color: rgba(24, 144, 255, 0.3);

      .ant-alert-icon {
        color: var(--primary-color-active, #177ddc);
      }

      .ant-alert-message {
        color: rgba(255, 255, 255, 0.88);
      }

      .ant-alert-description {
        color: rgba(255, 255, 255, 0.65);
      }
    }
  }

  .detail-footer {
    background: #1f1f1f !important;
    border-color: #303030;

    .price-info {
      .price-line__label { color: rgba(255, 255, 255, 0.45); }

      .price-badge { color: #ff7875; }
      .price-badge--paid { color: #ff7875; }
      .free-badge { color: #95de64; }

      .price-line--secondary .price-current-aside {
        color: rgba(255, 255, 255, 0.35);
      }
    }
  }

  .action-buttons {
    .ant-btn:not(.ant-btn-primary) {
      background: #262626;
      border-color: #434343;
      color: rgba(255, 255, 255, 0.72);

      &:hover,
      &:focus {
        background: #2f2f2f;
        border-color: #5a5a5a;
        color: rgba(255, 255, 255, 0.92);
      }
    }

    .update-tag {
      background: rgba(250, 140, 22, 0.15);
      border-color: rgba(250, 140, 22, 0.4);
      color: #fa8c16;
    }
  }

  .detail-header {
    .ant-statistic {
      .ant-statistic-content {
        color: rgba(255, 255, 255, 0.88);
      }

      .ant-statistic-title {
        color: rgba(255, 255, 255, 0.6);
      }
    }

    .rating-text {
      color: rgba(255, 255, 255, 0.72);
    }

    .publish-time {
      color: rgba(255, 255, 255, 0.72);
    }

    .author-name {
      color: rgba(255, 255, 255, 0.92);
    }
  }

  // Comments block in the modal: inherit dark colors.
  .comment-list {
    color: rgba(255, 255, 255, 0.85);

    .comment-item {
      border-color: #303030;

      .comment-content { color: rgba(255, 255, 255, 0.72); }
      .comment-meta,
      .comment-time { color: rgba(255, 255, 255, 0.45); }
    }

    .ant-input,
    .ant-input:hover,
    .ant-input:focus {
      background: #262626;
      border-color: #434343;
      color: rgba(255, 255, 255, 0.85);

      &::placeholder { color: rgba(255, 255, 255, 0.35); }
    }
  }
}
</style>
