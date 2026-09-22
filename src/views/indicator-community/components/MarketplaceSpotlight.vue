<template>
  <section class="marketplace-spotlight" :class="{ 'theme-dark': dark }">
    <button
      v-if="featured"
      type="button"
      class="marketplace-feature"
      :style="featureStyle"
      @click="$emit('select', featured)"
    >
      <span class="marketplace-feature__shade" aria-hidden="true"></span>
      <span class="marketplace-feature__content">
        <span class="marketplace-feature__eyebrow">
          <a-icon type="star" theme="filled" />
          {{ $t('community.sortHot') }}
        </span>
        <span class="marketplace-feature__badges">
          <span v-if="hasKpi(featured)" class="marketplace-score">
            <a-icon type="trophy" /> {{ scoreLabel(featured) }}
          </span>
          <span class="marketplace-badge marketplace-badge--type">{{ assetTypeLabel(featured) }}</span>
          <span v-if="featured.vip_free" class="marketplace-badge marketplace-badge--vip">{{ $t('community.vipFree') }}</span>
          <span class="marketplace-badge" :class="isPaid(featured) ? 'marketplace-badge--paid' : 'marketplace-badge--free'">
            {{ priceLabel(featured) }}
          </span>
        </span>
        <strong class="marketplace-feature__title">{{ featured.name }}</strong>
        <span class="marketplace-feature__description">
          {{ featured.description || $t('community.noDescription') }}
        </span>
        <span v-if="capabilityTags(featured).length" class="marketplace-feature__tags">
          <span v-for="tag in capabilityTags(featured)" :key="tag">{{ tag }}</span>
        </span>
        <span v-if="hasKpi(featured)" class="marketplace-feature__kpis">
          <span v-for="metric in kpiMetrics(featured)" :key="metric.key" class="marketplace-feature__kpi">
            <span>{{ metric.label }}</span>
            <strong :class="metric.tone">{{ metric.value }}</strong>
          </span>
        </span>
        <span class="marketplace-feature__footer">
          <span class="marketplace-author">
            <a-avatar :src="authorAvatar(featured)" :size="24" />
            {{ authorName(featured) }}
          </span>
          <span class="marketplace-stat"><a-icon type="star" theme="filled" /> {{ ratingLabel(featured) }}</span>
          <span class="marketplace-stat"><a-icon type="eye" /> {{ featured.view_count || 0 }}</span>
          <span class="marketplace-feature__action">
            {{ $t('community.admin.viewDetail') }}
            <a-icon type="arrow-right" />
          </span>
        </span>
      </span>
    </button>

    <aside
      v-if="hotItems.length"
      class="marketplace-hot"
      :class="{ 'marketplace-hot--single': hotItems.length === 1 }"
    >
      <header class="marketplace-hot__header">
        <span><a-icon type="fire" theme="filled" /> {{ $t('community.sortHot') }}</span>
      </header>
      <button
        v-for="item in hotItems"
        :key="item.id"
        type="button"
        class="marketplace-hot__item"
        :class="{ 'marketplace-hot__item--visual': !hasKpi(item) }"
        :style="hotItems.length === 1 ? hotItemStyle(item) : null"
        @click="$emit('select', item)"
      >
        <img :src="item.preview_image || fallbackCover" :alt="item.name" />
        <span class="marketplace-hot__body">
          <span class="marketplace-hot__topline">
            <strong>{{ item.name }}</strong>
            <span v-if="hasKpi(item)" class="marketplace-score">
              <a-icon type="trophy" /> {{ scoreLabel(item) }}
            </span>
            <span class="marketplace-badge" :class="isPaid(item) ? 'marketplace-badge--paid' : 'marketplace-badge--free'">
              {{ priceLabel(item) }}
            </span>
          </span>
          <span class="marketplace-hot__description">{{ item.description || $t('community.noDescription') }}</span>
          <span v-if="hasKpi(item)" class="marketplace-hot__kpis">
            <span v-for="metric in kpiMetrics(item)" :key="metric.key" class="marketplace-hot__kpi">
              <span>{{ metric.shortLabel }}</span>
              <strong :class="metric.tone">{{ metric.value }}</strong>
            </span>
          </span>
          <span class="marketplace-hot__meta">
            <span class="marketplace-author">
              <a-avatar :src="authorAvatar(item)" :size="20" />
              {{ authorName(item) }}
            </span>
            <span class="marketplace-stat"><a-icon type="star" theme="filled" /> {{ ratingLabel(item) }}</span>
            <span class="marketplace-stat"><a-icon type="eye" /> {{ item.view_count || 0 }}</span>
          </span>
        </span>
      </button>
    </aside>
  </section>
