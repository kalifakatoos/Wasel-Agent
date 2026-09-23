# Worklog — منظومة واصل نالوت (Wasel Nalut Super-App)

---
Task ID: 1-2 (البنية الأساسية)
Agent: Z.ai (الوكيل الرئيسي)
Task: تجهيز البنية التحتية الكاملة للمنظومة — قاعدة بيانات، محرك لحظي، مسارات API، نظام تصميم، هيكل رئيسي.

Work Log:
- فحص المشروع: Next.js 16 + App Router + Prisma/SQLite + shadcn/ui (New York) + Tailwind 4.
- تثبيت socket.io + socket.io-client.
- prisma/schema.prisma: Store, Product, Driver, Order, Wallet, WalletTransaction, DailyAudit, Voucher, BlockedPhone (SQLite) + db:push ناجح.
- بذور نالوت الحقيقية: 9 متاجر (قصر نالوت، بيتزا القلعة، مشويات شارع تونس، كافيه سيدي خليفة، مخبز نفوسة، سوبر ماركت المركزي، صيدلية جبل نفوسة، واصل متاع للإلكترونيات، عطور الصحراء) + 4 كباتن + محفظة زبون تجريبي (0910000001 برصيد 150 د.ل).
- mini-services/wasel-realtime: Socket.io على 3003 (path '/') + HTTP داخلي /emit و /health على 3013. الغرف: order:{id}, store:{id}, driver:{id}, admin:fleet, drivers:radar. يعمل ويجب تشغيله بـ `cd mini-services/wasel-realtime && bun run dev` (log: /home/z/my-project/realtime.log).
- مكتبات مشتركة: src/lib/wasel/{types,constants,pricing,server-utils,orders-server,api,socket,store,seed-data,ensure-seed}.ts
- التسعير: DeliveryFee = max(5, (5 + 1.2×km) × S(demand,supply)) بسقف سيجمويد 2.5x، أجرة خدمة = 0 د.ل دائماً.
- مسارات API (كلها تعمل): /api/health, /api/stores, /api/stores/{id}/menu, /api/stores/{id}/products/{pid}/availability, /api/orders (GET قوائم), /api/orders/{id} (GET), /api/orders/checkout (POST), /api/orders/{id}/status (accept+رادار/ready/reject), /api/orders/{id}/accept-offer, /api/orders/{id}/handover (🔒 قفل 423 إن لم تكن ready_for_pickup), /api/orders/{id}/deliver (OTP صارم + قيد مزدوج), /api/drivers, /api/drivers/{id}/shift, /api/drivers/{id}/offers, /api/drivers/{id}/settle (PIN), /api/drivers/{id}/location, /api/accounting/summary (PIN), /api/accounting/close-day (PIN), /api/accounting/payout-store (PIN), /api/disputes/resolve-noshow (PIN), /api/vouchers (PIN), /api/wallet/{phone}.
- القيد المزدوج عند التسليم: عهدة الكابتن += الإجمالي (كاش)، المتجر 90% من الـ subtotal، المنصة 10%، أجرة الكابتن كاملة؛ سندات RV/D DV؛ تسوية العهدة تصفّرها بسند قبض.
- نظام التصميم: ألوان الزمرد الليلي #041710/#062319/#0A3324 + الذهب #D4AF37/#F5D061، RTL كامل، خط Cairo للعربية وOutfit للمبالغ (font-money)، RTL digits.
- مكونات مشتركة: src/components/wasel/NalutMap.tsx (خريطة نالوت SVG إسقاطية بعلامات ومسار متحرك)، src/components/wasel/Badges.tsx (StatusBadge, Ly, OrderNo).
- صفحة / الرئيسية: بوابة هبوط فاخرة + 4 بوابات أدوار (زبون/كابتن/مطبخ/إدارة) عبر next/dynamic (ssr:false) — الملفات: src/components/apps/{CustomerApp,CaptainApp,MerchantApp,AdminApp}.tsx.

Stage Summary:
- البنية الخلفية مكتملة ومختبرة (health = connected, 9 متاجر).
- dev server على 3000 يعمل، محرك اللحظية على 3003/3013 يعمل.
- قواعد صارمة: دينار ليبي فقط (لا $)، PIN إداري 7788/9832 عبر هيدر x-admin-pin، هاتف ليبي 091/092/093/094، عهدة سقف 500 د.ل، أجرة خدمة صفر.
- المتبقي: بناء واجهات التطبيقات الأربعة (المهام 7-a..7-d) ثم QA.

---
Task ID: 7-c (شريك واصل / شاشة المطبخ KDS)
Agent: frontend-styling-expert
Task: بناء واجهة التاجر الكاملة — KDS ثلاثية الأعمدة، مخزون لحظي، تقارير، بث store:{id}، فواتير حرارية 80mm.

