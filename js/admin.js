/* ============================================================
   admin.js — Admin console logic
   Prototype T1 — لوحة التحكم

   الأقسام: نظرة عامة · المهام والـ Schemas (مع Builder ومعاينة حية) ·
   الموظفون والأدوار · مراجعة المخرجات (مراجعة بشرية إلزامية)

   ⚠️ كل الحفظ هنا في الذاكرة فقط (in-memory) — لا Backend بعد.
   ============================================================ */

var adminState = { theme: 'light', view: 'overview', selectedTask: null };

/* ================= Navigation ================= */
var VIEW_TITLES = {
  overview: 'نظرة عامة',
  tasks: 'المهام والـ Schemas',
  employees: 'الموظفون والأقسام',
  review: 'مراجعة المخرجات'
};

function switchView(view) {
  adminState.view = view;
  var navs = document.querySelectorAll('.nav-item');
  for (var i = 0; i < navs.length; i++) {
    navs[i].classList.toggle('active', navs[i].getAttribute('data-view') === view);
  }
  var views = document.querySelectorAll('.admin-view');
  for (var j = 0; j < views.length; j++) {
    views[j].classList.toggle('active', views[j].id === 'view-' + view);
  }
  document.getElementById('viewTitle').textContent = VIEW_TITLES[view];
}

/* ================= Theme (UI-005) ================= */
function toggleTheme() {
  adminState.theme = (adminState.theme === 'light') ? 'dark' : 'light';
  document.body.setAttribute('data-theme', adminState.theme);
  document.getElementById('themeBtn').textContent = (adminState.theme === 'light') ? '🌙' : '☀️';
}

/* ================= Overview ================= */
function renderActivity() {
  var list = document.getElementById('activityList');
  list.innerHTML = '';
  for (var i = 0; i < ACTIVITY.length; i++) {
    var a = ACTIVITY[i];
    var el = document.createElement('div');
    el.className = 'activity-item';
    el.innerHTML = '<span>' + a.icon + '</span><span>' + a.text + '</span><small>' + a.time + '</small>';
    list.appendChild(el);
  }
}

/* ================= Tasks list + builder ================= */
function renderTaskList() {
  var list = document.getElementById('adminTaskList');
  list.innerHTML = '';
  for (var i = 0; i < ADMIN_TASKS.length; i++) {
    (function (task, idx) {
      var el = document.createElement('div');
      el.className = 't-item' + (task.enabled ? '' : ' off') + (adminState.selectedTask === idx ? ' active' : '');
      el.innerHTML = '<span>' + task.icon + '</span><span>' + task.name + '</span><span class="t-role">' + ROLES[task.role] + '</span>';
      el.onclick = function () { selectTask(idx); };
      list.appendChild(el);
    })(ADMIN_TASKS[i], i);
  }
}

function selectTask(idx) {
  adminState.selectedTask = idx;
  renderTaskList();
  var task = ADMIN_TASKS[idx];
  document.getElementById('builderEmpty').style.display = 'none';
  document.getElementById('builderForm').style.display = 'block';
  document.getElementById('bName').value = task.name;
  document.getElementById('bIcon').value = task.icon;
  document.getElementById('bRole').value = task.role;
  document.getElementById('bInstructions').value = task.instructions;
  document.getElementById('disableTaskBtn').textContent = task.enabled ? 'تعطيل المهمة' : 'تفعيل المهمة';
  renderFields(task);
  renderPreview(task);
}

function renderFields(task) {
  var wrap = document.getElementById('fieldsList');
  wrap.innerHTML = '';
  for (var i = 0; i < task.fields.length; i++) {
    (function (f, idx) {
      var row = document.createElement('div');
      row.className = 'f-row';

      var inp = document.createElement('input');
      inp.type = 'text';
      inp.value = f.label;
      inp.addEventListener('input', function () { f.label = inp.value; renderPreview(task); });

      var sel = document.createElement('select');
      var types = [['text', 'نص قصير'], ['textarea', 'نص طويل'], ['select', 'قائمة اختيار']];
      for (var t = 0; t < types.length; t++) {
        var op = document.createElement('option');
        op.value = types[t][0];
        op.textContent = types[t][1];
        sel.appendChild(op);
      }
      sel.value = f.type;
      sel.addEventListener('change', function () { f.type = sel.value; renderPreview(task); });

      var del = document.createElement('button');
      del.className = 'f-del';
      del.textContent = '✕';
      del.title = 'حذف الحقل';
      del.onclick = function () {
        task.fields.splice(idx, 1);
        renderFields(task);
        renderPreview(task);
      };

      row.appendChild(inp);
      row.appendChild(sel);
      row.appendChild(del);
      wrap.appendChild(row);
    })(task.fields[i], i);
  }
}