</template>

<script>
import fallbackCover from '@/assets/marketplace/market-trend-hero.webp'

export default {
  name: 'MarketplaceSpotlight',
  props: {
    featured: {
      type: Object,
      default: null
    },
    hotItems: {
      type: Array,
      default: () => []
    },
    dark: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      fallbackCover
    }
  },
  computed: {
    featureStyle () {
      const image = this.featured && this.featured.preview_image
        ? this.featured.preview_image
        : fallbackCover
      return { backgroundImage: `url(${image})` }
    }
  },
  methods: {
    isPaid (item) {
      return item && item.pricing_type !== 'free' && Number(item.price || 0) > 0
    },
    priceLabel (item) {
      return this.isPaid(item)
        ? `${item.price} ${this.$t('community.credits')}`
        : this.$t('community.free')
    },
    assetTypeLabel (item) {
      const assetType = String(item && item.asset_type || '').toLowerCase()
      return assetType === 'script_template' || assetType === 'strategy'
        ? this.$t('community.tabScriptTemplates')
        : this.$t('community.chartIndicator')
    },
    ratingLabel (item) {
      const rating = Number(item && item.avg_rating || 0)
      return rating > 0 ? rating.toFixed(1) : '-'
    },
    authorName (item) {
      const author = item && item.author || {}
      return author.nickname || author.username || '-'
    },
    authorAvatar (item) {
      return item && item.author && item.author.avatar
    },
    hotItemStyle (item) {
      const image = item && item.preview_image ? item.preview_image : fallbackCover
      return { backgroundImage: `url(${image})` }
    },
    capabilityTags (item) {
      const symbols = Array.isArray(item && item.applicable_symbols) ? item.applicable_symbols : []
      const timeframes = Array.isArray(item && item.applicable_timeframes) ? item.applicable_timeframes : []
      return [...symbols, ...timeframes].filter(Boolean).slice(0, 4)
    },
    hasKpi (item) {
      if (!item) return false
      const hasValue = key => {
        const value = Number(item[key])
        return Number.isFinite(value) && value !== 0
      }
      return (Number(item.sample_size) || 0) > 0 ||
        hasValue('total_return') ||
        hasValue('annual_return') ||
        hasValue('sharpe') ||
        hasValue('max_drawdown')
    },
    scoreLabel (item) {
      const score = Number(item && item.score)
      return Number.isFinite(score) ? Math.round(score) : '-'
    },
    formatPercent (value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '-'
      return `${number > 0 ? '+' : ''}${number.toFixed(2)}%`
    },
    formatNumber (value) {
      const number = Number(value)
      return Number.isFinite(number) ? number.toFixed(2) : '-'
    },
    metricTone (value, positiveThreshold = 0) {
      const number = Number(value)
      if (!Number.isFinite(number)) return ''
      if (number > positiveThreshold) return 'kpi-positive'
      if (number < 0) return 'kpi-negative'
      return ''
    },
    kpiMetrics (item) {
      return [
        {
          key: 'total-return',
          label: this.$t('community.totalReturn'),
          shortLabel: this.$t('community.totalReturn'),
          value: this.formatPercent(item.total_return),
          tone: this.metricTone(item.total_return)
        },
        {
          key: 'annual-return',
          label: this.$t('community.annualReturn'),
          shortLabel: this.$t('community.annualReturn'),
          value: this.formatPercent(item.annual_return),
          tone: this.metricTone(item.annual_return)
        },
        {
          key: 'sharpe',
          label: this.$t('community.sharpe'),
          shortLabel: this.$t('community.sharpe'),
          value: this.formatNumber(item.sharpe),
          tone: this.metricTone(item.sharpe, 1)
        },
        {
          key: 'max-drawdown',
          label: this.$t('community.maxDrawdown'),
          shortLabel: this.$t('community.maxDrawdown'),
          value: this.formatPercent(item.max_drawdown),
          tone: 'kpi-negative'
        }
      ]
    }
  }
}
</script>