Work Log:
- قراءة العقود: types/constants/store/api/socket/Badges + مسارات /api/orders/status, availability (تأكيد الأشكال والقيود).
- src/components/apps/MerchantApp.tsx ('use client', export default with onExit):
  • الرأس: شعار 👨‍🍳 شريك واصل + Select متجر من /api/stores (عزل multi-tenant) + مؤشر «متصل بالبث» نابض أخضر/أحمر + كتم صوت + تحديث يدوي + خروج.
  • Socket: join store:{id} (leave القديمة عند التبديل)، أصغ store:new_order (toast + WebAudio beep دينغ-دينغ اختياري + بطاقة ring-alert)، order:status_changed (toast خروج عند out_for_delivery)، order:assigned (لوحة الكابتن في خريطة plates)، store:product_availability (تحديث فوري)، store:payout_settled («صُرفت مستحقاتكم»).
  • استقصاء احتياطي: active كل 4 ثوانٍ + all كل 12 ثانية، مع حماية storeIdRef ضد سباقات تبديل المتجر.
  • تاب KDS: 3 أعمدة grid lg:grid-cols-3 بعدادات: 🔔 جديدة (placed) بطاقات بيضاء دافئة نابضة + تمييز 💵 كاش/👛 محفظة + ملاحظات الأصناف بلون تحذيري + Dialog زمن الطهي (3 بطاقات راديو 15/25/35) → accept (toast «أُشعل رادار الكباتن (N عرض)») + رفض بـ AlertDialog؛ 🔥 قيد التحضير (accepted/preparing) عداد تنازلي من dispatchAt + شريط تقدم يتحول أحمر عند التأخر + 🛵 الكابتن ولوحته + زر ذهبي ضخم «الوجبة جاهزة للاستلام ✅»؛ ✅ جاهزة للاستلام (ready_for_pickup) زمردية «بانتظار الكابتن» وتختفي عند الانطلاق. EmptyState لطيف للأعمدة الفارغة.
  • 🖨️ زر طابعة على كل بطاقة → src/components/apps/merchant-receipt.tsx: فاتورة 302px بيضاء monospace (متجر، واصل نالوت، رقم، تاريخ، أصناف + ملاحظات، الإجمالي، أجرة التوصيل، عمولة 10%، صافي 90% بإطار بارز، «شكراً لشراكتكم») مع <style> داخلي @media print يخفي كل شيء عدا الفاتورة + @page 80mm.
  • تاب المخزون: بحث سريع + صفوف (emoji، عنوان مشطوب عند عدم التوفر، مخزون، سعر <Ly/>) + Switch 48px → availability POST فوري تفاؤلي مع تراجع عند الفشل + toast.
  • تاب التقارير: من status=all&limit=50 — طلبات اليوم المسلّمة، المبيعات (sum subtotal)، الصافي المستحق 90% <Ly/> بطل ذهبي، عمولة المنصة 10% شفافة، متوسط الطلب، أكثر 3 أصناف ببارات div ذهبية نسبية (بلا recharts).
  • تذييل لاصق mt-auto: «90% صافي المبيعات لك، بلا رسوم خفية».
- الجودة: كل المبالغ عبر <Ly/> (لا $)، لا ألوان زرقاء (زمرد/ذهب فقط)، أهداف لمس ≥48px، قوائم max-h wasel-scroll، timers نظيفة، Toaster محلي.
- فحص: bunx tsc --noEmit → CLEAN لملفات MerchantApp/merchant-*.

Files: src/components/apps/MerchantApp.tsx, src/components/apps/merchant-receipt.tsx

Stage Summary:
- شاشة المطبخ جاهزة: قبول → رادار → عداد → جاهز → استلام، مخزون لحظي، تقارير 90/10، فواتير حرارية قابلة للطباعة.
- ملاحظة: dev server يرجع 500 مؤقتاً لأن AdminApp.tsx (مهمة 7-d) غير موجود بعد — خارج نطاق هذه المهمة.

---
Task ID: 7-b (تطبيق الكابتن — واصل نالوت)
Agent: frontend-styling-expert
Task: بناء واجهة تطبيق الكابتن كاملة: الوردية، العهدة، رادار العروض بعداد 15 ثانية، دورة التوصيل الرباعية بخط زمني فاخر، تيليمتري حي كل 1.5 ثانية، واستقصاء احتياطي.