function addField() {
  if (adminState.selectedTask === null) return;
  var task = ADMIN_TASKS[adminState.selectedTask];
  task.fields.push({ label: 'حقل جديد', type: 'text' });
  renderFields(task);
  renderPreview(task);
}

function saveTask() {
  if (adminState.selectedTask === null) return;
  var task = ADMIN_TASKS[adminState.selectedTask];
  task.name = document.getElementById('bName').value.trim() || task.name;
  task.icon = document.getElementById('bIcon').value.trim() || task.icon;
  task.role = document.getElementById('bRole').value;
  task.instructions = document.getElementById('bInstructions').value;
  renderTaskList();
  renderPreview(task);
  var btn = document.getElementById('saveTaskBtn');
  btn.textContent = '✔ حُفظ (في الذاكرة فقط)';
  setTimeout(function () { btn.textContent = 'حفظ (تجريبي)'; }, 1600);
}

function toggleTaskEnabled() {
  if (adminState.selectedTask === null) return;
  var task = ADMIN_TASKS[adminState.selectedTask];
  task.enabled = !task.enabled;
  document.getElementById('disableTaskBtn').textContent = task.enabled ? 'تعطيل المهمة' : 'تفعيل المهمة';
  renderTaskList();
  renderStats();
}

function newTask() {
  ADMIN_TASKS.push({
    id: 'new' + ADMIN_TASKS.length,
    icon: '🆕',
    name: 'مهمة جديدة',
    role: 'reception',
    enabled: true,
    instructions: '',
    fields: [{ label: 'حقل جديد', type: 'text' }]
  });
  renderTaskList();
  selectTask(ADMIN_TASKS.length - 1);
  renderStats();
}

/* ===== Live preview — mirrors the employee-side form card ===== */
function renderPreview(task) {
  var box = document.getElementById('livePreview');
  box.innerHTML = '';

  var card = document.createElement('div');
  card.className = 'form-card';
  card.innerHTML =
    '<h5>🧭 بيانات إلزامية — Schema</h5>' +
    '<div class="req-note">كل الحقول المعلّمة بـ * إلزامية — زر الإرسال يفتح تلقائياً عند الاكتمال</div>' +
    '<div class="form-progress"><i style="width:0%"></i></div>';

  for (var i = 0; i < task.fields.length; i++) {
    var f = task.fields[i];
    var wrap = document.createElement('div');
    wrap.className = 'field';
    var lbl = document.createElement('label');
    lbl.innerHTML = (f.label || '—') + ' <span class="star">*</span>';
    wrap.appendChild(lbl);
    var inp;
    if (f.type === 'select') {
      inp = document.createElement('select');
      var op = document.createElement('option');
      op.textContent = 'اختر...';
      inp.appendChild(op);
    } else if (f.type === 'textarea') {
      inp = document.createElement('textarea');
      inp.rows = 2;
    } else {
      inp = document.createElement('input');
      inp.type = 'text';
    }
    inp.disabled = true;
    wrap.appendChild(inp);
    card.appendChild(wrap);
  }

  var btn = document.createElement('button');
  btn.className = 'btn-primary form-submit';
  btn.disabled = true;
  btn.textContent = 'إرسال البيانات';
  card.appendChild(btn);

  box.appendChild(card);
}

/* ================= Employees ================= */
function renderEmployees() {
  var body = document.getElementById('empTableBody');
  body.innerHTML = '';
  for (var i = 0; i < EMPLOYEES.length; i++) {
    (function (emp) {
      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      tdName.textContent = emp.name;

      var tdRole = document.createElement('td');
      var sel = document.createElement('select');
      for (var r in ROLES) {
        if (ROLES.hasOwnProperty(r)) {
          var op = document.createElement('option');
          op.value = r;
          op.textContent = ROLES[r];
          sel.appendChild(op);
        }
      }
      sel.value = emp.role;
      sel.addEventListener('change', function () { emp.role = sel.value; });
      tdRole.appendChild(sel);

      var tdState = document.createElement('td');
      tdState.innerHTML = emp.active
        ? '<span class="pill on">مفعّل</span>'
        : '<span class="pill off">موقوف</span>';

      var tdAct = document.createElement('td');
      var btn = document.createElement('button');
      btn.className = 'chip-btn';
      btn.textContent = emp.active ? 'إيقاف' : 'تفعيل';
      btn.onclick = function () { emp.active = !emp.active; renderEmployees(); };
      tdAct.appendChild(btn);

      tr.appendChild(tdName);
      tr.appendChild(tdRole);
      tr.appendChild(tdState);
      tr.appendChild(tdAct);
      body.appendChild(tr);
    })(EMPLOYEES[i]);
  }
}

