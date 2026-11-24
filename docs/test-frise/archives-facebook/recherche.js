'use strict';

const input = document.querySelector('#archive-search');
const feedback = document.querySelector('#archive-matches');
const years = Array.from(document.querySelectorAll('.archive-year'));
const normalize = text => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const indexedYears = years.map(year => ({
  year,
  initiallyOpen: year.open,
  entries: Array.from(year.querySelectorAll('li'), row => ({ row, text: normalize(row.textContent) })),
}));
input.addEventListener('input', () => {
  const words = normalize(input.value).trim().split(/\s+/).filter(Boolean);
  let total = 0;
  for (const group of indexedYears) {
    let found = 0;
    for (const entry of group.entries) {
      entry.row.hidden = !words.every(word => entry.text.includes(word));
      if (!entry.row.hidden) found += 1;
    }
    group.year.hidden = found === 0;
    group.year.open = words.length ? found > 0 : group.initiallyOpen;
    total += found;
  }
  feedback.textContent = words.length ? `${total} publication${total === 1 ? '' : 's'}` : '';
});

function revealMonth() {
  const target = document.getElementById(location.hash.slice(1));
  if (!target?.classList.contains('archive-month')) return;
  const year = target.closest('.archive-year');
  year.open = true;
  target.scrollIntoView();
}
window.addEventListener('hashchange', revealMonth);
revealMonth();