Work Log:
- CaptainApp.tsx (المحرك): رأس فيه اختيار الكابتن (Select بأسماء الـ 4 كباتن مع vehicleType/plateNumber) + خروج onExit. حالة داخلية home|delivery.
- بطاقة الوردية الضخمة: زر دائري 96px + زر عرض كامل h-14 — offline رمادي / online زمرد نابض (animate-ping) / busy ذهبي. POST /api/drivers/{id}/shift ومعالجة 409 «لديك توصيلات جارية» كـ toast.
- بطاقة «الكاش بحوزتك»: Ly bold كبير + شريط تقدم نسبة custody/500 + تحذير برتقالي #F59E0B وشريط «تجاوزت السقف — أودع النقد في المقر فوراً» عند تجاوز CUSTODY_CAP_LYD، وإلا أخضر هادئ.
- صف مؤشرات: earningsTotal / tripsCompleted / rating ⭐ / activeOrdersCount + بطاقة الطلب النشط بزر «متابعة التوصيل».
- captain-radar.tsx (OrderRadarDialog): Dialog غير قابل للإغلاق خارجياً (preventDefault على interact/escape)، حلقة SVG stroke-dashoffset عبر framer-motion بعداد 15→0، وسطها الأجرة Ly ذهبية، تفاصيل: متجر/حي/مسافة/دفع كاش-محفظة/رقم الطلب، زرا قبول زمرد ورفض رمادي بحجم h-16. الرفض يسجل في declinedOffers (useWasel). عند 0 إغلاق تلقائي. حرس ضد التكرار/المرفوض/الانشغال.
- captain-delivery.tsx (ActiveDeliveryFlow): خط زمني رأسي بأربع محطات + لوحة المرحلة الحالية:
  (1) التوجه للمتجر: بطاقة المتجر + الأصناف (max-h wasel-scroll) + ملاحظات الزبون بارزة + tel: + خريطة NalutMap بعلامة كابتن متحركة + «وصلت للمتجر 📍».
  (2) قفل المطبخ: 🔒 أحمر/برتقالي بنبضة انتظار إذا status !== ready_for_pickup؛ عند الجاهزية يتحول لزر ذهبي ring-alert نابض «استلمت الوجبة وبدأت الرحلة 🍔» → POST handover؛ عند 423 toast destructive برسالة الخادم دون تقدم مرحلة.
  (3) التوجه للزبون: العنوان + بطاقة «حصّل من الزبون» Ly bold للكاش (أو بطاقة محفظة هادئة) + خريطة + «وصلت لموقع الزبون 🏠».
  (4) التحقق: InputOTP رباعي font-money h-16 + «تأكيد التسليم واستلام الكاش ✅» → POST deliver؛ عند 401 اهتزاز framer-motion + تفريغ الخانات؛ عند النجاح شاشة «اكتملت الرحلة 🎉» بأجرة مستحقة + كاش محصّل وعودة تلقائية بعد 2.5 ثانية أو بزر.
- تيليمتري محاكاة: نبضة كل 1.5 ثانية emit('driver:location_update') بحالة الوردية وorderId للطلب النشط، مع lerp خطوة 0.0004 نحو المتجر/الزبون في المرحلتين 1 و3 وإعادة تصويب من الموقع الحالي عند تغيير المرحلة.
- socket: انضمام [driver:{id}, drivers:radar] ومصغية كاملة (radar_offer/radar_taken/status_changed يفك القفل بـ toast/assigned يحدّث فوراً وينتقل لشاشة التوصيل/custody_alert/shift) مع تنظيف off + leaveRooms.
- استقصاء مزدوج: offers كل 3 ثوانٍ فقط عند online && !busy، وطلبات نشطة + كباتن كل 5 ثوانٍ.
- تذييل لاصق mt-auto: «🛵 كباتن واصل — كامل أجرة التوصيل لك • العهدة تُورّد للمقر».
- إدارة timers نظيفة عبر intervals داخل useEffect بتنظيف كامل، وlatestRef لقراءة أحدث الحالة داخل معالجات socket دون إعادة اشتراك.

Stage Summary:
- ملفات المهمة: src/components/apps/{CaptainApp,captain-radar,captain-delivery,captain-shared}.tsx فقط — لم يُعدّل أي ملف آخر.
- tsc --noEmit نظيف لملفات المهمة (CLEAN)، بلا أي $ وبأهداف لمس ≥ 48px وبالدينار الليبي حصرياً.
- التطبيق جاهز للربط مع مهام QA: قفل المطبخ 423، سبقك كابتن آخر 409، وكود OTP 401 مغطاة من جهة الواجهة.
Task ID: 7-d (غرفة العمليات والمالية)
Agent: frontend-styling-expert
Task: بناء Admin Hub View كاملة — درع PIN، لوحة مؤشرات حية، أسطول، نزاعات، كباتن، محاسبة Z، متاجر.

