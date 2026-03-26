/**
 * politicards — production nightly sync
 *
 * Fetches ALL data needed for every politicard and saves it as static JSON.
 * Run nightly via cron — visitors never touch the congress.gov API directly.
 *
 * Cron: 0 3 * * * cd /www/wwwroot/xylorp.com/politik && node sync.js >> logs/sync.log 2>&1
 *
 * Output structure:
 *   public/data/members.json          — lightweight index (535 entries, for search)
 *   public/data/cards/{id}.json       — full card data per member
 *   public/data/sync-manifest.json    — last sync time, counts, errors
 *
 * Usage:
 *   node sync.js                      — full sync
 *   node sync.js --id W000817         — single member (test)
 *   node sync.js --chamber Senate     — one chamber only
 *   node sync.js --force              — re-fetch even if synced today
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { syncVotes } from './sync-votes.js';
import { existsSync } from 'node:fs';

const API_BASE    = 'https://api.congress.gov/v3';
const API_KEY     = process.env.CONGRESS_API_KEY;
const CONCURRENCY = 4;   // parallel member fetches — conservative to stay under rate limit
const BILLS_LIMIT = 250; // max per page (API maximum)

const OUT_DIR      = './public/data';
const CARDS_DIR    = `${OUT_DIR}/cards`;
const MEMBERS_FILE = `${OUT_DIR}/members.json`;
const MANIFEST     = `${OUT_DIR}/sync-manifest.json`;

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const arg  = key => {
  const i = argv.indexOf(`--${key}`);
  return i !== -1 ? argv[i + 1] ?? true : null;
};

const SINGLE_ID     = arg('id');
const FILTER_CHAMBER = arg('chamber');
const FORCE         = arg('force') !== null;

// ─────────────────────────────────────────────────────────────────────────────
// API fetch with retry + rate limit handling
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch(path, params = {}, retries = 3) {
  if (!API_KEY) throw new Error('CONGRESS_API_KEY env var not set');

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('format', 'json');
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));

  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url.toString());

    if (res.status === 429) {
      const wait = attempt * 30_000;
      console.warn(`\n  Rate limited, waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }

    if (res.status === 404) return null; // member not found — skip gracefully

    if (!res.ok) {
      if (attempt === retries) throw new Error(`API ${res.status} on ${path}`);
      await sleep(2000 * attempt);
      continue;
    }

    return res.json();
  }
}

// Paginate through ALL pages of a list endpoint
async function fetchAllPages(path, dataKey, params = {}) {
  const results = [];
  let offset = 0;

  while (true) {
    const data = await apiFetch(path, { ...params, limit: BILLS_LIMIT, offset });
    if (!data) break;

    const items = data[dataKey] ?? [];
    results.push(...items);

    const total = data.pagination?.count ?? items.length;
    offset += BILLS_LIMIT;
    if (offset >= total || items.length === 0) break;
  }

  return results;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency pool
// ─────────────────────────────────────────────────────────────────────────────

async function pool(items, fn, concurrency) {
  const errors  = [];
  const results = [];
  const queue   = [...items];

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      try {
        results.push(await fn(item));
      } catch (err) {
        errors.push({ item, message: err.message });
        results.push(null);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  return { results, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rarity
// ─────────────────────────────────────────────────────────────────────────────

function computeRarity(terms, leadership) {
  const termCount  = terms.length;
  const isLeader   = (leadership ?? []).length > 0;
  const startYears = terms.map(t => parseInt(t.startYear, 10)).filter(y => !isNaN(y));
  const earliest   = startYears.length ? Math.min(...startYears) : new Date().getFullYear();
  const years      = new Date().getFullYear() - earliest;

  const tier =
    termCount >= 10 || isLeader ? { tier: 'Legend',    dots: 5 } :
    termCount >= 6              ? { tier: 'Stalwart',  dots: 4 } :
    termCount >= 3              ? { tier: 'Veteran',   dots: 3 } :
    termCount >= 2              ? { tier: 'Sophomore', dots: 2 } :
                                  { tier: 'Freshman',  dots: 1 };

  return { ...tier, years, termCount, earliestYear: earliest };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build one card — this is the expensive part, runs nightly not per-visitor
// ─────────────────────────────────────────────────────────────────────────────

async function buildCard(bioguideId) {
  // Fetch member detail + ALL sponsored legislation in parallel
  const [memberData, allSponsored] = await Promise.all([
    apiFetch(`/member/${bioguideId}`),
    fetchAllPages(`/member/${bioguideId}/sponsored-legislation`, 'sponsoredLegislation'),
  ]);

  if (!memberData) throw new Error(`Member ${bioguideId} not found`);

  const member     = memberData.member;
  const terms      = Array.isArray(member.terms) ? member.terms : (member.terms?.item ?? []);
  const latestTerm = terms[terms.length - 1] ?? {};
  const rarity     = computeRarity(terms, member.leadership);

  // ── Party ──────────────────────────────────────────────────────────────
  const partyName  = member.partyHistory?.[0]?.partyName ?? latestTerm.party ?? 'Unknown';
  const partyAbbr  = partyName.startsWith('R') ? 'GOP'
                   : partyName.startsWith('D') ? 'DEM' : 'IND';
  const partyColor = partyName.startsWith('R') ? 'rep'
                   : partyName.startsWith('D') ? 'dem' : 'ind';

  // ── State ──────────────────────────────────────────────────────────────
  const stateCode = latestTerm.stateCode
    ?? latestTerm.state
    ?? member.state
    ?? 'XX';

  // ── Title ──────────────────────────────────────────────────────────────
  const chamber  = latestTerm.chamber ?? '';
  const district = latestTerm.district;
  const title    = chamber === 'Senate'                   ? 'U.S. Senator'
                 : district && district !== 0             ? `U.S. Rep. · District ${district}`
                 : chamber === 'House of Representatives' ? 'U.S. Rep. · At Large'
                 : 'Member of Congress';

  // ── Bills — now we have ALL of them, not just 50 ───────────────────────
  const enacted = allSponsored.filter(b => {
    const t = b.latestAction?.text?.toLowerCase() ?? '';
    return t.includes('became public law') ||
           t.includes('signed by president') ||
           t.includes('enacted');
  });

  const stalled = allSponsored.filter(b => {
    const t = b.latestAction?.text?.toLowerCase() ?? '';
    return t.includes('referred to') && !enacted.includes(b);
  });

  // Signature bill — most recent enacted, or most recent with any noteworthy action
  const sigBill = enacted[0] ?? allSponsored.find(b =>
    b.latestAction?.text && !b.latestAction.text.toLowerCase().includes('referred to')
  ) ?? allSponsored[0];

  // ── Legisletter URL ────────────────────────────────────────────────────
  const firstName   = member.firstName ?? '';
  const lastName    = member.lastName  ?? '';
  const nameSlug    = `${firstName} ${lastName}`
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const legisletterUrl = `https://legisletter.org/legislator/${nameSlug}-${bioguideId}/bills`;

  return {
    // Identity
    bioguideId,
    name:        member.directOrderName ?? `${firstName} ${lastName}`,
    initials:    `${(firstName[0] ?? '')}${(lastName[0] ?? '')}`.toUpperCase(),
    title,
    state:       stateCode.toUpperCase(),
    party:       partyName,
    partyAbbr,
    partyColor,
    since:       rarity.years > 0 ? `Since ${rarity.earliestYear}` : 'New member',
    cardId:      `${partyAbbr}-${stateCode.toUpperCase()}-${bioguideId}`,
    depiction:   member.depiction?.imageUrl ?? null,
    legisletterUrl,

    // Rarity
    rarityTier:  rarity.tier,
    rarityDots:  rarity.dots,
    yearsServed: rarity.years,
    termCount:   rarity.termCount,

    // Stats — all accurate now that we have full bill history
    yearsLabel:      rarity.years > 0 ? rarity.years : '< 1',
    billsSponsored:  allSponsored.length,
    billsCosponsored: member.cosponsoredLegislation?.count ?? 0,
    billsPassed:     enacted.length,
    billsStalled:    stalled.length,

    // Wins / Losses
    wins:   enacted.length,
    losses: stalled.length,

    // Phase 2 — votes API
    attendanceScore: null,
    partyLineScore:  null,
    bipartisanScore: null,

    // Signature bill
    sigTitle:  sigBill?.title ?? null,
    sigAction: sigBill?.latestAction?.text ?? null,
    sigIsWin:  sigBill ? enacted.includes(sigBill) : false,

    // Metadata
    syncedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!API_KEY) {
    console.error('ERROR: CONGRESS_API_KEY environment variable not set.');
    console.error('  export CONGRESS_API_KEY=your_key_here');
    process.exit(1);
  }

  await mkdir(CARDS_DIR, { recursive: true });
  await mkdir('./logs', { recursive: true });

  const startTime = Date.now();
  console.log(`\n[${new Date().toISOString()}] Politicards sync starting...`);

  // ── Single member mode ─────────────────────────────────────────────────
  if (SINGLE_ID) {
    console.log(`\nSingle member mode: ${SINGLE_ID}`);
    const card = await buildCard(SINGLE_ID);
    await writeFile(`${CARDS_DIR}/${SINGLE_ID}.json`, JSON.stringify(card, null, 2));
    console.log(`Saved → ${CARDS_DIR}/${SINGLE_ID}.json`);
    console.log(`  Name:        ${card.name}`);
    console.log(`  Rarity:      ${card.rarityTier} (${'★'.repeat(card.rarityDots)})`);
    console.log(`  Years:       ${card.yearsLabel}`);
    console.log(`  Sponsored:   ${card.billsSponsored}`);
    console.log(`  Passed:      ${card.billsPassed}`);
    console.log(`  Legisletter: ${card.legisletterUrl}`);
    return;
  }

  // ── Fetch full member list ─────────────────────────────────────────────
  console.log('\nFetching member list...');
  let allMembers = [];
  let offset = 0;

  while (true) {
    const data = await apiFetch('/member', { limit: 250, offset, currentMember: true });
    const page = data?.members ?? [];
    allMembers = allMembers.concat(page);
    const total = data?.pagination?.count ?? page.length;
    offset += 250;
    if (offset >= total || page.length === 0) break;
  }

  // Filter by chamber if requested
  if (FILTER_CHAMBER) {
    allMembers = allMembers.filter(m =>
      m.terms?.item?.some(t => t.chamber === FILTER_CHAMBER) ||
      (Array.isArray(m.terms) && m.terms.some(t => t.chamber === FILTER_CHAMBER))
    );
  }

  console.log(`  Found ${allMembers.length} members`);

  // Save lightweight member index for the search/browse page
  const memberIndex = allMembers.map(m => ({
    bioguideId:  m.bioguideId,
    name:        m.name,
    state:       m.state,
    partyName:   m.partyName,
    district:    m.district ?? null,
    depiction:   m.depiction?.imageUrl ?? null,
  }));

  await writeFile(MEMBERS_FILE, JSON.stringify(memberIndex, null, 2));
  console.log(`  Saved member index → ${MEMBERS_FILE}`);

  // ── Check if already synced today (skip unless --force) ───────────────
  if (!FORCE && existsSync(MANIFEST)) {
    const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
    const lastSync = new Date(manifest.syncedAt);
    const today    = new Date();
    if (lastSync.toDateString() === today.toDateString()) {
      console.log(`\nAlready synced today (${manifest.syncedAt}). Use --force to re-sync.`);
      return;
    }
  }

  // ── Build all cards ────────────────────────────────────────────────────
  console.log(`\nBuilding ${allMembers.length} cards (${CONCURRENCY} at a time)...`);
  console.log('This paginate ALL bills per member — takes 5–10 minutes, that is normal.\n');

  let done = 0;
  const ids = allMembers.map(m => m.bioguideId);

  const { errors } = await pool(ids, async (id) => {
    const card = await buildCard(id);
    await writeFile(`${CARDS_DIR}/${id}.json`, JSON.stringify(card, null, 2));
    done++;
    process.stdout.write(`\r  ${done}/${ids.length} — ${card.name.padEnd(35)} `);
    return card;
  }, CONCURRENCY);

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  // ── Write manifest ─────────────────────────────────────────────────────
  const manifest = {
    syncedAt:     new Date().toISOString(),
    memberCount:  ids.length,
    successCount: ids.length - errors.length,
    errorCount:   errors.length,
    elapsedSecs:  elapsed,
    errors:       errors.map(e => ({ id: e.item, message: e.message })),
  };

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));

  console.log(`\n\n✓ Sync complete in ${elapsed}s`);
  console.log(`  ${manifest.successCount} cards built successfully`);
  if (errors.length) {
    console.warn(`  ${errors.length} errors:`);
    errors.forEach(e => console.warn(`    ${e.item}: ${e.message}`));
  }
  console.log(`\n  Data ready at: ${OUT_DIR}/`);
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});