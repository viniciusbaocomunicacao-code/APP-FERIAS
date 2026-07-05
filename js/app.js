// ── State ──────────────────────────────────────────────
const state = {
  tab: 'atividades',
  ageFilter: 'all',
  actSearch: '',
  weekOffset: 0,
  plannerView: 'week',   // 'week' | 'day'
  plannerDate: null,     // selected date string 'YYYY-MM-DD'
  plannerData: {},       // { "2026-06-25": [{id,time,text,activityId}, ...] }
  openModal: null,
  activeActivityId: null,
  activeRecipeId: null,
  recipeCategory: 'all',
  editingEntry: null,    // { date, entry: null|existing }
  pickerDate: null,
  pickerSearch: '',
  pickerForEntry: false, // true when picker is used to fill entry editor
  // Shows tab
  showFilters: {
    stimulation: [],
    ageGroup: null,
    idealMoments: [],
    themes: [],
    goodForRainyDay: false,
    goodForTravel: false,
    goodForFamily: false,
    hasPtBrDub: false,
    search: '',
  },
  showsView: 'list',     // 'list' | 'detail'
  selectedShowId: null,
  activeCollection: null,
  favorites: [],
};

// ── Date Helpers ───────────────────────────────────────
const DAY_NAMES       = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const MONTH_NAMES     = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const FULL_MONTHS     = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const HOURS = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];

function dateKey(d) { return d.toISOString().slice(0,10); }
function isToday(d) { return dateKey(d) === dateKey(new Date()); }

function getWeekDates(offset) {
  const today = new Date();
  const sun   = new Date(today);
  sun.setDate(today.getDate() - today.getDay() + offset * 7);
  return Array.from({length:7}, (_,i) => { const d=new Date(sun); d.setDate(sun.getDate()+i); return d; });
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,5); }

// ── localStorage ───────────────────────────────────────
function loadPlanner() {
  try { state.plannerData = JSON.parse(localStorage.getItem('guia-ferias-rotina') || '{}'); }
  catch { state.plannerData = {}; }
}
function savePlanner() {
  localStorage.setItem('guia-ferias-rotina', JSON.stringify(state.plannerData));
}

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadPlanner();
  loadFavorites();
  bindNav();
  bindHomeTab();
  bindActivitiesTab();
  bindPlannerTab();
  bindRecipesTab();
  bindShowsTab();
  bindModals();
  bindSettingsModal();
  renderActivities();
  renderPlannerWeek();
  renderRecipes();
  renderShows();
});

// ── Home Tab ───────────────────────────────────────────
function bindHomeTab() {
  // Info buttons → open popup
  document.querySelectorAll('.netflix-info-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openProductPopup(btn.closest('.netflix-card'));
    });
  });
  // Unlocked cards → popup on card click too
  document.querySelectorAll('.netflix-card.unlocked').forEach(card => {
    card.addEventListener('click', () => openProductPopup(card));
  });
  // Locked cards → popup on click
  document.querySelectorAll('.netflix-card.locked').forEach(card => {
    card.addEventListener('click', () => openProductPopup(card));
  });
  // Popup close
  document.getElementById('product-popup-close').addEventListener('click', closeProductPopup);
  document.getElementById('product-popup').addEventListener('click', e => {
    if (e.target.id === 'product-popup') closeProductPopup();
  });
}

function openProductPopup(card) {
  const isLocked  = card.classList.contains('locked');
  const thumb     = card.querySelector('.netflix-thumb');
  const bgImg     = thumb ? thumb.style.backgroundImage : '';
  const bgColor   = thumb ? thumb.style.background : '';

  const imgEl = document.getElementById('product-popup-img');
  imgEl.style.backgroundImage = bgImg || '';
  imgEl.style.background = bgImg ? '' : bgColor;
  imgEl.classList.toggle('blurred', isLocked);

  const badge = document.getElementById('product-popup-badge');
  if (isLocked) {
    badge.textContent = '🔒 Disponível separadamente';
    badge.className = 'product-popup-badge locked';
  } else {
    badge.textContent = '✓ Incluso na sua compra';
    badge.className = 'product-popup-badge unlocked';
  }

  document.getElementById('product-popup-name').textContent = card.dataset.name || '';
  document.getElementById('product-popup-desc').textContent = card.dataset.desc || '';

  const footer = document.getElementById('product-popup-footer');
  if (card.dataset.url) {
    const ctaLabel = card.dataset.cta || (isLocked ? 'Ver produto →' : 'Acessar →');
    footer.innerHTML = `<a class="product-popup-cta" href="${card.dataset.url}" target="_blank" rel="noopener">${ctaLabel}</a>`;
    footer.style.display = '';
  } else {
    footer.innerHTML = '';
    footer.style.display = 'none';
  }

  const popup = document.getElementById('product-popup');
  popup.style.display = 'flex';
  requestAnimationFrame(() => popup.classList.add('open'));
}

function closeProductPopup() {
  const popup = document.getElementById('product-popup');
  popup.classList.remove('open');
  setTimeout(() => { popup.style.display = 'none'; }, 260);
}

// ── Navigation ─────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  );
}

function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector(`.nav-btn[data-tab="${tab}"]`).classList.add('active');
  if (tab === 'desenhos') checkTelaWarning();
}

// ── Activities Tab ─────────────────────────────────────
function bindActivitiesTab() {
  document.getElementById('act-search').addEventListener('input', e => {
    state.actSearch = e.target.value;
    renderActivities();
  });
  document.getElementById('age-filter-row').addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    state.ageFilter = pill.dataset.age;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    renderActivities();
  });
  document.getElementById('activities-grid').addEventListener('click', e => {
    const card = e.target.closest('.activity-card');
    if (card) openActivityModal(parseInt(card.dataset.id));
  });
}