Work Log:
- الملفات (بلا أي تعديل خارجها): src/components/apps/AdminApp.tsx + admin-{shared,dashboard,fleet,orders,captains,z,stores}.tsx.
- درع PIN: InputOTP بـ 4 خانات كبيرة (h-16 ذهبية) + اهتزاز framer-motion عند الخطأ + مسح تلقائي؛ الفتح = GET /api/accounting/summary بهيدر x-admin-pin (200→unlock، 401→toast «رمز غير صحيح»)؛ زر خروج onExit أسفل الشاشة.
- الجلسة: pin في state حاضر في كل الاستدعاءات (هيدر للـ GET، حقل pin للـ POST)؛ أي 401 لاحق → قفل فوري + إفراغ الحالة + toast.
- البث اللحظي: join ['admin:fleet'] + fleet:snapshot_request → استقبال fleet:snapshot/fleet:driver_location (تحريك العلامات)، fleet:driver_status (تحديث محلي + feed)، order:status_changed (feed + تحديث الطلبات)، order:radar_broadcast، driver:custody_settled + store:payout_settled (feed + refetch فوري للمحة والسندات). مؤشر «بث حي» في الرأس.
- مزامنة دورية: loadAll (summary + vouchers + orders) كل 8 ثوانٍ مع timestamps وآخر مزامنة.
- لوحة المؤشرات: 8 KPI (GMV ذهبي bold، كاش، مستحقات تجار 90%، أرباح منصة 10%، عهد الكباتن بتحذير برتقالي فوق سقف 500، محفظة، أرباح كباتن، نشط/مسلّم) + سجل أحداث حي (أحدث أولاً، max 12، أيقونات وtimestamps).
- الأسطول الحي: NalutMap كبيرة بعلامات كابتن (label = fullName، نبض للنشطين) + قائمة جانبية بحالات ملونة (offline رمادي/online زمردي/busy ذهبي) وعهدة كل كابتن وآخر إشارة.
- الطلبات والنزاعات: بطاقات (رقم، متجر، زبون+هاتف، StatusBadge، إجمالي، الدفع، الكابتن)؛ زر أحمر لفض النزاع على النشط → AlertDialog تحذيري مفصل (90% للمتجر + كامل الأجرة للكابتن + حظر الزبون) → POST resolve-noshow → toast بتفاصيل النتيجة؛ الطلبات disputed تعرض disputeNote.
- الكباتن: بطاقات (مركبة/لوحة، تقييم، رحلات، أرباح) + بطاقة عهدة بارزة (برتقالي > 500) وزر ذهبي تسوية (معطل إن ≤ 0) → AlertDialog → POST settle → Dialog سند قبض أبيض رسمي (رقم font-money، التوقيعان خطان، زر طباعة window.print مع CSS طباعة يعزل .print-area).
- المحاسبة Z: نفس KPI + زر تقفيل اليومية (AlertDialog) → POST close-day → Dialog محضر Z رسمي؛ جدول audits (كود/GMV/كاش/صافي/حالة)، دفتر سندات قبض-صرف ببادج ملون، جدول أرقام محظورة.
- المتاجر: بطاقات (emoji، dues، payoutPaid) → Dialog مبلغ مُسبق بـ dues مع تحقق → POST payout-store → سند صرف أبيض + المتبقي + طباعة.
- القيود محترمة: دينار ليبي حصرياً عبر <Ly/>، زمرد+ذهبي فقط (لا أزرق)، أهداف لمس ≥ 48px، قوائم max-h overflow-y-auto wasel-scroll، min-h-screen flex flex-col + تذييل لاصق mt-auto («🛡️ واصل نالوت — غرفة العمليات والمالية • كل قرش مُساءل»).
- جودة: TypeScript صارم، timers نظيفة (poll interval + socket handlers مُزالة في cleanup)، `bunx tsc --noEmit` نظيف لملفات admin.

Stage Summary:
- غرفة العمليات 7-d مكتملة وجاهزة للربط مع بقية التطبيقات (7-a..7-c) ثم QA شامل.
---
Task ID: 7-a
Agent: frontend-styling-expert
Task: واجهة تطبيق الزبون

