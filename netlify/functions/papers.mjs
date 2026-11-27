const lifetime = 30 * 60 * 1000;
const jobs = new Map();
let crossrefQueue = Promise.resolve();
function readCrossref(url, deadline) {
  const request = crossrefQueue.then(() => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Feed refresh timed out');
    return get(url, true, Math.min(2500, remaining));
  });
  crossrefQueue = request.catch(() => {}).then(() => new Promise(resolve => setTimeout(resolve, 250)));
  return request;
}
const topics = [
  ['SYK', ['Sachdev Ye Kitaev', 'SYK model']],
  ['Dilaton gravity', ['dilaton gravity', 'Jackiw Teitelboim']],
  ['Membrane Biophysics', ['lipid membrane', 'membrane mechanics', 'membrane eversion']]
];
const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
function clean(value = '') {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
      if (!entity.startsWith('#')) return entities[entity] ?? match;
      const point = entity[1] === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return point <= 0x10ffff ? String.fromCodePoint(point) : match;
    }).replace(/\s+/g, ' ').trim();
}
function topicFor(text) {
  const tags = [];
  if (/sachdev[\s\p{Pd}]+ye[\s\p{Pd}]+kitaev|\bsyk\b.{0,35}\b(model|fermion|chain|interaction|hamiltonian|gravity|ensemble|coupling)s?\b|\b(sparse|complex|supersymmetric|majorana|bosonic|brownian|coupled)\s+syk\b/iu.test(text)) tags.push('SYK');
  if (/\bdilaton[\s\p{Pd}]+(?:quantum[\s\p{Pd}]+)?gravit|\bjackiw[\s\p{Pd}]+teitelboim|\bjt[\s\p{Pd}]+gravity/iu.test(text)) tags.push('Dilaton gravity');
  if (/\b(?:lipid|fluid|cell|plasma)[\s\p{Pd}]+(?:bilayers?|membranes?)\b|\bmembrane[\s\p{Pd}]+(?:biophysics|mechanics|eversion|curvature|bending|elasticity|tension)\b/iu.test(text)) tags.push('Membrane Biophysics');
  return tags;
}
async function get(url, json = false, timeout = 8000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { Accept: json ? 'application/json' : 'application/atom+xml' } });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return json ? response.json() : response.text();
}
function tag(entry, name) {
  return clean(entry.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>'))?.[1]);
}
async function searchArxiv(groups) {
  const query = groups.flatMap(([, terms]) => terms.flatMap(term => ['ti:"'+term+'"', 'abs:"'+term+'"'])).join(' OR ');
  const url = new URL('https://export.arxiv.org/api/query');
  url.search = new URLSearchParams({ search_query: query, sortBy: 'submittedDate', sortOrder: 'descending', max_results: '60' });
  const xml = await get(url);
  if (!/<feed[\s>]/.test(xml)) throw new Error('Unexpected arXiv response');
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, item]) => ({
    title: tag(item, 'title'), url: tag(item, 'id').replace(/^http:/, 'https:').replace(/v\d+$/, ''),
    date: tag(item, 'published').slice(0, 10), source: 'arXiv', journal: 'Preprint',
    tags: topicFor(tag(item, 'title') + ' ' + tag(item, 'summary'))
  }));
}

async function arxiv() {
  const items = [];
  let failed = 0;
  for (const groups of [topics.slice(0, 2), topics.slice(2)]) {
    if (groups[0] === topics[2]) await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      items.push(...await searchArxiv(groups));
    } catch {
      failed++;
    }
  }
  if (failed === 2) throw new Error('Both arXiv searches failed');
  return { partial: failed > 0, items };
}
async function journals(source, prefix, deadline) {
  const results = await Promise.allSettled(topics.flatMap(([, terms]) => terms).map(async term => {
    const url = new URL('https://api.crossref.org/works');
    const since = new Date();
    since.setUTCFullYear(since.getUTCFullYear() - 2);
    url.search = new URLSearchParams({ 'query.title': term, rows: '60',
      filter: 'prefix:'+prefix+',type:journal-article,from-pub-date:'+since.toISOString().slice(0,10),
      select: 'title,DOI,published,container-title' });
    const result = await readCrossref(url, deadline);
    return result.message.items.map(item => {
      const title = clean(item.title?.[0]);
      const [year, month, day] = item.published?.['date-parts']?.[0] ?? [];
      return { title, url: 'https://doi.org/' + item.DOI, date: year ? [year, month, day].filter(Boolean).map(x => String(x).padStart(2,'0')).join('-') : '',
        source, journal: clean(item['container-title']?.[0]), tags: topicFor(title) };
    });
  }));
  if (results.every(result => result.status === 'rejected')) throw results[0].reason;
  return { partial: results.some(result => result.status === 'rejected'), items: results.flatMap(result => result.value ?? []) };
}
async function collect(name, query) {
  const previous = jobs.get(name);
  if (previous?.pending) return previous.pending;
  if (previous?.expires > Date.now()) return previous.result;
  const pending = (async () => {
    let result;
    try {
      const { items, partial } = await query();
      const unique = new Map((previous?.result?.items ?? []).map(item => [item.url, item]));
      if (!partial) unique.clear();
      for (const item of items) {
        if (item.title && item.tags.length && /^https:\/\/(?:arxiv\.org\/abs\/|doi\.org\/)/.test(item.url)) unique.set(item.url, item);
      }
      result = { status: partial ? 'partial' : 'ok', items: [...unique.values()] };
    } catch {
      result = { status: previous?.result?.items.length ? 'stale' : 'unavailable', items: previous?.result?.items ?? [] };
    }
    jobs.set(name, { result, expires: Date.now() + (result.status === 'ok' ? lifetime : 120000) });
    return result;
  })();
  jobs.set(name, { pending });
  return pending;
}
export default async function (request) {
  if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
  const deadline = Date.now() + 22000;
  const results = await Promise.all([
    collect('arXiv', arxiv),
    collect('APS', () => journals('APS', '10.1103', deadline)),
    collect('Nature', () => journals('Nature', '10.1038', deadline))
  ]);
  const sources = ['arXiv', 'APS', 'Nature'];
  const healthy = results.every(result => result.status === 'ok');
  return Response.json({
    items: results.flatMap(result => result.items).sort((a, b) => b.date.localeCompare(a.date)),
    sources: Object.fromEntries(sources.map((name, i) => [name, results[i].status]))
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60',
      'Netlify-CDN-Cache-Control': healthy
        ? 'public, durable, max-age=1800, stale-while-revalidate=300'
        : 'public, durable, max-age=120'
    }
  });
}
