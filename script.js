// RAPI Escolar Pro rewrite using vanilla JavaScript.
// The goal is to reproduce the core functionality of the original React app
// while avoiding external dependencies. State is persisted in localStorage.

// ------------------------ Helpers & State ------------------------

const STORAGE_KEY = 'rapi_pro_vanilla';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Default state with one segment
const DEFAULT_SEGMENT_ID = 'default';
const defaultState = {
  teachers: [],
  segments: [{ id: DEFAULT_SEGMENT_ID, name: 'Ensino Regular', dailyPeriods: 5 }],
  classes: [],
  // schedule[classId][day][period] = { subject, teacherId }
  schedule: {},
  // calendars[segmentId][YYYY-MM][date] = status
  calendars: { [DEFAULT_SEGMENT_ID]: {} },
  // absences list
  absences: [],
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure all necessary keys exist
      return Object.assign({}, defaultState, parsed);
    }
  } catch (err) {
    console.error('Error loading state', err);
  }
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving state', err);
  }
}

let state = loadState();

// Utility to get teacher by id
function getTeacherName(id) {
  const t = state.teachers.find((x) => x.id === id);
  return t ? t.name : '';
}

// Utility to get class by id
function getClassName(id) {
  const c = state.classes.find((x) => x.id === id);
  return c ? c.name : '';
}

// ------------------------ Navigation ------------------------

// Activate a tab based on id
function setActiveTab(tabId) {
  document.querySelectorAll('#sidebar button').forEach((btn) => {
    if (btn.dataset.tab === tabId) btn.classList.add('active');
    else btn.classList.remove('active');
  });
  document.querySelectorAll('#content .tab').forEach((section) => {
    if (section.id === tabId) section.classList.add('active');
    else section.classList.remove('active');
  });
  // Render the selected tab
  switch (tabId) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'segments':
      renderSegments();
      break;
    case 'teachers':
      renderTeachers();
      break;
    case 'classes':
      renderClasses();
      break;
    case 'calendar':
      renderCalendar();
      break;
    case 'schedule':
      renderSchedule();
      break;
    case 'absences':
      renderAbsences();
      break;
    case 'reports':
      renderReports();
      break;
  }
}

// Attach click listeners to sidebar buttons
document.querySelectorAll('#sidebar button').forEach((btn) => {
  btn.addEventListener('click', () => {
    setActiveTab(btn.dataset.tab);
  });
});

// ------------------------ Dashboard ------------------------

function renderDashboard() {
  const container = document.getElementById('dashboard-content');
  container.innerHTML = '';
  const card = (title, value) => {
    const div = document.createElement('div');
    div.style.padding = '10px';
    div.style.margin = '10px 0';
    div.style.backgroundColor = '#fff';
    div.style.border = '1px solid #ddd';
    div.style.borderRadius = '4px';
    div.innerHTML = `<strong>${title}</strong><br/><span style="font-size:24px;">${value}</span>`;
    return div;
  };
  container.appendChild(card('Total de Professores', state.teachers.length));
  container.appendChild(card('Total de Turmas', state.classes.length));
  container.appendChild(card('Total de Modalidades', state.segments.length));
  container.appendChild(card('Faltas Registradas', state.absences.length));
}

// ------------------------ Segments ------------------------