Work Log:
- قراءة worklog.md والعقود كاملة: types/constants/store/api/socket + NalutMap/Badges + مسارات API الفعلية (stores, menu, checkout, orders, orders/{id}, wallet/{phone}) وتأكيد أحداث socket: order:status_changed و order:driver_location {driverId,lat,lng,...}.
- بناء 10 ملفات (فقط CustomerApp.tsx + customer-*.tsx، بلا أي تعديل خارجها):
  - CustomerApp.tsx: export default مع onExit، رأس لاصق (شعار 🐪 + سلة بـ badge عدد الأصناف + خروج)، تبويب حالة داخلي browse/store/cart/checkout/tracking/orders/wallet، تنقل سفلي لاصق h-16 (استكشاف/طلباتي/المحفظة)، تذييل لاصق mt-auto، scrollTo أعلى عند كل تنقل.
  - customer-shared.tsx: LIBYAN_PHONE_RE مبني من LIBYAN_PHONE_PREFIXES (= /^09[1-4]\d{7}$/)، fmtDate بـ ar-LY-u-nu-latn (أرقام لاتينية)، ScreenBar (رجوع 48px)، LoadingBlock/ErrorBlock، PhoneGate (بوابة هوية الضيوف بالهاتف فقط).
  - customer-browse.tsx: فلاتر الأقسام (food/grocery/marketplace + الكل) بعمود أفقي، فلتر الأحياء DISTRICTS برقائق قابلة للتمرير (wasel-scroll)، بحث بالاسم/tagline/الحي، استعلام /api/stores?vertical&district مع cleanup + refresh، skeleton أثناء التحميل، بطاقات متاجر فاخرة (emoji، تقييم ⭐ font-money، الحي، زمن التحضير، التوصيل من <Ly/>) والمغلق grayscale+opacity+disabled، حالة فراغ.
  - customer-store.tsx: /api/stores/{id}/menu، رأس المتجر (تقييم، حي، prepMinutes، حالة)، تجميع الأصناف بـ category، صف صنف أفقي وغير المتاح مشطوب/معطل، skeleton للمنيو، شريط سلة عائم ثابت بعدّاد ومجموع، ProductDetailSheet مربوطة بالاختيار.
  - customer-product-sheet.tsx: Sheet side=bottom max-h-88vh wasel-scroll، emoji كبير، وصف كامل، عداد «− qty +» بأزرار 48px، Textarea ملاحظات للمطبخ (placeholder «بدون مايونيز، تغليف محكم…»)، تحذير استبدال السلة عند متجر مختلف، زر ذهبي «أضف إلى السلة • المجموع» + toast ذهبي، تصفير الحالة عند الفتح.
  - customer-cart.tsx: عناصر بعدادات 44px داخل هدف 48px + حذف، ملخص: قيمة الأصناف <Ly bold/>، «أجرة التوصيل تُحتسب عند التأكيد (تبدأ من 5.00 د.ل)»، «رسوم خدمة واصل: 0.00 د.ل ✅»، صندوق ميثاق واصل الشرعي (border زمرد bg زمردي شفاف: إجارة عمل/بيع قطعي/لا غرر/لا ربا)، متابعة الدفع + تفريغ السلة، حالة سلة فارغة.
  - customer-checkout.tsx: الاسم والهاتف (تحقق فوري بالريجكس + إطار أحمر عند الخطأ)، Select الحي من DISTRICTS، Textarea العنوان، بطاقتا دفع 💵 كاش / 👛 محفظة واصل مع جلب الرصيد من /api/wallet/{phone} (debounce 450ms) وتعطيل المحفظة عند الحظر + تنبيه blockedReason، ملاحظات عامة، «تأكيد الطلب نهائياً» بحالة تحميل (Loader2)، أخطاء الخادم العربية كما هي في toast destructive، عند النجاح: toast ذهبي «🔔 ringing في المطبخ!» + setCustomerIdentity + clearCart + انتقال للتتبع.
  - customer-tracking.tsx: joinRooms(['order:{id}']) وأصغاء order:status_changed (تحديث الحالة) و order:driver_location (تحريك علامة الكابتن) مع off + leaveRooms في cleanup؛ استقصاء كل 4 ثوانٍ GET /api/orders/{id} يتوقف ذاتياً عند حالة نهائية (delivered/cancelled/disputed) عبر orderRef؛ stepper رأسي بخمس مراحل (accepted يُحسب ضمن preparing) مع لمعة ring-alert للمرحلة الحالية وعلامة ✓ زمردية للمكتمل؛ كود OTP رباعي ضخم font-money بمربعات ذهبية ونص «سلّم هذا الكود للكابتن عند الاستلام»؛ ملخص الأصناف والمبالغ (subtotal + deliveryFee = total، serviceFee 0 ✅)؛ NalutMap بعلامات المتجر (storeEmoji/storeLatitude/storeLongitude) والزبون (deliveryLat/Lng) والكابتن الحي مع label driverName ومسار متجر→زبون؛ بدون زر إلغاء إطلاقاً؛ احتفال framer-motion «بالهناء والشفاء 🎉» بإيموجي متحرك عند التسليم؛ Alert أحمر للملغي/النزاع.
  - customer-orders.tsx: بلا هاتف → PhoneGate (يحفظ الهوية)، وإلا GET /api/orders?phone&status=all&limit=20 مع cleanup وإعادة محاولة، بطاقات برقم الطلب OrderNo font-money + StatusBadge + الإجمالي <Ly bold/> + التاريخ + زر «تتبع حي» للأوامر النشطة، قائمة max-h-[70vh] wasel-scroll.
  - customer-wallet.tsx: رصيد ضخم <Ly bold text-5xl/>، شارة نوع المحفظة، Alert أحمر للحظر مع blockedReason، آخر 20 حركة (label عربي للحالة + narration + ±مبلغ font-money أخضر/أحمر بحسب toWalletId)، زر تغيير الهاتف يعيد PhoneGate، قائمة max-h-[46vh] wasel-scroll.
- فحوصات: bunx tsc --noEmit مُرشّح لملفاتي = CLEAN (الأخطاء الباقية في ملفات آخرين: skills/ و api/accounting و DriverDTO typing — خارج نطاقي). لا $ إطلاقاً (فقط د.ل عبر Ly)، لا withOpacity، لا indigo/blue، لا any، 'use client' في العشرة ملفات، أهداف لمس ≥48px.

