const en = {
  setupTitle: 'Strategy setup', setupDescription: 'Choose an instrument from your watchlist or search. Its market is detected automatically.',
  market: 'Market', exchange: 'Exchange', product: 'Product', symbol: 'Instrument', symbolPlaceholder: 'Search an instrument',
  timeframe: 'Timeframe', direction: 'Direction', spot: 'Spot', swap: 'Perpetual', long: 'Long', short: 'Short', both: 'Long & short',
  spotLongOnly: 'Spot strategies are long-only. Leverage is fixed at 1x.', parametersTitle: 'Strategy parameters',
  parametersDescription: 'These values are saved with the strategy and reused by backtests and live creation.',
  sourceContractHint: 'Instrument, product, and timeframe come from the saved strategy contract.',
  params: {
    target_pct: { label: 'Capital to use', description: '95% means the strategy targets 95% of its capital after entry and keeps 5% for fees and execution differences. Perpetual leverage is calculated separately.' },
    allow_short: { label: 'Allow short positions', description: 'Applies to perpetual contracts. Spot strategies remain long-only.' }
  }
}

const zhCN = {
  setupTitle: '策略设置', setupDescription: '从自选列表选择或搜索交易标的，系统会自动识别市场并同步策略代码。',
  market: '市场', exchange: '交易所', product: '交易品种', symbol: '交易标的', symbolPlaceholder: '搜索交易标的',
  timeframe: 'K 线周期', direction: '交易方向', spot: '现货', swap: '永续合约', long: '只做多', short: '只做空', both: '多空双向',
  spotLongOnly: '现货策略只能做多，杠杆固定为 1 倍。', parametersTitle: '策略参数',
  parametersDescription: '这些参数会随策略保存，并在回测与创建实盘时继续使用。',
  sourceContractHint: '交易标的、品种和周期来自已保存的策略契约。',
  params: {
    target_pct: { label: '资金使用比例', description: '例如 95% 表示入场后使用该策略资金的 95%，剩余 5% 用于手续费和成交偏差；合约杠杆另行计算。' },
    allow_short: { label: '允许做空', description: '仅适用于永续合约；现货策略始终只能做多。' }
  }
}

const locale = (setupTitle, setupDescription, labels, hint, params) => ({
  setupTitle,
  setupDescription,
  market: labels[0], exchange: labels[1], product: labels[2], symbol: labels[3], symbolPlaceholder: labels[4],
  timeframe: labels[5], direction: labels[6], spot: labels[7], swap: labels[8], long: labels[9], short: labels[10], both: labels[11],
  spotLongOnly: hint[0], parametersTitle: hint[1], parametersDescription: hint[2], sourceContractHint: hint[3],
  params
})