function renderSegments() {
  const formDiv = document.getElementById('segments-form');
  const listDiv = document.getElementById('segments-list');
  formDiv.innerHTML = '';
  listDiv.innerHTML = '';
  // Form for adding a segment
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Nome da modalidade';
  const periodsInput = document.createElement('input');
  periodsInput.type = 'number';
  periodsInput.min = 1;
  periodsInput.max = 10;
  periodsInput.value = 5;
  periodsInput.placeholder = 'Aulas por dia';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Adicionar';
  addBtn.className = 'primary';
  addBtn.onclick = () => {
    const name = nameInput.value.trim();
    const periods = parseInt(periodsInput.value, 10) || 5;
    if (!name) {
      alert('Informe o nome da modalidade');
      return;
    }
    const id = generateUUID();
    state.segments.push({ id, name, dailyPeriods: periods });
    state.calendars[id] = {};
    nameInput.value = '';
    periodsInput.value = 5;
    saveState();
    renderSegments();
    renderDashboard();
  };
  formDiv.appendChild(nameInput);
  formDiv.appendChild(periodsInput);
  formDiv.appendChild(addBtn);
  // List existing segments
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>Nome</th><th>Aulas/Dia</th><th>Ações</th></tr>';
  const tbody = document.createElement('tbody');
  state.segments.forEach((seg) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${seg.name}</td><td>${seg.dailyPeriods}</td>`;
    const actionsTd = document.createElement('td');
    if (seg.id !== DEFAULT_SEGMENT_ID) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Excluir';
      delBtn.className = 'danger';
      delBtn.onclick = () => {
        if (state.classes.some((c) => c.segmentId === seg.id)) {
          alert('Não é possível excluir: há turmas vinculadas.');
          return;
        }
        if (confirm('Confirmar exclusão?')) {
          state.segments = state.segments.filter((s) => s.id !== seg.id);
          delete state.calendars[seg.id];
          saveState();
          renderSegments();
          renderDashboard();
        }
      };
      actionsTd.appendChild(delBtn);
    }
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  listDiv.appendChild(table);
}

// ------------------------ Teachers ------------------------

function renderTeachers() {
  const formDiv = document.getElementById('teachers-form');
  const listDiv = document.getElementById('teachers-list');
  formDiv.innerHTML = '';
  listDiv.innerHTML = '';
  // Form for adding a teacher
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Nome do professor';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Adicionar';
  addBtn.className = 'primary';
  addBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('Informe o nome do professor');
      return;
    }
    state.teachers.push({ id: generateUUID(), name });
    nameInput.value = '';
    saveState();
    renderTeachers();
    renderDashboard();
  };
  formDiv.appendChild(nameInput);
  formDiv.appendChild(addBtn);
  // List teachers
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Nome</th><th>Ações</th></tr></thead>';
  const tbody = document.createElement('tbody');
  state.teachers.forEach((teacher) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${teacher.name}</td>`;
    const td = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Excluir';
    delBtn.className = 'danger';
    delBtn.onclick = () => {
      if (confirm('Excluir professor? Isso removerá da grade.')) {
        state.teachers = state.teachers.filter((t) => t.id !== teacher.id);
        // Remove teacher from schedule
        Object.keys(state.schedule).forEach((cid) => {
          const days = state.schedule[cid];
          Object.keys(days).forEach((day) => {
            const periods = days[day];
            Object.keys(periods).forEach((p) => {
              if (periods[p].teacherId === teacher.id) {
                periods[p].teacherId = '';
              }
            });
          });
        });
        saveState();
        renderTeachers();
        renderSchedule();
        renderDashboard();
      }
    };
    td.appendChild(delBtn);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listDiv.appendChild(table);
}

// ------------------------ Classes ------------------------

function renderClasses() {
  const formDiv = document.getElementById('classes-form');
  const listDiv = document.getElementById('classes-list');
  formDiv.innerHTML = '';
  listDiv.innerHTML = '';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Nome da turma';
  const segmentSelect = document.createElement('select');
  state.segments.forEach((seg) => {
    const opt = document.createElement('option');
    opt.value = seg.id;
    opt.textContent = seg.name;
    segmentSelect.appendChild(opt);
  });
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Adicionar';
  addBtn.className = 'primary';
  addBtn.onclick = () => {
    const name = nameInput.value.trim();
    const segId = segmentSelect.value;
    if (!name) {
      alert('Informe o nome da turma');
      return;
    }
    state.classes.push({ id: generateUUID(), name, segmentId: segId });
    nameInput.value = '';
    saveState();
    renderClasses();
    renderDashboard();
  };
  formDiv.appendChild(nameInput);
  formDiv.appendChild(segmentSelect);
  formDiv.appendChild(addBtn);
  // List classes
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Turma</th><th>Modalidade</th><th>Ações</th></tr></thead>';
  const tbody = document.createElement('tbody');
  state.classes.forEach((cls) => {
    const tr = document.createElement('tr');
    const seg = state.segments.find((s) => s.id === cls.segmentId);
    tr.innerHTML = `<td>${cls.name}</td><td>${seg ? seg.name : '-'}</td>`;
    const td = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Excluir';
    delBtn.className = 'danger';
    delBtn.onclick = () => {
      if (confirm('Excluir turma e sua grade?')) {
        state.classes = state.classes.filter((c) => c.id !== cls.id);
        delete state.schedule[cls.id];
        // Remove absences for this class
        state.absences = state.absences.filter((a) => a.classId !== cls.id);
        saveState();
        renderClasses();
        renderSchedule();
        renderAbsences();
        renderDashboard();
      }
    };
    td.appendChild(delBtn);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listDiv.appendChild(table);
}

// ------------------------ Calendar ------------------------

function renderCalendar() {
  const controlsDiv = document.getElementById('calendar-controls');
  const gridDiv = document.getElementById('calendar-grid');
  controlsDiv.innerHTML = '';
  gridDiv.innerHTML = '';
  // Controls: segment select and month picker
  const segSelect = document.createElement('select');
  state.segments.forEach((seg) => {
    const opt = document.createElement('option');
    opt.value = seg.id;
    opt.textContent = seg.name;
    segSelect.appendChild(opt);
  });
  const monthInput = document.createElement('input');
  monthInput.type = 'month';
  // default to current month
  const today = new Date();
  monthInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  controlsDiv.appendChild(segSelect);
  controlsDiv.appendChild(monthInput);
  // Legend
  const legend = document.createElement('div');
  legend.style.marginTop = '8px';
  legend.innerHTML = '<small><span style="background:#e5e7eb;padding:2px 6px;border-radius:3px;margin-right:4px;">Letivo</span> <span style="background:#fee2e2;padding:2px 6px;border-radius:3px;margin-right:4px;">Feriado</span> <span style="background:#fef9c3;padding:2px 6px;border-radius:3px;margin-right:4px;">Não Letivo</span> <span style="background:#ddd6fe;padding:2px 6px;border-radius:3px;">Sábado Letivo</span></small>';
  controlsDiv.appendChild(legend);
  // Render grid when selections change
  function updateCalendarGrid() {
    const segId = segSelect.value;
    const ym = monthInput.value; // format YYYY-MM
    gridDiv.innerHTML = '';
    if (!ym) return;
    const [year, month] = ym.split('-').map(Number);
    // Determine number of days in month
    const lastDay = new Date(year, month, 0).getDate();
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Dia</th><th>Status</th></tr></thead>';
    const tbody = document.createElement('tbody');
    // Ensure calendar container exists
    if (!state.calendars[segId]) state.calendars[segId] = {};
    if (!state.calendars[segId][ym]) state.calendars[segId][ym] = {};
    const monthCal = state.calendars[segId][ym];
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const tr = document.createElement('tr');
      const status = monthCal[dateStr] || 'letivo';
      const tdDay = document.createElement('td');
      tdDay.textContent = dateStr;
      const tdStatus = document.createElement('td');
      // Create clickable cell that cycles status
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.style.padding = '4px 6px';
      span.style.borderRadius = '4px';
      span.style.cursor = 'pointer';
      function applyStatusStyling(val) {
        span.dataset.status = val;
        if (val === 'letivo') {
          span.textContent = 'Letivo';
          span.style.backgroundColor = '#e5e7eb';
        } else if (val === 'feriado') {
          span.textContent = 'Feriado';
          span.style.backgroundColor = '#fee2e2';
        } else if (val === 'nao_letivo') {
          span.textContent = 'Não Letivo';
          span.style.backgroundColor = '#fef9c3';
        } else if (val === 'sabado_letivo') {
          span.textContent = 'Sábado Letivo';
          span.style.backgroundColor = '#ddd6fe';
        }
      }
      applyStatusStyling(status);
      span.onclick = () => {
        // Cycle status
        let next;
        if (span.dataset.status === 'letivo') next = 'feriado';
        else if (span.dataset.status === 'feriado') next = 'nao_letivo';
        else if (span.dataset.status === 'nao_letivo') next = 'sabado_letivo';
        else next = 'letivo';
        applyStatusStyling(next);
        // Save
        if (next === 'letivo') delete monthCal[dateStr];
        else monthCal[dateStr] = next;
        saveState();
      };
      tdStatus.appendChild(span);
      tr.appendChild(tdDay);
      tr.appendChild(tdStatus);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    gridDiv.appendChild(table);
  }
  segSelect.onchange = updateCalendarGrid;
  monthInput.onchange = updateCalendarGrid;
  updateCalendarGrid();
}

// ------------------------ Schedule ------------------------

function renderSchedule() {
  const controlsDiv = document.getElementById('schedule-controls');
  const gridDiv = document.getElementById('schedule-grid');
  controlsDiv.innerHTML = '';
  gridDiv.innerHTML = '';
  // Control: choose class
  const classSelect = document.createElement('select');
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Selecione a turma';
  classSelect.appendChild(defaultOpt);
  state.classes.forEach((cls) => {
    const opt = document.createElement('option');
    opt.value = cls.id;
    opt.textContent = cls.name;
    classSelect.appendChild(opt);
  });
  controlsDiv.appendChild(classSelect);
  function updateScheduleGrid() {
    gridDiv.innerHTML = '';
    const cid = classSelect.value;
    if (!cid) return;
    const cls = state.classes.find((c) => c.id === cid);
    if (!cls) return;
    const seg = state.segments.find((s) => s.id === cls.segmentId);
    const periods = seg ? seg.dailyPeriods : 5;
    // Ensure schedule exists
    if (!state.schedule[cid]) state.schedule[cid] = {};
    // Build table
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    let headerHtml = '<tr><th>Dia/Período</th>';
    for (let p = 0; p < periods; p++) {
      headerHtml += `<th>${p + 1}ª Aula</th>`;
    }
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;
    const tbody = document.createElement('tbody');
    const weekdays = [1, 2, 3, 4, 5];
    const dayNames = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta' };
    weekdays.forEach((day) => {
      const tr = document.createElement('tr');
      const rowHeader = document.createElement('td');
      rowHeader.textContent = dayNames[day];
      tr.appendChild(rowHeader);
      if (!state.schedule[cid][day]) state.schedule[cid][day] = {};
      for (let p = 0; p < periods; p++) {
        const cell = document.createElement('td');
        // Subject input
        const subjInput = document.createElement('input');
        subjInput.type = 'text';
        subjInput.style.width = '70px';
        const current = state.schedule[cid][day][p] || { subject: '', teacherId: '' };
        subjInput.value = current.subject;
        subjInput.onchange = () => {
          const val = subjInput.value;
          if (!state.schedule[cid][day]) state.schedule[cid][day] = {};
          state.schedule[cid][day][p] = Object.assign({}, state.schedule[cid][day][p], { subject: val });
          saveState();
        };
        // Teacher select
        const teacherSelect = document.createElement('select');
        const noneOpt = document.createElement('option');
        noneOpt.value = '';
        noneOpt.textContent = '- Prof -';
        teacherSelect.appendChild(noneOpt);
        state.teachers.forEach((t) => {
          const opt = document.createElement('option');
          opt.value = t.id;
          opt.textContent = t.name;
          teacherSelect.appendChild(opt);
        });
        teacherSelect.value = current.teacherId;
        teacherSelect.onchange = () => {
          const tid = teacherSelect.value;
          if (!state.schedule[cid][day]) state.schedule[cid][day] = {};
          state.schedule[cid][day][p] = Object.assign({}, state.schedule[cid][day][p], { teacherId: tid });
          saveState();
        };
        cell.appendChild(subjInput);
        cell.appendChild(teacherSelect);
        tr.appendChild(cell);
      }
      tbody.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    gridDiv.appendChild(table);
  }
  classSelect.onchange = updateScheduleGrid;
  updateScheduleGrid();
}

// ------------------------ Absences ------------------------

function renderAbsences() {
  const formDiv = document.getElementById('absences-form');
  const listDiv = document.getElementById('absences-list');
  formDiv.innerHTML = '';
  listDiv.innerHTML = '';
  // Form fields
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  const teacherSelect = document.createElement('select');
  const teacherDefault = document.createElement('option');
  teacherDefault.value = '';
  teacherDefault.textContent = 'Selecione o professor';
  teacherSelect.appendChild(teacherDefault);
  state.teachers.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    teacherSelect.appendChild(opt);
  });
  const classSelect = document.createElement('select');
  const classDefault = document.createElement('option');
  classDefault.value = '';
  classDefault.textContent = 'Selecione a turma';
  classSelect.appendChild(classDefault);
  state.classes.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    classSelect.appendChild(opt);
  });
  const subjectSelect = document.createElement('select');
  const subjectDefault = document.createElement('option');
  subjectDefault.value = '';
  subjectDefault.textContent = 'Selecione a disciplina';
  subjectSelect.appendChild(subjectDefault);
  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.min = 1;
  amountInput.max = 10;
  amountInput.value = 1;
  // Populate subject options when class/teacher changes
  function updateSubjects() {
    subjectSelect.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = 'Selecione a disciplina';
    subjectSelect.appendChild(def);
    const tid = teacherSelect.value;
    const cid = classSelect.value;
    if (!tid || !cid) return;
    const subjects = new Set();
    const clsSched = state.schedule[cid] || {};
    Object.keys(clsSched).forEach((day) => {
      const periods = clsSched[day];
      Object.keys(periods).forEach((p) => {
        const item = periods[p];
        if (item.teacherId === tid && item.subject) subjects.add(item.subject);
      });
    });
    subjects.forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      subjectSelect.appendChild(opt);
    });
  }
  teacherSelect.onchange = updateSubjects;
  classSelect.onchange = updateSubjects;
  // Add button
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Registrar Falta';
  addBtn.className = 'primary';
  addBtn.onclick = () => {
    const date = dateInput.value;
    const tid = teacherSelect.value;
    const cid = classSelect.value;
    let subj = subjectSelect.value;
    const amt = parseInt(amountInput.value, 10) || 1;
    if (!date || !tid || !cid) {
      alert('Informe data, professor e turma.');
      return;
    }
    // If no subject selected but there is exactly one available, use it
    if (!subj) {
      const subjects = [];
      const clsSched = state.schedule[cid] || {};
      Object.keys(clsSched).forEach((day) => {
        const periods = clsSched[day];
        Object.keys(periods).forEach((p) => {
          const item = periods[p];
          if (item.teacherId === tid && item.subject) subjects.push(item.subject);
        });
      });
      if (subjects.length === 1) subj = subjects[0];
    }
    if (!subj) subj = 'Diversos';
    state.absences.push({ id: generateUUID(), date, teacherId: tid, classId: cid, subject: subj, amount: amt });
    // Reset form
    dateInput.value = '';
    teacherSelect.value = '';
    classSelect.value = '';
    amountInput.value = 1;
    updateSubjects();
    saveState();
    renderAbsences();
    renderDashboard();
  };
  formDiv.appendChild(dateInput);
  formDiv.appendChild(teacherSelect);
  formDiv.appendChild(classSelect);
  formDiv.appendChild(subjectSelect);
  formDiv.appendChild(amountInput);
  formDiv.appendChild(addBtn);
  // List absences
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Data</th><th>Professor</th><th>Turma</th><th>Disciplina</th><th>Qtde</th><th>Ações</th></tr></thead>';
  const tbody = document.createElement('tbody');
  state.absences.forEach((a) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.date}</td><td>${getTeacherName(a.teacherId)}</td><td>${getClassName(a.classId)}</td><td>${a.subject}</td><td>${a.amount}</td>`;
    const td = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Excluir';
    delBtn.className = 'danger';
    delBtn.onclick = () => {
      if (confirm('Excluir falta?')) {
        state.absences = state.absences.filter((x) => x.id !== a.id);
        saveState();
        renderAbsences();
        renderDashboard();
      }
    };
    td.appendChild(delBtn);
    tr.appendChild(td);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  listDiv.appendChild(table);
}

// ------------------------ RAPI Calculation (Reports) ------------------------

function getDatesInRange(startDate, endDate) {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start) || isNaN(end) || start > end) return [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function calculateRapi(stateData, filters, view) {
  const { calendars, schedule, absences, teachers, classes, segments } = stateData;
  const { startDate, endDate, segmentId, classId, teacherId } = filters;
  const dateRange = getDatesInRange(startDate, endDate);
  const dailyLog = [];
  const expectedCounts = {};
  classes.forEach((cls) => {
    if (classId && cls.id !== classId) return;
    if (segmentId && cls.segmentId !== segmentId) return;
    const segment = segments.find((s) => s.id === cls.segmentId);
    if (!segment) return;
    const dailySchedule = schedule[cls.id];
    if (!dailySchedule) return;
    dateRange.forEach((dateStr) => {
      const ym = dateStr.substring(0, 7);
      const status = calendars[cls.segmentId]?.[ym]?.[dateStr];
      if (status && status !== 'letivo') return;
      const d = new Date(dateStr).getDay();
      if (d === 0 || d === 6) return;
      const slots = dailySchedule[d];
      if (!slots) return;
      Object.entries(slots).forEach(([p, slot]) => {
        if (slot.teacherId && slot.subject) {
          if (teacherId && slot.teacherId !== teacherId) return;
          const key = `${slot.teacherId}|${cls.id}|${slot.subject}`;
          expectedCounts[key] = (expectedCounts[key] || 0) + 1;
          if (view === 'daily_log') {
            const tName = teachers.find((t) => t.id === slot.teacherId)?.name || 'Unknown';
            dailyLog.push({ date: dateStr, teacherName: tName, className: cls.name, subject: slot.subject, expected: 1, given: 1, absences: 0, percentage: 100 });
          }
        }
      });
    });
  });
  const absenceCounts = {};
  absences.forEach((abs) => {
    if (abs.date < startDate || abs.date > endDate) return;
    if (teacherId && abs.teacherId !== teacherId) return;
    if (classId && abs.classId !== classId) return;
    if (segmentId) {
      const c = classes.find((cx) => cx.id === abs.classId);
      if (!c || c.segmentId !== segmentId) return;
    }
    const key = `${abs.teacherId}|${abs.classId}|${abs.subject}`;
    absenceCounts[key] = (absenceCounts[key] || 0) + abs.amount;
    if (view === 'daily_log') {
      const tName = teachers.find((t) => t.id === abs.teacherId)?.name || 'Unknown';
      const cName = classes.find((c) => c.id === abs.classId)?.name || 'Unknown';
      dailyLog.push({ date: abs.date, teacherName: tName, className: cName, subject: abs.subject, expected: 0, given: 0, absences: abs.amount, percentage: 0, isAbsenceRecord: true });
    }
  });
  if (view === 'daily_log') {
    return dailyLog.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }
  const allKeys = new Set([...Object.keys(expectedCounts), ...Object.keys(absenceCounts)]);
  const report = [];
  allKeys.forEach((key) => {
    const [tId, cId, subj] = key.split('|');
    const teacher = teachers.find((t) => t.id === tId);
    const classGroup = classes.find((c) => c.id === cId);
    const expected = expectedCounts[key] || 0;
    const abs = absenceCounts[key] || 0;
    const given = Math.max(0, expected - abs);
    const percentage = expected > 0 ? (given / expected) * 100 : 0;
    if (teacher && classGroup) {
      report.push({ teacherName: teacher.name, className: classGroup.name, subject: subj, expected, given, absences: abs, percentage });
    }
  });
  if (view === 'teacher_summary') {
    const summaryMap = {};
    report.forEach((item) => {
      const key = item.teacherName;
      if (!summaryMap[key]) {
        summaryMap[key] = { teacherName: item.teacherName, className: '-', subject: '-', expected: 0, given: 0, absences: 0 };
      }
      summaryMap[key].expected += item.expected;
      summaryMap[key].given += item.given;
      summaryMap[key].absences += item.absences;
    });
    return Object.values(summaryMap).map((item) => {
      const percentage = item.expected > 0 ? (item.given / item.expected) * 100 : 0;
      return { ...item, percentage };
    });
  }
  return report.sort((a, b) => {
    if (a.teacherName !== b.teacherName) return a.teacherName.localeCompare(b.teacherName);
    return a.className.localeCompare(b.className);
  });
}

// ------------------------ Reports ------------------------

function renderReports() {
  const formDiv = document.getElementById('reports-form');
  const tableDiv = document.getElementById('reports-table');
  formDiv.innerHTML = '';
  tableDiv.innerHTML = '';
  // Form inputs: start date, end date
  const today = new Date();
  const startInput = document.createElement('input');
  startInput.type = 'date';
  startInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const endInput = document.createElement('input');
  endInput.type = 'date';
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  endInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  // Filter selects
  const segSelect = document.createElement('select');
  const segOptAll = document.createElement('option');
  segOptAll.value = '';
  segOptAll.textContent = 'Todas Modalidades';
  segSelect.appendChild(segOptAll);
  state.segments.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    segSelect.appendChild(opt);
  });
  const classSelect = document.createElement('select');
  const classOptAll = document.createElement('option');
  classOptAll.value = '';
  classOptAll.textContent = 'Todas Turmas';
  classSelect.appendChild(classOptAll);
  state.classes.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    classSelect.appendChild(opt);
  });
  const teacherSelect = document.createElement('select');
  const teacherOptAll = document.createElement('option');
  teacherOptAll.value = '';
  teacherOptAll.textContent = 'Todos Professores';
  teacherSelect.appendChild(teacherOptAll);
  state.teachers.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    teacherSelect.appendChild(opt);
  });
  // Report view type
  const viewSelect = document.createElement('select');
  [
    { value: 'teacher_summary', label: 'Resumo por Professor' },
    { value: 'detailed', label: 'Detalhado (Professor/Turma/Disciplina)' },
    { value: 'daily_log', label: 'Diário (Audit)' },
  ].forEach((optInfo) => {
    const opt = document.createElement('option');
    opt.value = optInfo.value;
    opt.textContent = optInfo.label;
    viewSelect.appendChild(opt);
  });
  // Generate button
  const genBtn = document.createElement('button');
  genBtn.textContent = 'Gerar Relatório';
  genBtn.className = 'primary';
  let reportData = [];
  function renderReportTable() {
    tableDiv.innerHTML = '';
    const view = viewSelect.value;
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    let header;
    if (view === 'daily_log') {
      header = '<tr><th>Data</th><th>Professor</th><th>Turma</th><th>Disciplina</th><th>Status</th></tr>';
    } else {
      header = '<tr><th>Professor</th><th>Turma</th><th>Disciplina</th><th>Previstas</th><th>Faltas</th><th>Dadas</th><th>%</th></tr>';
    }
    thead.innerHTML = header;
    const tbody = document.createElement('tbody');
    if (reportData.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7">Nenhum dado encontrado.</td>';
      tbody.appendChild(tr);
    } else {
      reportData.forEach((row) => {
        const tr = document.createElement('tr');
        if (view === 'daily_log') {
          tr.innerHTML = `<td>${row.date}</td><td>${row.teacherName}</td><td>${row.className}</td><td>${row.subject}</td><td>${row.isAbsenceRecord ? 'FALTA' : 'AULA'}</td>`;
        } else {
          tr.innerHTML = `<td>${row.teacherName}</td><td>${row.className}</td><td>${row.subject}</td><td>${row.expected}</td><td>${row.absences}</td><td>${row.given}</td><td>${row.percentage.toFixed(1)}%</td>`;
        }
        tbody.appendChild(tr);
      });
    }
    table.appendChild(thead);
    table.appendChild(tbody);
    tableDiv.appendChild(table);
  }
  genBtn.onclick = () => {
    const filters = {
      startDate: startInput.value,
      endDate: endInput.value,
      segmentId: segSelect.value,
      classId: classSelect.value,
      teacherId: teacherSelect.value,
    };
    reportData = calculateRapi(state, filters, viewSelect.value);
    renderReportTable();
  };
  // CSV export
  const csvBtn = document.createElement('button');
  csvBtn.textContent = 'CSV';
  csvBtn.onclick = () => {
    if (reportData.length === 0) return;
    const view = viewSelect.value;
    let csvLines = [];
    if (view === 'daily_log') {
      csvLines.push('Data;Professor;Turma;Disciplina;Status');
      reportData.forEach((row) => {
        csvLines.push(`${row.date};${row.teacherName};${row.className};${row.subject};${row.isAbsenceRecord ? 'Falta' : 'Aula'}`);
      });
    } else {
      csvLines.push('Professor;Turma;Disciplina;Previstas;Faltas;Dadas;Percentual');
      reportData.forEach((row) => {
        csvLines.push(`${row.teacherName};${row.className};${row.subject};${row.expected};${row.absences};${row.given};${row.percentage.toFixed(1)}%`);
      });
    }
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapi_relatorio_${startInput.value}_${endInput.value}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };
  // Print
  const printBtn = document.createElement('button');
  printBtn.textContent = 'Imprimir / PDF';
  printBtn.onclick = () => {
    if (reportData.length === 0) return;
    const view = viewSelect.value;
    const title = `Relatório RAPI - ${startInput.value} a ${endInput.value}`;
    let html = `<html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:6px;}th{background:#eee;}</style></head><body>`;
    html += `<h1>${title}</h1>`;
    html += '<table><thead>';
    if (view === 'daily_log') {
      html += '<tr><th>Data</th><th>Professor</th><th>Turma</th><th>Disciplina</th><th>Status</th></tr>';
    } else {
      html += '<tr><th>Professor</th><th>Turma</th><th>Disciplina</th><th>Previstas</th><th>Faltas</th><th>Dadas</th><th>%</th></tr>';
    }
    html += '</thead><tbody>';
    reportData.forEach((row) => {
      if (view === 'daily_log') {
        html += `<tr><td>${row.date}</td><td>${row.teacherName}</td><td>${row.className}</td><td>${row.subject}</td><td>${row.isAbsenceRecord ? 'FALTA' : 'AULA'}</td></tr>`;
      } else {
        html += `<tr><td>${row.teacherName}</td><td>${row.className}</td><td>${row.subject}</td><td>${row.expected}</td><td>${row.absences}</td><td>${row.given}</td><td>${row.percentage.toFixed(1)}%</td></tr>`;
      }
    });
    html += '</tbody></table></body></html>';
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
  };
  // Append controls
  formDiv.appendChild(startInput);
  formDiv.appendChild(endInput);
  formDiv.appendChild(segSelect);
  formDiv.appendChild(classSelect);
  formDiv.appendChild(teacherSelect);
  formDiv.appendChild(viewSelect);
  formDiv.appendChild(genBtn);
  formDiv.appendChild(csvBtn);
  formDiv.appendChild(printBtn);
  // Initially no data
  reportData = [];
  renderReportTable();
}

// Initial render
setActiveTab('dashboard');