Stage Summary:
- تطبيق الزبون مكتمل 100% ومتوافق مع العقود الخلفية الجاهزة: تصفح ضيوف بلا تسجيل → منيو وسلة بمتجر واحد → checkout بطلب هوية الهاتف فقط → تتبع حي (socket + استقصاء احتياطي 4s مع cleanup نظيف) بـ OTP ومسار على خريطة نالوت → سجل طلبات ومحفظة بالهاتف.
- قرارات: بنية ملفات customer-* منفصلة لكل شاشة مع customer-shared للعناصر المشتركة؛ زر إلغاء الزبون حُذف تماماً حسب التعليمات؛ 'accepted' يُعرض ضمن مرحلة التحضير في الـ stepper مع بقاء StatusBadge بالتسمية الفعلية؛ التحقق من الهاتف بنمط مبني من LIBYAN_PHONE_PREFIXES؛ أرقام المبالغ كلها font-money لاتينية عبر <Ly/>؛ إزالة السلة عند نجاح الطلب فقط.
- ملاحظة لمن يلي: أخطاء tsc القائمة في src/app/api/accounting/summary/route.ts (typing DriverDTO/createdAt) وليست من مهام 7-a.
Task ID: 8-9 (التكامل وضمان الجودة)
Agent: Z.ai (الوكيل الرئيسي)
Task: تكامل التطبيقات الأربعة + QA بالمسار الذهبي الكامل عبر curl و agent-browser + إصلاحات.

Work Log:
- tsc --noEmit نظيف (بعد إصلاح: ترتيب DailyAudit بـ auditDate، cast حالة الكابتن في summary، استيراد DriverDTO).
- ESLint نظيف: إصلاح 5 أخطاء react-hooks/set-state-in-effect في ملفات الزبون (queueMicrotask) + حذف eslint-disable مهمل في CaptainApp.
- اختبار مسار ذهبي عبر curl: checkout (WSL-260923-0001، 67.30 د.ل، أجرة 6.30) → قبول مطبخ 15د → رادار (1 عرض) → 🔒 قفل handover 423 قبل الجاهزية → ready → handover → OTP خاطئ 401 → OTP صحيح → delivered.
- تدقيق القيد المزدوج مطابق: عهدة 67.30 = الإجمالي، مستحقات متجر 54.90 = 90%×61، منصة 6.10 = 10%×61، أرباح كابتن 6.30 = كامل الأجرة. تسوية: سند RV-260923-001 والعهدة صفرت.
- اختبار الدفع بالمحفظة: 150 - 28.30 = 121.70، بلا كاش في العهدة، الضمان يُحرر عند التسليم. ✅
- إصلاح خطأ اتساق مكتشف: accept-offer وdispatchRadar كانا يرفضان ready_for_pickup — أصبحا يقبلانها (الطلبات الجاهزة تُعرض في الرادار وقابلة للقبول).
- QA عبر agent-browser (3 تبويبات متزامنة!): هبوط فاخر → زبون (استكشاف → منيو → Sheet صنف بعداد وملاحظات → سلة 3 أصناف/84.00 → ميثاق شرعي → دفع كاش → تتبع مع خريطة نالوت وOTP ضخم 1752 ورنين مطبخ) → مطبخ KDS (طلب نابض → قبول 15د → «أُشعل رادار الكباتن» → جاهزة) → كابتن (رادار دائري ذهبي بعداد 15ث → قبول → 4 مراحل → 🔒 مقفل فعلياً حتى جاهزية المطبخ عبر socket → فك فوري → OTP 1752 → 🎉 اكتملت الرحلة 6.30 أجرة + 90.30 عهدة) → إدارة (PIN 7788 → KPIs دقيقة: GMV 185.90/كاش 157.60/تجار 150.30/منصة 16.70/عهد 90.30 → أسطول حي ب4 كباتن → تسوية عهدة بسند قبض رسمي RV-260923-002 90.30 د.ل → محضر Z جاهز).
- فحص موبايل 390×844: بوابة PIN وتبويبات الإدارة متجاوبة بشكل ممتاز.
- إصلاح تجميلي: NalutMap خلفية زمرردية داكنة + preserveAspectRatio slice + dir=ltr (كانت تظهر خلفية بيضاء حول الخريطة).

Stage Summary:
- المنظومة مكتملة ويعمل مسارها الذهبي كاملاً بثلاثة أدوار متزامنة عبر WebSockets حية.
- كل الحراس تعمل: قفل المطبخ 423، OTP 401، PIN 401، حظر الهواتف، سقف العهدة 500، هاتف ليبي 091-094.
- بيانات تجريبية بالقاعدة: 3 طلبات مسلّمة (2 كاش + 1 محفظة)، سندا قبض، محفوظات قيود كاملة.
- الحالة: جاهزة للعرض. الملفات: ~40 ملف مصدري (24 واجهة + 17 API + 10 lib + خدمة لحظية).
---
Task ID: CRON-R2 (جولة المراجعة الدورية الثانية)
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح، ثم تطوير ميزات جديدة (تقييمات، فتح/إغلاق متجر، ETA، إحصائيات حية، صورة بطل).

