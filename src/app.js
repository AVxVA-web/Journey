const page = document.body.dataset.page;
const state = { completedWeeks: 12, totalWeeks: 52, xp: 1840, streak: 18 };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const plan = [
  ['السبت', 'رياضيات', 'تفاضل: 45 مسألة + ملخص قوانين'],
  ['الأحد', 'فيزياء', 'حركة وقوى: امتحان قصير وتحليل أخطاء'],
  ['الإثنين', 'عربي', 'بلاغة ونصوص: مراجعة مركزة'],
  ['الثلاثاء', 'كيمياء', 'اتزان: خريطة مفاهيم + بنك أسئلة'],
  ['الأربعاء', 'إنجليزي', 'Writing sprint + vocabulary recall'],
  ['الخميس', 'محاكاة', 'نموذج مختلط 90 دقيقة'],
  ['الجمعة', 'استشفاء', 'مراجعة خفيفة + تخطيط الأسبوع القادم'],
];

const missions = [
  ['Physics Boss', 'حل 35 سؤال قوانين حركة مع تصحيح فوري.', 180],
  ['Math Combo', 'جلسة 60 دقيقة تفاضل وتكامل بدون هاتف.', 160],
  ['Arabic Shield', 'مراجعة بلاغة + 20 سؤال تطبيق.', 120],
  ['Chemistry Lab', 'خريطة مفاهيم للاتزان الكيميائي.', 130],
  ['English Sprint', 'كتابة paragraph وتصحيح الأخطاء.', 100],
  ['Mock Gate', 'اختبار 25 دقيقة ضد الزمن.', 220],
];

function activateNavigation() {
  $$('[data-nav]').forEach((item) => item.classList.toggle('active', item.dataset.nav === page));
}

function updateHud() {
  const percent = Math.round((state.completedWeeks / state.totalWeeks) * 100);
  const levelXp = state.xp % 5000;
  if ($('#xp')) $('#xp').textContent = levelXp.toLocaleString('ar-EG');
  if ($('#streak')) $('#streak').textContent = state.streak.toLocaleString('ar-EG');
  if ($('#progressPercent')) $('#progressPercent').textContent = `${percent}%`;
  if ($('.progress-ring')) $('.progress-ring').style.setProperty('--progress', `${percent}%`);
}

function renderWeeks() {
  const weeksTrack = $('#weeksTrack');
  if (!weeksTrack) return;
  weeksTrack.innerHTML = '';
  for (let week = 1; week <= state.totalWeeks; week += 1) {
    const node = document.createElement('button');
    node.className = 'week';
    node.type = 'button';
    node.textContent = week;
    node.setAttribute('aria-label', `الأسبوع ${week}`);
    if (week <= state.completedWeeks) node.classList.add('done');
    if (week === state.completedWeeks + 1) node.classList.add('current');
    node.addEventListener('click', () => {
      state.completedWeeks = Math.max(0, week - 1);
      state.xp += 35;
      updateHud();
      renderWeeks();
    });
    weeksTrack.appendChild(node);
  }
}

function renderPlanner() {
  const weekPlan = $('#weekPlan');
  if (!weekPlan) return;
  weekPlan.innerHTML = plan.map(([day, subject, task]) => `<article class="plan-day"><strong>${day} · ${subject}</strong><p>${task}</p></article>`).join('');
}

function renderMissions() {
  const missionGrid = $('#missionGrid');
  if (!missionGrid) return;
  missionGrid.innerHTML = missions.map(([title, body, reward]) => `<article class="mission-card panel"><p class="eyebrow">+${reward} XP</p><h2>${title}</h2><p>${body}</p><button class="primary mission-action" data-reward="${reward}">تم الإنجاز</button></article>`).join('');
  missionGrid.addEventListener('click', (event) => {
    const button = event.target.closest('.mission-action');
    if (!button) return;
    state.xp += Number(button.dataset.reward);
    button.textContent = 'تم تسجيل الإنجاز ✓';
    button.disabled = true;
    updateHud();
  });
}

function bindActions() {
  const quickWin = $('#quickWin');
  if (quickWin) quickWin.addEventListener('click', () => {
    state.xp += 180;
    state.streak += 1;
    if (state.completedWeeks < state.totalWeeks) state.completedWeeks += 1;
    updateHud();
  });

  const startFocus = $('#startFocus');
  if (startFocus) startFocus.addEventListener('click', (event) => {
    event.currentTarget.textContent = 'الجلسة تعمل — لا تكسر السلسلة';
    $('#timer').textContent = '24:59';
  });
}

activateNavigation();
renderWeeks();
renderPlanner();
renderMissions();
bindActions();
updateHud();
