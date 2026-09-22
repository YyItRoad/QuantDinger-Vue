<template>
  <div
    id="userLayout"
    :class="['user-layout-wrapper', isMobile && 'mobile']"
    :style="{ '--login-accent': themeAccent }"
  >
    <div class="auth-shell">
      <section class="brand-panel">
        <div class="brand-atmosphere" aria-hidden="true">
          <span class="tech-grid"></span>
          <span class="tech-orbit orbit-primary"></span>
          <span class="tech-orbit orbit-secondary"></span>
          <span class="tech-scan"></span>
          <span class="tech-pulse"></span>
        </div>

        <header class="brand-header">
          <a href="/" class="brand-link" :aria-label="brandConfig.app_name">
            <img :src="loginLogo" class="brand-logo" :alt="brandConfig.app_name">
          </a>
          <span class="brand-edition">{{ $t('user.login.hero.edition') }}</span>
        </header>

        <div class="brand-story">
          <div class="story-kicker">
            <a-icon type="line-chart" />
            <span>{{ $t('user.login.hero.kicker') }}</span>
          </div>
          <h1>{{ $t('user.login.hero.title') }}</h1>
          <p class="story-summary">{{ $t('user.login.hero.subtitle') }}</p>
        </div>

        <footer class="brand-footer">
          <a-icon type="check-circle" class="status-icon" />
          <span>{{ $t('user.login.hero.status') }}</span>
          <a-divider type="vertical" class="footer-divider" />
          <span>{{ $t('user.login.hero.scope') }}</span>
        </footer>
      </section>

      <section class="access-panel">
        <div class="user-layout-lang">
          <select-lang class="select-lang-trigger" />
        </div>

        <div class="user-layout-content">
          <div class="access-content">
            <div class="access-heading">
              <span class="access-kicker">{{ $t('user.login.hero.secureAccess') }}</span>
              <h2>{{ $t('user.login.hero.welcome') }}</h2>
              <p>{{ $t('user.login.hero.welcomeDesc') }}</p>
            </div>

            <main class="main-content">
              <router-view />
            </main>
          </div>

          <footer class="legal-footer">
            <span>{{ brandConfig.copyright }}</span>
          </footer>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { deviceMixin } from '@/store/device-mixin'
import SelectLang from '@/components/SelectLang'
import defaultLogo from '@/assets/logo_w.png'

export default {
  name: 'UserLayout',
  components: {
    SelectLang
  },
  mixins: [deviceMixin],
  computed: {
    ...mapState({
      brandConfig: state => state.brand.config,
      appColor: state => state.app.color
    }),
    themeAccent () {
      return this.appColor || '#faad14'
    },
    loginLogo () {
      const remote = this.brandConfig && this.brandConfig.logos && this.brandConfig.logos.dark
      return remote || defaultLogo
    }
  },
  mounted () {
    document.body.classList.add('userLayout')
  },
  beforeDestroy () {
    document.body.classList.remove('userLayout')
  }
}
</script>