Work Log:
- الحالة: الخدمتان سليمتان (3000 + 3003/3013)، lint نظيف، أخطاء 500 في dev.log كانت تاريخية من مرحلة الوكلاء المتوازيين.
- QA متصفح اكتشف 3 فجوات وعالجها:
  1) بطاقات الطلبات المسلّمة في «طلباتي» كانت غير قابلة للفتح → شاشة تفاصيل طلب كاملة (فاتورة + تقييم) عبر customer-order-detail.tsx، والبطاقات صارت قابلة للنقر مع حالة تركيز ولوحة مفاتيح.
  2) نظام تقييم غائب → ميزة كاملة: أعمدة ratingSum/ratingCount للمتجر والكابتن + Order.ratedAt/storeStars/driverStars (db:push)، مسار POST /api/orders/{id}/rate (تقييم واحد لكل طلب، حماية هاتف الزبون، 409 للمكرر)، واجهة نجوم تفاعلية، المتوسطات تتحدث حياً (متجر 5.0 ثم 4.0 بعد تقييم ثانٍ، كابتن 5.0) وتُبث عبر order:rated.
  3) لا مفتاح إغلاق متجر → ميزة كاملة: مسار POST /api/stores/{id}/open-toggle + زر مفتاح في رأس المطبخ (أخضر/أحمر) + سؤاع socket store:status_changed + الخادم يرفض checkout 409 «المتجر مغلق حالياً» (مُختبر).
- ميزات إضافية:
  - بطاقة ⏱️ الوصول المتوقع (ETA) في شاشة التتبع: زمن تحضير متبقٍ + زمن رحلة هافرساين بسرعة 22 كم/س، شريط تقدم متحرك والمسافة بالكيلومتر.
  - /api/health الآن يرجع live{ordersToday, deliveredToday, gmvToday, onlineDrivers, activeOrders} وصفحة الهبوط تعرض 3 بطاقات حية (طلب اليوم، GMV، كباتن متصلون) مع تحديث كل 15 ثانية.
  - صورة بطل مولّدة بالذكاء الاصطناعي (سكوتر بصندوق ذهبي في قرية أمازيغية جبلية عند الغروب) كخلفية لقسم البطل بطبقة زمردية شفافة.
  - manifest.webmanifest (PWA خفيف: standalone، RTL، ألوان واصل) + ربطه في layout.
- 🚨 اكتشاف هندسي مهم: لا يمكن إعادة تشغيل dev server (start.sh يشغّل `bun run dev` بلا حلقة إعادة تشغيل — قتله يسقط التطبيق نهائياً)، وعميل Prisma القديم في ذاكرة العملية لا يرى أعمدة المخطط الجديدة (node_modules externalized بـ require cache). الحل المطبق:
  - مسار التقييم يكتب الأعمدة الجديدة عبر $executeRawUnsafe (يعمل مع العميلين القديم والجديد).
  - دالة patchNewOrderFields في orders-server.ts ترقّع ratedAt/storeStars/driverStars لنتائج القراءة عبر $queryRawUnsafe، ومسارا GET /api/orders و /api/orders/{id} يستخدمانها.
  - src/lib/db.ts استخدم مفتاح global مُوثّق (__waselPrismaClient_v2) لتفادي كاش globalThis القديم عند أي HMR مستقبلي.
- تحقق نهائي: tsc نظيف، ESLint نظيف، curl: تقييم 5/5 ثم 4/5 (متوسطات صحيحة)، مكرر 409، طلب من متجر مغلق 409، إعادة فتح تعمل، /api/health live صحيح (3 طلبات، GMV 185.90، 1/4 كباتن).
- متصفحاً: الهبوط بصورة البطل + إحصائيات حية، تفاصيل الطلب 0002 (فاتورة بيتزا القلعة 28.30)، تقييم 4+5 نجوم مسجل ويظهر للقراءة فقط مع رسالة شكر، مفتاح المتجر مغلق→مفتوح بانتقال بصري كامل.

Stage Summary:
- 3 ميزات جديدة متكاملة (تقييمات، إغلاق متجر، ETA) + إحصائيات حية + صورة بطل + PWA manifest.
- قيد معروف: حتى إعادة تشغيل الحاوية القادمة، أي وصول typed لأعمدة المخطط الجديدة يجب أن يمر عبر SQL الخام (النمط مطبق في rate + patchNewOrderFields). بعد أي إعادة تشغيل كاملة للعميل يصبح كل شيء typed طبيعي.
- توصيات الجولة القادمة: (1) اختبار نزاع no-show كاملاً بالمتصفح + التحقق من حظر الزبون عند الدفع. (2) صفحة سجل أحداث for المتاجر (store:status_changed). (3) تحسين مؤشر «انقطع البث» العابر بعد تبديل الأدوار. (4) نسبة نجاح التوزيع الزمنية في لوحة الإدارة. (5) اختبار موبايل كامل للتطبيقات الأربعة.

---
Task ID: CRON-R3 (جولة المراجعة الدورية الثالثة)
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح (نزاع no-show كامل + الحظر)، إصلاح 3 أخطاء، ثم 4 ميزات جديدة + تحسينات ستايل شاملة.

