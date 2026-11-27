const feed = document.querySelector('.paper-feed');
const strip = feed.querySelector('.paper-feed__strip');
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
let frame = null;
let previousTime;
let position;
let copy;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
  stop();
  copy?.remove();
  copy = undefined;
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
  if (papers.length) {
    copy = list.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('a').forEach(link => { link.tabIndex = -1; });
    strip.append(copy);
  }
  updatePlayback();
}

function stop() {
  cancelAnimationFrame(frame);
  frame = null;
  previousTime = undefined;
}

function updatePlayback() {
  if (!reducedMotion.matches && copy && frame === null) {
    position = strip.scrollLeft;
    frame = requestAnimationFrame(step);
  } else if (reducedMotion.matches) {
    stop();
  }
}

function step(time) {
  if (previousTime !== undefined) {
    if (touching || strip.matches(':focus-within') ||
        (window.matchMedia('(hover: hover)').matches && strip.matches(':hover'))) {
      position = strip.scrollLeft;
    } else {
      position = (position + Math.min(time - previousTime, 50) * .045) % list.getBoundingClientRect().width;
      strip.scrollLeft = position;
    }
  }
  previousTime = time;
  frame = requestAnimationFrame(step);
}

strip.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch') touching = true;
});
for (const eventName of ['pointerup', 'pointercancel']) {
  window.addEventListener(eventName, () => { touching = false; });
}
reducedMotion.addEventListener('change', updatePlayback);

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
