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

---
Task ID: CRON-R4 (جولة المراجعة الدورية الرابعة)
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح عبر البوابة :81، ثم 4 ميزات جديدة (إدارة كوبونات DB، أكواد شحن المحفظة، إعادة الطلب، سند أجرة الكابتن في النزاعات) + تحسينات ستايل.

Work Log:
- الحالة عند البدء: الخدمتان سليمتان (3000 + 3003/3013)، lint و tsc نظيفان، QA استكشافي بالمتصفح (هبوط → زبون → محفظة → إدارة PIN 7788) بلا أي أخطاء — المنظومة مستقرة، فاختارنا تطوير ميزات جديدة بدل إصلاحات.
- 🎟️ ميزة 1 — إدارة كوبونات الخصم من غرفة العمليات (توصية CRON-R3 #1):
  • جدول PromoCode جديد في المخطط (db:push) — الوصول كله عبر SQL خام ($queryRawUnsafe/$executeRawUnsafe) توافقاً مع عميل Prisma العالق بالذاكرة (النمط الموثق من CRON-R2).
  • src/lib/wasel/promos-server.ts: زرع تلقائي للكوبونات الرسمية الثلاث (INSERT OR IGNORE)، getActivePromos مع fallback للثوابت، computePromoDiscountDb (تحقق خادمي نهائي: موجود/نشط/حد أدنى/سقف/لا يتجاوز الأصناف)، recordPromoUsage.
  • مسارات: GET /api/promos (عام — نشط فقط)، GET/POST/PATCH /api/admin/promos بدرع PIN (كود 3-16 حرفاً إنجليزي، نسبة 1-90 أو مبلغ ثابت، سقف اختياري يجب أن يزيد عن الثابت، رفض مكرر 409 برسالة عربية).
  • checkout صار يتحقق من جدول DB بدل الثوابت + يسجل الإحصائيات + يبث store:promo_applied إلى [store:{id}, admin:fleet] (توصية CRON-R3 #3).
  • تاب «التسويق» جديد في AdminApp (أيقونة TicketPercent) — admin-marketing.tsx: بطاقات كوبون بشكل تذاكر مثقوبة (ثقوب جانبية + خط perforation أفقي) بمفتاح Switch للتفعيل/التعطيل + شارات إحصائية (قيمة الخصم/حد أدنى/مرات استخدام/إجمالي ما وُفّر) + Dialog إنشاء كوبون كامل (كود، اسم، وصف، نوع، نسبة/مبلغ، سقف، حد أدنى، إيموجي) + شريط إحصائيات علوي. تحميل الكوبونات والأكواد أُضيف إلى loadAll الدوري كل 8 ثوانٍ.
  • الواجهات صارت ديناميكية: الهبوط (page.tsx) وشاشة الدفع (customer-checkout.tsx) يجلبان /api/promos مع بقاء الثوابت كاحتياط — computePromoDiscount عمّت لتقبل قائمة.
- 🎁 ميزة 2 — أكواد شحن المحفظة (بطاقات هدية مسبقة الدفع — شرعية: دفعة مقدمة بلا ربا ولا غرر):
  • جدول TopupCode جديد (code WASL-XXXX-XXXX، فئة، مرة واحدة، usedByPhone/usedAt، ملاحظة).
  • مسارات: GET/POST/PATCH /api/admin/topup-codes (توليد دفعة 1-20 كوداً بفئة 5-500 د.ل مع معالجة تصادم الكود، تعطيل ممنوع على كود مستهلك)، POST /api/wallet/redeem (تحقق هاتف ليبي + حظر، استهلاك ذرّي شرطي usedByPhone IS NULL، شحن المحفظة upsert، قيد مزدوج type topup، بث wallet:topup_redeemed للإدارة).
  • واجهة الزبون: بطاقة «شحن بكود هدية» مثقوبة في المحفظة بإدخال uppercase وزر شحن زمرد + رسالة نجاح بالرصيد الجديد + label «دفعة مقدمة شرعية»؛ حركة topup تظهر «شحن بكود هدية 🎁» في سجل الحركات.
  • واجهة الإدارة: نفس تاب التسويق — توليد أكواد (فئة/عدد/ملاحظة)، قائمة أكواد بحالة (نشط/مستهلك/معطل) + زر نسخ للحافظة + Switch للتعطيل (مخفي على المستهلك) + إحصائيات (جاهز/مستهلك/أُعيدت للمحافظ).
- 🔁 ميزة 3 — إعادة الطلب: زر «إعادة الطلب» زمرد على الطلبات المسلّمة في «طلباتي» (بدل سطر نصي) وفي بطاقة الفاتورة (customer-order-detail) — يُرجع الأصناف بكمياتها وأسعارها التاريخية إلى السلة (سياسة متجر واحد محفوظة) + toast ذهبي + انتقال مباشر للسلة.
- 🧾 ميزة 4 — سند صرف مستقل لأجرة الكابتن في نزاع no-show (توصية CRON-R3 #2): resolve-noshow ينشئ سند DV ثانياً بـ beneficiaryRole 'driver' باسم الكابتن ومبلغ أجرة التوصيل الكاملة + قيد مزدوج dispute صريح، ويُعاد captainVoucher في الاستجابة، وtoast الإدارة يذكر رقم السند. تحقق حي: DV-260923-006 لأحمد يونس 6.30 بجانب DV-260923-005 للمتجر 22.50 — القيد المزدوج سليم (محفظة الكابتن 18.90+6.30=25.20).
- 🐛 إصلاح متانة: accept-offer كان يرجع PrismaClientValidationError خام عند غياب driver_id — أضيف حرس 400 برسالة عربية «معرف الكابتن مطلوب».
- 🌟 ستايل إضافي: أحداث promo/topup في سجل أحداث لوحة المؤشرات (أيقونات TicketPercent/Gift زمردية-ذهبية)، FeedEvent وسّع بـ kind 'promo'|'topup'، رسالة toast النزاع تميز سند الكابتن.
- QA حية شاملة (كلها عبر البوابة :81):
  • curl: زرع الكوبونات تلقائياً، إنشاء RAMADAN20 (20% سقف 12 من 40) → checkout 75 د.ل خصم 12 (السقف يعمل!) → usedCount 1→2 بعد طلب ثانٍ، مكرر 409، تعطيل → «هذا الكوبون مُعطّل حالياً»، إعادة تفعيل تعمل.
  • curl: توليد 3 أكواد 25 د.ل → شحن 0940000111 (رصيد 25) → إعادة استهلاك 409 → كود مجهول 404 → هاتف محظور 403 → القيد المزدوج سليم.
  • متصفحاً: RAMADAN20 ظهر تلقائياً على الهبوط (4 كوبونات)، تاب التسويق ببطاقات التذاكر والمفاتيح، شحن الكود من واجهة المحفظة (25→50 فوراً + رسالة نجاح)، زر إعادة الطلب حوّل طلب 0003 إلى سلة (ترية ×3 = 84.00)، checkout بشرائح كوبونات ديناميكية وتعتيم غير المؤهل.
  • بث لحظي بين تبويبين: checkout بكوبون NAALUT5 → ظهر فوراً في KDS بيتزا القلعة (🔔 طلب جديد + 🎟️ كوبون في سجل النشاط) وفي سجل غرفة الإدارة (🎟️ استخدم الزبون…) — عبر socket حي.
  • موبايل 390×844: طلباتي بأزرار إعادة الطلب والإحصائيات متجاوبة.
- لقطات موثقة في download/: qa4-landing-coupons, qa4-admin-marketing, qa4-admin-gifts, qa4-wallet-gift, qa4-wallet-redeemed, qa4-orders-reorder, qa4-cart-reorder, qa4-checkout-promos, qa4-merchant-promo.

Stage Summary:
- المنظومة اكتملت حلقة التسويق والولاء: كوبونات مُدارة مركزياً بتحقق خادمي مزدوج (واجهة + خادم + DB)، أكواد شحن شرعية مسبقة الدفع بقيد مزدوج، إعادة طلب بلمسة، ومحاسبة نزاعات موثقة بسندات مستقلة لكل طرف.
- الحراس الجديدة: كود مكرر 409، كوبون معطل مرفوض خادمياً، كود هدية يُستهلك ذرّياً مرة واحدة، الهاتف المحظور لا يشحن ولا يطلب، كود مستهلك لا يُعدّل.
- بيانات تجريبية جديدة: كوبون RAMADAN20 نشط (2 استخدامات/24.00 وُفّرت)، 3 أكواد هدية (2 نشط + 1 مستهلك لـ 0940000111 برصيد 50)، محفظة 0940000111.
- ملاحظة معمارية: جميع الوصول للجدولين الجديدين عبر SQL خام — بعد أي إعادة تشغيل كاملة للحاوية يمكن تحويله typed طبيعي إن رغبتم.
- توصيات الجولة القادمة: (1) تحليلات الكوبونات في تقرير Z (خصومات اليوم ضمن المحضر). (2) إشعار زبون عند اقتراب انتهاء حملة كوبون (عدد استخدامات محدود). (3) بيع أكواد الشحن كمنتج في واصل متاع (متجر marketplace يبيع الأكواد). (4) قائمة إشعارات الزبون داخل التطبيق (order:status_changed تُجمع في صندوق وارد). (5) فحص Lighthouse للـ PWA.

---
Task ID: CRON-R5 (جولة المراجعة الدورية الخامسة — قيد التنفيذ)
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح، ثم 3 ميزات جديدة: صندوق إشعارات الزبون اللحظي، بطاقات الشحن كمنتجات في واصل متاع (إصدار أكواد عند التسليم)، تحليلات الكوبونات في محضر Z.

Work Log (حتى الآن):
- الحالة عند البدء: الخدمتان سليمتان (3000 + 3003/3013)، lint وtsc نظيفان، QA استكشافي (هبوط/زبون/متجر/PIN) بلا أخطاء — استمرار تطوير ميزات.
- 🔔 ميزة 1 — صندوق إشعارات الزبون (توصية CRON-R4 #4):
  • src/lib/wasel/notifications-server.ts (جديد): notifyCustomer تبث لغرفة customer:{phone} عبر customer:notify + orderNotifyText نصوص عربية موحدة لكل حالة + issueGiftCardsForOrder + ensureGiftCardProducts.
  • types.ts: WaselNotification {id dedup, kind order|wallet|gift, title, body, orderId, codes…}.
  • store.ts: notifications[] محفوظة بـ persist (40 كحد أقصى) + pushNotification بمنع تكرار صارم بالمفتاح + markNotificationsRead + clearNotifications.
  • customer-notifications.tsx (جديد): جرس 48px بشارة غير المقروء (حتى ٩+) + Sheet جانبية فاخرة ببطاقات تذاكر مثقوبة، أيقونة لكل نوع، «قبل X د»، زر تتبع الطلب، عرض أكواد بطاقات الشحن داخل الصندوق، مسح الكل، حالة فراغ أنيقة.
  • CustomerApp: الجرس في الرأس بجانب السلة؛ الاشتراك بغرفة customer:{phone} عند توفر الهوية + استقصاء احتياطي 12 ثانية بفرق الحالة (يلتقط ما فاته البث) + توست ذهبي لكل إشعار جديد.
  • خطافات الخادم: checkout (placed) → status accept/ready/reject (preparing/ready_for_pickup/cancelled) → accept-offer (تعيين كابتن باسمه ولوحته) → handover (out_for_delivery) → deliver (delivered) → wallet/redeem (شحن المحفظة). كلها بنفس مفتاح order:{id}:{status} فلا تكرار بين البث والاستقصاء.
- 🎁 ميزة 2 — بطاقات الشحن كمنتجات في واصل متاع (توصية CRON-R4 #3):
  • منتجات giftcard-25/50/100 في متع mataa-electronics (زرع تلقائي idempotent عبر ensureGiftCardProducts عند كل checkout + إضافتها لـ seed-data.ts لقواعد جديدة).
  • عند التسليم: issueGiftCardsForOrder تولّد TopupCode فعلياً لكل وحدة (نفس مولّد WASL-XXXX-XXXX مع معالجة تصادم) + قيد مزدوج gift_card_issued + بث store:giftcard_sold للإدارة + إشعار الزبون بالأكواد مباشرة في الصندوق.
- 🎟️ ميزة 3 — تحليلات الكوبونات في لوحة المؤشرات (توصية CRON-R4 #1):
  • summary API: promoDiscountLyd (إجمالي خصومات اليوم) + promoOrders + promoBreakdown (GROUP BY promoCode عبر SQL خام).
  • AccountingSummary موسع + بطاقة «كوبونات اليوم (تحمّلتها المنصة)» في داشبورد الإدارة مع تفصيل أكواد (استخدامات × وفر) ونصيحة تشغيلية.
- 🌟 ستايل: شبكة كوبونات الهبوط sm:grid-cols-2 lg:grid-cols-4 (لا بطاقة يتيمة)، الجرس بتصميم مطابق للسلة.
- إصلاح lint: إزالة تحديث ref أثناء render (react-hooks/refs) في customer-notifications.
- tsc نظيف، ESLint نظيف. QA الوظائف الجديدة API/متصفحاً: قيد الإنجاز في هذا الدور.

Work Log (الاكتمال والتحقق):
- 🐛 إصلاح مكتشف بالاختبار: استعلام promoBreakdown الخام كان يقارن التاريخ بـ ISO نصي بينما Prisma يخزن SQLite DateTime كـ epoch millis — استبدل بـ todayStart.getTime() وظهر التفصيل فوراً (RAMADAN20 2×24.00 / NAALUT5 3×15.00 / JEBEL15 1×13.50 / WASEL10 2×13.10).
- 🐛 إصلاح: بطاقات الشحن لم تكن تظهر في منيو متجر واصل متاع (الزرع كان عند checkout فقط) — أضفت ensureGiftCardProducts لمسار /api/stores/{id}/menu (idempotent) وظهرت فوراً.
- 🐛 إصلاح lint: إزالة تحديث ref أثناء render في customer-notifications (react-hooks/refs).
- توصيل حدث store:giftcard_sold لغرفة المتجر أيضاً وأضفت معالجه في سجل نشاط KDS (🎁 بيع بطاقات شحن...) وفي سجل غرفة الإدارة (💳 صُدرت بطاقات... التزام على المنصة).
- تحسين شبكة داشبورد الإدارة: بطاقتا نجاح التوزيع وكوبونات اليوم تمتد col-span-2 md:3 xl:2 — صف أخير متوازن تماماً بلا فراغات.
- شبكة كوبونات الهبوط أصبحت sm:grid-cols-2 lg:grid-cols-4 — 4 كوبونات في صف واحد متوازن (تحقق بصري).

QA الحية الشاملة (كلها عبر البوابة :81):
- تدفق بطاقة الشحن كاملاً من الواجهة: متجر واصل متاع → بطاقة 25 د.ل في السلة → checkout (سالم أغوجة 0917778889 كاش، أجرة 8.75) → تتبع WSL-260923-0017 → (accept/assign/ready/handover/deliver عبر API) → الجرس ظهر 6 غير مقروء + توست «اكتمل التوصيل» حي → صندوق الإشعارات ببطاقات التذاكر عرض كود WASL-36AY-T689 داخل إطار منقّط → شاشة المحفظة استرداد الكود → الرصيد 75 → 100.00 د.ل + توست «شُحنت محفظتك» + إشعار wallet في الصندوق.
- تدفق API مستقل سابق: طلب بطاقتين (25+50) 0917778889 → 7 إشعارات لحظية متسلسلة وصلت كلها عبر غرفة customer:0917778889 (placed/preparing/assigned/ready/out/gift/delivered) — موثقة في /tmp/wasel-qa/notify.log.
- القيد المزدوج لطلب البطاقات سليم: custody_collect 83.75 = الإجمالي، store_payout 67.5 = 90%×75، platform_commission 7.5 = 10%×75، settlement 8.75 = كامل الأجرة، gift_card_issued 75.0 (التزام escrow→customer).
- حماية التكرار: re-deliver يرفض 409 والأكواد بقيت 2 فقط؛ مفاتيح الإشعار order:{id}:{status} تمنع التكرار بين البث والاستقصاء.
- summary API: promoDiscountLyd 65.6 | promoOrders 8 | breakdown 4 أكواد — وبطاقة «كوبونات اليوم» ظهرت في داشبورد الإدارة بالتفصيل والنصيحة.
- الاسترداد بث إشعار wallet لحظياً (تحقق بمستمع socket ثانٍ: «شُحنت محفظتك بنجاح... رصيدك الآن 75.00»).
- موبايل 390×844: لوحة الإشعارات بعرض كامل، بطاقات مقروءة، طوابع وقت «قبل X د»، أزرار تتبع 44px+.

Stage Summary:
- 3 ميزات جديدة مكتملة ومدققة: (1) صندوق إشعارات الزبون اللحظي (بث + استقصاء احتياطي + منع تكرار + persist). (2) بطاقات الشحن كمنتجات في واصل متاع بإصدار أكواد عند التسليم وإشعار مباشر بالأكواد. (3) تحليلات كوبونات اليوم في محضر Z/الداشبورد.
- ملفات جديدة: src/lib/wasel/notifications-server.ts + src/components/apps/customer-notifications.tsx. ملفات معدلة: types/store (إشعارات + حقول تحليلات)، CustomerApp (الجرس)، 5 مسارات API (checkout/status/accept-offer/handover/deliver) + wallet/redeem + menu + summary + seed-data + MerchantApp/AdminApp (أحداث الهدايا) + admin-dashboard (بطاقة الكوبونات) + page.tsx (شبكة الكوبونات).
- lint وtsc نظيفان، لا أخطاء في dev.log، 10 لقطات موثقة في download/ (qa5-*).
- بيانات تجريبية جديدة: طلبان ببطاقات شحن (0016 API / 0017 واجهة)، أكواد صادرة (واحد مستهلك 0917778889 رصيده 100)، DRV-02 متصل.
- توصيات الجولة القادمة: (1) شارة «بطاقة شحن» في عناصر السلة/الفاتورة مع أيقونة مميزة وسطر «الكود يُصدر عند التسليم». (2) تجميع الإشعارات القديمة تحت «الأقدم» بعد 24 سا. (3) عداد استخدام الكوبونات المتبقي (maxUses) مع تحذير الزبون عند اقتراب النفاد. (4) إشعار سطح المكتب (Notification API) للزبون عند وصول إشعار والتطبيق بالخلفية. (5) تصدير تقرير Z اليومي PDF من لوحة الإدارة.

---
Task ID: CRON-R6 (جولة المراجعة الدورية السادسة)
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح عبر البوابة :81، ثم 5 ميزات جديدة (حصة الكوبونات maxUses، شارات بطاقات الشحن في السلة/الفاتورة/KDS، تجميع الإشعارات الأقدم، إشعارات سطح المكتب، طباعة محضر Z PDF) + تحسينات ستايل إجبارية.

Work Log:
- الحالة عند البدء: الخدمتان سليمتان (3000 + 3003/3013 عبر البوابة :81)، lint وtsc نظيفان، QA استكشافي (هبوط → زبون → متجر → إدارة PIN) بلا أي أخطاء — بوابة PIN رفضت التجاوز عبر localStorage (adminUnlocked لا يُحترم إلا من الواجهة) — المنظومة مستقرة، فاختارنا تطوير ميزات بدل إصلاحات.
- 🔥 ميزة 1 — حصة استخدام الكوبونات (maxUses) مع عدّاد ندرة حي (توصية CRON-R5 #3):
  • prisma/schema.prisma: عمود maxUses Int? على PromoCode + db:push ناجح.
  • promos-server.ts: PromoRow/promoRowToDef يحملان maxUses؛ computePromoDiscountDb يرفض النافد برسالة «نفدت نسخ هذا الكوبون — استُخدمت كل الحصص المخصصة»؛ recordPromoUsage صار UPDATE ذرّياً بشرط usedCount < maxUses (لا تجاوز للحصة حتى في السباق)؛ getActivePromosWithMeta جديد يعيد usedCount + remainingUses ويخفي النافد تلقائياً.
  • /api/promos يعيد العدّادات الحية؛ /api/admin/promos POST يقبل maxUses (1+ أو null لغير محدود) وGET يمرره.
  • الواجهات: شارة ندرة على كوبونات الهبوط والدفع «🔥 متبقٍ X استخدامات فقط» (كهرمانية ≤3، حمراء نابضة عند 1)؛ تذاكر الإدارة تعرض «مرات الاستخدام 1/3» مع شريط تقدم ملون (زمردي/كهرماني ≥75%/أحمر عند النفاد)؛ حقل «حصة الاستخدام» في Dialog إنشاء الكوبون مع معاينة الشارة.
  • اختبار حي كامل: إنشاء LAST3 (15% سقف 8، من 25، maxUses=3) → طلب حقيقي 25→21.25 والعدّاد نزل 1→(2 متبقية) → استنفاد يدوي بالـDB → الكوبون اختفى من /api/promos وcheckout الخادمي رفضه بالرسالة الصحيحة → أُعيد usedCount=1 للبيانات التجريبية.
- 💳 ميزة 2 — شارات بطاقات الشحن في كل نقطة تماس (توصية CRON-R5 #1):
  • السلة: عنصر البطاقة بإطار ذهبي منقّط متدرج + شارة «💳 بطاقة شحن» ذهبية عائمة + سطر «🔐 الكود يُصدر آلياً عند التسليم» (كشف تلقائي بادئة giftcard- بلا تغيير مخطط).
  • الدفع: شريط تذكرة مثقوبة «يتضمن طلبك N بطاقة شحن واصل» مع توضيح الإصدار الآلي عند التسليم.
  • الفاتورة (customer-order-detail): شارة مصغرة بجانب الصنف + سطر «الكود أُصدر آلياً عند التسليم — تجده في صندوق الإشعارات».
  • KDS المتجر (ItemsList المشتركة بين الطلب والطباعة): تنبيه ذهبي منقّط أعلى الأصناف «لا يوجد بضاعة تُسلّم — الإصدار آلي من المنصة» + شارة على الصنف نفسه (بنسختي الخلفية الداكنة والطباعة الفاتحة).
- 🕐 ميزة 3 — تجميع الإشعارات الأقدم بعد 24 سا (توصية CRON-R5 #2):
  • customer-notifications.tsx: تقسيم recent/older على حد 24 ساعة + فاصل «🕐 الأقدم — قبل أكثر من 24 ساعة» بحبوب وسط خطين متدرجين + بطاقات مدمجة خافتة للأقدم (بلا ثقوب/بلا نقطة غير المقروء/سطر واحد للنص) — استخراج renderCard موحّد بمعامل compact/animate يمنع تكرار الماركب.
  • تحقق حي: تعمير إشعار تجريبي إلى 30 سا عبر localStorage → الفاصل والبطاقة المدمجة ظهرا («قبل 1 يوم»).
- 🖥️ ميزة 4 — إشعارات سطح المكتب (Notification API) (توصية CRON-R5 #4):
  • في ingest: عند document.hidden والإذن granted يطلق Notification بعربية RTL وtag=n.id (منع التكدس) وicon=/logo.svg وonclick يعيد التركيز — بلا أخطاء في المتصفحات التي تتطلب ServiceWorker (try/catch).
  • زر تذييل اللوحة «فعّل إشعارات الجهاز لتصلك التنبيهات في الخلفية» (44px+) يتحول لإيمerald «مفعلة ✓» بعد المنح، ويختفي إن كان الإذن denied — ظهر وتم التحقق بصرياً في اللوحة.
- 🖨️ ميزة 5 — طباعة محضر Z / حفظه PDF (توصية CRON-R5 #5):
  • admin-z.tsx: buildZPrintHtml يولّد A4 عربي RTL احترافي (ترويسة خضراء بشعار واصل، كود المحضر ذهبي، جدول مبالغ dotted، ختم «كل قرش مُساءل»، خانتا توقيع أمين الصندوق/مدير العمليات، تذييل بالدينار الليبي) + printZReport عبر iframe خفي (لا يمس الثيم الداكن) مع تنظيف تلقائي بعد الطباعة.
  • زر «طباعة المحضر / حفظه PDF» في Dialog المحضر + زر طابعة 8px لكل صف في سجل المحاضر السابقة.
  • اختبار حي: تقفيل يومية حقيقي أُصدر Z-260923-01 (GMV 303.90 / كاش 275.60 / منصة 26.70 / 18 طلباً) → الزر فتح مسار الطباعة بلا أخطاء والمحتوى وُلّد سليماً.
- 🌟 ستايل إجباري إضافي:
  • globals.css: :focus-visible حلقة ذهبية موحدة (إتاحة + هوية)، إزالة -webkit-tap-highlight-color للجوال، scroll-behavior smooth، .ticket-sheen سحب ضوئي بطيء متكرر لتذاكر الكوبونات، .card-lift رفعة تحويم بظل.
  • شبكة كوبونات الهبوط صارت flex-wrap justify-center (بلا بطاقة يتيمة مهما كان عدد الكوبونات — 5 كوبونات الآن = 4 + 1 وسطية) مع عرض محسوب sm:50%/lg:25%.
- QA حية شاملة (كلها عبر البوابة :81): تدفق السلة→الدفع ببطاقة شحن مع الشارات الثلاث الجديدة، تطبيق LAST3 والخصم الصحيح 3.75، طلب حقيقي WSL-260923-0018 وتتبعه، عدّاد الاستخدام الحي على الهبوط والدفع ولوحة الإدارة، موبايل 390×844 للكوبونات وKDS، إشعار KDS للمتجر.
- lint وtsc نظيفان، لا أخطاء في dev.log، 12 لقطة موثقة في download/ (qa6-*).

Stage Summary:
- اكتملت حلقة «ندرة وشفافية» التسويق: حصص كوبونات مُدارة مركزياً بعدّاد حي وذرّي لا يُتجاوز، الكوبون النافد يختفي تلقائياً ولا يقبل الخادم إلا الحصص المتاحة.
- بطاقات الشحن صارت واضحة لكل الأطراف (الزبون في السلة/الفاتورة، والمتجر في KDS) مع توضيح شرعي صريح: دفعة مقدمة، الكود يُصدر آلياً عند التسليم من المنصة لا من المتجر.
- صندوق الإشعارات نظيف زمنياً (الأقدم مدمج خافت) وتصل التنبيهات للجهاز حتى بالخلفية بمحارف عربية صحيحة.
- محاضر Z أصبحت وثيقة رسمية قابلة للطباعة/PDF بالعربية بخانتَي توقيع — تُطبع من السجل التاريخي أيضاً.
- بيانات تجريبية جديدة: كوبون LAST3 نشط (1/3 استخدامات — يعرض شارة الندرة)، محضر Z-260923-01، طلب بطاقة شحن 0018، 5 كوبونات على الهبوط.
- ملاحظة: عمود maxUses يُدار بـ SQL خام كالجدولين السابقين (توافق عميل Prisma العالق بالذاكرة) — إن أُعيد توليد العميل يمكن تحويله typed.
- توصيات الجولة القادمة: (1) تحليلات الندرة في تقرير Z (كم طلباً خسر بعد نفاد الحصة — لوحة فرص). (2) كوبونات بمحفظة (خصم يُودع رصيداً بدل خصم فاتورة). (3) إشعار Zbون عند نفاد حصة كوبون مُتابَع (watch). (4) توقيع إلكتروني/ختم SVG في طباعة محضر Z. (5) اختبار Lighthouse للـ PWA وتحسين درجة الأداء. (6) أخذ لقطة خريطة أسطول حية في داشبورد الإدارة كصورة مصغرة.

---
Task ID: CRON-R7 (جولة المراجعة الدورية السابعة)
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح عبر agent-browser، ثم 4 ميزات جديدة (تحليلات الفرص الضائعة، كوبونات كاش باك المحفظة، خريطة الأسطول المصغرة في الداشبورد، ختم إلكتروني SVG في محضر Z) + تحسينات ستايل إجبارية.

Work Log — القسم 1: الحالة عند البدء والتقييم:
- قراءة worklog.md كاملاً: 6 جولات سابقة (Task 1-2 ثم CRON-R1..R6) — منظومة ناضجة بكل الحلقات.
- فحص الصحة: /api/health سليم (9 متاجر، 4 كباتن، 18 طلب اليوم، GMV 303.90) + wasel-realtime على 3003/3013 يعمل (uptime 13240s).
- tsc وESLint نظيفان (الأخطاء الوحيدة في skills/ خارج المشروع)، dev.log بلا أخطاء.
- QA استكشافي بـ agent-browser عبر البوابة :81: الهبوط (إحصائيات حية + 5 كوبونات)، تطبيق الزبون (تصفح/فلاتر/متجر)، درع PIN (7788 رفض التجاوز عبر localStorage)، الداشبورد (كل البطاقات) — صفر أخطاء صفحة وصفر أخطاء كونسول. الحكم: مستقر → ميزات جديدة بدل إصلاحات.

Work Log — القسم 2: التنفيذ والتحقق:
- 📉 ميزة 1 — تحليلات الفرص الضائعة (توصية CRON-R6 #1):
  • جدول PromoReject جديد (schema.prisma + db:push + CREATE TABLE IF NOT EXISTS احتياطي): code, reason (exhausted|disabled|min_not_met|unknown), phoneMasked (091****889), subtotalLyd, wouldDiscountLyd, createdAt.
  • promos-server.ts: recordPromoReject (أكواد معروفة فقط — نظافة من أخطاء الكتابة) + getPromoRejectStats (GROUP BY مع topReason) + computePromoDiscountDb أعاد {reason, row} عند الرفض.
  • checkout يسجل الرفض قبل إرجاع الخطأ؛ summary API يعيد promoRejects {count, lostLyd, breakdown}؛ بطاقة «فرص ضائعة اليوم» في الداشبورد (كهرمانية/حمراء ≥5 مع شارة خسارة ≈ د.ل وتفصيل الأكواد ونصيحة «زِد الحصة أو جدّد الكود»)؛ close-day يختم الأرقام في أعمدة DailyAudit الجديدة (promoRejectsCount/promoRejectsLossLyd) عبر UPDATE..RETURNING خام.
  • اختبار حي: تعطيل CASH5 ثم محاولة سلة 28 → رفض «مُعطّل» ومسجل؛ إعادة تفعيل ثم سلة 5 → رفض «تحت الحد» ومسجل؛ summary: count=2، lostLyd=5، topReason=min_not_met ✓.
- 💸 ميزة 2 — كوبونات كاش باك المحفظة (توصية CRON-R6 #2):
  • kind='cashback' جديد عبر كل السلسلة: promos.ts (PromoResult + cashback?؛ لا خصم فاتورة) وpromos-server (تحقق خادمي: نسبة/ثابت مع سقف، لا يتجاوز قيمة السلة) وPOST /api/admin/promos.
  • عمود Order.cashbackLyd (schema + db:push + كتابة SQL خام مع promoCode).
  • checkout: discount=0 والكاش باك يُخزن بالطلب + recordPromoUsage بالقيمة + بث store:promo_applied مع promoKind/cashbackLyd.
  • deliver: creditPromoCashback — قراءة خام، حماية idempotency (نوع قيد promo_cashback)، قيد مزدوج من platform_revenue → محفظة الزبون، إشعار الزبون «💸 كاش باك وصل محفظتك!»، بث wallet:promo_cashback للإدارة والمتجر.
  • الواجهات: شريحة كاش باك زمردية في الدفع مع «+X د.ل لمحفظتك بعد التسليم» وصندوق تطبيق مميز وتوست مخصص؛ تذكرة الإدارة بشارة «💸 كاش باك» وقيمة إيداع؛ Dialog الإنشاء بخيار «💸 كاش باك محفظة» وتوضيح شرعي؛ سجل KDS/Dashbورد يفرق الكاش باك؛ محفظة الزبون: حركة «كاش باك كوبون 💸».
  • اختبار حي كامل API: CASH5 (ثابت 5، من 20) → طلب تريدية 28 (خصم 0، إجمالي 36.9 سليم) → قبول/جاهز/تسليم كابتن → توصيل OTP → محفظة 0920000111 رصيد 5.00 بنوع promo_cashback من platform_revenue + إشعار + بث ✓. summary: promoCashbackLyd=5 عبر طلب واحد ✓.
- 🗺️ ميزة 3 — خريطة الأسطول المصغرة في الداشبورد (توصية CRON-R6 #6):
  • بطاقة NalutMap compact في شبكة lg:grid-cols-5 (خريطة 3 أعمدة + سجل الأحداث عمودان) مع عدادات حية (متصل/في مهمة) وlive-dot نابضة ومفتاح ألوان.
  • مصدر مزدوج: تيليمتري البث أولاً (fleet:snapshot/driver_location) وإن غاب يستخدم آخر إحداثيات DB للكباتن غير offline — الخريطة لم تعد فارغة أبداً (تحقق حي: 2 متصل/1 في مهمة ظهرت فوراً).
- 🔏 ميزة 4 — ختم إلكتروني SVG في محضر Z (توصية CRON-R6 #4):
  • buildZPrintHtml: ختم دائري SVG مائل -8° (حلقتان + نص دائري textPath «واصل نالوت • غرفة العمليات / NALUT • LIBYA • LYD»، «معتمد» + كود المحضر + «كل قرش مُساءل») بعد صندوق الختم النصي.
  • صفوف تحليلية شرطية في الطباعة وفي Dialog المحضر: «كاش باك وُدع للمحافظ» و«فرص ضائعة — كوبونات مرفوضة» (تظهر فقط عند >0 — توافق المحاضر القديمة).
  • تقفيل حقيقي: Z-260923-02 (GMV 340.80 / كاش 312.50 / منصة 29.50 / 19 طلباً) أعاد promoRejectsCount=2 وpromoRejectsLossLyd=5 وcashbackCreditedLyd=5 ✓ وظهر في سجل المحاضر بالواجهة.
- 🌟 ستايل إجباري:
  • admin-shared.tsx: useAnimatedNumber (count-up بـ rAF وeasing cubic-out) داخل كل KpiCard — الأرقام المالية تتدحرج بسلاسة عند كل تحديث (إصلاح lint set-state-in-effect بجعل setState داخل rAF).
  • globals.css: .aurora (شفق متحرك 16s بثلاث طبقات radial + blur)، .aurora-slow، .gold-sweep (سحبة ضوء بيضاء على الأزرار عند التحويم)، .live-dot (نبضة زمردي)، .scarcity-text.
  • تطبيق: شفق الهبوط خلف البطل + gold-sweep على «🚀 اطلب الآن» وزر تأكيد الدفع وزر «كوبون جديد»؛ live-dot في رأس خريطة الأسطول.
- QA حية شاملة (البوابة :81): الداشبورد بالبطاقات الجديدة (قيمة الكوبونات = خصم + كاش باك)، بطاقة الفرص الضائعة بتفصيل CASH5، خريطة الأسطول بالكباتن، تاب التسويق بتذكرة CASH5، شريحة الكاش باك في الدفع وصندوق التطبيق والتوست، موبايل 390×844 لكل البطاقات الجديدة، سجل محاضر Z-260923-02.
- lint وtsc نظيفان، dev.log بلا أخطاء، 12 لقطة موثقة في download/ (qa7-*).

Stage Summary:
- اكتملت حلقة «تسويق أذكى»: المنصة الآن تعرف من حاول وفشل (فرص ضائعة بقيمة مالية تقديرية)، وتكافئ الولاء بإيداع شرعي في المحفظة (كاش باك بقيد مزدوج من ميزانية التسويق)، والقرارات تعرض على خريطة حية لا تفرغ.
- المحضر Z رسمي أكثر: ختم إلكتروني SVG وصفوف تحليلية (كاش باك/فرص ضائعة) تُختم وقت التقفيل.
- ملفات جديدة: لا شيء (تعديل موسع فقط). مخطط: PromoReject جدول + Order.cashbackLyd + DailyAudit 3 أعمدة (كلها db:push + وصول SQL خام).
- بيانات تجريبية: كوبون CASH5 كاش باك نشط (استخدام 1)، طلب 0019 (28 د.ل كاش باك)، محفظة 0920000111 رصيد 5، محضر Z-260923-02، سجل فرص ضائعة 2 محاولات.
- ملاحظة معمارية: الأعمدة/الجدول الجديد يُدار بـ SQL خام كالسابق (توافق عميل Prisma العالق بالذاكرة) — إعادة توليد العميل تسمح بتحويله typed.
- توصيات الجولة القادمة: (1) إشعار الإدارة اللحظي عند تجاوز الفرص الضائعة عتبة (مثلاً 5/يوم) مع زر «جدّد الحصة» سريع. (2) كاش باك بنسبة مع سقف في حملات كبرى + اختبار سباق الحصص. (3) تقرير فرص ضائعة شهري لكل كود (اتجاه زمني). (4) طباعة فاتورة الزبون من الفاتورة الرقمية (نمط A5). (5) اختبار Lighthouse للـ PWA (ما زالت معلقة من R6). (6) رسوم بيانية GMV أسبوعية في الداشبورد (sparkline SVG خفيف).

---
Task ID: CRON-R8 (جولة المراجعة الدورية الثامنة)
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح عبر agent-browser، ثم 3 ميزات جديدة (سباركلاين GMV الأسبوعي، تنبيه الفرص الضائعة اللحظي مع تجديد الحصة السريع، طباعة فاتورة الزبون A5) + تحسينات ستايل إجبارية.

Work Log — القسم 1: الحالة عند البدء والتقييم:
- قراءة worklog.md كاملاً: 7 جولات سابقة (Task 1-2 ثم CRON-R1..R7) — منظومة ناضجة.
- فحص الصحة: /api/health سليم (9 متاجر، 4 كباتن، 19 طلب اليوم، GMV 340.80) + wasel-realtime على 3003/3013 (uptime 14727s).
- tsc وESLint نظيفان (الأخطاء الوحيدة في skills/ خارج المشروع)، dev.log بلا أخطاء.
- ملاحظة: خطأ كونسول قديم (admin-dashboard.tsx:391 parse) ظهر في الجلسة المفتوحة من الدور السابق — تلاشى بعد reload (كان Fast Refresh قديم معلقاً)، الصفحة نظيفة تماماً بعد التحميل.
- QA استكشافي بـ agent-browser عبر البوابة :81: الهبوط → تطبيق الزبون (9 متاجر + فلاتر + جرس) → درع PIN (7788) → داشبورد الإدارة بكل البطاقات → KDS المتجر (5 طلبات جديدة) → موبايل 390×844 — صفر أخطاء صفحة وكونسول. الحكم: مستقر → ميزات جديدة بدل إصلاحات.

Work Log — القسم 2: التنفيذ والتحقق:
- 📈 ميزة 1 — سباركلاين GMV لآخر 7 أيام (توصية CRON-R7 #6):
  • summary API: weeklyTrend (7 أيام: التسمية العربية لليوم + gmvLyd + orders) بحساب محلي من طلبات الأسبوع (delivered فقط).
  • بطاقة جديدة في الداشبورد (xl:col-span-2): SVG بحجم viewBox 320×96، مسار خط متحرك pathLength 1.4s + تعبئة تدرج زمردية + خطوط شبكة منقطة ذهبية خافتة + نقاط أيام + نقطة اليوم الذهبية بنبضة دائرية متكررة (motion.circle r 7→13) + شارة تغير ▲/▼% عن أمس (زمردية/حمراء) + سطر «أفضل يوم» بالذهبي.
  • تحقق حي: 340.80 د.ل لليوم، الأيام السابقة صفر (نظام مزروع حديثاً) — الرسم والشارات والأفضلية تعمل.
- 🚨 ميزة 2 — تنبيه الفرص الضائعة اللحظي + تجديد الحصة السريع (توصية CRON-R7 #1):
  • promos-server: تصدير estimateLostDiscount (تقدير خسارة الفرصة للبث).
  • checkout: عند رفض الكوبون (نفدت/معطل/تحت الحد) يُبث admin:promo_reject لغرفة admin:fleet مع {code,label,reason,subtotalLyd,lostLyd,phoneMasked} — الهاتف يُقنّع 091****XXX.
  • PATCH /api/admin/promos: يدعم addUses (1-500) — UPDATE ذرّي «maxUses = COALESCE(maxUses,0)+?» مع إعادة تفعيل تلقائية، ويعيد الصف المحدث.
  • AdminApp: حالة promoAlert + معالج بث (يضيف حدثاً للسجل الحي + يرفع التنبيه) + زر «جدّد الحصة +10» ذهبي (exhausted) وزر «فعّل الكوبون» (disabled) + إغلاق يدوي وتلقائي بعد 45 ثانية + quickRenew callback يمرر للداشبورد.
  • الداشبورد: صفوف الأكواد في بطاقة الفرص الضائعة تحصل على زر «جدّد +10» المدمج (لأسباب exhausted فقط) مع حالة انشغال.
  • اختبار حي كامل: أُنهكت حصة LAST3 يدوياً (3/3) → محاولة checkout فاشلة عمداً → المستمع الخادمي التقط admin:promo_reject (code LAST3, lostLyd 4.20, phone 091****001) → **التنبيه ظهر فوراً في المتصفح المفتوح** (شريط أحمر متوهج بشريط نبض علوي) → نقر «جدّد الحصة +10» → Toast «⚡ زِدت حصة LAST3 بـ 10 استخدامات» + اختفاء التنبيه + تحديث البطاقة (3 محاولات ≈ 9.20 د.ل) والDB (maxUses 13) → أُعيدت بيانات LAST3 التجريبية (1/3) وحُذف سجل الرفض.
- 🖨️ ميزة 3 — فاتورة الزبون A5 قابلة للطباعة/PDF (توصية CRON-R7 #4):
  • customer-order-detail: زر «طباعة الفاتورة / حفظها PDF» في بطاقة الأصناف (لكل الطلبات).
  • buildInvoiceHtml: A5 (11mm margins) عربي RTL — رأس أخضر بشعار واصل + كود الطلب ذهبي + شارة «نسخة الزبون» + شبكة بيانات (متجر/زبون/حي/هاتف/عنوان/كابتن/دفع/تسليم) + جدول أصناف منقوط (بادئة giftcard- تعرض «💳 يُصدر الكود آلياً عند التسليم» والملاحظات 📝) + إجماليات بالإطار الشرعي (عقد بيع قطعي/إجارة عمل/رسوم خدمة 0.00/خصم الكوبون يتحمله واصل) + صندوق «الإطار الشرعي» الشامل + سطر ختم «فاتورة إلكترونية موثقة — كل قرش مُساءل».
  • الطباعة عبر iframe خفي (كمحضر Z) — بلا مساس بالثيم الداكن.
  • تحقق حي: النقر أنشأ iframe (2160 حرف body) وطُبع ونُظف تلقائياً (0 iframe بعد 2.5s) بلا أخطاء؛ استُخرج HTML الفاتورة وعُرض كصورة — التخطيط A5 كامل وسليم (قسم meta، جدول، إجماليات، إطار شرعي، ختم).
- 🌟 ستايل إجباري:
  • globals.css: @keyframes wasel-rise-in + .kpi-stagger (دخول متدرج 0.55s بتأخيرات 0.02-0.46s لكل بطاقات مؤشرات الداشبورد) + .spark-sheen (لمعان ذهبي عابر 0.9s عند تحويم بطاقة السباركلاين).
  • تطبيق kpi-stagger على شبكة المؤشرات وspark-sheen على بطاقة الاتجاه — الداشبورد يفتح الآن بحركة موجة مالية متسلسلة.
- QA حية إضافية: موبايل 390×844 للبطاقات الجديدة (تكدس سليم col-span-2)، لا أخطاء كونسول في كل التدفق، بيانات التجارب نظفت (TSTR8 عُطل وحذف rejects، LAST3 استعاد 1/3).
- lint وtsc نظيفان، dev.log بلا أخطاء، 10 لقطات موثقة في download/ (qa8-*).

Stage Summary:
- اكتملت «حلقة الأرباح المرئية»: مدير العمليات يرى الآن اتجاه الأسبوع برسم حي نبضي، ويُنبَّه لحظياً كلما حاول زبون كوبوناً نافداً — وبنقرة زر واحدة يجدد الحصة ويستعيد العميل قبل انسحابه (أقصر مسار قرار: بث → تنبيه → فعل).
- الزبون صار يملك وثيقة رسمية قابلة للطباعة (A5 PDF) بإطار شرعي كامل — تصلح للفصل والمحاسبة الشخصية.
- ملفات جديدة: لا شيء (تعديلات فقط). مخطط: weeklyTrend على AccountingSummary (types+API).
- بيانات تجريبية: طلب 0020 رُفض عمداً (لا أثر مخزني)، LAST3 بعد الاستعادة 1/3 كما كان، بيانات الفرص الضائعة 2 CASH5 (نظيفة).
- ملاحظة تشغيلية: زر التنبيه «فعّل الكوبون» يعيد تفعيل كوبون معطل من مكان التنبيه مباشرة دون فتح تاب التسويق.
- توصيات الجولة القادمة: (1) اختبار Lighthouse للـ PWA (معلقة من R6/R7 — دومة الآن). (2) إشعار سطح المكتب للإدارة عند وصول تنبيه الفرص الضائعة والتطبيق بالخلفية. (3) تقرير فرص ضائعة شهري لكل كود مع اتجاه زمني sparkline مصغر بالتاب التسويق. (4) كوبونات كاش باك بنسبة مع سقف + اختبار سباق الحصص المتزامنة. (5) طباعة كشف حساب المتجر (A4) من تاب المتاجر بمجموع التوريدات. (6) تفاعل تحويم على نقاط السباركلاين يعرض tooltip بتاريخ وقيمة اليوم.

---
Task ID: CRON-R9 (جولة المراجعة الدورية التاسعة)
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح عبر agent-browser، ثم 3 ميزات جديدة (إشعارات سطح المكتب للإدارة، تقرير الفرص الضائعة الشهري بسباركلاين تفاعلي، كشف حساب متجر A4) + تحسينات ستايل إجبارية.

Work Log — القسم 1: الحالة عند البدء والتقييم:
- قراءة worklog.md كاملاً: 8 جولات سابقة (Task 1-2 ثم CRON-R1..R8) — منظومة ناضجة مستقرة.
- فحص الصحة: /api/health سليم (9 متاجر، 4 كباتن، 19 طلب اليوم، GMV 340.80، realtime connected) + wasel-realtime على 3003/3013 (uptime 16043s).
- tsc وESLint نظيفان قبل التعديل، dev.log بلا أخطاء جديدة (سطر Fast Refresh القديم فقط).
- QA استكشافي بـ agent-browser عبر البوابة :81: الهبوط → بوابة الأدوار → تطبيق الزبون (9 متاجر + فلاتر + محفظة) → درع PIN (7788 بضغطات حقيقية) → داشبورد بالبطاقات والسباركلاين → تاب التسويق → تاب المتاجر — صفر أخطاء صفحة وكونسول.
- ملاحظة تشغيلية: تحديث الجلسة عبر reload يقفل غرفة العمليات (سلوك أمني صحيح) — أُعيد الفتح بـ PIN.
- الحكم: مستقر → تنفيذ توصيات CRON-R8 بدل الإصلاحات.

Work Log — القسم 2: التنفيذ والتحقق:
- 🔔 ميزة 1 — إشعارات سطح المكتب للإدارة (توصية R8 #2):
  • ملف جديد src/lib/wasel/desktop-notifications.ts: كشف دعم/صلاحية، requestDesktopNotifPermission، showDesktopNotification (dir rtl، أيقونة logo.svg، tag لمنع التكرار، النقر يرفع النافذة)، تفضيل محلي wasel-admin-desktop-notif.
  • AdminApp: حالة notifPref/notifPerm + notify() callback + زر جرس في الرأس (Bell/BellRing/BellOff حسب الحالة، aria-pressed، min-h-12) — عند التفعيل تُطلب الصلاحية ويُرسل إشعار تجريبي «🔔 إشعارات واصل مفعّلة».
  • الإشعارات تُطلق من الأحداث المالية الحية: admin:promo_reject (فرصة ضائعة بالقيمة المهدورة)، driver:custody_settled (عهدة للخزينة)، store:payout_settled (مستحقات متجر).
  • تحقق حي: النقر أطلق الطلب → headless يرفض تلقائياً → توست «🚫 المتصفح يمنع الإشعارات» + أيقونة BellOff — المسار المرفوض سليم؛ المسار الممنوح يعتمد على Notification API القياسية.
- 📉 ميزة 2 — تقرير الفرص الضائعة الشهري (توصية R8 #3):
  • promos-server: getMonthlyLostReport(days) — سلسلة يومية (date() على نص ISO + تصفية زمنية في JS لتفادي مقارنة نص بعدد في SQLite) + تفصيل لكل كود (count/lostLyd/topReason/lastAt).
  • API جديد GET /api/admin/promos/report?days=30 (درع PIN، clamp 7-90 يوماً).
  • admin-marketing: بطاقة «تقرير الفرص الضائعة — آخر 30 يوماً» أعلى التاب — رقاقات إجمالية (محاولات مرفوضة بالأحمر + قيمة مهدورة بالذهبي) + سباركلاين SVG بـ30 نقطة (تدرج أحمر، pathLength متحرك، مناطق لمس عريضة لكل يوم) + خط تقاطع ذهبي متقطع + فقاعة تلميح (اليوم + القيمة + عدد المحاولات) + صفوف الأكواد بدخول متدرج (كود/سبب شائع/محاولات/هدر/آخر محاولة) + حالة فراغ زمردية + هياكل shimmer أثناء التحميل.
  • تحقق حي: التقرير يعرض 2 محاولات / 5.00 د.ل (CASH5) والسباركلاين والتلميح وصف الكود يعمل — ديسكتوب وموبايل.
- 🧾 ميزة 3 — كشف حساب متجر A4 (توصية R8 #5):
  • API جديد GET /api/accounting/store-statement?store_id&days=30 (درع PIN): بيانات المتجر + الطلبات المسلّمة بالفترة (رقم/تاريخ/سلة/توريد 90%/منصة 10%/دفع) + إجماليات.
  • admin-stores: زر «كشف حساب A4 — آخر 30 يوماً» لكل بطاقة متجر (min-h-11، أيقونة FileText، حالة انشغال) → جلب ثم بناء وثيقة A4 عربية RTL (رأس أخضر متدرج + شارة ذهبية + شبكة بيانات + جدول منقوط + صناديق إجماليات بخلفية داكنة ذهبية + الإطار الشرعي عقد بيع قطعي/إجرة عمل + ختم «كل قرش مُساءل») وطباعتها عبر iframe خفي (نمط الفاتورة A5).
  • تحقق حي: النقر أنشأ iframe، استُخرج HTML (5609 حرفاً) وعُرض كصورة — تخطيط A4 كامل والأرقام مطابقة: مطعم قصر نالوت 3 طلبات، مبيعات 173.00 = توريد 155.70 + منصة 17.30 ✓، ومستحقات الداشبورد للبطاقة (155.70) متطابقة مع الكشف.
- 🌟 ستايل إجباري:
  • سباركلاين GMV في الداشبورد صار تفاعلياً: مناطق لمس لكل يوم + خط تقاطع ذهبي + تكبير/تذهيب النقطة المُحوَّمة + فقاعة تلميح (اسم اليوم + GMV + عدد الطلبات) مُقيَّدة داخل البطاقة (clamp 14%-86%) كي لا تُقص عند الحواف.
  • globals.css: .shimmer (هياكل عظمية متلألئة ذهبية) + :focus-visible (حلقة تركيز ذهبية للوصولية بلوحة المفاتيح) + .chart-tip (فقاعة تلميح زجاجية بحد ذهبي وسهم سفلي).
  • admin-shared: KpiCardSkeleton + KpiGridSkeleton — الداشبورد يعرض 8 هياكل متلألئة أثناء التحميل الأول بدل أصفار ثابتة ثم يبدّل للشبكة المتحركة.
  • نفس فقاعة التلميح والم clamp مطبقة على سباركلاين الفرص الضائعة في التسويق (12%-88%).
- QA حية إضافية: موبايل 390×844 (داشبورد/تقرير/متاجر) — تكدس سليم وأهداف لمس 44px+، صفر أخطاء كونسول في كامل الجولة.
- lint وtsc نظيفان بعد التعديل (أُصلح set-state-in-effect بإزالة setState متزامن داخل effect)، dev.log بلا أخطاء، 8 لقطات موثقة في download/ (qa9-*).

Stage Summary:
- اكتمل «حلقة اليقظة»: مدير العمليات يُنبَّه الآن حتى خارج النافذة (إشعارات سطح مكتب مالية)، ويرى اتجاه الفرص الضائعة بشهر كامل بسباركلاين تفاعلي يكشف أي كود يهدّر المال ولماذا، ويستطيع إصدار كشف حساب رسمي A4 لأي شريك بنقرة — وثيقة جاهزة للتسليم أو PDF.
- ملفات جديدة: desktop-notifications.ts + api/admin/promos/report + api/accounting/store-statement. مخطط: لا تغييرات (كل الجداول موجودة).
- بيانات: لا بذور جديدة — التقرير يقرأ PromoReject الموجود (2 CASH5) والكشف يقرأ الطلبات المسلّمة الفعلية.
- ملاحظة معمارية: تلميحات الرسوم تعتمد mouseover (تفويض React) لا mouseenter الأصلي عند الاختبار الآلي.
- توصيات الجولة القادمة: (1) اختبار Lighthouse للـ PWA (معلقة من R6 — دومة الآن فعلاً). (2) كوبونات كاش باك بنسبة مع سقف + اختبار سباق الحصص المتزامنة. (3) تصدير تقرير الفرص الضائعة CSV من التاب. (4) خيار «آخر 90 يوماً» في تقرير الفرص الضائعة بمُبدل فترة. (5) إشعار سطح مكتب عند طلب جديد يقع في نطاق خارج ساعات الذروة (ليالي هادئة). (6) لمسة تحويم على صفوف الأكواد في تقرير الفرص الضائعة تُبرز نقطة اليوم المقابلة في السباركلاين.

---
Task ID: CRON-R10 (جولة المراجعة الدورية العاشرة) — قيد التنفيذ
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح، ثم تنفيذ 5 ميزات من توصيات R9 (CSV تصدير، مُبدّل فترة، كاش باك نسبي، إشعار الطلبات الليلية، ربط تحويم الصفوف بالسباركلاين) + تحسينات ستايل.

Work Log — القسم 1: التقييم عند البدء:
- قراءة worklog.md: 9 جولات سابقة (Task 1-2 ثم CRON-R1..R9) — منظومة ناضجة.
- /api/health سليم (9 متاجر، 4 كباتن، 19 طلب اليوم، GMV 340.80، realtime connected) + wasel-realtime 3003/3013 (uptime 17243s).
- tsc وESLint نظيفان قبل التعديل.
- QA استكشافي بـ agent-browser: الهبوط → تطبيق الزبون (متاجر+فلاتر) → درع PIN 7788 → لوحة المؤشرات → تاب التسويق — صفر أخطاء صفحة وكونسول. الحكم: مستقر → ميزات جديدة.

Work Log — القسم 2: التنفيذ (جارٍ التحقق الحي):
- 📥 ميزة 1 — تصدير CSV لتقرير الفرص الضائعة: زر CSV في رأس البطاقة يولّد ملف UTF-8 بـ BOM (ثلاثة أقسام: ملخص/سلسلة يومية/تفصيل أكواد بأيام نشطة) باسم wasel-lost-opportunities-{n}d.csv.
- 📆 ميزة 2 — مُبدّل الفترة 7/30/90: شرائح pill متحركة (التدرج الأحمر للنشطة) في رأس تقرير الفرص الضائعة + العنوان الديناميكي + إعادة جلب عبر loadLostReport(useCallback) مع حماية alive ضد السباقات.
- 💰 ميزة 3 — كاش باك نسبي مع سقف: بذرة NAFUSA8 (8% حتى 6 د.ل — من 25 د.ل) — منطق الحساب كان يدعم percent+cashback أصلاً (promos.ts وpromos-server.ts)، أُضيف مثال رسمي مُعتمد.
- 🌙 ميزة 4 — إشعار الطلبات الليلية: AdminApp يستمع store:new_order (يذيد السجل الحي دائماً) ويرسل إشعار سطح مكتب 🌙 عند الساعات الهادئة 22:00–07:00.
- ⚡ ميزة 5 — ربط تحويم الصفوف بالسباركلاين: getMonthlyLostReport يضيف daily[] لكل كود (استعلام GROUP BY code,date) + في الواجهة تحويم صف الكود يُضيء حلقات ذهبية نابضة على أيامه في الرسم + شارة «نشط في N يوم» + توهج الصف.
- ستايل: شرائح الفترة بأهداف لمس min-h-9، صفوف الأكواد بتحويم ذهبي متدرج transition-all، زر CSV زمردية بظل تحويم.

Stage Summary (مرحلي):
- ملفات معدلة: promos-server.ts (daily لكل كود)، promos.ts (NAFUSA8)، AdminApp.tsx (store:new_order + quiet-hours)، admin-marketing.tsx (الفترة/CSV/الربط/الستايل).
- tsc وESLint نظيفان بعد التعديل. التحقق الحي للميزات الخمس: قيد التنفيذ الآن.

---
Task ID: CRON-R10 (جولة المراجعة الدورية العاشرة) — مكتملة
Agent: Z.ai (webDevReview cron)
Task: تقييم الحالة، QA بالمتصفح عبر agent-browser، ثم 5 ميزات من توصيات R9 + تحسينات ستايل إجبارية.

## القسم 1: وصف حالة المشروع / التقييم عند البدء
- قراءة worklog.md كاملاً: 9 جولات سابقة (Task 1-2 ثم CRON-R1..R9) — منظومة ناضجة مستقرة (4 تطبيقات، بث لحظي، محاسبة Z، تسويق، فواتير A5/A4).
- فحص الصحة: /api/health سليم (9 متاجر، 4 كباتن، 19 طلب اليوم، GMV 340.80 د.ل، realtime connected) + wasel-realtime على 3003/3013 (uptime 17243s).
- tsc وESLint نظيفان قبل التعديل، dev.log بلا أخطاء.
- QA استكشافي بـ agent-browser عبر البوابة :81: الهبوط → تطبيق الزبون (متاجر/فلاتر/سلة) → درع PIN (7788) → لوحة المؤشرات → تاب التسويق — صفر أخطاء صفحة وكونسول.
- ملاحظة: تعديل الملفات أثناء الجلسة (Hot Reload) يقفل جلسة الإدارة (سلوك أمني صحيح) — أُعيد الفتح بالـ PIN.
- الحكم: مستقر → تنفيذ توصيات CRON-R9 بدل الإصلاحات.

## القسم 2: الأهداف / المنجزات / نتائج التحقق
- 📥 ميزة 1 — تصدير CSV لتقرير الفرص الضائعة (توصية R9 #3):
  • زر CSV زمردي في رأس بطاقة التقرير — يولّد ملف UTF-8 مع BOM يفتح بالعربية في Excel.
  • ثلاثة أقسام: ملخص (نافذة/إجمالي محاولات/قيمة مهدورة) + سلسلة يومية كاملة (تاريخ/يوم/محاولات/هدر) + تفصيل أكواد (كود/محاولات/هدر/سبب أشهر/آخر محاولة/أيام نشطة).
  • اسم الملف wasel-lost-opportunities-{n}d.csv + توست نجاح + معالجة رفض المتصفح.
  • تحقق حي: `agent-browser download` التقط الملف (1469 بايت) والبيانات مطابقة (2 محاولات، 5.00 د.ل).
- 📆 ميزة 2 — مُبدّل الفترة 7/30/90 يوماً (توصية R9 #4):
  • شرائح pill في رأس التقرير (أسبوع/شهر/٣ أشهر) — النشطة بتدرج أحمر متوهج، aria-pressed، أهداف لمس min-h-9.
  • loadLostReport عبر useCallback مع حارس alive ضد السباقات عند تبديل الفترة بسرعة، والعنوان الديناميكي يتبع الفترة.
  • تحقق حي: أسبوع → «آخر 7 يوماً» → شهر → «آخر 30 يوماً»، والAPI يُرجع days: 7/30/90 مع التفصيل.
- 💰 ميزة 3 — كاش باك نسبي بسقف (توصية R9 #2):
  • منطق الحساب كان يدعم percent+cashback أصلاً في الطبقتين (promos.ts وpromos-server.ts) — أضفنا البذرة الرسمية NAFUSA8: 8% حتى سقف 6 د.ل، حد أدنى 25 د.ل، إيداع عند التسليم.
  • تُزرع تلقائياً INSERT OR IGNORE عبر ensurePromosSeeded — ظهرت في تاب التسويق (7 كوبونات) وقائمة الزبائن.
  • تحقق حي: سلة 35.00 د.ل → شارة «+2.80 د.ل لمحفظتك بعد التسليم» (8%×35=2.80 ✓) والفاتورة تبقى 35.00 (لا خصم من الفاتورة — الإيداع بعد التسليم من ميزانية التسويق، قيد مزدوج).
  • ملاحظة سباق الحصص: recordPromoUsage ذرّي أصلاً (UPDATE ... WHERE usedCount < maxUses) — لا بيع زائد مهما تزامنت الطلبات.
- 🌙 ميزة 4 — إشعار الطلبات الليلية لغرفة العمليات (توصية R9 #5):
  • AdminApp يستمع store:new_order (كان يصل admin:fleet من checkout أصلاً): نبض «🆕 طلب جديد» في السجل الحي دائماً + إشعار سطح مكتب 🌙 فقط في الساعات الهادئة 22:00–07:00 (يذكر المتجر والمبلغ والحي و«تأكد من تغطية الكباتن»).
  • تحقق حي: بثّنا حدث اختبار عبر /emit على 3013 → ظهر فوراً في السجل الحي «🆕 طلب جديد 0099-R10 من «مطعم قصر نالوت» — 42.50 د.ل | وسط المدينة • نقداً عند التسليم». الساعة 19:37 خارج الهادئة → الإشعار الصامت تُخطى بشكل صحيح (المسار مُختبر كودياً).
- ⚡ ميزة 5 — ربط تحويم صفوف الأكواد بالسباركلاين (توصية R9 #6):
  • الخادم: getMonthlyLostReport يضيف daily[] لكل كود (GROUP BY code, date) مُصفّى بالنافذة.
  • الواجهة: تحويم صف الكود → حلقات ذهبية نابضة (motion.circle scale) على أيامه في الرسم + توهج الصف بحد ذهبي + شارة «⚡ نشط في N يوم» + aria-label.
  • تحقق حي: eval عدّ الحلقات قبل التحويم 0 → أثناء تحويم CASH5 أصبحت 1 على يومها النشط ✓ (ديسكتوب وموبايل).
- 🌟 ستايل إجباري:
  • شرائح الفترة بتدرج أحمر-وردي للنشطة وظل ملون، صفوف الأكواد transition-all بتحويم ذهبي متدرج، زر CSV بحد زمردي وظل تحويم، شارة الأيام النشطة تتلون ذهبياً عند التحويم، نصائح الاستخدام تحدّثت لذكر الربط الجديد.
- QA حية إضافية: موبايل 390×844 (الشرائح والزر يتكدسون بشكل سليم، الصفوف بمس لمريح)، لقطة ديسكتوب بالتحويم، تنظيف سلة الاختبار (0 أصناف)، بيانات الفرص الضائعة الفعلية لم تُمس.
- lint وtsc نظيفان بعد التعديل، dev.log بلا أخطاء، صفر أخطاء كونسول في كامل الجولة، 5 لقطات موثقة (qa10-*).

## القسم 3: المشاكل/المخاطر المفتوحة وتوصيات الجولة القادمة
- مخاطر/ملاحظات:
  • إشعار سطح المكتب الليلي يعتمد على منح الصلاحية (المتصفح headless يرفض) — المسار الممنوح يتطلب متصفحاً حقيقياً؛ الكود يتراجع بهدوء.
  • أيام السلسلة تُبنى بمفتاح يوم محلي للخادم — التطابق مع مفاتيح الواجهة مُختبر (نفس المنطقة الزمنية)؛ لو نُشر الخادم بمنطقة زمنية مختلفة عن الزبائن قد تنزاح الحلقات يوماً (منخفض الخطورة محلياً).
  • Hot Reload يقفل جلسة الإدارة عند تعديل الملفات — سلوك مقصود لا يحتاج إصلاحاً.
- توصيات الجولة القادمة:
  1. اختبار Lighthouse للـ PWA (معلقة من R6 — انظر manifest.webmanifest الموجود).
  2. جدولة عروض زمنية للكوبونات (يبدأ/ينتهي في تاريخ) بدل التفعيل اليدوي فقط.
  3. تجميع إشعارات الطلبات الليلية (digest كل 15 دقيقة) إذا تزامن عدة طلبات لتفادي إزعاج الإدارة.
  4. زر «إعادة تعيين حصة» منفصل عن «جدّد +10» لتصحيح الحصص المزروعة يدوياً.
  5. نافذة تفصيلية للكود (Dialog) عند نقر صفه: كل محاولاته مع الهواتف المقنعة والأوقات.
  6. سباركلاين المبيعات الشهرية في تاب المحاسبة Z بنفس نمط تفاعل الفرص الضائعة.

---
Task ID: CRON-R11 (جولة المراجعة الحادية عشرة) — مكتملة
Agent: Z.ai (webDevReview cron)
Task: تنفيذ كامل توصيات CRON-R10 الست المتبقية — جدولة الكوبونات الزمنية كالميزة الرئيسية + 5 ميزات مرافقة.

## القسم 1: وصف حالة المشروع / التقييم عند البدء
- الطلب من المستخدم: «شن مازال» (ما المتبقي؟) — كانت توصيات R10 الست هي كل ما تبقى.
- فحص الصحة عند البدء: /api/health سليم (9 متاجر، 4 كباتن، 8 طلبات نشطة) + wasel-realtime متصل (uptime 72894s).
- tsc وESLint نظيفان، لا أخطاء في dev.log.

## القسم 2: الأهداف / المنجزات / نتائج التحقق
- ⏰ ميزة 1 (الرئيسية) — كوبونات مجدولة زمنياً (startsAt/endsAt) — سلسلة كاملة:
  • Schema: عمودا DateTime? على PromoCode + db:push ناجح.
  • الخادم: PROMO_WINDOW_SQL في استعلامي الكوبونات النشطة + فحص نافذة في computePromoDiscountDb برفضين جديدين (not_started/expired) برسائل عربية مفصّلة بالتاريخ واليوم والساعة (fmtArabicDateTime).
  • API: POST يقبل startsAt/endsAt (تحقق: النهاية بعد البداية) + PATCH action جديد للجدولة + GET يُرجع التواريخ.
  • تحقق حي: checkout بـ EXPIRED11 → «انتهت صلاحية هذا الكوبون في الخميس 2 يناير الساعة 10:00 ص» وUPCOMING12 → «يبدأ العمل في السبت 1 يونيو» — والمحاولتان وُثّقتا في الفرص الضائعة تلقائياً وبثّتا للعمليات.
- 🎨 ميزة 2 — واجهة الجدولة الكاملة في تاب التسويق:
  • حوار الإنشاء: حقلا datetime-local اختياريان في صندوق برتقالي مع شرح.
  • التذكرة: شريط جدولة ملون حسب الحالة (⏳ مجدول قريباً برتقالي / ⏰ ينتهي بعد X ذهبي / ⌛ منتهي زمنياً أحمر) + شارة حالة واعية بالجدولة + حدود وتعتيم متغيّر.
  • حوار تعديل الجدولة لكل كوبون (يفتح بالقيم الحالية، إفراغهما يلغي النافذة) — اختُبر حفظ/إلغاء/إعادة فتح بقيم محفوظة.
  • منع تسريب الكوبونات خارج النافذة: /api/promos للزبائن لا يُرجع EXPIRED11/UPCOMING12 (مُختبر).
- 🔍 ميزة 2.5 (إضافة) — فحص لطيف /api/promos/check: عند إدخال الزبون كوداً غير مدرج (خارج نافذته) يستبدل «كود الخصم غير صالح» برسالة خادمية دقيقة بلا أي آثار جانبية — مُختبر حياً في واجهة الزبون.
- 🔄 ميزة 3 — تصفير الحصة منفصل عن التجديد (توصية R10 #4):
  • PATCH resetUses ذرّي + زر «تصفير الحصة» أحمر في كل تذكرة بجانب «جدّد +10» الذهبي و«⏰ جدولة» — صف أزرار ثلاثي بمس لمس مريح.
  • تحقق حي: تصفير WASEL10 → usedCount: 0 في GET.
- 📋 ميزة 4 — نافذة تفصيل الكود (توصية R10 #5):
  • getPromoRejectDetail (60 محاولة كحد أقصى) + API /api/admin/promos/report/detail محمي بالـ PIN.
  • صفوف الأكواد في التقرير صارت أزرار قابلة للنقر (وعلى لوحة المفاتيح Enter/Space) بإشارة «🔍 انقر للتفصيل».
  • الحوار: شارة سبب ملونة + هاتف مقنّع + سلة وهدر + طابع زمني، هياكل تحميل shimmer، حالة فراغ.
  • تحقق حي: نقر صف EXPIRED11 → المحاولة المسجلة (091****001، سلة 6.00، هدر 0.90).
- 📈 ميزة 5 — سباركلاين المبيعات الشهرية في تاب Z (توصية R10 #6):
  • monthlyTrend (30 يوماً) في AccountingSummary + حسابه في /api/accounting/summary.
  • MonthlySalesSparkline: خط زمردي متدرج + شارات (إجمالي 340.80 د.ل، 6 طلبات، 🏆 أفضل يوم: الأربعاء، 1 يوم نشط) + tooltip تحويم بنقطة ذهبية وخط دليل — مُختبر بالتحويم الحي (qa11-07).
- 🌙 ميزة 6 — تجميع الإشعارات الليلية (توصية R10 #3):
  • أول طلب ليلي → إشعار فوري؛ ما بعده خلال 15 دقيقة → شارة مجمّعة بنفسجية «N طلبات ليلية في دورة التجميع» تُظهر فوق التبويبات مع إنفجار تلقائي بعد 15 دقيقة صمت.
  • (الساعة 14:5x ليست ضمن الهدوء — المسار مُختبر كودياً والشارة مبنية بنمط نفس لافتة الفرص الضائعة.)
- 📱 ميزة 7 — أيقونات PWA بصرية (توصية R10 #1 جزئياً):
  • توليد PNG من logo.svg عبر sharp: icon-192/512 + apple-touch-icon (180) + favicon-32 في public/icons/.
  • manifest محدّث (أيقونات PNG + maskable + orientation + categories) + layout icons/appleWebApp meta.
  • ملاحظة: Service Worker متعمد الإسقاط في بيئة dev (يكسر Hot Reload) — يُضاف عند النشر.
- QA حي شامل بـ agent-browser (11 لقطة qa11-*):
  • ديسكتوب: تسويق (شارات، حوار جدولة، حفظ/إلغاء)، تفصيل كود، تاب Z بالسباركلاين والتحويم.
  • موبايل 390×844: تاب Z (شرائح تتكدس) + تسويق (صفوف وأزرار بمس لمريح) + تذكرة بالأزرار الثلاثة.
  • واجهة الزبون: إضافة منتج → سلة → دفع → EXPIRED11 → الرسالة الدقيقة حمراء ✓ ثم تنظيف السلة (0 أصناف).
  • صفر أخطاء كونسول وصفحة وطول الجولة، dev.log نظيف.
- lint وtsc نظيفان بعد كل التعديلات (0 أخطاء في src).

## القسم 3: المشاكل/المخاطر المفتوحة وتوصيات الجولة القادمة
- مخاطر/ملاحظات:
  • EXPIRED11 وUPCOMING12 أُبقيا عمداً كبيانات عرض حية لميزة الجدولة (محاولتاهما في التقرير تعرضان الشارات الجديدة) — يمكن حذفهما من الواجهة متى شاءت الإدارة.
  • مقارنة النافذة الزمنية في SQL نصية ISO — موحدة الصيغة داخلياً (toISOString حصراً) آمنة؛ لو كُتبت قيم خارجية بصيغة أخرى قد تنزاح (لا يوجد مسار كهذا حالياً).
  • تجميع الإشعارات الليلية يعتمد على ساعة جهاز المشغّل (كما السابق).
- توصيات الجولة القادمة:
  1. إحصاءات الجدولة في تاب التسويق: عدّاد «كوبونات تنتهي خلال 48 ساعة» بتنبيه استباقي للإدارة لتجديد الحملات.
  2. صفحة إدارة الكوبونات المنتهية (أرشيف) مع زر «استنساخ بحملة جديدة» (نفس القيم بتواريخ جديدة).
  3. تفويض تقارير CSV للجدولة (تصدير قائمة الكوبونات وجداولها وحصصها).
  4. اختبار Lighthouse/إنتاج كامل عند تجهيز النشر (SW + offline fallback).
  5. إشعار الاكتمال للحصص: نبض في السجل الحي عندما يصل usedCount إلى 80%+ من maxUses.
  6. توطين تنسيقات التاريخ بالعربية بالكامل في حوار الجدولة (datetime-local يعرض صيغة المتصفح).
