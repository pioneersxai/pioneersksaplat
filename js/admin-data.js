/* ============================================================
   admin-data.js — Demo data for the admin console (DUMMY ONLY)
   Prototype T1 — لوحة التحكم

   ⚠️ كل الأسماء والأرقام هنا وهمية للعرض.
   في النسخة الفعلية تأتي كل هذه البيانات من الـ Backend،
   وتعليمات النماذج تُخزَّن في الخادم فقط — لا تصل للمتصفح أبداً.
   ============================================================ */

var ROLES = {
  reception: 'الاستقبال',
  marketing: 'التسويق',
  social: 'السوشيال ميديا',
  website: 'المواقع والمتاجر',
  stores: 'المستودعات',
  hr: 'الموارد البشرية (HR)',
  accounting: 'الحسابات'
};

var ADMIN_TASKS = [
  {
    id: 'confirm', icon: '📞', name: 'تأكيد موعد عميل', role: 'reception', enabled: true,
    instructions: 'اجمع بيانات الموعد كاملة ثم صِغ رسالة تأكيد ودودة ومختصرة بالتنسيق المعتمد. لا تتجاوز 3 أسطر. (نص تجريبي)',
    fields: [
      { label: 'اسم العميل', type: 'text' },
      { label: 'يوم وتاريخ الموعد', type: 'text' },
      { label: 'الخدمة المحجوزة', type: 'select' }
    ]
  },
  {
    id: 'inquiry', icon: '💬', name: 'رد على استفسار عميل', role: 'reception', enabled: true,
    instructions: 'لا تصِغ أي رد قبل معرفة قناة التواصل ونص الاستفسار كاملاً. الرد يُراجع قبل الإرسال. (نص تجريبي)',
    fields: [
      { label: 'قناة التواصل', type: 'select' },
      { label: 'نص استفسار العميل', type: 'textarea' },
      { label: 'اسم العميل', type: 'text' }
    ]
  },
  {
    id: 'eod', icon: '📊', name: 'تقرير نهاية اليوم', role: 'reception', enabled: true,
    instructions: 'لا تقبل التقرير إلا بالأرقام الأساسية كاملة، ثم أخرجه بالتنسيق المعتمد للإدارة. (نص تجريبي)',
    fields: [
      { label: 'عدد الزيارات اليوم', type: 'text' },
      { label: 'عدد المكالمات', type: 'text' },
      { label: 'أهم ملاحظة أو مشكلة', type: 'textarea' }
    ]
  },
  {
    id: 'post', icon: '📝', name: 'كتابة بوست سوشيال', role: 'marketing', enabled: true,
    instructions: 'حدّد الخدمة والجمهور والهدف قبل أي صياغة. التزم بالكلمات المسموحة فقط، والمسودة تخضع لمراجعة قبل النشر. (نص تجريبي)',
    fields: [
      { label: 'الخدمة موضوع البوست', type: 'text' },
      { label: 'الجمهور المستهدف', type: 'text' },
      { label: 'الهدف من البوست', type: 'select' }
    ]
  },
  {
    id: 'reelidea', icon: '🎬', name: 'فكرة فيديو قصير', role: 'marketing', enabled: true,
    instructions: 'ابنِ سيناريو من 3 مشاهد كحد أقصى حسب المدة المستهدفة، واختم دائماً بالدعوة للإجراء. (نص تجريبي)',
    fields: [
      { label: 'موضوع الفيديو', type: 'text' },
      { label: 'المدة المستهدفة', type: 'select' },
      { label: 'الدعوة للإجراء (CTA)', type: 'text' }
    ]
  },
  {
    id: 'schedule', icon: '📅', name: 'جدولة بوستات الأسبوع', role: 'social', enabled: true,
    instructions: 'لا تبنِ الجدول قبل معرفة المنصة والعدد والمحور. وزّع المحتوى بين توعوي وتفاعلي وتعريفي. (نص تجريبي)',
    fields: [
      { label: 'المنصة', type: 'select' },
      { label: 'عدد البوستات المطلوبة', type: 'text' },
      { label: 'المحور الأساسي للأسبوع', type: 'text' }
    ]
  },
  {
    id: 'reply', icon: '💬', name: 'رد على تعليق أو رسالة', role: 'social', enabled: true,
    instructions: 'اطلب نص التعليق والنبرة قبل الصياغة. أي رد يخص تفاصيل طبية يُحوَّل للفريق المختص. (نص تجريبي)',
    fields: [
      { label: 'المنصة', type: 'select' },
      { label: 'نص التعليق / الرسالة', type: 'textarea' },
      { label: 'نبرة الرد', type: 'select' }
    ]
  },
  {
    id: 'pageupdate', icon: '🌐', name: 'طلب تحديث محتوى صفحة', role: 'website', enabled: true,
    instructions: 'وثّق الصفحة والقسم والتعديل المطلوب حرفياً قبل أي تنفيذ. (نص تجريبي)',
    fields: [
      { label: 'الصفحة (الاسم أو الرابط)', type: 'text' },
      { label: 'القسم المطلوب تعديله', type: 'text' },
      { label: 'وصف التعديل المطلوب', type: 'textarea' }
    ]
  },
  {
    id: 'product', icon: '🛒', name: 'إضافة منتج للمتجر', role: 'website', enabled: true,
    instructions: 'لا تصِغ بطاقة المنتج قبل اكتمال الاسم والسعر والوصف. الصياغة تُراجع قبل النشر. (نص تجريبي)',
    fields: [
      { label: 'اسم المنتج', type: 'text' },
      { label: 'السعر', type: 'text' },
      { label: 'وصف مختصر للمنتج', type: 'textarea' }
    ]
  },
  {
    id: 'supply', icon: '📦', name: 'طلب توريد مخزون', role: 'stores', enabled: true,
    instructions: 'حدّد الصنف والكمية ودرجة الاستعجال، وأخرج الطلب بالتنسيق المعتمد للمشتريات. (نص تجريبي)',
    fields: [
      { label: 'اسم الصنف', type: 'text' },
      { label: 'الكمية المطلوبة', type: 'text' },
      { label: 'درجة الاستعجال', type: 'select' }
    ]
  },
  {
    id: 'stockcount', icon: '📋', name: 'تقرير جرد صنف', role: 'stores', enabled: true,
    instructions: 'لا تقبل الجرد بلا كمية فعلية وملاحظات الفروقات. (نص تجريبي)',
    fields: [
      { label: 'اسم الصنف', type: 'text' },
      { label: 'الكمية المجرودة فعلياً', type: 'text' },
      { label: 'ملاحظات / فروقات', type: 'textarea' }
    ]
  },
  {
    id: 'attendance', icon: '🕒', name: 'تقرير حضور يومي', role: 'hr', enabled: true,
    instructions: 'لا يكتمل التقرير إلا بأرقام الحضور والغياب وملاحظاتها، بالتنسيق المعتمد. (نص تجريبي)',
    fields: [
      { label: 'عدد الحاضرين', type: 'text' },
      { label: 'عدد الغائبين', type: 'text' },
      { label: 'ملاحظات', type: 'textarea' }
    ]
  },
  {
    id: 'vacancy', icon: '📣', name: 'مسودة إعلان وظيفة', role: 'hr', enabled: true,
    instructions: 'حدّد المسمى والقسم والمتطلبات. الإعلان يُراجع قانونياً قبل النشر. (نص تجريبي)',
    fields: [
      { label: 'المسمى الوظيفي', type: 'text' },
      { label: 'القسم', type: 'text' },
      { label: 'أهم المتطلبات', type: 'textarea' }
    ]
  },
  {
    id: 'expense', icon: '🧾', name: 'تسجيل مصروف', role: 'accounting', enabled: true,
    instructions: 'لا تسجّل مصروفاً بلا وصف ومبلغ وتصنيف. القيد مبدئي بانتظار مراجعة المحاسب. (نص تجريبي)',
    fields: [
      { label: 'وصف المصروف', type: 'text' },
      { label: 'المبلغ', type: 'text' },
      { label: 'التصنيف', type: 'select' }
    ]
  },
  {
    id: 'collection', icon: '💰', name: 'تقرير تحصيل يومي', role: 'accounting', enabled: true,
    instructions: 'لا يكتمل التقرير إلا بمجاميع النقدي والشبكة والملاحظات، بالتنسيق المعتمد. (نص تجريبي)',
    fields: [
      { label: 'إجمالي النقدي', type: 'text' },
      { label: 'إجمالي الشبكة / التحويلات', type: 'text' },
      { label: 'ملاحظات', type: 'textarea' }
    ]
  }
];