function renderActivities() {
  const q   = state.actSearch.toLowerCase().trim();
  const age = state.ageFilter;
  const filtered = ACTIVITIES.filter(a => {
    const ageOk  = age === 'all' || a.age === age;
    const textOk = !q || a.name.toLowerCase().includes(q) || a.skills.toLowerCase().includes(q);
    return ageOk && textOk;
  });
  const grid = document.getElementById('activities-grid');
  if (!filtered.length) {
    grid.innerHTML = `<div class="no-results"><div class="no-results-emoji">🔍</div><p>Nenhuma atividade encontrada</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(a => {
    const label = AGE_GROUPS.find(g => g.key === a.age)?.label || a.age;
    return `<div class="activity-card" data-id="${a.id}">
      <span class="card-age-badge">${label}</span>
      <div class="card-name">${a.name}</div>
    </div>`;
  }).join('');
}

// ── Activity Modal ─────────────────────────────────────
function openActivityModal(id) {
  const a = ACTIVITIES.find(x => x.id === id);
  if (!a) return;
  state.activeActivityId = id;
  state.openModal = 'activity';
  const label = AGE_GROUPS.find(g => g.key === a.age)?.label || a.age;
  document.getElementById('activity-modal-tag').textContent      = label;
  document.getElementById('activity-modal-title').textContent    = a.name;
  document.getElementById('activity-modal-materials').textContent = a.materials;
  document.getElementById('activity-modal-howtoplay').textContent = a.howToPlay;
  document.getElementById('activity-modal-skills').textContent   = a.skills;
  openOverlay('activity-modal');
}

// ── Planner Tab ────────────────────────────────────────
function bindPlannerTab() {
  document.getElementById('planner-prev').addEventListener('click', () => {
    state.weekOffset--;
    renderPlannerWeek();
  });
  document.getElementById('planner-next').addEventListener('click', () => {
    state.weekOffset++;
    renderPlannerWeek();
  });
  document.getElementById('planner-back-btn').addEventListener('click', () => {
    state.plannerView = 'week';
    document.getElementById('planner-week-nav').style.display = '';
    document.getElementById('planner-day-header').style.display = 'none';
    renderPlannerWeek();
  });
}

// ── Week View ──────────────────────────────────────────
function countCompletedBlocks(key) {
  const dayData = state.plannerData[key] || {};
  return ROUTINE_BLOCKS.filter(b => {
    const bd = dayData[b.id];
    if (!bd) return false;
    return b.fields.some(f => {
      const v = bd[f.id];
      return v && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== '');
    });
  }).length;
}

function renderPlannerWeek() {
  state.plannerView = 'week';
  document.getElementById('planner-week-nav').style.display = '';
  document.getElementById('planner-day-header').style.display = 'none';

  const days  = getWeekDates(state.weekOffset);
  const first = days[0], last = days[6];
  document.getElementById('week-label').textContent =
    `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`;

  const container = document.getElementById('planner-content');
  container.innerHTML = days.map(d => {
    const key      = dateKey(d);
    const todayCls = isToday(d) ? ' today' : '';
    const done     = countCompletedBlocks(key);
    const total    = ROUTINE_BLOCKS.length;
    const preview  = done === 0
      ? '<span class="week-row-empty">Toque para registrar o dia</span>'
      : `<span class="week-row-chip">${done} de ${total} momentos registrados</span>`;

    return `<button class="planner-week-row${todayCls}" data-date="${key}">
      <div class="pwd-left">
        <div class="pwd-day">${DAY_NAMES[d.getDay()]}</div>
        <div class="pwd-date">${d.getDate()}</div>
      </div>
      <div class="pwd-center">${preview}</div>
      <div class="pwd-arrow">›</div>
    </button>`;
  }).join('');

  container.querySelectorAll('.planner-week-row').forEach(row =>
    row.addEventListener('click', () => openDayView(row.dataset.date))
  );
}

// ── Day View ───────────────────────────────────────────
function openDayView(dateStr) {
  state.plannerView  = 'day';
  state.plannerDate  = dateStr;
  document.getElementById('planner-week-nav').style.display = 'none';
  document.getElementById('planner-day-header').style.display = '';

  const d = new Date(dateStr + 'T12:00:00');
  document.getElementById('planner-day-title').textContent =
    `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${FULL_MONTHS[d.getMonth()]}`;

  renderDayView();
}

function renderDayView() {
  const dayData  = state.plannerData[state.plannerDate] || {};
  const done     = countCompletedBlocks(state.plannerDate);
  const total    = ROUTINE_BLOCKS.length;
  const container = document.getElementById('planner-content');

  container.innerHTML = `
    <div class="routine-progress-bar">
      <div class="routine-progress-fill" style="width:${Math.round(done/total*100)}%"></div>
    </div>
    <div class="routine-progress-label">${done} de ${total} momentos registrados</div>
    <div class="routine-blocks">
      ${ROUTINE_BLOCKS.map(block => renderRoutineBlock(block, dayData[block.id])).join('')}
    </div>`;

  container.querySelectorAll('.block-header').forEach(header => {
    header.addEventListener('click', () => toggleBlock(header.closest('.routine-block-card')));
  });

  container.querySelectorAll('.block-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const fieldType = chip.dataset.type;
      if (fieldType === 'chips') {
        chip.closest('.block-chips-row').querySelectorAll('.block-chip').forEach(c => c.classList.remove('active'));
      }
      chip.classList.toggle('active');
      autoSaveBlock(chip.closest('.routine-block-card').dataset.blockId);
    });
  });

  container.querySelectorAll('.block-text-input, .block-field-time').forEach(input => {
    input.addEventListener('change', () => {
      autoSaveBlock(input.closest('.routine-block-card').dataset.blockId);
    });
  });

  container.querySelectorAll('.block-time-main').forEach(input => {
    input.addEventListener('change', () => {
      const card = input.closest('.routine-block-card');
      const blockId = card.dataset.blockId;
      card.querySelector('.block-time-display').textContent = input.value;
      autoSaveBlock(blockId);
    });
  });
}

function renderRoutineBlock(block, savedData) {
  const bd = savedData || {};
  const isCompleted = block.fields.some(f => {
    const v = bd[f.id];
    return v && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== '');
  });
  const time = bd.time || block.timeDefault;

  return `<div class="routine-block-card${isCompleted ? ' completed' : ''}" data-block-id="${block.id}">
    <div class="block-header">
      <div class="block-header-left">
        <span class="block-emoji">${block.emoji}</span>
        <div class="block-info">
          <div class="block-name">${block.name}${block.optional ? ' <span class="block-optional">opcional</span>' : ''}</div>
          <span class="block-time-display">${time}</span>
        </div>
      </div>
      <div class="block-header-right">
        ${isCompleted ? '<span class="block-done-badge">✓</span>' : ''}
        <span class="block-chevron">›</span>
      </div>
    </div>
    <div class="block-body">
      <div class="block-field">
        <label class="block-field-label">Horário</label>
        <input type="time" class="block-time-main" value="${time}">
      </div>
      ${block.fields.map(f => renderBlockField(f, bd)).join('')}
    </div>
  </div>`;
}

function renderBlockField(field, bd) {
  if (field.type === 'chips' || field.type === 'chips-multi') {
    const sel = field.type === 'chips'
      ? (bd[field.id] ? [bd[field.id]] : [])
      : (bd[field.id] || []);
    const chips = field.options.map(opt =>
      `<button class="block-chip${sel.includes(opt) ? ' active' : ''}" data-field="${field.id}" data-val="${opt}" data-type="${field.type}">${opt}</button>`
    ).join('');
    return `<div class="block-field">
      <label class="block-field-label">${field.label}</label>
      <div class="block-chips-row">${chips}</div>
    </div>`;
  }
  if (field.type === 'text') {
    return `<div class="block-field">
      <label class="block-field-label">${field.label}</label>
      <input type="text" class="block-text-input" data-field="${field.id}" value="${bd[field.id] || ''}" placeholder="${field.placeholder || ''}">
    </div>`;
  }
  if (field.type === 'time') {
    return `<div class="block-field">
      <label class="block-field-label">${field.label}</label>
      <input type="time" class="block-field-time" data-field="${field.id}" value="${bd[field.id] || ''}">
    </div>`;
  }
  return '';
}

function toggleBlock(card) {
  const isOpen = card.classList.contains('open');
  card.classList.toggle('open', !isOpen);
  card.querySelector('.block-chevron').style.transform = isOpen ? '' : 'rotate(90deg)';
}

function autoSaveBlock(blockId) {
  const card  = document.querySelector(`.routine-block-card[data-block-id="${blockId}"]`);
  const block = ROUTINE_BLOCKS.find(b => b.id === blockId);
  if (!card || !block) return;

  const bd = {};
  const timeMain = card.querySelector('.block-time-main');
  if (timeMain) bd.time = timeMain.value;

  block.fields.forEach(f => {
    if (f.type === 'chips') {
      const a = card.querySelector(`.block-chip[data-field="${f.id}"].active`);
      if (a) bd[f.id] = a.dataset.val;
    } else if (f.type === 'chips-multi') {
      bd[f.id] = Array.from(card.querySelectorAll(`.block-chip[data-field="${f.id}"].active`)).map(c => c.dataset.val);
    } else if (f.type === 'text') {
      const inp = card.querySelector(`input.block-text-input[data-field="${f.id}"]`);
      if (inp) bd[f.id] = inp.value;
    } else if (f.type === 'time') {
      const inp = card.querySelector(`input.block-field-time[data-field="${f.id}"]`);
      if (inp) bd[f.id] = inp.value;
    }
  });

  if (!state.plannerData[state.plannerDate]) state.plannerData[state.plannerDate] = {};
  state.plannerData[state.plannerDate][blockId] = bd;
  savePlanner();

  const isCompleted = block.fields.some(f => {
    const v = bd[f.id];
    return v && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== '');
  });
  card.classList.toggle('completed', isCompleted);
  const doneBadge = card.querySelector('.block-done-badge');
  const rightEl   = card.querySelector('.block-header-right');
  if (isCompleted && !doneBadge) rightEl.insertAdjacentHTML('afterbegin', '<span class="block-done-badge">✓</span>');
  else if (!isCompleted && doneBadge) doneBadge.remove();

  // Update progress bar
  const done  = countCompletedBlocks(state.plannerDate);
  const total = ROUTINE_BLOCKS.length;
  const bar   = document.querySelector('.routine-progress-fill');
  const label = document.querySelector('.routine-progress-label');
  if (bar)   bar.style.width   = `${Math.round(done/total*100)}%`;
  if (label) label.textContent = `${done} de ${total} momentos registrados`;
}

function prefillActivityBlock(dateStr, activityName) {
  if (!state.plannerData[dateStr]) state.plannerData[dateStr] = {};
  const h = new Date().getHours();
  const blockId = h < 12 ? 'ativ-manha' : 'ativ-tarde';
  const existing = state.plannerData[dateStr][blockId] || {};
  state.plannerData[dateStr][blockId] = { ...existing, desc: activityName, tipo: 'Do guia' };
  savePlanner();
}

// ── Week Picker (for "Add to Planner" from activity) ──
function openWeekPicker(activityId) {
  state.activeActivityId  = activityId;
  state.weekPickerOffset  = 0;
  renderWeekPickerDays();
  openOverlay('week-picker-modal');
}

let weekPickerOffset = 0;

function renderWeekPickerDays() {
  const days  = getWeekDates(weekPickerOffset);
  const first = days[0], last = days[6];
  document.getElementById('wp-week-label').textContent =
    `${first.getDate()} ${MONTH_NAMES[first.getMonth()]} – ${last.getDate()} ${MONTH_NAMES[last.getMonth()]}`;

  document.getElementById('wp-days').innerHTML = days.map(d => {
    const key  = dateKey(d);
    const done = countCompletedBlocks(key);
    return `<button class="wp-day-btn${isToday(d) ? ' today' : ''}" data-date="${key}">
      <span class="wp-day-name">${DAY_NAMES[d.getDay()]}</span>
      <span class="wp-day-date">${d.getDate()}</span>
      <span class="wp-day-count">${done ? done + ' momentos' : 'Vazio'}</span>
    </button>`;
  }).join('');

  document.querySelectorAll('.wp-day-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      closeOverlay('week-picker-modal');
      const a = ACTIVITIES.find(x => x.id === state.activeActivityId);
      if (a) prefillActivityBlock(btn.dataset.date, a.name);
      switchTab('planner');
      openDayView(btn.dataset.date);
      showToast(`"${a?.name}" adicionado à rotina do dia ✓`);
    })
  );
}

// ── Recipes Tab ────────────────────────────────────────
function bindRecipesTab() {
  document.getElementById('recipes-grid').addEventListener('click', e => {
    const card = e.target.closest('.recipe-card');
    if (card) openRecipeModal(parseInt(card.dataset.id));
  });
  document.getElementById('recipe-filter-row').addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    state.recipeCategory = pill.dataset.cat;
    document.querySelectorAll('#recipe-filter-row .filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    renderRecipes();
  });
}

function renderRecipes() {
  const filtered = state.recipeCategory === 'all'
    ? RECIPES
    : RECIPES.filter(r => r.category === state.recipeCategory);
  if (!filtered.length) {
    document.getElementById('recipes-grid').innerHTML =
      `<div class="no-results" style="grid-column:1/-1"><div class="no-results-emoji">🍽️</div><p>Nenhuma receita nesta categoria</p></div>`;
    return;
  }
  document.getElementById('recipes-grid').innerHTML = filtered.map(r => `
    <div class="recipe-card" data-id="${r.id}">
      <div class="recipe-emoji">${r.emoji}</div>
      <div class="recipe-info">
        <div class="recipe-name">${r.name}</div>
        <div class="recipe-meta">
          <span class="recipe-meta-tag">⏱ ${r.time}</span>
          <span class="recipe-meta-tag">${r.difficulty}</span>
          <span class="recipe-meta-tag">${r.age}</span>
        </div>
      </div>
    </div>`).join('');
}

function openRecipeModal(id) {
  const r = RECIPES.find(x => x.id === id);
  if (!r) return;
  document.getElementById('recipe-modal-emoji').textContent  = r.emoji;
  document.getElementById('recipe-modal-title').textContent  = r.name;
  document.getElementById('recipe-modal-meta').innerHTML =
    `<div class="recipe-meta-tags">
       <span class="recipe-meta-tag">⏱ ${r.time}</span>
       <span class="recipe-meta-tag">${r.difficulty}</span>
       <span class="recipe-meta-tag">${r.age}</span>
     </div>`;
  document.getElementById('recipe-modal-ingredients').innerHTML = r.ingredients.map(i=>`<li>${i}</li>`).join('');
  document.getElementById('recipe-modal-howto').textContent  = r.howToMake;
  document.getElementById('recipe-modal-tip').textContent    = r.tip;
  openOverlay('recipe-modal');
}

// ── Modal Helpers ──────────────────────────────────────
function openOverlay(id)  {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeOverlay(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
  state.openModal = null;
}

function bindModals() {
  // Overlay click to close
  document.querySelectorAll('.modal-overlay').forEach(overlay =>
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(overlay.id); })
  );
  // Close buttons
  document.querySelectorAll('.modal-close-btn').forEach(btn =>
    btn.addEventListener('click', () => closeOverlay(btn.dataset.modal))
  );

  // Activity → Add to Planner
  document.getElementById('activity-add-planner-btn').addEventListener('click', () => {
    const id = state.activeActivityId;
    closeOverlay('activity-modal');
    if (id) openWeekPicker(id);
  });

  // Week picker nav
  document.getElementById('wp-prev').addEventListener('click', () => { weekPickerOffset--; renderWeekPickerDays(); });
  document.getElementById('wp-next').addEventListener('click', () => { weekPickerOffset++; renderWeekPickerDays(); });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape')
      document.querySelectorAll('.modal-overlay.open').forEach(el => closeOverlay(el.id));
  });
}

// ── Settings ────────────────────────────────────────────
function bindSettingsModal() {
  document.getElementById('settings-btn').addEventListener('click', () => openOverlay('settings-modal'));

  // Install guide tabs (auto-detect platform)
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (isAndroid) switchInstallTab('android');
  document.getElementById('install-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.install-tab');
    if (tab) switchInstallTab(tab.dataset.os);
  });

  const darkToggle = document.getElementById('dark-mode-toggle');
  darkToggle.checked = localStorage.getItem('guia-ferias-theme') === 'dark';
  darkToggle.addEventListener('change', () => {
    const isDark = darkToggle.checked;
    document.documentElement.classList.toggle('dark-mode', isDark);
    localStorage.setItem('guia-ferias-theme', isDark ? 'dark' : 'light');
  });

  const notifToggle = document.getElementById('notifications-toggle');
  notifToggle.checked = localStorage.getItem('guia-ferias-notifications') === 'on'
    && typeof Notification !== 'undefined' && Notification.permission === 'granted';
  notifToggle.addEventListener('change', () => {
    if (notifToggle.checked) {
      if (typeof Notification === 'undefined') {
        notifToggle.checked = false;
        return;
      }
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          localStorage.setItem('guia-ferias-notifications', 'on');
        } else {
          notifToggle.checked = false;
          localStorage.setItem('guia-ferias-notifications', 'off');
        }
      });
    } else {
      localStorage.setItem('guia-ferias-notifications', 'off');
    }
  });

  document.getElementById('change-password-btn').addEventListener('click', sendChangePasswordEmail);
  document.getElementById('settings-logout-btn').addEventListener('click', () => {
    closeOverlay('settings-modal');
    appSignOut();
  });
}

function switchInstallTab(os) {
  document.getElementById('install-tab-ios').classList.toggle('active', os === 'ios');
  document.getElementById('install-tab-android').classList.toggle('active', os === 'android');
  document.getElementById('install-steps-ios').style.display = os === 'ios' ? '' : 'none';
  document.getElementById('install-steps-android').style.display = os === 'android' ? '' : 'none';
}

// ── Favorites ─────────────────────────────────────────
function loadFavorites() {
  try { state.favorites = JSON.parse(localStorage.getItem('guia-ferias-favorites') || '[]'); }
  catch { state.favorites = []; }
}
function saveFavorites() {
  localStorage.setItem('guia-ferias-favorites', JSON.stringify(state.favorites));
}
function toggleFavorite(id) {
  const i = state.favorites.indexOf(id);
  if (i === -1) { state.favorites.push(id); showToast('Adicionado aos favoritos ♥'); }
  else          { state.favorites.splice(i, 1); showToast('Removido dos favoritos'); }
  saveFavorites();
  renderShows();
}
function isFav(id) { return state.favorites.includes(id); }

// ── Age Warning Modal ─────────────────────────────────
function checkTelaWarning() {
  if (!sessionStorage.getItem('guia-ferias-tela-warning')) {
    sessionStorage.setItem('guia-ferias-tela-warning', '1');
    openOverlay('age-warning-modal');
  }
}

// ── Shows Tab ─────────────────────────────────────────
function bindShowsTab() {
  document.getElementById('show-search').addEventListener('input', e => {
    state.showFilters.search = e.target.value;
    renderShows();
  });

  document.getElementById('shows-filter-btn').addEventListener('click', () => {
    syncFilterModalToState();
    openOverlay('shows-filter-modal');
  });

  document.getElementById('shows-back-btn').addEventListener('click', () => {
    state.showsView = 'list';
    state.selectedShowId = null;
    document.getElementById('shows-detail-view').style.display = 'none';
    document.getElementById('shows-list-view').style.display = '';
  });

  document.getElementById('btn-go-atividades').addEventListener('click', () => {
    closeOverlay('age-warning-modal');
    switchTab('atividades');
  });

  // Grid clicks (details + favorites) — delegated
  document.getElementById('shows-list-view').addEventListener('click', e => {
    const favBtn = e.target.closest('.show-fav-btn');
    if (favBtn) { e.stopPropagation(); toggleFavorite(favBtn.dataset.id); return; }
    const detailBtn = e.target.closest('.show-detail-btn');
    if (detailBtn) {
      const card = detailBtn.closest('[data-id]');
      if (card) openShowDetail(card.dataset.id);
      return;
    }
    const card = e.target.closest('.show-card');
    if (card) openShowDetail(card.dataset.id);
  });

  // Collection chips
  document.getElementById('shows-collections-row').addEventListener('click', e => {
    const chip = e.target.closest('.collection-chip');
    if (!chip) return;
    state.activeCollection = chip.dataset.collection || null;
    document.querySelectorAll('.collection-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    renderShows();
  });

  // Filter modal
  document.getElementById('filter-clear-btn').addEventListener('click', () => {
    clearFilters();
    renderShows();
  });
  document.getElementById('filter-apply-btn').addEventListener('click', () => {
    applyFiltersFromModal();
    closeOverlay('shows-filter-modal');
    renderShows();
  });

  document.getElementById('filter-stim-chips').addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    chip.classList.toggle('active');
    const val = parseInt(chip.dataset.val);
    const m = STIM_META[val];
    if (chip.classList.contains('active')) {
      chip.style.background = m.dotColor;
      chip.style.borderColor = m.dotColor;
      chip.style.color = '#fff';
    } else {
      chip.style.background = '';
      chip.style.borderColor = '';
      chip.style.color = '';
    }
  });

  ['filter-age-chips','filter-moment-chips','filter-theme-chips'].forEach(rowId => {
    document.getElementById(rowId).addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      if (chip.dataset.filter === 'age') {
        document.querySelectorAll('#filter-age-chips .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.toggle('active');
      } else {
        chip.classList.toggle('active');
      }
    });
  });

  document.querySelectorAll('.filter-chip[data-filter="extra"]').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });
}

function syncFilterModalToState() {
  document.querySelectorAll('#filter-stim-chips .filter-chip').forEach(chip => {
    const val = parseInt(chip.dataset.val);
    const active = state.showFilters.stimulation.includes(val);
    chip.classList.toggle('active', active);
    const m = STIM_META[val];
    chip.style.background   = active ? m.dotColor : '';
    chip.style.color        = active ? '#fff' : '';
    chip.style.borderColor  = active ? m.dotColor : '';
  });
  document.querySelectorAll('#filter-age-chips .filter-chip').forEach(chip =>
    chip.classList.toggle('active', chip.dataset.val === state.showFilters.ageGroup)
  );
  document.querySelectorAll('#filter-moment-chips .filter-chip').forEach(chip =>
    chip.classList.toggle('active', state.showFilters.idealMoments.includes(chip.dataset.val))
  );
  document.querySelectorAll('#filter-theme-chips .filter-chip').forEach(chip =>
    chip.classList.toggle('active', state.showFilters.themes.includes(chip.dataset.val))
  );
  document.querySelectorAll('.filter-chip[data-filter="extra"]').forEach(chip =>
    chip.classList.toggle('active', !!state.showFilters[chip.dataset.val])
  );
}

function applyFiltersFromModal() {
  state.showFilters.stimulation = [];
  document.querySelectorAll('#filter-stim-chips .filter-chip.active').forEach(chip =>
    state.showFilters.stimulation.push(parseInt(chip.dataset.val))
  );
  const ageChip = document.querySelector('#filter-age-chips .filter-chip.active');
  state.showFilters.ageGroup = ageChip ? ageChip.dataset.val : null;
  state.showFilters.idealMoments = [];
  document.querySelectorAll('#filter-moment-chips .filter-chip.active').forEach(chip =>
    state.showFilters.idealMoments.push(chip.dataset.val)
  );
  state.showFilters.themes = [];
  document.querySelectorAll('#filter-theme-chips .filter-chip.active').forEach(chip =>
    state.showFilters.themes.push(chip.dataset.val)
  );
  document.querySelectorAll('.filter-chip[data-filter="extra"]').forEach(chip => {
    state.showFilters[chip.dataset.val] = chip.classList.contains('active');
  });
}

function clearFilters() {
  state.showFilters = {
    stimulation: [], ageGroup: null, idealMoments: [], themes: [],
    goodForRainyDay: false, goodForTravel: false,
    goodForFamily: false, hasPtBrDub: false, search: state.showFilters.search,
  };
  document.querySelectorAll('#shows-filter-modal .filter-chip').forEach(c => {
    c.classList.remove('active');
    c.style.background = c.style.color = c.style.borderColor = '';
  });
}

function hasAnyFilter() {
  const f = state.showFilters;
  return !!f.search || !!state.activeCollection ||
    f.stimulation.length > 0 || !!f.ageGroup ||
    f.idealMoments.length > 0 || f.themes.length > 0 ||
    f.goodForRainyDay || f.goodForTravel ||
    f.goodForFamily || f.hasPtBrDub;
}

function countActiveFilters() {
  const f = state.showFilters;
  return f.stimulation.length + (f.ageGroup ? 1 : 0) +
    f.idealMoments.length + f.themes.length +
    (f.goodForRainyDay ? 1 : 0) +
    (f.goodForTravel ? 1 : 0) + (f.goodForFamily ? 1 : 0) + (f.hasPtBrDub ? 1 : 0);
}

function filterShows() {
  const f = state.showFilters;
  return SCREEN_CONTENT.filter(s => {
    if (f.search && !s.title.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (state.activeCollection && !(s.collections || []).includes(state.activeCollection)) return false;
    if (f.stimulation.length && !f.stimulation.includes(s.stimulationLevel)) return false;
    if (f.ageGroup) {
      if (f.ageGroup === 'baby'    && !(s.maxAge <= 2 || s.minAge <= 2)) return false;
      if (f.ageGroup === 'toddler' && !(s.minAge <= 5 && s.maxAge >= 2)) return false;
      if (f.ageGroup === 'child'   && !(s.minAge <= 8 && s.maxAge >= 5)) return false;
      if (f.ageGroup === 'older'   && !(s.maxAge >= 8)) return false;
    }
    if (f.idealMoments.length && !f.idealMoments.some(m => s.idealMoments.includes(m))) return false;
    if (f.themes.length && !f.themes.some(t => s.themes.includes(t))) return false;
    if (f.goodForRainyDay && !s.goodForRainyDay) return false;
    if (f.goodForTravel   && !s.goodForTravel)   return false;
    if (f.goodForFamily   && !s.goodForFamily)   return false;
    if (f.hasPtBrDub      && !s.hasPtBrDub)      return false;
    return true;
  });
}

function stimDots(level) {
  const m = STIM_META[level];
  return Array.from({length: 5}, (_, i) =>
    `<span class="stim-dot" style="background:${i < level ? m.dotColor : '#DDE3F0'}"></span>`
  ).join('');
}

function renderShowCard(s, inCurated) {
  const m = STIM_META[s.stimulationLevel];
  const fav = isFav(s.id);
  const tags = (s.tags || s.themes || []).slice(0, 2).map(t => `<span class="show-tag-chip">${t}</span>`).join('');
  const badgeHtml = (s.badges || []).slice(0, 2).map(b => {
    const info = BADGES.find(x => x.key === b);
    return info ? `<span class="show-badge-chip" style="background:${info.color}20;color:${info.color};border-color:${info.color}40">${info.emoji} ${b}</span>` : '';
  }).join('');

  const thumbStyle = s.thumbnail
    ? `background-image:url('${s.thumbnail}');background-size:cover;background-position:center top`
    : `background:linear-gradient(135deg,${m.bgColor},${m.bgColor}cc)`;

  return `<div class="show-card${inCurated ? ' show-card-curated' : ''}" data-id="${s.id}">
    <div class="show-card-thumb" style="${thumbStyle}">
      ${s.thumbnail ? '' : `<span class="show-card-emoji">${s.emoji}</span>`}
      <div class="show-stim-badge" style="background:${m.dotColor}">${s.stimulationLabel || m.label}</div>
      <button class="show-fav-btn${fav ? ' active' : ''}" data-id="${s.id}" aria-label="${fav ? 'Remover favorito' : 'Favoritar'}">
        ${fav ? '♥' : '♡'}
      </button>
    </div>
    <div class="show-card-body">
      <div class="show-stim-dots">${stimDots(s.stimulationLevel)}</div>
      <div class="show-title">${s.title}</div>
      <div class="show-meta">${s.ageRange} · ${s.averageDuration || s.averageEpisodeDuration}</div>
      <div class="show-tags">${tags}</div>
      ${badgeHtml ? `<div class="show-badges-row">${badgeHtml}</div>` : ''}
      <button class="show-detail-btn">Ver detalhes →</button>
    </div>
  </div>`;
}

function renderCuratedSection(title, emoji, items) {
  if (!items.length) return '';
  const cards = items.slice(0, 10).map(s => renderShowCard(s, true)).join('');
  return `<div class="curated-section">
    <div class="curated-title">${emoji} ${title}</div>
    <div class="curated-scroll">${cards}</div>
  </div>`;
}

function renderShows() {
  // Update filter badge
  const count = countActiveFilters();
  const badge = document.getElementById('filter-badge');
  badge.textContent = count;
  badge.style.display = count > 0 ? '' : 'none';

  renderActiveFilterChips();

  const curated    = document.getElementById('shows-curated');
  const grid       = document.getElementById('shows-grid');
  const gridTitle  = document.getElementById('shows-grid-title');
  const anyFilt    = hasAnyFilter();

  if (anyFilt) {
    // Hide curated, show filtered grid
    curated.style.display = 'none';
    if (gridTitle) gridTitle.style.display = 'none';
    const filtered = filterShows();
    if (!filtered.length) {
      grid.innerHTML = `<div class="shows-empty">
        <div style="font-size:48px;margin-bottom:12px;">🔍</div>
        <div style="font-weight:700;color:var(--text);margin-bottom:6px;">Nenhum resultado</div>
        <div style="font-size:13px;color:var(--text-muted);">Tente remover um filtro ou buscar por outro tema.</div>
      </div>`;
    } else {
      grid.innerHTML = filtered.map(s => renderShowCard(s, false)).join('');
    }
  } else {
    // Show curated sections + full list
    curated.style.display = '';
    if (gridTitle) gridTitle.style.display = '';
    const descacelerar = SCREEN_CONTENT.filter(s => s.stimulationLevel <= 2).slice(0, 10);
    const brasileiras  = SCREEN_CONTENT.filter(s => (s.collections || []).includes('Produções Brasileiras')).slice(0, 10);
    const aprendendo   = SCREEN_CONTENT.filter(s => s.idealMoments.includes('Momento educativo')).slice(0, 10);

    curated.innerHTML =
      renderCuratedSection('Recomendados para desacelerar', '☁️', descacelerar) +
      (brasileiras.length ? renderCuratedSection('Produções brasileiras', '🇧🇷', brasileiras) : '') +
      renderCuratedSection('Aprendendo brincando', '📚', aprendendo);

    grid.innerHTML = SCREEN_CONTENT.map(s => renderShowCard(s, false)).join('');
  }
}

function renderActiveFilterChips() {
  const f   = state.showFilters;
  const row = document.getElementById('active-filters-row');
  const chips = [];

  f.stimulation.forEach(v => chips.push({ label: STIM_META[v].label, remove: () => { state.showFilters.stimulation = state.showFilters.stimulation.filter(x => x !== v); } }));
  if (f.ageGroup) {
    const labels = { baby: 'Bebê (0–2)', toddler: 'Pequeno (2–5)', child: 'Criança (5–8)', older: 'Maior (8+)' };
    chips.push({ label: labels[f.ageGroup], remove: () => { state.showFilters.ageGroup = null; } });
  }
  f.idealMoments.forEach(v => chips.push({ label: v, remove: () => { state.showFilters.idealMoments = state.showFilters.idealMoments.filter(x => x !== v); } }));
  f.themes.forEach(v => chips.push({ label: v, remove: () => { state.showFilters.themes = state.showFilters.themes.filter(x => x !== v); } }));
  if (f.goodForRainyDay) chips.push({ label: '🌧️ Chuva',    remove: () => { state.showFilters.goodForRainyDay = false; } });
  if (f.goodForTravel)   chips.push({ label: '✈️ Viagem',   remove: () => { state.showFilters.goodForTravel   = false; } });
  if (f.goodForFamily)   chips.push({ label: '👨‍👩‍👧 Família', remove: () => { state.showFilters.goodForFamily   = false; } });
  if (f.hasPtBrDub)      chips.push({ label: '🇧🇷 PT-BR',   remove: () => { state.showFilters.hasPtBrDub      = false; } });

  if (!chips.length) { row.style.display = 'none'; return; }
  row.style.display = '';
  row.innerHTML = chips.map((c, i) =>
    `<span class="active-filter-chip">${c.label} <button class="chip-remove" data-chip="${i}">×</button></span>`
  ).join('');
  row.querySelectorAll('.chip-remove').forEach(btn =>
    btn.addEventListener('click', () => {
      chips[parseInt(btn.dataset.chip)].remove();
      renderShows();
    })
  );
}

function openShowDetail(id) {
  const show = SCREEN_CONTENT.find(s => s.id === id);
  if (!show) return;
  state.showsView  = 'detail';
  state.selectedShowId = id;

  const m = STIM_META[show.stimulationLevel];
  const fav = isFav(id);

  const themeChips  = show.themes.map(t  => `<span class="detail-chip">${t}</span>`).join('');
  const skillChips  = (show.skills || []).map(sk => `<span class="detail-chip">${sk}</span>`).join('');
  const momentChips = (show.idealMoments || []).map(mo => `<span class="detail-chip">${mo}</span>`).join('');
  const colChips    = (show.collections || []).map(c => `<span class="detail-chip detail-chip-col">${c}</span>`).join('');
  const badgeHtml   = (show.badges || []).map(b => {
    const info = BADGES.find(x => x.key === b);
    return info ? `<span class="detail-badge" style="background:${info.color}15;color:${info.color};border-color:${info.color}40">${info.emoji} ${b}</span>` : '';
  }).join('');

  const extraBadges = [
    show.goodForRainyDay ? `<span class="detail-extra-badge">🌧️ Dia de chuva</span>`   : '',
    show.goodForTravel   ? `<span class="detail-extra-badge">✈️ Viagem</span>`           : '',
    show.goodForFamily   ? `<span class="detail-extra-badge">👨‍👩‍👧 Para assistir em família</span>` : '',
    show.hasPtBrDub      ? `<span class="detail-extra-badge">🇧🇷 Dublado em PT</span>`  : '',
  ].filter(Boolean).join('');

  const dur = show.averageDuration || show.averageEpisodeDuration;

  document.getElementById('shows-detail-content').innerHTML = `
    <div class="detail-banner" style="background:linear-gradient(160deg,${m.bgColor},${m.bgColor}cc)">
      <div class="detail-banner-emoji">${show.emoji}</div>
      <button class="detail-fav-btn${fav ? ' active' : ''}" data-id="${id}">${fav ? '♥' : '♡'}</button>
    </div>
    <div class="detail-body">
      <div class="detail-stim-row">
        <span class="detail-stim-dots">${stimDots(show.stimulationLevel)}</span>
        <span class="detail-stim-label" style="color:${m.dotColor}">${show.stimulationLabel || m.label}</span>
      </div>
      <h1 class="detail-title">${show.title}</h1>
      ${show.originalTitle && show.originalTitle !== show.title ? `<div class="detail-original-title">${show.originalTitle}</div>` : ''}
      <div class="detail-meta-row">
        <span class="detail-meta-pill">${show.contentType || 'Série'}</span>
        ${show.year ? `<span class="detail-meta-pill">${show.year}</span>` : ''}
        ${show.country ? `<span class="detail-meta-pill">${show.country}</span>` : ''}
        <span class="detail-meta-pill">${show.ageRange}</span>
        <span class="detail-meta-pill">⏱ ${dur}</span>
      </div>

      ${badgeHtml ? `<div class="detail-badges-row">${badgeHtml}</div>` : ''}

      <div class="detail-section">
        <div class="detail-section-label">Sinopse</div>
        <p class="detail-text">${show.synopsis}</p>
      </div>
      <div class="detail-section">
        <div class="detail-section-label">Por que recomendamos</div>
        <p class="detail-text">${show.whyRecommend}</p>
      </div>
      <div class="detail-section">
        <div class="detail-section-label">O que observar</div>
        <p class="detail-text">${show.whatToObserve || show.parentSummary}</p>
      </div>

      <div class="detail-section">
        <div class="detail-section-label">Temas</div>
        <div class="detail-chips-row">${themeChips}</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-label">Habilidades desenvolvidas</div>
        <div class="detail-chips-row">${skillChips}</div>
      </div>
      <div class="detail-section">
        <div class="detail-section-label">Momentos ideais</div>
        <div class="detail-chips-row">${momentChips}</div>
      </div>
      ${colChips ? `<div class="detail-section">
        <div class="detail-section-label">Coleções</div>
        <div class="detail-chips-row">${colChips}</div>
      </div>` : ''}

      ${extraBadges ? `<div class="detail-extra-badges">${extraBadges}</div>` : ''}

      <a class="detail-cta-btn" href="${show.justWatchUrl}" target="_blank" rel="noopener noreferrer">
        Ver onde assistir →
      </a>
      <p class="detail-cta-note">Os catálogos dos streamings podem mudar. Confira a disponibilidade atual.</p>
    </div>
  `;

  document.getElementById('shows-detail-content').querySelector('.detail-fav-btn')
    .addEventListener('click', () => {
      toggleFavorite(id);
      openShowDetail(id);
    });

  document.getElementById('shows-list-view').style.display = 'none';
  document.getElementById('shows-detail-view').style.display = '';
  document.getElementById('tab-desenhos').scrollTop = 0;
}

// ── Toast ──────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
