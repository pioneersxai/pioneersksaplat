/* ============================================================
   data.js — Demo tasks per role (DUMMY DATA — for prototype only)
   Prototype T1 — منصّة العمل الذكية
   قرار UI-002: مكتبة مهام مفلترة حسب الدور (Role-based Task Library)

   الأدوار: reception · marketing · social · website · stores · hr · accounting
   (admin ليس دور مهام — يوجَّه للوحة التحكم من شاشة الدخول)

   ⚠️ في النسخة الفعلية: هذه البيانات تأتي من الـ Backend
   (تعليمات صاحب العمل + الـ Schemas المعتمدة) — لا تُكتب هنا يدوياً.
   ============================================================ */

var TASKS = {

  /* ============ الاستقبال ============ */
  reception: [
    {
      id: 'confirm', icon: '📞',
      ar: ['تأكيد موعد عميل', 'اجمع بيانات الموعد وسيصيغ لك المساعد رسالة التأكيد المعتمدة'],
      en: ['Confirm client appointment', 'Collect appointment data; the assistant drafts the approved confirmation message'],
      steps: 3,
      fields: [
        { k: 'client', ar: 'اسم العميل', en: 'Client name', type: 'text' },
        { k: 'day', ar: 'يوم وتاريخ الموعد', en: 'Appointment day & date', type: 'text' },
        { k: 'service', ar: 'الخدمة المحجوزة', en: 'Booked service', type: 'select',
          opts: { ar: ['اختر...', 'استشارة أولى', 'جلسة متابعة', 'أخرى'], en: ['Choose...', 'First consultation', 'Follow-up session', 'Other'] } }
      ],
      result: {
        ar: 'مرحباً {client} 👋<br>نؤكد موعدك يوم <b>{day}</b> لخدمة <b>{service}</b>.<br>نرجو الحضور قبل الموعد بـ 10 دقائق. لأي استفسار يسعدنا تواصلك معنا.',
        en: 'Hello {client} 👋<br>We confirm your appointment on <b>{day}</b> for <b>{service}</b>.<br>Please arrive 10 minutes early. We are happy to help with any questions.'
      }
    },
    {
      id: 'inquiry', icon: '💬',
      ar: ['رد على استفسار عميل', 'المساعد يلزمك بجمع سياق الاستفسار كاملاً قبل صياغة الرد'],
      en: ['Reply to client inquiry', 'The assistant requires the full inquiry context before drafting a reply'],
      steps: 3,
      fields: [
        { k: 'channel', ar: 'قناة التواصل', en: 'Channel', type: 'select',
          opts: { ar: ['اختر...', 'واتساب', 'هاتف', 'إنستغرام'], en: ['Choose...', 'WhatsApp', 'Phone', 'Instagram'] } },
        { k: 'question', ar: 'نص استفسار العميل', en: 'Client question text', type: 'textarea' },
        { k: 'client', ar: 'اسم العميل', en: 'Client name', type: 'text' }
      ],
      result: {
        ar: 'رد مقترح عبر <b>{channel}</b> للعميل <b>{client}</b>:<br>«شكراً لتواصلك معنا 🌟 بخصوص استفسارك: سيتم تزويدك بالتفاصيل الدقيقة من الفريق المختص، وتحت إشراف طبي كامل.»<br><i>— يُراجع قبل الإرسال</i>',
        en: 'Suggested reply via <b>{channel}</b> to <b>{client}</b>:<br>“Thank you for reaching out 🌟 Regarding your question: the specialized team will provide exact details, under full medical supervision.”<br><i>— review before sending</i>'
      }
    },
    {
      id: 'eod', icon: '📊',
      ar: ['تقرير نهاية اليوم', 'لا يقبل المساعد التقرير إلا مكتمل الأرقام الأساسية'],
      en: ['End-of-day report', 'The assistant only accepts the report with all core numbers'],
      steps: 4,
      fields: [
        { k: 'visits', ar: 'عدد الزيارات اليوم', en: 'Visits today', type: 'text' },
        { k: 'calls', ar: 'عدد المكالمات', en: 'Calls handled', type: 'text' },
        { k: 'issues', ar: 'أهم ملاحظة أو مشكلة', en: 'Key note or issue', type: 'textarea' }
      ],
      result: {
        ar: '📊 <b>تقرير نهاية اليوم</b><br>الزيارات: {visits} · المكالمات: {calls}<br>أبرز الملاحظات: {issues}<br><i>أُرسل للإدارة بالتنسيق المعتمد.</i>',
        en: '📊 <b>End-of-day report</b><br>Visits: {visits} · Calls: {calls}<br>Key notes: {issues}<br><i>Sent to management in the approved format.</i>'
      }
    }
  ],

  /* ============ التسويق ============ */
  marketing: [
    {
      id: 'post', icon: '📝',
      ar: ['كتابة بوست سوشيال', 'المساعد يلزمك بتحديد الخدمة والجمهور والهدف قبل أي صياغة'],
      en: ['Write a social post', 'The assistant requires service, audience and goal before drafting'],
      steps: 3,
      fields: [
        { k: 'service', ar: 'الخدمة موضوع البوست', en: 'Service of the post', type: 'text' },
        { k: 'audience', ar: 'الجمهور المستهدف', en: 'Target audience', type: 'text' },
        { k: 'goal', ar: 'الهدف من البوست', en: 'Post goal', type: 'select',
          opts: { ar: ['اختر...', 'وعي بالخدمة', 'حجوزات', 'تفاعل'], en: ['Choose...', 'Awareness', 'Bookings', 'Engagement'] } }
      ],
      result: {
        ar: '📝 <b>مسودة بوست</b> عن <b>{service}</b> لجمهور <b>{audience}</b> (الهدف: {goal}):<br>«اهتمامك ببشرتك يبدأ بخطوة ✨ تعرّف على {service} — بإشراف طبي وبنتائج مدروسة. احجز استشارتك الآن.»<br><i>— مسودة تخضع لمراجعة قبل النشر</i>',
        en: '📝 <b>Post draft</b> about <b>{service}</b> for <b>{audience}</b> (goal: {goal}):<br>“Caring for your skin starts with one step ✨ Discover {service} — under medical supervision, with well-studied results. Book your consultation now.”<br><i>— draft subject to review before publishing</i>'
      }
    },
    {
      id: 'reelidea', icon: '🎬',
      ar: ['فكرة فيديو قصير', 'اجمع عناصر الفكرة وسيبني لك المساعد سيناريو مبدئياً'],
      en: ['Short video idea', 'Provide the idea elements; the assistant builds an initial script'],
      steps: 3,
      fields: [
        { k: 'topic', ar: 'موضوع الفيديو', en: 'Video topic', type: 'text' },
        { k: 'duration', ar: 'المدة المستهدفة', en: 'Target duration', type: 'select',
          opts: { ar: ['اختر...', '15 ثانية', '30 ثانية', '60 ثانية'], en: ['Choose...', '15s', '30s', '60s'] } },
        { k: 'cta', ar: 'الدعوة للإجراء (CTA)', en: 'Call to action (CTA)', type: 'text' }
      ],
      result: {
        ar: '🎬 <b>سيناريو مبدئي</b> ({duration}) عن <b>{topic}</b>:<br>مشهد 1: سؤال شائع من الجمهور · مشهد 2: إجابة سريعة مبسطة · مشهد 3: {cta}<br><i>— مسودة للمراجعة</i>',
        en: '🎬 <b>Initial script</b> ({duration}) about <b>{topic}</b>:<br>Scene 1: a common audience question · Scene 2: quick simple answer · Scene 3: {cta}<br><i>— draft for review</i>'
      }
    }
  ],

  /* ============ السوشيال ميديا ============ */
  social: [
    {
      id: 'schedule', icon: '📅',
      ar: ['جدولة بوستات الأسبوع', 'حدّد المنصة والعدد والمحور وسيبني لك المساعد جدولاً مبدئياً'],
      en: ['Schedule weekly posts', 'Set platform, count and theme; the assistant builds an initial schedule'],
      steps: 3,
      fields: [
        { k: 'platform', ar: 'المنصة', en: 'Platform', type: 'select',
          opts: { ar: ['اختر...', 'إنستغرام', 'تيك توك', 'سناب شات'], en: ['Choose...', 'Instagram', 'TikTok', 'Snapchat'] } },
        { k: 'count', ar: 'عدد البوستات المطلوبة', en: 'Number of posts', type: 'text' },
        { k: 'theme', ar: 'المحور الأساسي للأسبوع', en: 'Main theme of the week', type: 'text' }
      ],
      result: {
        ar: '📅 <b>جدول مبدئي</b> — {count} بوست على <b>{platform}</b> حول «{theme}»:<br>موزعة على أيام الأسبوع بالتناوب بين محتوى توعوي · تفاعلي · تعريفي بالخدمات.<br><i>— جدول مبدئي يخضع للمراجعة</i>',
        en: '📅 <b>Initial schedule</b> — {count} posts on <b>{platform}</b> around “{theme}”:<br>Spread across the week alternating educational · interactive · service-intro content.<br><i>— initial schedule, subject to review</i>'
      }
    },
    {
      id: 'reply', icon: '💬',
      ar: ['رد على تعليق أو رسالة', 'المساعد يطلب نص التعليق ونبرة الرد قبل الصياغة'],
      en: ['Reply to a comment or DM', 'The assistant requires the comment text and reply tone before drafting'],
      steps: 3,
      fields: [
        { k: 'platform', ar: 'المنصة', en: 'Platform', type: 'select',
          opts: { ar: ['اختر...', 'إنستغرام', 'تيك توك', 'سناب شات'], en: ['Choose...', 'Instagram', 'TikTok', 'Snapchat'] } },
        { k: 'comment', ar: 'نص التعليق / الرسالة', en: 'Comment / message text', type: 'textarea' },
        { k: 'tone', ar: 'نبرة الرد', en: 'Reply tone', type: 'select',
          opts: { ar: ['اختر...', 'ودّية', 'رسمية'], en: ['Choose...', 'Friendly', 'Formal'] } }
      ],
      result: {
        ar: '💬 <b>مسودة رد</b> ({tone}) على <b>{platform}</b>:<br>«أهلاً بك 🌟 شكراً لتفاعلك! تم تسجيل ملاحظتك وسيتواصل معك الفريق المختص بالتفاصيل الدقيقة.»<br><i>— يُراجع قبل النشر</i>',
        en: '💬 <b>Reply draft</b> ({tone}) on <b>{platform}</b>:<br>“Hello 🌟 thanks for engaging! Your note is logged and the specialized team will follow up with exact details.”<br><i>— review before posting</i>'
      }
    }
  ],

  /* ============ المواقع والمتاجر ============ */
  website: [
    {
      id: 'pageupdate', icon: '🌐',
      ar: ['طلب تحديث محتوى صفحة', 'حدّد الصفحة والقسم والتعديل المطلوب بدقة قبل التنفيذ'],
      en: ['Page content update request', 'Specify the page, section and exact change before execution'],
      steps: 3,
      fields: [
        { k: 'page', ar: 'الصفحة (الاسم أو الرابط)', en: 'Page (name or URL)', type: 'text' },
        { k: 'section', ar: 'القسم المطلوب تعديله', en: 'Section to modify', type: 'text' },
        { k: 'change', ar: 'وصف التعديل المطلوب', en: 'Description of the change', type: 'textarea' }
      ],
      result: {
        ar: '🌐 <b>طلب تحديث</b> — صفحة <b>{page}</b> · قسم <b>{section}</b>:<br>{change}<br><i>— طلب موثَّق جاهز للتنفيذ بعد الاعتماد</i>',
        en: '🌐 <b>Update request</b> — page <b>{page}</b> · section <b>{section}</b>:<br>{change}<br><i>— documented request, ready for execution after approval</i>'
      }
    },
    {
      id: 'product', icon: '🛒',
      ar: ['إضافة منتج للمتجر', 'المساعد يلزمك ببيانات المنتج كاملة قبل صياغة بطاقته'],
      en: ['Add a store product', 'The assistant requires complete product data before drafting its card'],
      steps: 3,
      fields: [
        { k: 'name', ar: 'اسم المنتج', en: 'Product name', type: 'text' },
        { k: 'price', ar: 'السعر', en: 'Price', type: 'text' },
        { k: 'desc', ar: 'وصف مختصر للمنتج', en: 'Short product description', type: 'textarea' }
      ],
      result: {
        ar: '🛒 <b>بطاقة منتج مبدئية</b>:<br><b>{name}</b> — {price}<br>{desc}<br><i>— تُراجع الصياغة والسعر قبل النشر في المتجر</i>',
        en: '🛒 <b>Initial product card</b>:<br><b>{name}</b> — {price}<br>{desc}<br><i>— copy and price reviewed before publishing to the store</i>'
      }
    }
  ],

  /* ============ المستودعات ============ */
  stores: [
    {
      id: 'supply', icon: '📦',
      ar: ['طلب توريد مخزون', 'حدّد الصنف والكمية ودرجة الاستعجال ليخرج الطلب بالتنسيق المعتمد'],
      en: ['Stock supply request', 'Set item, quantity and urgency to produce the approved request format'],
      steps: 3,
      fields: [
        { k: 'item', ar: 'اسم الصنف', en: 'Item name', type: 'text' },
        { k: 'qty', ar: 'الكمية المطلوبة', en: 'Required quantity', type: 'text' },
        { k: 'urgency', ar: 'درجة الاستعجال', en: 'Urgency', type: 'select',
          opts: { ar: ['اختر...', 'عادي', 'عاجل'], en: ['Choose...', 'Normal', 'Urgent'] } }
      ],
      result: {
        ar: '📦 <b>طلب توريد</b> ({urgency}):<br>الصنف: <b>{item}</b> · الكمية: <b>{qty}</b><br><i>— أُرسل لمسؤول المشتريات بالتنسيق المعتمد</i>',
        en: '📦 <b>Supply request</b> ({urgency}):<br>Item: <b>{item}</b> · Quantity: <b>{qty}</b><br><i>— sent to procurement in the approved format</i>'
      }
    },
    {
      id: 'stockcount', icon: '📋',
      ar: ['تقرير جرد صنف', 'المساعد لا يقبل الجرد بلا كمية فعلية وملاحظات الفروقات'],
      en: ['Item stock-count report', 'The assistant requires the counted quantity and variance notes'],
      steps: 3,
      fields: [
        { k: 'item', ar: 'اسم الصنف', en: 'Item name', type: 'text' },
        { k: 'counted', ar: 'الكمية المجرودة فعلياً', en: 'Counted quantity', type: 'text' },
        { k: 'notes', ar: 'ملاحظات / فروقات', en: 'Notes / variances', type: 'textarea' }
      ],
      result: {
        ar: '📋 <b>تقرير جرد</b> — <b>{item}</b>:<br>الكمية الفعلية: <b>{counted}</b><br>الملاحظات: {notes}<br><i>— سُجّل بانتظار المطابقة</i>',
        en: '📋 <b>Stock-count report</b> — <b>{item}</b>:<br>Counted quantity: <b>{counted}</b><br>Notes: {notes}<br><i>— logged pending reconciliation</i>'
      }
    }
  ],

  /* ============ الموارد البشرية ============ */
  hr: [
    {
      id: 'attendance', icon: '🕒',
      ar: ['تقرير حضور يومي', 'لا يكتمل التقرير إلا بأرقام الحضور والغياب وملاحظاتها'],
      en: ['Daily attendance report', 'The report requires presence/absence numbers and notes'],
      steps: 3,
      fields: [
        { k: 'present', ar: 'عدد الحاضرين', en: 'Present count', type: 'text' },
        { k: 'absent', ar: 'عدد الغائبين', en: 'Absent count', type: 'text' },
        { k: 'notes', ar: 'ملاحظات (تأخير · استئذان...)', en: 'Notes (lateness · permissions...)', type: 'textarea' }
      ],
      result: {
        ar: '🕒 <b>تقرير الحضور اليومي</b><br>حضور: {present} · غياب: {absent}<br>ملاحظات: {notes}<br><i>— أُرسل للإدارة بالتنسيق المعتمد</i>',
        en: '🕒 <b>Daily attendance report</b><br>Present: {present} · Absent: {absent}<br>Notes: {notes}<br><i>— sent to management in the approved format</i>'
      }
    },
    {
      id: 'vacancy', icon: '📣',
      ar: ['مسودة إعلان وظيفة', 'حدّد المسمى والقسم والمتطلبات ليصيغ المساعد الإعلان'],
      en: ['Job posting draft', 'Set title, department and requirements; the assistant drafts the posting'],
      steps: 3,
      fields: [
        { k: 'title', ar: 'المسمى الوظيفي', en: 'Job title', type: 'text' },
        { k: 'dept', ar: 'القسم', en: 'Department', type: 'text' },
        { k: 'reqs', ar: 'أهم المتطلبات', en: 'Key requirements', type: 'textarea' }
      ],
      result: {
        ar: '📣 <b>مسودة إعلان وظيفة</b>:<br>مطلوب <b>{title}</b> لقسم <b>{dept}</b>.<br>المتطلبات: {reqs}<br><i>— تُراجع الصياغة والاشتراطات قبل النشر</i>',
        en: '📣 <b>Job posting draft</b>:<br><b>{title}</b> needed for <b>{dept}</b>.<br>Requirements: {reqs}<br><i>— wording and conditions reviewed before publishing</i>'
      }
    }
  ],

  /* ============ الحسابات ============ */
  accounting: [
    {
      id: 'expense', icon: '🧾',
      ar: ['تسجيل مصروف', 'المساعد لا يسجّل مصروفاً بلا وصف ومبلغ وتصنيف'],
      en: ['Record an expense', 'The assistant requires description, amount and category'],
      steps: 3,
      fields: [
        { k: 'desc', ar: 'وصف المصروف', en: 'Expense description', type: 'text' },
        { k: 'amount', ar: 'المبلغ', en: 'Amount', type: 'text' },
        { k: 'category', ar: 'التصنيف', en: 'Category', type: 'select',
          opts: { ar: ['اختر...', 'تشغيلي', 'تسويقي', 'أخرى'], en: ['Choose...', 'Operational', 'Marketing', 'Other'] } }
      ],
      result: {
        ar: '🧾 <b>قيد مصروف مبدئي</b>:<br>{desc} — <b>{amount}</b> ({category})<br><i>— قيد مبدئي بانتظار مراجعة المحاسب</i>',
        en: '🧾 <b>Initial expense entry</b>:<br>{desc} — <b>{amount}</b> ({category})<br><i>— initial entry pending accountant review</i>'
      }
    },
    {
      id: 'collection', icon: '💰',
      ar: ['تقرير تحصيل يومي', 'لا يكتمل التقرير إلا بمجاميع النقدي والشبكة والملاحظات'],
      en: ['Daily collections report', 'The report requires cash and card totals plus notes'],
      steps: 3,
      fields: [
        { k: 'cash', ar: 'إجمالي النقدي', en: 'Cash total', type: 'text' },
        { k: 'card', ar: 'إجمالي الشبكة / التحويلات', en: 'Card / transfers total', type: 'text' },
        { k: 'notes', ar: 'ملاحظات', en: 'Notes', type: 'textarea' }
      ],
      result: {
        ar: '💰 <b>تقرير التحصيل اليومي</b><br>نقدي: {cash} · شبكة/تحويلات: {card}<br>ملاحظات: {notes}<br><i>— أُرسل للحسابات بالتنسيق المعتمد</i>',
        en: '💰 <b>Daily collections report</b><br>Cash: {cash} · Card/transfers: {card}<br>Notes: {notes}<br><i>— sent to accounting in the approved format</i>'
      }
    }
  ]
};