var EMPLOYEES = [
  { name: 'موظف تجريبي 1', role: 'reception', active: true },
  { name: 'موظف تجريبي 2', role: 'reception', active: true },
  { name: 'موظف تجريبي 3', role: 'marketing', active: true },
  { name: 'موظف تجريبي 4', role: 'social', active: true },
  { name: 'موظف تجريبي 5', role: 'website', active: true },
  { name: 'موظف تجريبي 6', role: 'stores', active: true },
  { name: 'موظف تجريبي 7', role: 'hr', active: true },
  { name: 'موظف تجريبي 8', role: 'accounting', active: false }
];

var REVIEW_QUEUE = [
  {
    emp: 'موظف تجريبي 1', task: 'رد على استفسار عميل', time: 'اليوم 10:20',
    output: 'رد مقترح عبر واتساب: «شكراً لتواصلك معنا 🌟 سيتم تزويدك بالتفاصيل الدقيقة من الفريق المختص، وتحت إشراف طبي كامل.»',
    state: null
  },
  {
    emp: 'موظف تجريبي 3', task: 'كتابة بوست سوشيال', time: 'اليوم 09:45',
    output: 'مسودة بوست: «اهتمامك ببشرتك يبدأ بخطوة ✨ تعرّف على الخدمة — بإشراف طبي وبنتائج مدروسة. احجز استشارتك الآن.»',
    state: null
  },
  {
    emp: 'موظف تجريبي 6', task: 'طلب توريد مخزون', time: 'أمس 21:05',
    output: 'طلب توريد (عاجل) — الصنف: مستلزمات تشغيل (تجريبي) · الكمية: 40. أُرسل بالتنسيق المعتمد للمشتريات.',
    state: null
  }
];

var ACTIVITY = [
  { icon: '✅', text: 'اعتمدتَ مخرَج «تأكيد موعد عميل» — موظف تجريبي 1', time: 'اليوم 11:02' },
  { icon: '🧭', text: 'عدّلتَ Schema مهمة «كتابة بوست سوشيال» (أُضيف حقل الهدف)', time: 'أمس 18:30' },
  { icon: '👥', text: 'أُضيف «موظف تجريبي 8» بقسم الحسابات', time: 'أمس 14:12' },
  { icon: '💬', text: '14 محادثة جديدة على المنصّة', time: 'أمس' }
];
