/* ============================================================
   app.js — App logic: state · i18n apply · auth (demo) ·
   library rendering · chat + enforced Schema form cards
   Prototype T1 — منصّة العمل الذكية

   القرارات المجسَّدة:
   UI-001 Chat + Form Cards (إلزام صلب من الواجهة)
   UI-002 Role-based Task Library (7 أقسام + Admin)
   UI-003 AR RTL default + EN toggle
   UI-004 Sidebar layout
   UI-005 Light theme + Dark toggle
   ============================================================ */

/* ================= In-memory state (no browser storage) ================= */
var state = { lang: 'ar', theme: 'light', user: null, role: null, formDone: false };
var currentTask = null;

/* BE-P1: الوضع الحي — يُكتشف تلقائياً من /api/me
   LIVE=true: دخول حقيقي بكلمة مرور + المهام من قاعدة D1
   LIVE=false: الوضع التجريبي القديم كما هو (fallback آمن) */
var LIVE = false;
var SERVER_TASKS = [];

/* ================= i18n helpers ================= */
function t(key) {
  var v = STR[state.lang][key];
  return (v === undefined) ? key : v;
}

function applyI18n() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = (state.lang === 'ar') ? 'rtl' : 'ltr';

  var nodes = document.querySelectorAll('[data-i18n]');
  for (var i = 0; i < nodes.length; i++) {
    nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
  }
  var phs = document.querySelectorAll('[data-i18n-ph]');
  for (var j = 0; j < phs.length; j++) {
    phs[j].placeholder = t(phs[j].getAttribute('data-i18n-ph'));
  }
  document.getElementById('langBtn').textContent = (state.lang === 'ar') ? 'EN' : 'ع';

  if (state.user) { paintUser(); renderLibrary(); }
}

function toggleLang() {
  state.lang = (state.lang === 'ar') ? 'en' : 'ar';
  applyI18n();
}

function toggleTheme() {
  state.theme = (state.theme === 'light') ? 'dark' : 'light';
  document.body.setAttribute('data-theme', state.theme);
  document.getElementById('themeBtn').textContent = (state.theme === 'light') ? '🌙' : '☀️';
}

/* ================= Live mode detection (BE-P1) ================= */
function detectMode() {
  fetch('/api/me')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (!d.live) return; /* يبقى تجريبياً */
      LIVE = true;
      /* واجهة الدخول الحية: مستخدم + كلمة مرور، بلا اختيار قسم */
      document.getElementById('empPass').style.display = 'block';
      document.getElementById('roleWrap').style.display = 'none';
      var note = document.getElementById('modeNote');
      note.textContent = d.needSetup ? t('needSetupNote') : t('liveNote');
      document.getElementById('empName').placeholder = t('phUser');
      if (d.user) enterApp(d.user); /* جلسة قائمة — دخول مباشر */
    })
    .catch(function () { /* لا خادم (فتح محلي مثلاً) → تجريبي */ });
}

function enterApp(user) {
  if (user.role === 'admin') { window.location.href = 'admin/'; return; }
  state.user = user.name;
  state.role = user.role;
  var after = function () {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').classList.add('active');
    paintUser();
    renderLibrary();
    goLibrary();
  };
  if (LIVE) {
    fetch('/api/tasks')
      .then(function (r) { return r.json(); })
      .then(function (d) { SERVER_TASKS = (d && d.tasks) || []; after(); })
      .catch(function () { SERVER_TASKS = []; after(); });
  } else {
    after();
  }
}

/* ================= Auth ================= */
function doLogin() {
  if (LIVE) {
    var username = document.getElementById('empName').value.trim();
    var password = document.getElementById('empPass').value;
    var note = document.getElementById('modeNote');
    if (!username || !password) { note.textContent = t('loginFail'); return; }
    note.textContent = t('loggingIn');
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.ok) { enterApp(d.user); }
        else { note.textContent = t('loginFail'); }
      })
      .catch(function () { note.textContent = t('loginFail'); });
    return;
  }

  /* ===== الوضع التجريبي (كما كان) ===== */
  var role = document.getElementById('empRole').value;
  if (role === 'admin') { window.location.href = 'admin/'; return; }
  var name = document.getElementById('empName').value.trim();
  if (!name) name = (state.lang === 'ar') ? 'موظف تجريبي' : 'Demo Employee';
  enterApp({ name: name, role: role });
}

function logout() {
  if (LIVE) { fetch('/api/logout', { method: 'POST' }); }
  state.user = null;
  document.getElementById('app').classList.remove('active');
  document.getElementById('loginScreen').style.display = 'flex';
}

