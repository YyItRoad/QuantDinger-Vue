const locale = {
  'menu.dashboard.positionManager': '持仓管理',
  'positionManager.title': '币安合约持仓管理',
  'positionManager.subtitle': '同步并查看交易所当前合约仓位。此页面暂不创建策略、不接管仓位，也不会下单。',
  'positionManager.credentialPlaceholder': '请选择币安合约凭证',
  'positionManager.credentialEmpty': '暂无币安凭证，请先在账户中心添加并测试连接。',
  'positionManager.credentialsFailed': '加载币安凭证失败',
  'positionManager.syncPositions': '同步持仓',
  'positionManager.syncSuccess': '已同步交易所合约仓位',
  'positionManager.syncEmpty': '同步完成，当前没有合约仓位',
  'positionManager.syncFailed': '同步交易所持仓失败',
  'positionManager.pendingTitle': '接管功能尚未接入',
  'positionManager.pendingDescription': '下一步只通过现有策略实例和运行机制接管完整仓位；不会恢复旧的绑定、部分数量、归属确认或三种执行模式。',
  'positionManager.positionsTitle': '交易所合约持仓',
  'positionManager.positionsEmpty': '当前没有合约持仓，请选择凭证并同步。',
  'positionManager.symbol': '交易对',
  'positionManager.side': '方向',
  'positionManager.quantity': '持仓数量',
  'positionManager.entryPrice': '开仓价',
  'positionManager.markPrice': '最新价格',
  'positionManager.leverage': '杠杆倍数',
  'positionManager.long': '多头',
  'positionManager.short': '空头',
  'positionManager.lastSynced': '最近同步时间'
}

const localeNames = ['ar-SA', 'de-DE', 'en-US', 'fr-FR', 'ja-JP', 'ko-KR', 'ru-RU', 'th-TH', 'vi-VN', 'zh-CN', 'zh-TW']

export default localeNames.reduce((messages, localeName) => {
  messages[localeName] = { ...locale }
  return messages
}, {})
