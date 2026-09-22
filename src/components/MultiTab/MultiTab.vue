<script lang="jsx">
import events from './events'
import { i18nRender } from '@/locales'
import { tabKey } from './tabIdentity.mjs'

export default {
  name: 'MultiTab',
  data () {
    return {
      fullPathList: [],
      pages: [],
      activeKey: '',
      newTabIndex: 0
    }
  },
  created () {
    // bind event
    events.$on('open', val => {
      if (!val) {
        throw new Error(`multi-tab: open tab ${val} err`)
      }
      const target = typeof val === 'object' ? (val.fullPath || val.path) : val
      if (target && target !== this.$route.fullPath) {
        this.$router.push(target).catch(() => {})
      } else {
        this.activeKey = tabKey(val)
      }
    }).$on('close', val => {
      if (!val) {
        this.closeThat(this.activeKey)
        return
      }
      this.closeThat(val)
    }).$on('rename', ({ key, name }) => {
      try {
        const normalizedKey = this.resolveTabKey(key)
        const item = this.pages.find(item => tabKey(item) === normalizedKey)
        item.meta.customTitle = name
        this.$forceUpdate()
      } catch (e) {
      }
    })
    const initialKey = tabKey(this.$route)
    this.pages.push(this.$route)
    this.fullPathList.push(initialKey)
    this.selectedLastPath()
  },
  methods: {
    resolveTabKey (value) {
      if (typeof value === 'string' && this.fullPathList.includes(value)) {
        return value
      }
      return tabKey(value)
    },
    onEdit (targetKey, action) {
      this[action](targetKey)
    },
    remove (targetKey) {
      const normalizedKey = this.resolveTabKey(targetKey)
      const targetPage = this.pages.find(page => tabKey(page) === normalizedKey)
      this.pages = this.pages.filter(page => tabKey(page) !== normalizedKey)
      this.fullPathList = this.fullPathList.filter(path => path !== normalizedKey)
      // If the active tab was closed, switch to the latest remaining tab.
      if (!this.fullPathList.includes(this.activeKey)) {
        this.selectedLastPath()
      }
      if (targetPage) events.$emit('cache-evict', targetPage)
    },
    selectedLastPath () {
      this.activeKey = this.fullPathList[this.fullPathList.length - 1]
    },

    tabText (key) {
      const keys = {
        closeThat: 'multiTab.closeCurrent',
        closeRight: 'multiTab.closeRight',
        closeLeft: 'multiTab.closeLeft',
        closeAll: 'multiTab.clearOthers',
        clear: 'multiTab.clear',
        lastTab: 'multiTab.lastTab',
        noLeft: 'multiTab.noLeft',
        noRight: 'multiTab.noRight'
      }
      return i18nRender(keys[key])
    },
    closeCurrentActive () {
      this.closeThat(this.activeKey)
    },
    closeRightActive () {
      this.closeRight(this.activeKey)
    },
    closeLeftActive () {
      this.closeLeft(this.activeKey)
    },
    closeOtherActive () {
      this.closeAll(this.activeKey)
    },
    closeThat (e) {
      const targetKey = this.resolveTabKey(e)
      // Keep at least one tab available.
      if (this.fullPathList.length > 1) {
        this.remove(targetKey)
      } else {
        this.$message.info(this.tabText('lastTab'))
      }
    },
    closeLeft (e) {
      const currentIndex = this.fullPathList.indexOf(this.resolveTabKey(e))
      if (currentIndex > 0) {
        this.fullPathList.forEach((item, index) => {
          if (index < currentIndex) {
            this.remove(item)
          }
        })
      } else {
        this.$message.info(this.tabText('noLeft'))
      }
    },
    closeRight (e) {
      const currentIndex = this.fullPathList.indexOf(this.resolveTabKey(e))
      if (currentIndex < (this.fullPathList.length - 1)) {
        this.fullPathList.forEach((item, index) => {
          if (index > currentIndex) {
            this.remove(item)
          }
        })
      } else {
        this.$message.info(this.tabText('noRight'))
      }
    },
    closeAll (e) {
      const currentIndex = this.fullPathList.indexOf(this.resolveTabKey(e))
      this.fullPathList.forEach((item, index) => {
        if (index !== currentIndex) {
          this.remove(item)
        }
      })
    },
    closeMenuClick (key, route) {
      this[key](route)
    },
    renderTabPaneMenu (e) {
      return (
        <a-menu {...{ on: { click: ({ key, item, domEvent }) => { this.closeMenuClick(key, e) } } }}>
          <a-menu-item key="closeThat">{this.tabText('closeThat')}</a-menu-item>
          <a-menu-item key="closeRight">{this.tabText('closeRight')}</a-menu-item>
          <a-menu-item key="closeLeft">{this.tabText('closeLeft')}</a-menu-item>
          <a-menu-item key="closeAll">{this.tabText('closeAll')}</a-menu-item>
        </a-menu>
      )
    },
    renderTabPane (title, keyPath) {
      const menu = this.renderTabPaneMenu(keyPath)

      return (
        <a-dropdown overlay={menu} trigger={['contextmenu']}>
          <span style={{ userSelect: 'none' }}>{ title }</span>
        </a-dropdown>
      )
    },
    renderClearMenu () {
      return (
        <a-menu class="ant-pro-multi-tab-action-menu" {...{ on: { click: ({ key }) => { this[key]() } } }}>
          <a-menu-item key="closeOtherActive">{this.tabText('closeAll')}</a-menu-item>
          <a-menu-item key="closeRightActive">{this.tabText('closeRight')}</a-menu-item>
          <a-menu-item key="closeLeftActive">{this.tabText('closeLeft')}</a-menu-item>
          <a-menu-divider />
          <a-menu-item key="closeCurrentActive">{this.tabText('closeThat')}</a-menu-item>
        </a-menu>
      )
    }
  },
  watch: {
    $route: function (newVal) {
      const newKey = tabKey(newVal)
      this.activeKey = newKey
      const existingIndex = this.fullPathList.indexOf(newKey)
      if (existingIndex < 0) {
        this.fullPathList.push(newKey)
        this.pages.push(newVal)
      } else {
        // Query changes belong to the same workspace tab. Keep the latest
        // fullPath so returning to this tab restores its current sub-state.
        this.$set(this.pages, existingIndex, newVal)
      }
    },
    activeKey: function (newPathKey) {
      if (newPathKey && newPathKey !== tabKey(this.$route)) {
        const page = this.pages.find(item => tabKey(item) === newPathKey)
        const target = page ? (page.fullPath || page.path) : newPathKey
        this.$router.push(target).catch(() => {})
      }
    }
  },
  render () {
    const { onEdit, $data: { pages } } = this
    const panes = pages.map(page => {
      const title = page.meta.customTitle || i18nRender(page.meta.title) || page.name || page.path
      const pageKey = tabKey(page)
      return (
        <a-tab-pane
          style={{ height: 0 }}
          tab={this.renderTabPane(title, pageKey)}
          key={pageKey} closable={pages.length > 1}
        >
        </a-tab-pane>)
    })

    return (
      <div class="ant-pro-multi-tab">
        <div class="ant-pro-multi-tab-wrapper">
          <a-tabs
            hideAdd
            type={'editable-card'}
            v-model={this.activeKey}
            tabBarStyle={{ margin: 0, paddingLeft: '16px', paddingTop: '1px' }}
            {...{ on: { edit: onEdit } }}>
            {panes}
          </a-tabs>
          <a-dropdown overlay={this.renderClearMenu()} trigger={['click']} placement="bottomRight">
            <button type="button" class="ant-pro-multi-tab-clear">
              <a-icon type="delete" />
              <span>{this.tabText('clear')}</span>
              <a-icon type="down" class="ant-pro-multi-tab-clear__arrow" />
            </button>
          </a-dropdown>
        </div>
      </div>
    )
  }
}
</script>
