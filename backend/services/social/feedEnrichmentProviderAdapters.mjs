const nasaImageQueries = [
  'earth from space',
  'nebula galaxy stars',
  'ocean earth observation',
  'forest earth observation',
  'moon horizon',
];

const commonsQueries = [
  { query: 'featured picture bird', category: 'nature' },
  { query: 'featured picture flower', category: 'nature' },
  { query: 'featured picture waterfall', category: 'nature' },
  { query: 'featured picture forest', category: 'nature' },
  { query: 'featured picture ocean', category: 'nature' },
  { query: 'featured picture wildlife animal', category: 'nature' },
];

const npsQueries = [
  'waterfall',
  'forest',
  'valley',
  'stargazing',
  'ocean',
];

const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const stripHtml = (value) => normalizeWhitespace(String(value || '').replace(/<[^>]*>/g, ' '));

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

const uniqueItems = (items) => items
  .filter(Boolean)
  .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);

const roundRobinGroups = (groups, limit = 10) => {
  const output = [];
  let index = 0;
  while (output.length < limit && groups.some((group) => group[index])) {
    groups.forEach((group) => {
      if (output.length < limit && group[index]) output.push(group[index]);
    });
    index += 1;
  }
  return output;
};

const buildNasaImageItems = async ({ fetchJson, nowMs, env, moderate }) => {
  const query = dayIndex(nowMs, nasaImageQueries);
  const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=12`;
  const data = await fetchJson(url, { env });
  const collectionItems = firstArrayValue(data?.collection?.items);
  const imageItems = collectionItems.filter((candidate) => candidate?.data?.[0]?.title && candidate?.links?.[0]?.href);

  return uniqueItems(imageItems.slice(0, 5).map((item, index) => {
    const asset = item.data[0] || {};
    const mediaUrl = item.links.find((link) => link?.render === 'image' && link?.href)?.href || item.links[0]?.href;
    const nasaId = firstText(asset.nasa_id, item.href, asset.title, index).replace(/[^a-z0-9_-]+/gi, '-').slice(0, 80);

    return moderate({
      id: `nasa-images-${nasaId || `${nowMs}-${index}`}`,
      kind: 'enrichment',
      source: 'nasa-images',
      category: 'space',
      title: asset.title,
      summary: firstText(asset.description_508, asset.description, 'A NASA Image and Video Library moment for a wider view.'),
      mediaType: 'image',
      mediaUrl,
      url: asset.nasa_id ? `https://images.nasa.gov/details/${encodeURIComponent(asset.nasa_id)}` : item.href,
      publishedAt: toIsoDate(asset.date_created, nowMs - index * 60_000),
    });
  }));
};

const buildCommonsNatureItems = async ({ fetchJson, nowMs, env, moderate }) => {
  const { query, category } = dayIndex(nowMs, commonsQueries);
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: '12',
    gsrsearch: query,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1200',
    origin: '*',
  });
  const url = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
  const data = await fetchJson(url, { env });
  const pages = Object.values(data?.query?.pages || {});

  return uniqueItems(pages
    .map((page, index) => {
      const imageInfo = firstArrayValue(page?.imageinfo)[0] || {};
      const metadata = imageInfo.extmetadata || {};
      const mediaUrl = imageInfo.thumburl || imageInfo.url;
      const title = stripHtml(metadata.ObjectName?.value) || normalizeWhitespace(page?.title).replace(/^File:/i, '');
      const license = stripHtml(metadata.LicenseShortName?.value);
      const credit = stripHtml(metadata.Artist?.value || metadata.Credit?.value);
      const description = stripHtml(metadata.ImageDescription?.value);
      const sourceLabel = [credit, license].filter(Boolean).join(' / ');

      if (!mediaUrl || !title || !sourceLabel) return null;

      return moderate({
        id: `wikimedia-commons-${page.pageid || title}`,
        kind: 'enrichment',
        source: 'wikimedia-commons',
        category,
        title,
        summary: firstText(description, `Open nature image from Wikimedia Commons. Credit: ${sourceLabel}`),
        mediaType: 'image',
        mediaUrl,
        url: imageInfo.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        publishedAt: toIsoDate(imageInfo.timestamp, nowMs - index * 60_000),
      });
    })
    .filter(Boolean)
    .slice(0, 5));
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
    buildNasaImageItems({ fetchJson, nowMs, env, moderate }),
    buildCommonsNatureItems({ fetchJson, nowMs, env, moderate }),
    buildSmithsonianItem({ fetchJson, nowMs, env, moderate }),
    buildNpsParkItem({ fetchJson, nowMs, env, moderate }),
  ]);

  const groups = providerResults
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter(Boolean)
    .map((value) => (Array.isArray(value) ? value : [value]))
    .map((items) => items.map(moderate).filter(Boolean));

  return roundRobinGroups(groups, 10);
};
