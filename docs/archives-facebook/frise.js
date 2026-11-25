'use strict';

const timeline = document.querySelector('#frise');
if (timeline) {
  const controls = timeline.querySelector('.timeline-controls');
  const range = controls.querySelector('input');
  const buttons = Array.from(controls.querySelectorAll('button'));
  const periods = Array.from(timeline.querySelectorAll('.timeline-period'));
  const status = controls.querySelector('[role="status"]');
  let current = 0;

  function show(index, announce) {
    const period = periods[index];
    if (index !== current) {
      periods[current].hidden = true;
      period.dataset.direction = index > current ? 'older' : 'newer';
      period.hidden = false;
      current = index;
    }
    const month = period.querySelector('h3').textContent;
    range.value = String(index);
    range.setAttribute('aria-valuetext', month);
    range.style.setProperty('--timeline-progress', `${periods.length > 1 ? index * 100 / (periods.length - 1) : 0}%`);
    for (const button of buttons) {
      const destination = index + Number(button.dataset.step);
      button.setAttribute('aria-disabled', String(destination < 0 || destination >= periods.length));
    }
    if (announce) status.textContent = month;
  }

  if (periods.length > 1) controls.hidden = false;
  show(0, false);
  range.addEventListener('input', () => show(range.valueAsNumber, false));
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const index = current + Number(button.dataset.step);
      if (index >= 0 && index < periods.length) show(index, true);
    });
  }
}
