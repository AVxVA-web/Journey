const state = {
  completedWeeks: 10,
  totalWeeks: 52,
  xp: 2460,
  level: 8,
  streak: 12,
};

const weeksTrack = document.querySelector('#weeksTrack');
const xp = document.querySelector('#xp');
const xpFill = document.querySelector('#xpFill');
const level = document.querySelector('#level');
const streak = document.querySelector('#streak');
const weeksLeft = document.querySelector('#weeksLeft');
const progressPercent = document.querySelector('#progressPercent');
const ring = document.querySelector('.ring');

function renderWeeks() {
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
      state.xp += 25;
      updateHud();
      renderWeeks();
    });
    weeksTrack.appendChild(node);
  }
}

function updateHud() {
  const percent = Math.round((state.completedWeeks / state.totalWeeks) * 100);
  const currentXp = state.xp % 3000;
  const levelNumber = Math.floor(state.xp / 3000) + 8;
  xp.textContent = currentXp.toLocaleString('ar-EG');
  xpFill.style.width = `${(currentXp / 3000) * 100}%`;
  level.textContent = levelNumber.toLocaleString('ar-EG');
  streak.textContent = state.streak.toLocaleString('ar-EG');
  weeksLeft.textContent = `${state.totalWeeks - state.completedWeeks} أسبوع`;
  progressPercent.textContent = `${percent}%`;
  ring.style.setProperty('--progress', `${percent}%`);
}

document.querySelector('#completeMission').addEventListener('click', () => {
  state.xp += 120;
  state.streak += 1;
  if (state.completedWeeks < state.totalWeeks) state.completedWeeks += 1;
  updateHud();
  renderWeeks();
});

document.querySelector('#resetProgress').addEventListener('click', () => {
  state.completedWeeks = 10;
  state.xp = 2460;
  state.streak = 12;
  updateHud();
  renderWeeks();
});

document.querySelector('#startFocus').addEventListener('click', (event) => {
  event.currentTarget.textContent = 'الجولة بدأت — اقفل المشتتات';
  document.querySelector('#timer').textContent = '24:59';
});

renderWeeks();
updateHud();