function paintUser() {
  var roleLbl = t('role_' + state.role);
  document.getElementById('userNameLbl').textContent = state.user;
  document.getElementById('userRoleLbl').textContent = roleLbl;
  document.getElementById('userAvatar').textContent = state.user.charAt(0);
  document.getElementById('roleBadge').textContent = '👤 ' + roleLbl;
  document.getElementById('helloLbl').textContent = t('hello') + '، ' + state.user + ' 👋';
}

/* ================= Task library (UI-002) ================= */
function renderLibrary() {
  var grid = document.getElementById('taskGrid');
  grid.innerHTML = '';
  /* الوضع الحي: المهام من قاعدة D1 · التجريبي: من data.js */
  var list = LIVE ? SERVER_TASKS : (TASKS[state.role] || []);

  for (var i = 0; i < list.length; i++) {
    (function (task) {
      var el = document.createElement('div');
      el.className = 'task-card';
      var txt = (state.lang === 'ar') ? task.ar : task.en;
      el.innerHTML =
        '<div class="icon">' + task.icon + '</div>' +
        '<h4>' + txt[0] + '</h4>' +
        '<p>' + txt[1] + '</p>' +
        '<div class="steps">' + STR[state.lang].stepsPath(task.steps) + '</div>';
      el.onclick = function () { openTask(task); };
      grid.appendChild(el);
    })(list[i]);
  }

  /* Locked card — visualizes role-based filtering */
  var locked = document.createElement('div');
  locked.className = 'task-card locked';
  locked.innerHTML =
    '<div class="icon">🔒</div>' +
    '<h4>' + t('lockedTitle') + '</h4>' +
    '<p>' + t('lockedSub') + '</p>';
  grid.appendChild(locked);
}

function goLibrary() {
  document.getElementById('chatView').classList.remove('active');
  document.getElementById('libraryView').classList.remove('hidden');
  document.getElementById('topTitle').textContent = t('libTitle');
}

/* ================= Chat + enforced Schema form (UI-001) ================= */
function openTask(task) {
  currentTask = task;
  state.formDone = false;

  document.getElementById('libraryView').classList.add('hidden');
  document.getElementById('chatView').classList.add('active');

  var txt = (state.lang === 'ar') ? task.ar : task.en;
  document.getElementById('topTitle').textContent = txt[0];
  document.getElementById('messages').innerHTML = '';
  lockComposer(true);

  var intro = (state.lang === 'ar')
    ? 'أهلاً ' + state.user + ' 👋 سأساعدك في «' + txt[0] + '». حتى نلتزم بالمسار المعتمد، أحتاج منك البيانات التالية أولاً — <b>لن نستطيع المتابعة قبل اكتمالها</b>:'
    : 'Hi ' + state.user + ' 👋 I will help you with "' + txt[0] + '". To follow the approved path, I need the following data first — <b>we cannot continue before it is complete</b>:';

  aiMessage(intro, buildFormCard(task));
}

function buildFormCard(task) {
  var card = document.createElement('div');
  card.className = 'form-card';

  var head = document.createElement('h5');
  head.innerHTML = '🧭 ' + t('schemaTitle');
  var note = document.createElement('div');
  note.className = 'req-note';
  note.textContent = t('reqNote');
  var prog = document.createElement('div');
  prog.className = 'form-progress';
  prog.innerHTML = '<i></i>';

  card.appendChild(head);
  card.appendChild(note);
  card.appendChild(prog);

  var inputs = [];
  for (var i = 0; i < task.fields.length; i++) {
    var f = task.fields[i];
    var wrap = document.createElement('div');
    wrap.className = 'field';

    var lbl = document.createElement('label');
    lbl.innerHTML = ((state.lang === 'ar') ? f.ar : f.en) +
      ' <span class="star">*</span> <span class="valid-mark">✔</span>';
    wrap.appendChild(lbl);

    var inp;
    if (f.type === 'select') {
      inp = document.createElement('select');
      var opts = (state.lang === 'ar') ? f.opts.ar : f.opts.en;
      for (var o = 0; o < opts.length; o++) {
        var op = document.createElement('option');
        op.value = (o === 0 ? '' : opts[o]);
        op.textContent = opts[o];
        inp.appendChild(op);
      }
    } else if (f.type === 'textarea') {
      inp = document.createElement('textarea');
    } else {
      inp = document.createElement('input');
      inp.type = 'text';
    }
    inp.setAttribute('data-key', f.k);
    wrap.appendChild(inp);
    card.appendChild(wrap);
    inputs.push({ wrap: wrap, inp: inp });
  }

  var btn = document.createElement('button');
  btn.className = 'btn-primary form-submit';
  btn.disabled = true;
  btn.textContent = t('submit');
  var hint = document.createElement('div');
  hint.className = 'form-hint';
  hint.textContent = t('hint');
  card.appendChild(btn);
  card.appendChild(hint);

  /* Hard enforcement: submit unlocks only when ALL required fields are filled */
  function check() {
    var done = 0;
    for (var i = 0; i < inputs.length; i++) {
      var v = inputs[i].inp.value.trim();
      if (v) { inputs[i].wrap.classList.add('done'); done++; }
      else { inputs[i].wrap.classList.remove('done'); }
    }
    prog.querySelector('i').style.width = Math.round(done / inputs.length * 100) + '%';
    btn.disabled = (done !== inputs.length);
  }
  for (var k = 0; k < inputs.length; k++) {
    inputs[k].inp.addEventListener('input', check);
    inputs[k].inp.addEventListener('change', check);
  }

  btn.onclick = function () {
    var data = {};
    for (var i = 0; i < inputs.length; i++) {
      data[inputs[i].inp.getAttribute('data-key')] = inputs[i].inp.value.trim();
      inputs[i].inp.disabled = true;
    }
    btn.disabled = true;
    btn.textContent = '✔';
    submitForm(data);
  };

  return card;
}