<style lang="less" scoped>
#userLayout.user-layout-wrapper {
  min-height: 100vh;
  color: #151515;
  background: #f4f4f2;

  .auth-shell,
  .brand-panel,
  .access-panel,
  .user-layout-content {
    box-sizing: border-box;
  }

  .auth-shell {
    display: grid;
    grid-template-columns: minmax(520px, 58%) minmax(480px, 42%);
    min-height: 100vh;
  }

  .brand-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: clamp(28px, 3vw, 48px) clamp(48px, 6.5vw, 116px) 30px;
    overflow: hidden;
    color: #fff;
    background: #101010;
    border-right: 1px solid #292929;
  }

  .brand-atmosphere {
    position: absolute;
    z-index: 0;
    inset: 0;
    overflow: hidden;
    pointer-events: none;

    &::after {
      position: absolute;
      top: 14%;
      right: 7%;
      width: 34%;
      height: 1px;
      content: '';
      opacity: 0.2;
      background: linear-gradient(90deg, transparent, var(--login-accent, #faad14), transparent);
      transform: rotate(-18deg);
      transform-origin: right center;
    }
  }

  .tech-grid {
    position: absolute;
    inset: -12%;
    opacity: 0.55;
    background-image:
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: 54px 54px;
    mask-image: linear-gradient(to bottom, transparent 2%, #000 30%, #000 78%, transparent 100%);
    transform: perspective(720px) rotateX(58deg) translateY(18%);
    transform-origin: center 62%;
    animation: login-grid-drift 18s linear infinite;
  }

  .tech-orbit {
    position: absolute;
    display: block;
    border: 1px solid color-mix(in srgb, var(--login-accent, #faad14) 18%, transparent);
    border-radius: 50%;
    box-shadow:
      inset 0 0 40px color-mix(in srgb, var(--login-accent, #faad14) 4%, transparent),
      0 0 30px rgba(255, 255, 255, 0.015);

    &::before,
    &::after {
      position: absolute;
      display: block;
      content: '';
      border-radius: 50%;
    }

    &::before {
      top: 10%;
      left: 18%;
      width: 5px;
      height: 5px;
      background: var(--login-accent, #faad14);
      box-shadow: 0 0 14px color-mix(in srgb, var(--login-accent, #faad14) 62%, transparent);
    }

    &::after {
      inset: 14%;
      border: 1px dashed rgba(255, 255, 255, 0.07);
    }
  }

  .orbit-primary {
    top: 18%;
    right: -238px;
    width: 510px;
    height: 510px;
    animation: login-orbit-float 16s ease-in-out infinite;
  }

  .orbit-secondary {
    bottom: -278px;
    left: -248px;
    width: 460px;
    height: 460px;
    opacity: 0.58;
    animation: login-orbit-float 21s ease-in-out -8s infinite reverse;
  }

  .tech-scan {
    position: absolute;
    top: -8%;
    left: 8%;
    width: 72%;
    height: 1px;
    opacity: 0;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--login-accent, #faad14) 64%, #fff), transparent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--login-accent, #faad14) 22%, transparent);
    animation: login-scan 10s ease-in-out infinite;
  }

  .tech-pulse {
    position: absolute;
    top: 31%;
    right: 13%;
    width: 6px;
    height: 6px;
    background: var(--login-accent, #faad14);
    border-radius: 50%;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--login-accent, #faad14) 34%, transparent);
    animation: login-pulse 3.8s ease-out infinite;
  }

  .brand-header,
  .brand-story,
  .brand-footer {
    position: relative;
    z-index: 1;
  }

  .brand-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .brand-link {
    display: inline-flex;
    align-items: center;
    min-width: 0;
  }

  .brand-logo {
    display: block;
    width: clamp(210px, 17vw, 292px);
    max-width: 100%;
    height: auto;
  }

  .brand-edition {
    flex: 0 0 auto;
    padding: 7px 10px;
    color: #a6a6a6;
    font-size: 11px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid #383838;
    border-radius: 5px;
  }

  .brand-story {
    width: ~"min(620px, 100%)";
    margin: auto 0;
    padding: clamp(38px, 6vh, 54px) 0;
  }

  .story-kicker {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 28px;
    color: var(--login-accent, #faad14);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;

    .anticon {
      font-size: 16px;
    }
  }

  h1 {
    max-width: 620px;
    margin: 0;
    color: #fff;
    font-size: clamp(40px, 3.5vw, 60px);
    font-weight: 750;
    line-height: 1.12;
    letter-spacing: -0.045em;
    overflow-wrap: anywhere;
    white-space: pre-line;
  }

  .story-summary {
    max-width: 540px;
    margin: 22px 0 0;
    color: #a8a8a8;
    font-size: clamp(15px, 1.15vw, 18px);
    line-height: 1.8;
  }

  .brand-footer {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #777;
    font-size: 12px;
  }

  .status-icon {
    color: var(--login-accent, #faad14);
    font-size: 13px;
  }

  .footer-divider {
    height: 12px;
    margin: 0 2px;
    border-left-color: #3a3a3a;
  }

  .access-panel {
    position: relative;
    min-width: 0;
    min-height: 100vh;
    background: #f4f4f2;
  }

  .user-layout-lang {
    position: absolute;
    top: 28px;
    right: 30px;
    z-index: 2;

    .select-lang-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 42px;
      min-height: 42px;
      padding: 0 12px;
      color: #202020;
      font-size: 16px;
      cursor: pointer;
      background: #fff;
      border: 1px solid #dededb;
      border-radius: 7px;
    }
  }

  .user-layout-content {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding: clamp(64px, 8vh, 104px) clamp(44px, 6vw, 108px) 20px;
  }

  .access-content {
    width: ~"min(480px, 100%)";
    margin: auto;
  }

  .access-heading {
    margin-bottom: 20px;
  }

  .access-kicker {
    display: block;
    margin-bottom: 10px;
    color: color-mix(in srgb, var(--login-accent, #faad14) 72%, #171717);
    font-size: 11px;
    font-weight: 750;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .access-heading h2 {
    margin: 0;
    color: #141414;
    font-size: 30px;
    font-weight: 750;
    line-height: 1.25;
    letter-spacing: -0.025em;
  }

  .access-heading p {
    margin: 9px 0 0;
    color: #777;
    font-size: 14px;
    line-height: 1.65;
  }

  .main-content {
    width: 100%;
  }

  .legal-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 8px 16px;
    width: ~"min(480px, 100%)";
    margin: 18px auto 0;
    color: #929292;
    font-size: 12px;
    line-height: 1.6;

    a {
      color: #585858;
      cursor: pointer;

      &:hover {
        color: #111;
      }
    }
  }

}

@keyframes login-grid-drift {
  0% {
    background-position: 0 0, 0 0;
  }
  100% {
    background-position: 0 54px, 54px 0;
  }
}

@keyframes login-orbit-float {
  0%,
  100% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(12deg) scale(1.035);
  }
}

@keyframes login-scan {
  0%,
  12% {
    opacity: 0;
    transform: translateY(0);
  }
  24% {
    opacity: 0.2;
  }
  70% {
    opacity: 0.08;
  }
  88%,
  100% {
    opacity: 0;
    transform: translateY(82vh);
  }
}

@keyframes login-pulse {
  0% {
    opacity: 0.72;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--login-accent, #faad14) 32%, transparent);
  }
  72%,
  100% {
    opacity: 0;
    box-shadow: 0 0 0 24px transparent;
  }
}

@media (max-width: 1180px) {
  #userLayout.user-layout-wrapper {
    .auth-shell {
      grid-template-columns: minmax(430px, 48%) minmax(470px, 52%);
    }

    .brand-panel {
      padding-right: 48px;
      padding-left: 48px;
    }
  }
}

@media (max-width: 900px) {
  #userLayout.user-layout-wrapper {
    .auth-shell {
      display: block;
    }

    .brand-panel {
      min-height: auto;
      padding: 26px 28px 32px;
      border-right: 0;
      border-bottom: 1px solid #292929;
    }

    .brand-atmosphere {
      opacity: 0.72;
    }

    .orbit-primary {
      top: -170px;
      right: -210px;
    }

    .orbit-secondary,
    .tech-scan {
      display: none;
    }

    .brand-logo {
      width: 210px;
    }

    .brand-story {
      padding: 56px 0 24px;
    }

    h1 {
      font-size: clamp(36px, 7vw, 52px);
    }

    .brand-footer {
      display: none;
    }

    .access-panel,
    .user-layout-content {
      min-height: auto;
    }

    .user-layout-lang {
      top: 20px;
      right: 22px;
    }

    .user-layout-content {
      padding: 72px 24px 26px;
    }
  }
}

@media (max-width: 576px) {
  #userLayout.user-layout-wrapper {
    .brand-panel {
      padding: 22px 20px 28px;
    }

    .brand-header {
      padding-right: 56px;
    }

    .brand-logo {
      width: 174px;
    }

    .brand-edition {
      display: none;
    }

    .brand-story {
      padding: 42px 0 12px;
    }

    .story-kicker {
      margin-bottom: 18px;
      font-size: 11px;
    }

    h1 {
      font-size: 34px;
    }

    .story-summary {
      margin-top: 16px;
      font-size: 14px;
      line-height: 1.65;
    }

    .user-layout-lang {
      top: 16px;
      right: 16px;
    }

    .user-layout-content {
      padding: 58px 16px 20px;
    }

    .access-heading h2 {
      font-size: 26px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  #userLayout.user-layout-wrapper {
    .tech-grid,
    .tech-orbit,
    .tech-scan,
    .tech-pulse {
      animation: none;
    }

    .tech-scan,
    .tech-pulse {
      display: none;
    }
  }
}
</style>