Work Log:
- الحالة: الخدمتان سليمتان (3000 + 3003/3013)، lint نظيف، tsc نظيف (أخطاء skills/ فقط خارج التطبيق).
- QA نزاع no-show كامل بالمسار الذهبي عبر agent-browser: طلب كاش جديد (مشويات شارع تونس 90 د.ل) → قبول API → غرفة الإدارة (PIN 7788) → تاب الطلبات → فض النزاع → توست مفصل → المتجر 81.00 (90%) + سند DV-260923-003 → المحفظة 403 «رقمك محظور» عند checkout → القيد المزدوج سليم.
- 🐛 إصلاح 1 (دقة مالية): توست النزاع كان يقول «أجرة الكابتن 6.30» حتى لو لم يُعيَّن كابتن — أضيف حقل captainPaid للـ API والرسالة تميز الحالتين («لا يوجد كابتن مُعيَّن — لم تُصرف أي أجرة»).
- 🐛 إصلاح 2 (UX الحظر): رقم محظور كان يُعطَّل فقط في المحفظة بالواجهة بينما الخادم يرفض كل الطلبات — الآن تحذير أحمر بارز + تعطيل زر التأكيد كلياً + validate يرفض الحظر.
- 🐛 إصلاح 3 (جذري بصري): اكتشاف أن body محسوبه أبيض lab(100 0 0) رغم صحة globals.css — سببه chunk CSS قديم عالق في كاش dev server (يحمل :root القديم بـ --background:#fff) — لمس globals.css أجبر إعادة ترجمة فأصبح body #041710. كان يظهر كحواف بيضاء حول كل البطاقات.
- 🎟️ ميزة كوبونات الخصم (المواصفة: Total = Subtotal + Fee − Discount):
  • src/lib/wasel/promos.ts: 3 كوبونات (WASEL10 نسبة 10% سقف 10، NAALUT5 ثابت 5، JEBEL15 نسبة 15% سقف 15) بحدود أدنى + computePromoDiscount خادميّة.
  • عمود Order.promoCode (db:push + generate) — كتابة/قراءة عبر SQL الخام ($executeRawUnsafe + ترقيع patchNewOrderFields) توافقاً مع عميل Prisma العالق بالذاكرة.
  • checkout API: promo_code → تحقق خادمي صارم → discountLyd + promoCode + total = subtotal+fee−discount (الخصم على المنصة، لا يمس 90% المتجر ولا أجرة الكابتن).
  • الواجهة: قسم كوبون في الدفع (بطاقات تذاكر منقطة بثقوب جانبية + إدخال + toast وفر + سطر خصم في ملخص الدفع/التتبع/الفاتورة/الاستلام الحراري).
  • اختبارات: WASEL10 (9.00 من 90)، JEBEL15 (13.50)، رفض كود مجهول، رفض حد أدنى، سلة صغيرة.
- 📊 ميزة: بطاقة «نجاح التوزيع (الرادار)» بلوحة الإدارة — dispatchEligible/dispatchAssigned في summary + بطاقة مخصصة بشريط تقدم متحرك (أخضر ≥80% / برتقالي) ونصيحة تشغيلية. ظهرت 100% (3/3).
- ❤️ ميزة: بطاقة ملف الولاء في «طلباتي» — طلبات مسلمة/إجمالي الإنفاق/وفّرتها بالكوبونات (27.50 حية) + المتجر المفضل بعدّاده.
- 📜 ميزة: شريط «آخر الأحداث» الحي في KDS — أحداث من store:new_order/status_changed/assigned/payout/status مع أوقات، يظهر بحركة AnimatePresence (تحقق حي بطلب مباشر عبر gateway).
- 🌟 ستايل: هبوط بحركة دخول متدرجة (hero + بوابات)، شريط ثقة (OTP/15-30 دقيقة/فواتير)، قسم «كوبونات واصل النشطة» بتذاكر منقطة، أعمدة ملونة للإحصائيات، bg-[#041710] لجذر الهبوط.
- 🔍 تشخيص معماري مهم: «انقطع البث» كان أثر فحص بالمتصفح عبر localhost:3000 مباشرة (يتجاوز بوابة Caddy:81 التي تخدم XTransformPort) — عبر localhost:81 متصل: connectedClients=1 والبث يعمل. التوصية: فحوص البث المستقبلية تكون عبر البوابة :81.
- تحقق نهائي: lint نظيف، tsc نظيف (باستثناء skills/)، لا أخطاء في dev.log، 4 لقطات موثقة في download/ (landing-new, tracking-promo, admin-dispatch, merchant-activity-live, mobile-loyalty2).

Stage Summary:
- المنظومة الآن: كوبونات شرعية شفافة تحملها المنصة + مؤشر رادار تشغيلي + ولاء زبون + سجل أحداث للمتجر + إصلاحات حظر/نزاع/CSS جذرية.
- بيانات تجريبية: 4 طلبات بكوبونات، حظر نشط لـ 0941234567، سند DV-260923-003.
- توصيات الجولة القادمة: (1) إدارة كوبونات من لوحة الإدارة (إنشاء/تعطيل بدل الترميز الثابت). (2) دفع أجرة نزاع للكابتن في سند مستقل وليس فقط increment صامت. (3) إشعار socket عند تطبيق كوبون ليظهر في شريط أحداث المتجر. (4) اختبار البث عبر :81 عند فحص أي شيء لحظي. (5) كوبون عربي الجنس (نسب بالكلمات) لتجنب ارتباك RTL في بطاقات التذاكر.