<style lang="less" scoped>
.marketplace-spotlight {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr);
  gap: 16px;
  margin-bottom: 26px;
}

.marketplace-feature,
.marketplace-hot {
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
}

.marketplace-feature {
  position: relative;
  display: block;
  min-height: 260px;
  padding: 0;
  overflow: hidden;
  color: rgba(0, 0, 0, 0.88);
  text-align: left;
  background-color: #fff;
  background-position: right center;
  background-size: cover;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--primary-color, #52c41a);
    outline-offset: 2px;
  }

  &__shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.99) 0%, rgba(255, 255, 255, 0.96) 46%, rgba(255, 255, 255, 0.68) 72%, rgba(255, 255, 255, 0.22) 100%);
  }

  &__content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    min-height: 260px;
    padding: 24px;
    z-index: 1;
  }

  &__eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 14px;
    color: #d48806;
    font-size: 13px;
    font-weight: 700;
  }

  &__badges {
    position: absolute;
    top: 18px;
    right: 18px;
    display: flex;
    gap: 6px;
  }

  &__title {
    max-width: 65%;
    margin-bottom: 8px;
    overflow: hidden;
    font-size: 28px;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__description {
    display: -webkit-box;
    width: 65%;
    max-width: 620px;
    margin-bottom: 14px;
    overflow: hidden;
    color: rgba(0, 0, 0, 0.62);
    font-size: 14px;
    line-height: 1.65;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    max-width: 65%;

    span {
      padding: 4px 9px;
      border: 1px solid rgba(15, 23, 42, 0.1);
      border-radius: 4px;
      color: rgba(0, 0, 0, 0.62);
      background: rgba(255, 255, 255, 0.78);
      font-size: 12px;
    }
  }

  &__kpis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: 65%;
    max-width: 620px;
    margin-top: 14px;
    overflow: hidden;
    border: 1px solid rgba(15, 23, 42, 0.1);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.86);
    backdrop-filter: blur(6px);
  }

  &__kpi {
    display: flex;
    min-width: 0;
    padding: 8px 10px;
    flex-direction: column;
    gap: 2px;

    & + & {
      border-left: 1px solid rgba(15, 23, 42, 0.08);
    }

    > span {
      overflow: hidden;
      color: rgba(0, 0, 0, 0.46);
      font-size: 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    > strong {
      color: rgba(0, 0, 0, 0.82);
      font-size: 13px;
    }
  }

  &__footer {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    margin-top: auto;
    color: rgba(0, 0, 0, 0.6);
    font-size: 12px;
  }

  &__action {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-left: auto;
    padding: 8px 14px;
    border-radius: 5px;
    color: #fff;
    background: var(--primary-color, #52c41a);
    font-size: 13px;
    font-weight: 700;
  }
}

.marketplace-hot {
  padding: 14px;

  &--single {
    display: flex;
    flex-direction: column;

    .marketplace-hot__item {
      position: relative;
      display: flex;
      align-items: flex-end;
      flex: 1;
      min-height: 190px;
      margin-top: 8px;
      padding: 18px;
      overflow: hidden;
      border: 0;
      border-radius: 8px;
      background-color: #f5f5f5;
      background-position: right center;
      background-size: cover;

      &::before {
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.92) 58%, rgba(255, 255, 255, 0.36) 100%);
        content: '';
      }
    }

    .marketplace-hot__item--visual {
      align-items: center;

      &::before {
        background: linear-gradient(90deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.9) 56%, rgba(255, 255, 255, 0.24) 100%);
      }

      .marketplace-hot__body {
        width: 72%;
        margin-right: auto;
      }

      .marketplace-hot__topline strong {
        font-size: 18px;
      }

      .marketplace-hot__description {
        margin-top: 9px;
        font-size: 13px;
        -webkit-line-clamp: 3;
      }

      .marketplace-hot__meta {
        margin-top: 16px;
      }
    }

    .marketplace-hot__item img {
      display: none;
    }

    .marketplace-hot__body {
      position: relative;
      width: 100%;
      padding: 0;
      z-index: 1;
    }

    .marketplace-hot__topline strong {
      color: rgba(0, 0, 0, 0.86);
      font-size: 16px;
    }

    .marketplace-hot__description {
      display: -webkit-box;
      margin-top: 6px;
      color: rgba(0, 0, 0, 0.56);
      line-height: 1.5;
      text-overflow: initial;
      white-space: normal;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .marketplace-hot__kpis {
      gap: 8px;
      margin: 14px 0 12px;
      padding: 9px 10px;
      border: 1px solid rgba(15, 23, 42, 0.1);
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.84);
      backdrop-filter: blur(5px);
    }

    .marketplace-hot__kpi > span {
      color: rgba(0, 0, 0, 0.44);
      font-size: 10px;
    }

    .marketplace-hot__kpi > strong {
      color: rgba(0, 0, 0, 0.82);
      font-size: 12px;
    }

    .marketplace-hot__meta {
      margin-top: 0;
      color: rgba(0, 0, 0, 0.56);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    color: rgba(0, 0, 0, 0.85);
    font-size: 15px;
    font-weight: 700;

    .anticon {
      margin-right: 6px;
      color: #fa541c;
    }
  }

  &__item {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 12px;
    width: 100%;
    padding: 10px 0;
    border: 0;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    color: inherit;
    text-align: left;
    background: transparent;
    cursor: pointer;

    &:hover .marketplace-hot__topline > strong {
      color: var(--primary-color, #52c41a);
    }

    img {
      width: 112px;
      height: 72px;
      border-radius: 6px;
      object-fit: cover;
    }
  }

  &__body {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  &__topline {
    display: flex;
    align-items: flex-start;
    gap: 8px;

    strong {
      min-width: 0;
      flex: 1;
      overflow: hidden;
      color: rgba(0, 0, 0, 0.85);
      font-size: 14px;
      text-overflow: ellipsis;
      white-space: nowrap;
      transition: color 0.2s ease;
    }
  }

  &__description {
    margin-top: 3px;
    overflow: hidden;
    color: rgba(0, 0, 0, 0.48);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__kpis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    margin-top: 7px;
  }

  &__kpi {
    display: flex;
    min-width: 0;
    flex-direction: column;

    > span {
      overflow: hidden;
      color: rgba(0, 0, 0, 0.4);
      font-size: 9px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    > strong {
      color: rgba(0, 0, 0, 0.78);
      font-size: 11px;
      line-height: 1.35;
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: auto;
    color: rgba(0, 0, 0, 0.48);
    font-size: 11px;
  }
}

.marketplace-badge {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 4px;
  color: #fff;
  background: #595959;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;

  &--type { background: #722ed1; }
  &--vip { color: #1f1f1f; background: #fadb14; }
  &--paid { background: #fa8c16; }
  &--free { background: #52c41a; }
}

.marketplace-score {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 999px;
  color: #fff;
  background: linear-gradient(135deg, #40a9ff, #13c2c2);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.kpi-positive { color: #73d13d !important; }
.kpi-negative { color: #ff7875 !important; }

.marketplace-author,
.marketplace-stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.marketplace-author {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.marketplace-stat .anticon-star {
  color: #faad14;
}

.marketplace-spotlight.theme-dark {
  .marketplace-feature,
  .marketplace-hot {
    border-color: rgba(255, 255, 255, 0.1);
    background-color: #1f1f1f;
    box-shadow: none;
  }

  .marketplace-feature {
    color: rgba(255, 255, 255, 0.92);

    &__shade {
      background: linear-gradient(90deg, rgba(18, 18, 18, 0.98) 0%, rgba(18, 18, 18, 0.9) 46%, rgba(18, 18, 18, 0.36) 100%);
    }

    &__eyebrow {
      color: #ffd666;
    }

    &__description,
    &__footer {
      color: rgba(255, 255, 255, 0.68);
    }

    &__tags span {
      border-color: rgba(255, 255, 255, 0.14);
      color: rgba(255, 255, 255, 0.72);
      background: rgba(255, 255, 255, 0.08);
    }

    &__kpis {
      border-color: rgba(255, 255, 255, 0.12);
      background: rgba(18, 18, 18, 0.64);
    }

    &__kpi {
      & + & {
        border-color: rgba(255, 255, 255, 0.1);
      }

      > span {
        color: rgba(255, 255, 255, 0.5);
      }

      > strong {
        color: rgba(255, 255, 255, 0.9);
      }
    }
  }

  .marketplace-hot--single {
    .marketplace-hot__item {
      background-color: #181818;

      &::before {
        background: linear-gradient(180deg, rgba(18, 18, 18, 0.18) 0%, rgba(18, 18, 18, 0.9) 78%, rgba(18, 18, 18, 0.98) 100%);
      }
    }

    .marketplace-hot__item--visual::before {
      background: linear-gradient(90deg, rgba(18, 18, 18, 0.98) 0%, rgba(18, 18, 18, 0.9) 56%, rgba(18, 18, 18, 0.2) 100%);
    }

    .marketplace-hot__topline strong {
      color: rgba(255, 255, 255, 0.9);
    }

    .marketplace-hot__description,
    .marketplace-hot__meta {
      color: rgba(255, 255, 255, 0.56);
    }

    .marketplace-hot__kpis {
      border-color: rgba(255, 255, 255, 0.1);
      background: rgba(18, 18, 18, 0.64);
    }

    .marketplace-hot__kpi > span {
      color: rgba(255, 255, 255, 0.46);
    }

    .marketplace-hot__kpi > strong {
      color: rgba(255, 255, 255, 0.88);
    }
  }

  .marketplace-hot__header,
  .marketplace-hot__topline strong {
    color: rgba(255, 255, 255, 0.9);
  }

  .marketplace-hot__item {
    border-color: rgba(255, 255, 255, 0.08);
  }

  .marketplace-hot__description,
  .marketplace-hot__meta {
    color: rgba(255, 255, 255, 0.48);
  }

  .marketplace-hot__kpi > span {
    color: rgba(255, 255, 255, 0.42);
  }

  .marketplace-hot__kpi > strong {
    color: rgba(255, 255, 255, 0.84);
  }
}

@media (max-width: 1080px) {
  .marketplace-spotlight {
    grid-template-columns: minmax(0, 1fr);
  }

  .marketplace-hot {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 16px;

    &__header {
      grid-column: 1 / -1;
    }
  }
}

@media (max-width: 640px) {
  .marketplace-feature {
    min-height: 280px;

    &__content {
      width: 100%;
      min-height: 280px;
      padding: 20px;
    }

    &__title {
      max-width: 100%;
      font-size: 23px;
    }

    &__description,
    &__tags,
    &__kpis {
      width: 100%;
      max-width: 100%;
    }

    &__badges {
      position: static;
      order: -1;
      margin-bottom: 10px;
    }

    &__footer {
      gap: 10px;
    }

    &__action {
      padding: 7px 9px;
    }
  }

  .marketplace-hot {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
