// بيانات نالوت الحقيقية المشتركة (تستخدمها البذور و ensure-seed)
export const SEED_STORES = [
  {
    id: 'qasr-nalut', name: 'مطعم قصر نالوت', vertical: 'food', district: 'وسط المدينة',
    latitude: 31.8692, longitude: 10.9801, rating: 4.9, emoji: '🏰', tagline: 'أصالة المطبخ الأمازيغي الجبلي', prepMinutes: 25,
    products: [
      { id: 'qn-tridia', title: 'ترية نالوتية بالدجاج', description: 'ترية تقليدية على أصولها مع دجاج بلدي وصلصة الطماطم الجبلية', basePriceLyd: 28, emoji: '🍲', category: 'أطباق رئيسية' },
      { id: 'qn-couscous', title: 'كسكسي باللحم والخضار', description: 'كسكسي سقي مبخر على الطريقة الأمازيغية مع لحم غنم طازج', basePriceLyd: 35, emoji: '🥘', category: 'أطباق رئيسية' },
      { id: 'qn-shakhshukha', title: 'شخشوخة جبل نفوسة', description: 'رقائق عجين رقيقة مع مرقة حمراء وحبق بلدي', basePriceLyd: 30, emoji: '🍛', category: 'أطباق رئيسية' },
      { id: 'qn-zummita', title: 'زُميطة بالزيتون', description: 'زميطة شعير محمص مع زيت زيتون جبل نفوسة البكر', basePriceLyd: 12, emoji: '🥣', category: 'مقبلات' },
      { id: 'qn-tea', title: 'شاي أخضر بالنعناع', description: 'شاي صحراوي معتم على الفحم مع نعناع طازج', basePriceLyd: 5, emoji: '🫖', category: 'مشروبات' },
    ],
  },
  {
    id: 'qalaa-pizza', name: 'بيتزا القلعة', vertical: 'food', district: 'حي القلعة',
    latitude: 31.8674, longitude: 10.9842, rating: 4.7, emoji: '🍕', tagline: 'بيتزا إيطالية بروح جبلية', prepMinutes: 20,
    products: [
      { id: 'qp-margherita', title: 'بيتزا مارغريتا وسط الحجم', description: 'عجين إيطالي طازج، صلصة طماطم، موزاريلا، ريحان', basePriceLyd: 22, emoji: '🍕', category: 'بيتزا' },
      { id: 'qp-mixed', title: 'بيتزا مشكّل لحوم', description: 'سلامي، لحم مفروم، فطر، فلفل، جبنة مضاعفة', basePriceLyd: 30, emoji: '🍕', category: 'بيتزا' },
      { id: 'qp-burger', title: 'برجر القلعة المزدوج', description: 'قطعتا لحم مشوي، جبنة شيدر، صلصة خاصة، بطاطس', basePriceLyd: 25, emoji: '🍔', category: 'برجر' },
      { id: 'qp-fries', title: 'بطاطس مقرمشة كبير', description: 'بطاطس ذهبية مع بهارات القلعة السرية', basePriceLyd: 8, emoji: '🍟', category: 'مقبلات' },
      { id: 'qp-soda', title: 'مشروب غازي بارد', description: 'علبة مبردة من الثلاجة', basePriceLyd: 3, emoji: '🥤', category: 'مشروبات' },
    ],
  },
  {
    id: 'tunis-street-grill', name: 'مشويات شارع تونس', vertical: 'food', district: 'شارع تونس',
    latitude: 31.8705, longitude: 10.9790, rating: 4.8, emoji: '🍢', tagline: 'شاورما ومشاوي على الفحم', prepMinutes: 18,
    products: [
      { id: 'tg-shawarma', title: 'شاورما دجاج كبيرة', description: 'شاورما بطابونة مع ثومية وبطاطس وخبز طازج', basePriceLyd: 18, emoji: '🌯', category: 'شاورما' },
      { id: 'tg-kefta', title: 'كفتة مشوية بالفحم', description: 'أقراص كفتة لحم مع بصل سماق وخبز حجري', basePriceLyd: 24, emoji: '🍢', category: 'مشاوي' },
      { id: 'tg-falafel', title: 'سندويش فلافل حار', description: 'فلافل مقرمشة مع مخلل وطحينة', basePriceLyd: 8, emoji: '🧆', category: 'سندويشات' },
      { id: 'tg-mix-plate', title: 'طبق مشكل مشاوي لعائلة', description: 'دجاج، كفتة، كباب مع سلطة وخبز وأرز', basePriceLyd: 45, emoji: '🍖', category: 'مشاوي' },
    ],
  },
  {
    id: 'sidi-khalifa-cafe', name: 'كافيه سيدي خليفة', vertical: 'food', district: 'سيدي خليفة',
    latitude: 31.8660, longitude: 10.9785, rating: 4.6, emoji: '☕', tagline: 'قهوة مختصة بظلال الوادي', prepMinutes: 12,
    products: [
      { id: 'sk-espresso', title: 'إسبريسو مختص', description: 'حبوب محمصة طازجة من أجود المزارع', basePriceLyd: 6, emoji: '☕', category: 'قهوة' },
      { id: 'sk-cappuccino', title: 'كابتشينو كريمي', description: 'إسبريسو مع رغوة حليب غنية ورشة كاكاو', basePriceLyd: 8, emoji: '☕', category: 'قهوة' },
      { id: 'sk-croissant', title: 'كرواسون باللوز', description: 'مخبوز صباحي طازج زبدة فرنسية', basePriceLyd: 9, emoji: '🥐', category: 'معجنات' },
      { id: 'sk-juice', title: 'عصير برتقال طبيعي', description: 'برتقال معصور لحظياً بدون سكر مضاف', basePriceLyd: 7, emoji: '🍊', category: 'عصائر' },
    ],
  },
  {
    id: 'nafusa-bakery', name: 'مخبز نفوسة المركزي', vertical: 'grocery', district: 'وسط المدينة',
    latitude: 31.8680, longitude: 10.9830, rating: 4.8, emoji: '🥖', tagline: 'خبز ساخن كل ساعة', prepMinutes: 10,
    products: [
      { id: 'nb-khobz', title: 'خبز حجري تقليدي (5 أرغفة)', description: 'خبز Tanour على الحجر الطيني الجبلي', basePriceLyd: 5, emoji: '🥖', category: 'خبز' },
      { id: 'nb-muwarraqa', title: 'مورقة بالزيت والحرارة', description: 'عجين مورق رقيق مع زيت زيتون بكر', basePriceLyd: 6, emoji: '🥮', category: 'معجنات' },
      { id: 'nb-makroudh', title: 'مقروض بالتمر', description: 'حلوى أمازيغية بالتمر الجبلي والسميد', basePriceLyd: 15, emoji: '🍬', category: 'حلويات' },
      { id: 'nb-mlewie', title: 'ملوية زبدة (حبتان)', description: 'ملوية طرية بطبقات زبدة فاخرة', basePriceLyd: 10, emoji: '🥯', category: 'معجنات' },
    ],
  },
  {
    id: 'nalut-central-market', name: 'سوبر ماركت نالوت المركزي', vertical: 'grocery', district: 'شارع تونس',
    latitude: 31.8710, longitude: 10.9825, rating: 4.5, emoji: '🛒', tagline: 'كل احتياجات بيتك في 20 دقيقة', prepMinutes: 15,
    products: [
      { id: 'cm-milk', title: 'حليب طازج 1 لتر', description: 'حليب كامل الدسم مبرد', basePriceLyd: 6, emoji: '🥛', category: 'ألبان' },
      { id: 'cm-eggs', title: 'بيض بلدي 30 حبة', description: 'بيض دجاج بلدي طازج من مزارع الجبل', basePriceLyd: 18, emoji: '🥚', category: 'ألبان' },
      { id: 'cm-oil', title: 'زيت زيتون بكر 1 لتر', description: 'زيت زيتون من معاصر جبل نفوسة', basePriceLyd: 25, emoji: '🫒', category: 'أساسيات' },
      { id: 'cm-water', title: 'عبوة مياه معدنية 12 قارورة', description: 'مياه جبلية نقية 1.5 لتر', basePriceLyd: 12, emoji: '💧', category: 'مشروبات' },
      { id: 'cm-rice', title: 'أرز بسمتي 2 كغ', description: 'أرز بسمتي فاخر حبة طويلة', basePriceLyd: 16, emoji: '🍚', category: 'أساسيات' },
      { id: 'cm-dates', title: 'تمر صفري جبلي 1 كغ', description: 'تمر صفري من نخيل الوادي', basePriceLyd: 20, emoji: '🌴', category: 'أساسيات' },
    ],
  },
  {
    id: 'jabal-pharmacy', name: 'صيدلية جبل نفوسة', vertical: 'grocery', district: 'طريق الحوامد',
    latitude: 31.8655, longitude: 10.9870, rating: 4.9, emoji: '💊', tagline: 'أدويتك تصل إليك بسرعة وأمان', prepMinutes: 10,
    products: [
      { id: 'jp-paracetamol', title: 'باراسيتامول 500ملغ', description: 'شريط 20 قرص خافض حرارة', basePriceLyd: 4, emoji: '💊', category: 'أدوية عامة' },
      { id: 'jp-vitc', title: 'فيتامين سي 1000', description: 'علبة 20 إفروفسك مناعة قوية', basePriceLyd: 15, emoji: '🍊', category: 'فيتامينات' },
      { id: 'jp-babyformula', title: 'حليب أطفال مرحلة 1', description: 'علبة 400غ مدعمة بالحديد', basePriceLyd: 38, emoji: '🍼', category: 'عناية الأطفال' },
      { id: 'jp-firstaid', title: 'حقيبة إسعافات أولية', description: '20 قطعة أساسية للمنزل والسيارة', basePriceLyd: 32, emoji: '🩹', category: 'مستلزمات طبية' },
    ],
  },
  {
    id: 'mataa-electronics', name: 'واصل متاع للإلكترونيات', vertical: 'marketplace', district: 'وسط المدينة',
    latitude: 31.8720, longitude: 10.9760, rating: 4.4, emoji: '🔌', tagline: 'أحدث الإلكترونيات بضمان محلي', prepMinutes: 30,
    products: [
      { id: 'me-powerbank', title: 'بنك طاقة 20000 مللي أمبير', description: 'شحن سريع 22.5 واط منفذين', basePriceLyd: 85, emoji: '🔋', category: 'إلكترونيات' },
      { id: 'me-earbuds', title: 'سماعات بلوتوث لاسلكية', description: 'عزل ضوضاء ANC وبطارية 30 ساعة', basePriceLyd: 120, emoji: '🎧', category: 'إلكترونيات' },
      { id: 'me-charger', title: 'شاحن سريع 33 واط', description: 'شاحن جداري بتقنية PD و QC3', basePriceLyd: 45, emoji: '⚡', category: 'إكسسوارات' },
      { id: 'giftcard-25', title: 'بطاقة شحن واصل — 25 د.ل', description: 'بطاقة هدية مسبقة الدفع لشحن محفظة واصل بقيمة 25.00 د.ل. يُصدر لك الكود فور استلام الطلب، وتستخدمه من شاشة المحفظة. دفعة مقدمة شرعية بلا ربا ولا غرر.', basePriceLyd: 25, emoji: '🎁', category: 'بطاقات شحن واصل' },
      { id: 'giftcard-50', title: 'بطاقة شحن واصل — 50 د.ل', description: 'بطاقة هدية مسبقة الدفع لشحن محفظة واصل بقيمة 50.00 د.ل. يُصدر لك الكود فور استلام الطلب، وتستخدمه من شاشة المحفظة. دفعة مقدمة شرعية بلا ربا ولا غرر.', basePriceLyd: 50, emoji: '🎁', category: 'بطاقات شحن واصل' },
      { id: 'giftcard-100', title: 'بطاقة شحن واصل — 100 د.ل', description: 'بطاقة هدية مسبقة الدفع لشحن محفظة واصل بقيمة 100.00 د.ل. يُصدر لك الكود فور استلام الطلب، وتستخدمه من شاشة المحفظة. دفعة مقدمة شرعية بلا ربا ولا غرر.', basePriceLyd: 100, emoji: '🎁', category: 'بطاقات شحن واصل' },
    ],
  },
  {
    id: 'sahara-perfumes', name: 'عطور الصحراء', vertical: 'marketplace', district: 'حي القلعة',
    latitude: 31.8668, longitude: 10.9815, rating: 4.7, emoji: '🌸', tagline: 'روائح شرقية أصيلة', prepMinutes: 15,
    products: [
      { id: 'sp-oud', title: 'دهن عود كمبودي 3مل', description: 'دهن عود فاخر معتق', basePriceLyd: 140, emoji: '🪵', category: 'عطور' },
      { id: 'sp-bakhoor', title: 'بخور معتق 50غ', description: 'بخور عود فاخر برائحة دوام', basePriceLyd: 35, emoji: '🫕', category: 'بخور' },
      { id: 'sp-musk', title: 'مسك أبيض 100مل', description: 'عطر مسك أبيض ناعم يدوم', basePriceLyd: 55, emoji: '🤍', category: 'عطور' },
    ],
  },
] as const

export const SEED_DRIVERS = [
  { id: 'DRV-01', fullName: 'أحمد يونس', phone: '0913000101', vehicleType: 'سيارة', plateNumber: 'نالوت 21', rating: 4.9, lat: 31.8690, lng: 10.9805 },
  { id: 'DRV-02', fullName: 'محمد اغمير', phone: '0913000102', vehicleType: 'دراجة نارية', plateNumber: 'نالوت 47', rating: 4.8, lat: 31.8670, lng: 10.9845 },
  { id: 'DRV-03', fullName: 'عبدالسلام برعص', phone: '0913000103', vehicleType: 'سيارة', plateNumber: 'نالوت 63', rating: 4.7, lat: 31.8708, lng: 10.9795 },
  { id: 'DRV-04', fullName: 'مصطفى عساف', phone: '0913000104', vehicleType: 'دراجة نارية', plateNumber: 'نالوت 88', rating: 4.9, lat: 31.8652, lng: 10.9868 },
] as const