function addEmployee() {
  EMPLOYEES.push({ name: 'موظف تجريبي ' + (EMPLOYEES.length + 1), role: 'reception', active: true });
  renderEmployees();
  renderStats();
}

/* ================= Review queue (GOV-HUMAN-REVIEW) ================= */
function renderReview() {
  var list = document.getElementById('reviewList');
  list.innerHTML = '';
  var pending = 0;

  for (var i = 0; i < REVIEW_QUEUE.length; i++) {
    (function (item) {
      var card = document.createElement('div');
      card.className = 'review-card' + (item.state ? ' review-done' : '');
      if (!item.state) pending++;

      var stateHtml = '';
      if (item.state === 'ok') stateHtml = '<span class="review-state ok">✔ اعتُمد</span>';
      if (item.state === 'back') stateHtml = '<span class="review-state back">↩ أُعيد للموظف</span>';

      card.innerHTML =
        '<div class="review-meta"><b>' + item.emp + '</b> · ' + item.task + ' · ' + item.time + ' ' + stateHtml + '</div>' +
        '<div class="review-output">' + item.output + '</div>';

      var actions = document.createElement('div');
      actions.className = 'review-actions';

      var ok = document.createElement('button');
      ok.className = 'btn-ok';
      ok.textContent = '✔ اعتماد';
      ok.onclick = function () { item.state = 'ok'; renderReview(); };

      var back = document.createElement('button');
      back.className = 'btn-back';
      back.textContent = '↩ إرجاع للتعديل';
      back.onclick = function () { item.state = 'back'; renderReview(); };

      actions.appendChild(ok);
      actions.appendChild(back);
      card.appendChild(actions);
      list.appendChild(card);
    })(REVIEW_QUEUE[i]);
  }

  if (REVIEW_QUEUE.length === 0) {
    list.innerHTML = '<div class="empty-note">لا مخرجات بانتظار المراجعة 🎉</div>';
  }

  var badge = document.getElementById('reviewBadge');
  badge.textContent = pending;
  badge.style.display = pending ? 'inline-block' : 'none';

  var sp = document.getElementById('statPending');
  if (sp) sp.textContent = pending;
}

/* ================= Overview stats (computed from data) ================= */
function renderStats() {
  var enabledCount = 0;
  for (var i = 0; i < ADMIN_TASKS.length; i++) {
    if (ADMIN_TASKS[i].enabled) enabledCount++;
  }
  var roleCount = 0;
  for (var r in ROLES) { if (ROLES.hasOwnProperty(r)) roleCount++; }

  var st = document.getElementById('statTasks');
  var sr = document.getElementById('statRoles');
  var se = document.getElementById('statEmps');
  if (st) st.textContent = enabledCount;
  if (sr) sr.textContent = roleCount;
  if (se) se.textContent = EMPLOYEES.length;
}

/* ================= 📱 Burger menu (mobile sidebar) ================= */
function setSidebar(open) {
  var aside = document.querySelector('.admin-side');
  var scrim = document.getElementById('scrim');
  if (open) { aside.classList.add('open'); scrim.classList.add('show'); }
  else { aside.classList.remove('open'); scrim.classList.remove('show'); }
}
document.getElementById('burgerBtn').addEventListener('click', function () {
  var aside = document.querySelector('.admin-side');
  setSidebar(!aside.classList.contains('open'));
});
document.getElementById('scrim').addEventListener('click', function () { setSidebar(false); });

/* ================= Event bindings ================= */
var navBtns = document.querySelectorAll('.nav-item');
for (var n = 0; n < navBtns.length; n++) {
  (function (btn) {
    btn.addEventListener('click', function () {
      switchView(btn.getAttribute('data-view'));
      setSidebar(false); /* أغلق قائمة الجوال بعد الاختيار */
    });
  })(navBtns[n]);
}
document.getElementById('themeBtn').addEventListener('click', toggleTheme);
document.getElementById('newTaskAdminBtn').addEventListener('click', newTask);
document.getElementById('addFieldBtn').addEventListener('click', addField);
document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
document.getElementById('disableTaskBtn').addEventListener('click', toggleTaskEnabled);
document.getElementById('addEmpBtn').addEventListener('click', addEmployee);

/* ================= Init ================= */
renderActivity();
renderTaskList();
renderEmployees();
renderReview();
renderStats();
