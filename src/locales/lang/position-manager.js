const locale = {
  'menu.dashboard.positionManager': '持仓管理',
  'positionManager.title': '持仓管理',
  'positionManager.subtitle': '同步交易所当前仓位，并使用现有创建实盘流程为未管理仓位创建独立策略实例。',
  'positionManager.credentialPlaceholder': '请选择账户凭证',
  'positionManager.credentialEmpty': '暂无可用凭证，请先在账户中心添加并测试连接。',
  'positionManager.credentialsFailed': '加载账户凭证失败',
  'positionManager.syncPositions': '同步持仓',
  'positionManager.syncSuccess': '已同步交易所仓位',
  'positionManager.syncEmpty': '同步完成，当前没有仓位',
  'positionManager.syncFailed': '同步交易所持仓失败',
  'positionManager.positionsTitle': '交易所当前持仓',
  'positionManager.positionsEmpty': '当前没有持仓，请选择凭证并同步。',
  'positionManager.symbol': '交易对',
  'positionManager.marketType': '市场类型',
  'positionManager.swap': '合约',
  'positionManager.spot': '现货',
  'positionManager.side': '方向',
  'positionManager.quantity': '持仓数量',
  'positionManager.entryPrice': '开仓价',
  'positionManager.markPrice': '最新价格',
  'positionManager.leverage': '杠杆倍数',
  'positionManager.management': '管理策略',
  'positionManager.unmanaged': '未管理',
  'positionManager.createManagement': '创建管理策略',
  'positionManager.currentPosition': '当前接管仓位',
  'positionManager.managementConflict': '已有 {count} 个策略记录',
  'positionManager.managementFailed': '加载持仓策略归属失败',
  'positionManager.long': '多头',
  'positionManager.short': '空头',
  'positionManager.lastSynced': '最近同步时间'
}

const localeNames = ['ar-SA', 'de-DE', 'en-US', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW']

export default localeNames.reduce((messages, localeName) => {
  messages[localeName] = { ...locale }
  return messages
}, {})