function submitForm(data) {
  var tpl = (state.lang === 'ar') ? currentTask.result.ar : currentTask.result.en;
  var out = tpl.replace(/\{(\w+)\}/g, function (_, k) { return data[k] || '—'; });

  var res = document.createElement('div');
  res.className = 'result-card';
  res.innerHTML = '<span class="tag">' + t('resultTag') + '</span><br>' + out;

  aiMessage(t('afterSubmit'), res);
  state.formDone = true;
  lockComposer(false);
}

/* ================= Composer lock (part of UI-001 enforcement) ================= */
function lockComposer(locked) {
  document.getElementById('composerInput').disabled = locked;
  document.getElementById('sendBtn').disabled = locked;
  var b = document.getElementById('lockBanner');
  if (locked) b.classList.add('show'); else b.classList.remove('show');
}

function userSend() {
  var inp = document.getElementById('composerInput');
  var val = inp.value.trim();
  if (!val) return;
  userMessage(val);
  inp.value = '';
  setTimeout(function () { aiMessage(t('freeReply')); }, 500);
}

/* ================= Message rendering ================= */
function aiMessage(html, node) {
  var m = document.getElementById('messages');
  var row = document.createElement('div');
  row.className = 'msg-row';
  row.innerHTML =
    '<div class="msg-avatar ai">⚙</div>' +
    '<div class="msg-body"><div class="name">' + t('assistant') + '</div><div>' + html + '</div></div>';
  if (node) row.querySelector('.msg-body').appendChild(node);
  m.appendChild(row);
  m.scrollTop = m.scrollHeight;
}

function userMessage(text) {
  var m = document.getElementById('messages');
  var row = document.createElement('div');
  row.className = 'msg-row';
  var safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  row.innerHTML =
    '<div class="msg-avatar user">' + state.user.charAt(0) + '</div>' +
    '<div class="msg-body"><div class="name">' + t('you') + '</div><div>' + safe + '</div></div>';
  m.appendChild(row);
  m.scrollTop = m.scrollHeight;
}

/* ================= 📱 Burger menu (mobile sidebar) ================= */
function setSidebar(open) {
  var aside = document.querySelector('#app aside');
  var scrim = document.getElementById('scrim');
  if (open) { aside.classList.add('open'); scrim.classList.add('show'); }
  else { aside.classList.remove('open'); scrim.classList.remove('show'); }
}
document.getElementById('burgerBtn').addEventListener('click', function () {
  var aside = document.querySelector('#app aside');
  setSidebar(!aside.classList.contains('open'));
});
document.getElementById('scrim').addEventListener('click', function () { setSidebar(false); });

/* ================= Event bindings ================= */
document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('newTaskBtn').addEventListener('click', function () {
  goLibrary();
  setSidebar(false); /* أغلق قائمة الجوال بعد الاختيار */
});
document.getElementById('langBtn').addEventListener('click', toggleLang);
document.getElementById('themeBtn').addEventListener('click', toggleTheme);
document.getElementById('sendBtn').addEventListener('click', userSend);
document.getElementById('composerInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); userSend(); }
});

/* ================= Init ================= */
applyI18n();
detectMode();
