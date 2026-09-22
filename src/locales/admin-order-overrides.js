const keys = [
  'adminOrders.colOrderNo',
  'adminOrders.colPaymentReference',
  'adminOrders.filterPaymentAll',
  'adminOrders.filterPlanAll',
  'adminOrders.filterFailed',
  'adminOrders.filterCancelled',
  'adminOrders.methodStripe',
  'adminOrders.resetFilters',
  'adminOrders.searchPlaceholderExtended',
  'adminOrders.manualConfirmTitle',
  'adminOrders.loadFailed'
]

const values = {
  'en-US': ['Order No.', 'Payment reference', 'All payment methods', 'All plans', 'Failed', 'Cancelled', 'Card (Stripe)', 'Reset', 'User, email, order no. or payment reference', 'Manual confirm on-chain order', 'Failed to load orders'],
  'zh-CN': ['订单号', '支付凭证', '全部支付方式', '全部套餐', '失败', '已取消', '银行卡（Stripe）', '重置', '搜索用户、邮箱、订单号或支付凭证', '手动确认链上订单', '订单加载失败'],
  'zh-TW': ['訂單編號', '付款憑證', '全部付款方式', '全部方案', '失敗', '已取消', '信用卡（Stripe）', '重設', '搜尋使用者、信箱、訂單編號或付款憑證', '手動確認鏈上訂單', '訂單載入失敗'],
  'ja-JP': ['注文番号', '支払い参照', 'すべての支払い方法', 'すべてのプラン', '失敗', 'キャンセル済み', 'カード（Stripe）', 'リセット', 'ユーザー、メール、注文番号、支払い参照を検索', 'オンチェーン注文を手動確認', '注文の読み込みに失敗しました'],
  'ko-KR': ['주문 번호', '결제 참조', '모든 결제 수단', '모든 요금제', '실패', '취소됨', '카드(Stripe)', '초기화', '사용자, 이메일, 주문 번호 또는 결제 참조 검색', '온체인 주문 수동 확인', '주문을 불러오지 못했습니다'],
  'de-DE': ['Bestellnr.', 'Zahlungsreferenz', 'Alle Zahlungsarten', 'Alle Tarife', 'Fehlgeschlagen', 'Storniert', 'Karte (Stripe)', 'Zurücksetzen', 'Benutzer, E-Mail, Bestellnr. oder Zahlungsreferenz', 'On-Chain-Bestellung manuell bestätigen', 'Bestellungen konnten nicht geladen werden'],
  'fr-FR': ['N° de commande', 'Référence de paiement', 'Tous les moyens de paiement', 'Toutes les offres', 'Échec', 'Annulé', 'Carte (Stripe)', 'Réinitialiser', 'Utilisateur, e-mail, commande ou référence de paiement', 'Confirmer manuellement la commande on-chain', 'Impossible de charger les commandes'],
  'ru-RU': ['№ заказа', 'Платёжная ссылка', 'Все способы оплаты', 'Все тарифы', 'Ошибка', 'Отменён', 'Карта (Stripe)', 'Сбросить', 'Пользователь, почта, № заказа или платёжная ссылка', 'Подтвердить блокчейн-заказ вручную', 'Не удалось загрузить заказы'],
  'th-TH': ['เลขที่คำสั่งซื้อ', 'ข้อมูลอ้างอิงการชำระเงิน', 'วิธีชำระเงินทั้งหมด', 'แพ็กเกจทั้งหมด', 'ล้มเหลว', 'ยกเลิกแล้ว', 'บัตร (Stripe)', 'รีเซ็ต', 'ค้นหาผู้ใช้ อีเมล เลขที่คำสั่งซื้อ หรือข้อมูลอ้างอิง', 'ยืนยันคำสั่งซื้อบนเชนด้วยตนเอง', 'โหลดคำสั่งซื้อไม่สำเร็จ'],
  'vi-VN': ['Mã đơn hàng', 'Tham chiếu thanh toán', 'Tất cả phương thức', 'Tất cả gói', 'Thất bại', 'Đã hủy', 'Thẻ (Stripe)', 'Đặt lại', 'Tìm người dùng, email, mã đơn hoặc tham chiếu thanh toán', 'Xác nhận thủ công đơn hàng on-chain', 'Không thể tải đơn hàng'],
  'ar-SA': ['رقم الطلب', 'مرجع الدفع', 'كل طرق الدفع', 'كل الباقات', 'فشل', 'ملغي', 'بطاقة (Stripe)', 'إعادة تعيين', 'ابحث بالمستخدم أو البريد أو رقم الطلب أو مرجع الدفع', 'تأكيد طلب الشبكة يدويًا', 'تعذر تحميل الطلبات']
}

const messages = {}
for (const [locale, localeValues] of Object.entries(values)) {
  messages[locale] = {}
  keys.forEach((key, index) => {
    messages[locale][key] = localeValues[index]
  })
}

export default messages
