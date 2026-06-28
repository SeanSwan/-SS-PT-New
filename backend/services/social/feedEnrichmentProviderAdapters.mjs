const nasaImageQueries = [
  'earth from space',
  'nebula galaxy stars',
  'ocean earth observation',
  'forest earth observation',
  'moon horizon',
];

const npsQueries = [
  'waterfall',
  'forest',
  'valley',
  'stargazing',
  'ocean',
];

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const toIsoDate = (value, nowMs) => {
  const parsed = value ? Date.parse(String(value)) : NaN;
  return new Date(Number.isFinite(parsed) ? parsed : nowMs).toISOString();
};

const dayIndex = (nowMs, values) => {
  const day = Math.floor(nowMs / 86_400_000);
  return values[Math.abs(day) % values.length];
};

const firstArrayValue = (...values) => values.find((value) => Array.isArray(value) && value.length > 0) || [];

const firstText = (...values) => values.map(normalizeWhitespace).find(Boolean) || '';

const buildNasaImageItem = async ({ fetchJson, nowMs, env, moderate }) => {
  const query = dayIndex(nowMs, nasaImageQueries);
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=8`;
  const data = await fetchJson(url, { env });
  const collectionItems = firstArrayValue(data?.collection?.items);
  const item = collectionItems.find((candidate) => candidate?.data?.[0]?.title && candidate?.links?.[0]?.href);
  if (!item) return null;

  const asset = item.data[0] || {};
  const mediaUrl = item.links.find((link) => link?.render === 'image' && link?.href)?.href || item.links[0]?.href;
  const nasaId = firstText(asset.nasa_id, item.href, asset.title).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80);

  return moderate({
    id: `nasa-images-${nasaId || nowMs}`,
    kind: 'enrichment',
    source: 'nasa-images',
    category: 'space',
    title: asset.title,
    summary: firstText(asset.description_508, asset.description, 'A NASA Image and Video Library moment for a wider view.'),
    mediaType: 'image',
    mediaUrl,
    url: asset.nasa_id ? `https://images.nasa.gov/details/${encodeURIComponent(asset.nasa_id)}` : item.href,
    publishedAt: toIsoDate(asset.date_created, nowMs),
  });
};

const buildSmithsonianItem = async ({ fetchJson, nowMs, env, moderate }) => {
  const apiKey = env.SMITHSONIAN_API_KEY || env.DATA_GOV_API_KEY;
  if (!apiKey) return null;

  const query = 'nature OR animal OR botanical OR forest OR ocean';
  const url = `https://api.si.edu/openaccess/api/v1.0/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&rows=10&start=0`;
  const data = await fetchJson(url, { env });
  const rows = firstArrayValue(data?.response?.rows, data?.rows);
  const row = rows.find((candidate) => candidate?.content?.descriptiveNonRepeating?.title || candidate?.title);
  if (!row) return null;

  const content = row.content || {};
  const descriptive = content.descriptiveNonRepeating || {};
  const indexed = content.indexedStructured || {};
  const media = firstArrayValue(descriptive.online_media?.media, descriptive.media);
  const primaryMedia = media.find((candidate) => candidate?.content || candidate?.thumbnail || candidate?.resources?.[0]?.url) || {};
  const mediaUrl = primaryMedia.content || primaryMedia.thumbnail || primaryMedia.resources?.[0]?.url;
  const title = firstText(descriptive.title, row.title, 'Smithsonian open access nature record');
  const topic = firstArrayValue(indexed.topic, indexed.object_type)[0] || 'open access science';

  return moderate({
    id: `smithsonian-${row.id || title}`,
    kind: 'enrichment',
    source: 'smithsonian',
    category: 'culture',
    title,
    summary: `A Smithsonian Open Access ${normalizeWhitespace(topic).toLowerCase()} item selected for a calm daily wonder card.`,
    mediaType: mediaUrl ? 'image' : undefined,
    mediaUrl,
    url: descriptive.record_link || row.url,
    publishedAt: toIsoDate(row.lastModified || row.timestamp, nowMs),
  });
};

const buildNpsParkItem = async ({ fetchJson, nowMs, env, moderate }) => {
  if (!env.NPS_API_KEY) return null;

  const query = dayIndex(nowMs, npsQueries);
  const url = `https://developer.nps.gov/api/v1/parks?limit=10&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(env.NPS_API_KEY)}`;
  const data = await fetchJson(url, { env });
  const parks = firstArrayValue(data?.data);
  const park = parks.find((candidate) => candidate?.fullName && candidate?.description);
  if (!park) return null;

  const image = firstArrayValue(park.images)[0] || {};
  return moderate({
    id: `nps-${park.parkCode || park.id || park.fullName}`,
    kind: 'enrichment',
    source: 'nps',
    category: 'parks',
    title: park.fullName,
    summary: park.description,
    mediaType: image.url ? 'image' : undefined,
    mediaUrl: image.url,
    url: park.url,
    publishedAt: new Date(nowMs).toISOString(),
  });
};

export const buildProviderItems = async ({ fetchJson, nowMs, env, moderate }) => {
  const providerResults = await Promise.allSettled([
    buildNasaImageItem({ fetchJson, nowMs, env, moderate }),
    buildSmithsonianItem({ fetchJson, nowMs, env, moderate }),
    buildNpsParkItem({ fetchJson, nowMs, env, moderate }),
  ]);

  return providerResults
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter(Boolean)
    .map(moderate)
    .filter(Boolean);
};
