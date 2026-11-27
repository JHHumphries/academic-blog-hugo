const feed = document.querySelector('.paper-feed');
const strip = feed.querySelector('.paper-feed__strip');
const track = feed.querySelector('.paper-feed__track');
const list = feed.querySelector('.paper-feed__items');
const status = feed.querySelector('[role="status"]');
const sourceNames = ['arXiv', 'APS', 'Nature', 'Biophysical Journal'];
const topicsByScope = {
  'quantum-chaos': ['SYK', 'Dilaton gravity', 'Quantum Chaos'],
  'membrane-mechanics': ['Membrane Biophysics']
};
const scopedTopics = topicsByScope[feed.dataset.scope];
let papers = [];
let note = '';
const pixelsPerMillisecond = .045;
let animation;
let loopWidth = 0;
let copy;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const hover = window.matchMedia('(hover: hover)');
let touching = false;

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Feed unavailable');
  return response.json();
}

function inScope(paper) {
  return !scopedTopics || scopedTopics.some(topic => paper.tags.includes(topic));
}

function mixSources(papers) {
  const counts = new Map();
  return [...papers]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(paper => {
      const rank = counts.get(paper.source) ?? 0;
      counts.set(paper.source, rank + 1);
      return { paper, rank };
    })
    .sort((a, b) => a.rank - b.rank)
    .map(({ paper }) => paper);
}

function paperKey(paper) {
  // Older saved Nature links point directly to articles rather than to DOIs.
  const natureId = paper.url.match(/^https:\/\/www\.nature\.com\/articles\/([^/?#]+)/)?.[1];
  return natureId ? 'https://doi.org/10.1038/' + natureId.toLowerCase() : paper.url;
}

function render() {
  if (strip.matches(':focus-within')) {
    // A live refresh should not remove a headline while someone is reading it.
    strip.addEventListener('focusout', () => queueMicrotask(render), { once: true });
    return;
  }
  clearAnimation();
  list.replaceChildren();
  strip.scrollLeft = 0;
  for (const paper of papers) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = paper.url;
    link.textContent = paper.title;
    if (paper.tags.includes('Membrane Biophysics')) {
      link.dataset.research = 'membrane-mechanics';
    } else if (topicsByScope['quantum-chaos'].some(topic => paper.tags.includes(topic))) {
      link.dataset.research = 'quantum-chaos';
    }
    const metadata = document.createElement('small');
    metadata.textContent = [paper.source, paper.date, paper.saved ? 'saved' : ''].filter(Boolean).join(' · ');
    item.append(link, metadata);
    list.append(item);
  }
  feed.toggleAttribute('data-has-items', papers.length > 0);
  status.textContent = papers.length ? papers.length + ' papers. ' + note
    : scopedTopics ? 'No papers for this research area are available right now.' : 'The paper feed is unavailable at the moment.';
  resizeLoop();
}

function clearAnimation() {
  animation?.cancel();
  animation = undefined;
  loopWidth = 0;
  copy?.remove();
  copy = undefined;
}

function currentOffset() {
  const position = (animation?.currentTime ?? 0) * pixelsPerMillisecond;
  return (loopWidth ? position % loopWidth : 0) + strip.scrollLeft;
}

function resizeLoop() {
  const width = list.getBoundingClientRect().width;
  if (reducedMotion.matches || !list.childElementCount || width <= strip.clientWidth) {
    const offset = currentOffset();
    clearAnimation();
    strip.scrollLeft = offset;
    return;
  }
  if (width === loopWidth && animation) return;

  const offset = currentOffset();
  animation?.cancel();
  if (!copy) {
    copy = list.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('a').forEach(link => { link.tabIndex = -1; });
    track.append(copy);
  }
  loopWidth = width;
  strip.scrollLeft = 0;
  animation = track.animate(
    [{ transform: 'translateX(0)' }, { transform: `translateX(-${loopWidth}px)` }],
    { duration: loopWidth / pixelsPerMillisecond, iterations: Infinity, easing: 'linear' }
  );
  animation.currentTime = (offset % loopWidth) / pixelsPerMillisecond;
  updatePlayback();
}

function updatePlayback() {
  if (!animation) return;
  if (touching || strip.matches(':focus-within') || (hover.matches && strip.matches(':hover'))) {
    animation.pause();
    return;
  }
  if (strip.scrollLeft) {
    const offset = currentOffset();
    strip.scrollLeft = 0;
    animation.currentTime = (offset % loopWidth) / pixelsPerMillisecond;
  }
  animation.play();
}

strip.addEventListener('pointerenter', updatePlayback);
strip.addEventListener('pointerleave', updatePlayback);
strip.addEventListener('focusin', event => {
  updatePlayback();
  if (!animation || !list.contains(event.target)) return;
  const viewport = strip.getBoundingClientRect();
  const headline = event.target.getBoundingClientRect();
  if (headline.left < viewport.left || headline.right > viewport.right) {
    const offset = headline.left - track.getBoundingClientRect().left;
    strip.scrollLeft = 0;
    animation.currentTime = offset / pixelsPerMillisecond;
  }
});
strip.addEventListener('focusout', () => queueMicrotask(updatePlayback));
strip.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch') return;
  touching = true;
  updatePlayback();
});
for (const eventName of ['pointerup', 'pointercancel']) {
  window.addEventListener(eventName, () => {
    if (!touching) return;
    touching = false;
    updatePlayback();
  });
}
reducedMotion.addEventListener('change', resizeLoop);
const observer = new ResizeObserver(resizeLoop);
observer.observe(strip);
observer.observe(list);

async function load() {
  const liveRequest = getJSON(feed.dataset.endpoint).catch(() => null);
  const snapshot = (await getJSON(feed.dataset.snapshot).catch(() => [])).filter(inScope);
  if (snapshot.length) {
    papers = mixSources(snapshot.map(paper => ({ ...paper, saved: true })));
    note = 'Showing saved papers while checking sources.';
    render();
  }
  const live = await liveRequest;
  const sources = live?.sources ?? {};
  const liveItems = (live?.items ?? []).filter(inScope);
  const fallback = sourceNames.filter(name => !sources[name] || sources[name] === 'unavailable'
    || (sources[name] === 'partial' && !liveItems.some(paper => paper.source === name)));
  const savedItems = snapshot.filter(paper => (scopedTopics && !liveItems.length) || fallback.includes(paper.source)
    || (sources[paper.source] === 'partial' && paper.tags.some(tag =>
      !liveItems.some(item => item.source === paper.source && item.tags.includes(tag)))));
  papers = mixSources([...new Map([
    ...savedItems.map(paper => ({ ...paper, saved: true })),
    ...liveItems.map(paper => ({ ...paper, saved: sources[paper.source] === 'stale' }))
  ].map(paper => [paperKey(paper), paper])).values()]
    .filter(paper => /^https:\/\/(?:arxiv\.org\/abs\/|doi\.org\/|www\.nature\.com\/articles\/|www\.sciencedirect\.com\/science\/article\/pii\/)/.test(paper.url)));
  const savedSources = sourceNames.filter(name =>
    sources[name] === 'stale' || savedItems.some(paper => paper.source === name));
  const incomplete = sourceNames.filter(name => sources[name] === 'partial' && !savedSources.includes(name));
  const unavailable = fallback.filter(name => !savedSources.includes(name));
  note = [
    savedSources.length && 'Saved results for ' + savedSources.join(', ') + '.',
    incomplete.length && 'Partial results from ' + incomplete.join(', ') + '.',
    unavailable.length && 'Unavailable: ' + unavailable.join(', ') + '.'
  ].filter(Boolean).join(' ');
  render();
}

load();
