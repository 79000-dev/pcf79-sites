'use strict';

const articles = window.ARTICLES;
const home = document.querySelector('#home');
const search = document.querySelector('#filter');
const status = document.querySelector('#matches');
const cards = Array.from(document.querySelectorAll('[data-story]'));
const readers = Array.from(document.querySelectorAll('.reader'));
const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

function showResults(tag = '') {
  const terms = normalize(search.value).trim().split(/\s+/);
  let count = 0;
  articles.forEach((article, index) => {
    const text = normalize([
      article.date, article.place, article.category, article.title,
      article.deck, ...article.tags, ...article.paragraphs,
    ].join(' '));
    const visible = (!tag || article.tags.includes(tag)) && terms.every((term) => text.includes(term));
    cards[index].hidden = !visible;
    count += Number(visible);
  });
  status.textContent = search.value || tag ? `${count} article${count === 1 ? '' : 's'}` : '';
}

for (const [index, article] of articles.entries()) {
  const related = readers[index].querySelector('.related');
  let next;
  let bestScore = 0;
  for (const candidate of articles) {
    if (candidate.id === article.id) continue;
    const sharedTags = candidate.tags.filter((tag) => article.tags.includes(tag));
    const score = sharedTags.length * 2 - Number(sharedTags.includes('Niort'));
    if (score > bestScore) {
      next = candidate;
      bestScore = score;
    }
  }
  if (next) {
    const link = document.createElement('a');
    link.href = `#article/${next.id}`;
    link.textContent = next.title;
    related.append('À lire aussi · ', link);
  }
}

let selectedTag = '';
function navigate(initial = false) {
  const active = readers.find((reader) => '#' + reader.id === location.hash);
  home.hidden = Boolean(active);
  for (const reader of readers) reader.hidden = reader !== active;
  if (active) {
    if (!initial) active.querySelector('h2').focus({ preventScroll: true });
    active.scrollIntoView();
    return;
  }
  const anchor = document.getElementById(location.hash.slice(1));
  if (anchor) anchor.scrollIntoView();
}

document.addEventListener('click', (event) => {
  const tagLink = event.target.closest('[data-tag]');
  if (tagLink) {
    selectedTag = tagLink.dataset.tag;
    search.value = '';
    showResults(selectedTag);
  } else if (event.target.closest('a[href="#actualites"]')) {
    selectedTag = '';
    search.value = '';
    showResults();
  }
});
search.addEventListener('input', () => {
  selectedTag = '';
  showResults();
});
window.addEventListener('hashchange', () => navigate());
navigate(true);

const dialog = document.querySelector('#membership');
const join = document.querySelector('[data-join]');
const video = join.querySelector('video');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function preview() {
  if (!reduceMotion.matches) video.play().catch(() => {});
}
join.addEventListener('pointerenter', preview);
join.addEventListener('pointerleave', () => video.pause());
join.addEventListener('focus', preview);
join.addEventListener('blur', () => video.pause());
join.addEventListener('click', () => dialog.showModal());
dialog.querySelector('.close').addEventListener('click', () => dialog.close());
const form = document.querySelector('#prepare');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const get = (key) => values.get(key).trim();
  const lines = [
    'Bonjour,', '', 'Je souhaite être contacté au sujet de mon adhésion.',
    '', `Nom : ${get('prenom')} ${get('nom')}`, `Adresse e-mail : ${get('email')}`,
  ];
  if (get('commune')) lines.push(`Commune : ${get('commune')}`);
  if (get('texte')) lines.push('', get('texte'));
  const letter = lines.join('\n');
  document.querySelector('#letter').value = letter;
  const send = document.querySelector('#envoi');
  send.href = 'mailto:dspcf79@orange.fr?subject=Demande%20d%E2%80%99adh%C3%A9sion&body=' + encodeURIComponent(letter);
  document.querySelector('#draft').hidden = false;
  send.focus();
});

if (location.protocol === 'https:') {
  const feed = new URL(document.querySelector('[data-feed]').href);
  document.querySelector('[data-apple-feed]').href = feed.href.replace(/^https:/, 'webcal:');
  document.querySelector('[data-google-feed]').href =
    'https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=' + encodeURIComponent(feed.href);
}