export default {
  'en-US': { strategyBuilder: en },
  'zh-CN': { strategyBuilder: zhCN },
  'zh-TW': { strategyBuilder: locale('策略設定', '選擇此單一標的策略使用的市場環境，系統會同步更新策略程式碼。', ['市場', '交易所', '交易品種', '交易標的', '搜尋交易標的', 'K 線週期', '交易方向', '現貨', '永續合約', '只做多', '只做空', '多空雙向'], ['現貨策略只能做多，槓桿固定為 1 倍。', '策略參數', '這些參數會隨策略儲存，並在回測與建立實盤時繼續使用。', '交易標的、品種和週期來自已儲存的策略契約。'], { target_pct: { label: '資金使用比例', description: '例如 95% 表示進場後使用該策略資金的 95%，其餘 5% 預留給手續費和成交差異；合約槓桿另行計算。' }, allow_short: { label: '允許做空', description: '僅適用於永續合約；現貨策略始終只能做多。' } }) },
  'de-DE': { strategyBuilder: locale('Strategie einrichten', 'Wählen Sie den Marktkontext für diese Einzelinstrument-Strategie.', ['Markt', 'Börse', 'Produkt', 'Instrument', 'Instrument suchen', 'Zeitrahmen', 'Richtung', 'Spot', 'Perpetual', 'Long', 'Short', 'Long & Short'], ['Spot-Strategien sind nur Long; der Hebel ist 1x.', 'Strategieparameter', 'Diese Werte werden gespeichert und für Backtests und Live-Erstellung wiederverwendet.', 'Instrument, Produkt und Zeitraum stammen aus dem gespeicherten Strategievertrag.'], { target_pct: { label: 'Kapitaleinsatz', description: '95 % bedeutet, dass die Strategie 95 % ihres Kapitals einsetzt und 5 % für Gebühren und Ausführungsabweichungen zurückhält. Der Hebel wird separat berechnet.' }, allow_short: { label: 'Short-Positionen erlauben', description: 'Gilt für Perpetual-Kontrakte; Spot bleibt nur Long.' } }) },
  'fr-FR': { strategyBuilder: locale('Configuration de la stratégie', 'Choisissez le contexte de marché de cette stratégie mono-instrument.', ['Marché', 'Plateforme', 'Produit', 'Instrument', 'Rechercher un instrument', 'Période', 'Direction', 'Spot', 'Perpétuel', 'Long', 'Short', 'Long et short'], ['Les stratégies spot sont uniquement longues, avec un levier de 1x.', 'Paramètres de stratégie', 'Ces valeurs sont enregistrées et réutilisées pour le backtest et le lancement réel.', 'L’instrument, le produit et la période proviennent du contrat enregistré.'], { target_pct: { label: 'Capital utilisé', description: '95 % signifie que la stratégie utilise 95 % de son capital et conserve 5 % pour les frais et les écarts d’exécution. Le levier est calculé séparément.' }, allow_short: { label: 'Autoriser les positions short', description: 'Valable pour les contrats perpétuels ; le spot reste long uniquement.' } }) },
  'ja-JP': { strategyBuilder: locale('戦略設定', '単一銘柄戦略で使用する市場条件を選択します。', ['市場', '取引所', '商品', '銘柄', '銘柄を検索', '時間足', '方向', '現物', '無期限', 'ロング', 'ショート', '両方向'], ['現物戦略はロングのみで、レバレッジは1倍です。', '戦略パラメータ', 'これらの値は戦略と共に保存され、バックテストと実運用作成で再利用されます。', '銘柄、商品、時間足は保存済みの戦略契約から取得します。'], { target_pct: { label: '資金使用率', description: '95% は戦略資金の 95% を使用し、5% を手数料や約定差のために残す設定です。無期限契約のレバレッジは別に計算されます。' }, allow_short: { label: 'ショートを許可', description: '無期限契約のみ。現物はロングのみです。' } }) },
  'ko-KR': { strategyBuilder: locale('전략 설정', '단일 종목 전략에 사용할 시장 환경을 선택하세요.', ['시장', '거래소', '상품', '종목', '종목 검색', '시간 주기', '방향', '현물', '무기한', '롱', '숏', '양방향'], ['현물 전략은 롱만 가능하며 레버리지는 1배입니다.', '전략 매개변수', '이 값은 전략과 함께 저장되어 백테스트와 실거래 생성에 재사용됩니다.', '종목, 상품, 주기는 저장된 전략 계약에서 가져옵니다.'], { target_pct: { label: '자금 사용 비율', description: '95%는 전략 자금의 95%를 사용하고 수수료와 체결 오차를 위해 5%를 남긴다는 뜻입니다. 무기한 계약 레버리지는 별도로 계산됩니다.' }, allow_short: { label: '숏 허용', description: '무기한 계약에만 적용되며 현물은 롱만 가능합니다.' } }) },
  'ru-RU': { strategyBuilder: locale('Настройка стратегии', 'Выберите рыночный контекст для стратегии одного инструмента.', ['Рынок', 'Биржа', 'Продукт', 'Инструмент', 'Поиск инструмента', 'Таймфрейм', 'Направление', 'Спот', 'Бессрочный', 'Лонг', 'Шорт', 'Лонг и шорт'], ['Спотовые стратегии работают только в лонг с плечом 1x.', 'Параметры стратегии', 'Значения сохраняются и используются в бэктесте и при запуске.', 'Инструмент, продукт и таймфрейм берутся из сохранённого контракта стратегии.'], { target_pct: { label: 'Использование капитала', description: '95% означает использование 95% капитала стратегии с резервом 5% на комиссии и отклонения исполнения. Плечо рассчитывается отдельно.' }, allow_short: { label: 'Разрешить шорт', description: 'Только для бессрочных контрактов; спот остаётся только лонг.' } }) },
  'th-TH': { strategyBuilder: locale('ตั้งค่ากลยุทธ์', 'เลือกบริบทตลาดสำหรับกลยุทธ์ตราสารเดียวนี้', ['ตลาด', 'ตลาดซื้อขาย', 'ผลิตภัณฑ์', 'ตราสาร', 'ค้นหาตราสาร', 'กรอบเวลา', 'ทิศทาง', 'สปอต', 'สัญญาถาวร', 'ซื้อ', 'ขาย', 'สองทาง'], ['กลยุทธ์สปอตเปิดได้เฉพาะฝั่งซื้อและเลเวอเรจ 1x', 'พารามิเตอร์กลยุทธ์', 'ค่าเหล่านี้จะถูกบันทึกและนำไปใช้กับการทดสอบย้อนหลังและการสร้างไลฟ์', 'ตราสาร ผลิตภัณฑ์ และกรอบเวลามาจากสัญญากลยุทธ์ที่บันทึกไว้'], { target_pct: { label: 'สัดส่วนเงินทุนที่ใช้', description: '95% หมายถึงใช้เงินทุนของกลยุทธ์ 95% และสำรอง 5% สำหรับค่าธรรมเนียมและความคลาดเคลื่อนในการส่งคำสั่ง ส่วนเลเวอเรจคำนวณแยกต่างหาก' }, allow_short: { label: 'อนุญาตฝั่งขาย', description: 'ใช้กับสัญญาถาวรเท่านั้น; สปอตเปิดได้เฉพาะฝั่งซื้อ' } }) },
  'vi-VN': { strategyBuilder: locale('Thiết lập chiến lược', 'Chọn bối cảnh thị trường cho chiến lược một mã này.', ['Thị trường', 'Sàn', 'Sản phẩm', 'Mã giao dịch', 'Tìm mã giao dịch', 'Khung thời gian', 'Hướng', 'Giao ngay', 'Vĩnh cửu', 'Mua', 'Bán', 'Hai chiều'], ['Chiến lược giao ngay chỉ mua và đòn bẩy cố định 1x.', 'Tham số chiến lược', 'Các giá trị được lưu và dùng lại khi kiểm thử và tạo giao dịch thật.', 'Mã, sản phẩm và khung thời gian lấy từ hợp đồng chiến lược đã lưu.'], { target_pct: { label: 'Tỷ lệ vốn sử dụng', description: '95% nghĩa là chiến lược dùng 95% vốn và giữ lại 5% cho phí cùng sai lệch khớp lệnh. Đòn bẩy hợp đồng được tính riêng.' }, allow_short: { label: 'Cho phép bán khống', description: 'Chỉ áp dụng cho hợp đồng vĩnh cửu; giao ngay chỉ mua.' } }) },
  'ar-SA': { strategyBuilder: locale('إعداد الاستراتيجية', 'اختر سياق السوق لهذه الاستراتيجية ذات الأداة الواحدة.', ['السوق', 'المنصة', 'المنتج', 'الأداة', 'البحث عن أداة', 'الإطار الزمني', 'الاتجاه', 'فوري', 'دائم', 'شراء', 'بيع', 'الاتجاهان'], ['استراتيجيات السوق الفوري للشراء فقط والرافعة 1x.', 'معلمات الاستراتيجية', 'تُحفظ هذه القيم وتُستخدم في الاختبار وإنشاء التداول المباشر.', 'تأتي الأداة والمنتج والإطار الزمني من عقد الاستراتيجية المحفوظ.'], { target_pct: { label: 'نسبة رأس المال المستخدم', description: 'تعني 95% استخدام 95% من رأس مال الاستراتيجية مع إبقاء 5% للرسوم وفروق التنفيذ. تُحسب الرافعة للعقود بشكل منفصل.' }, allow_short: { label: 'السماح بالبيع', description: 'للعقود الدائمة فقط؛ السوق الفوري للشراء فقط.' } }) }
}
