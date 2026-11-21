for (const dropdown of document.querySelectorAll('.nav-dropdown')) {
  const label = dropdown.querySelector('.nav-dropdown__label');

  dropdown.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    dropdown.classList.add('is-dismissed');
    label.focus();
  });
  dropdown.addEventListener('pointerenter', () => {
    dropdown.classList.remove('is-dismissed');
  });
  dropdown.addEventListener('focusin', event => {
    if (!dropdown.contains(event.relatedTarget)) {
      dropdown.classList.remove('is-dismissed');
    }
  });
}
