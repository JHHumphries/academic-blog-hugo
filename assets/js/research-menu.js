const research = document.querySelector('.nav-dropdown');

if (research) {
  const trigger = research.querySelector('summary');
  research.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') research.open = true;
  });
  research.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse' && !research.querySelector('li a:focus')) {
      research.open = false;
    }
  });
  research.addEventListener('focusout', event => {
    if (!research.contains(event.relatedTarget) && !research.matches(':hover')) {
      research.open = false;
    }
  });
  research.addEventListener('keydown', event => {
    if (event.key === 'Escape' && research.open) {
      research.open = false;
      trigger.focus();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!research.contains(event.target)) research.open = false;
  });
}
