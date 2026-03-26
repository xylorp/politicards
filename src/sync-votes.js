/**
 * sync-votes.js — compute attendance, party-line, and bipartisan scores
 *
 * Sources:
 *   Senate: senate.gov/legislative/LIS/roll_call_votes/vote{congress}{session}/vote_{c}_{s}_{n}.xml
 *   House:  clerk.house.gov/evs/{year}/roll{n}.xml
 *   Bridge: senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml  (lis_member_id → bioguideId)
 *
 * Output: updates each public/data/cards/{id}.json with:
 *   attendanceScore  — % of eligible votes cast (0–100)
 *   partyLineScore   — % of votes with party majority (0–100)
 *   bipartisanScore  — % of contested votes crossing party lines (0–100)
 *
 * Run standalone or imported by sync.js:
 *   node sync-votes.js                  — current congress both chambers
 *   node sync-votes.js --chamber senate — senate only
 *   node sync-votes.js --chamber house  — house only
 *   node sync-votes.js --congress 118   — specific congress
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { parseStringPromise } from 'xml2js';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const CURRENT_CONGRESS = 119;
const CURRENT_SESSION  = 1;
const CARDS_DIR        = './public/data/cards';
const CONCURRENCY      = 8; // vote XML files are small, can go faster
const sleep = ms => new Promise(r => setTimeout(r, ms));

const argv    = process.argv.slice(2);
const arg     = key => { const i = argv.indexOf(`--${key}`); return i !== -1 ? argv[i + 1] ?? true : null; };
const CHAMBER = arg('chamber') ?? 'both';    // 'senate' | 'house' | 'both'
const CONGRESS = parseInt(arg('congress') ?? CURRENT_CONGRESS, 10);

// ─────────────────────────────────────────────────────────────────────────────
// XML fetch helper
// ─────────────────────────────────────────────────────────────────────────────

async function fetchXml(url, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      return parseStringPromise(text, { explicitArray: false, ignoreAttrs: false });
    } catch (err) {
      if (i === retries) return null;
      await sleep(1000 * i);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Concurrency pool
// ─────────────────────────────────────────────────────────────────────────────

async function pool(items, fn, concurrency) {
  const results = [];
  const queue   = [...items];
  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      try { results.push(await fn(item)); }
      catch (e) { results.push(null); }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results.filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Senate
// ─────────────────────────────────────────────────────────────────────────────

async function buildLisToBioguide() {
  console.log('  Fetching Senate member XML (lis_member_id → bioguideId map)...');
  const data = await fetchXml('https://www.senate.gov/legislative/LIS_MEMBER/cvc_member_data.xml');
  if (!data) throw new Error('Could not fetch Senate member data');

  const map = {};
  const senators = data.senators.senator;
  const list = Array.isArray(senators) ? senators : [senators];
  for (const s of list) {
    const lisId  = s.$.lis_member_id ?? s['lis_member_id'];
    const bioId  = s.bioguideId;
    const party  = s.party;
    if (lisId && bioId) map[lisId] = { bioguideId: bioId, party };
  }
  console.log(`  Mapped ${Object.keys(map).length} senators`);
  return map;
}

async function getSenateVoteCount(congress, session) {
  // Fetch the vote list page to find the highest vote number
  const url = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.htm`;
  try {
    const res  = await fetch(url);
    const text = await res.text();
    // Vote numbers appear as "vote_NNN_1_00XXX" links — find the max
    const matches = [...text.matchAll(/vote_\d+_\d+_(\d+)\.xml/g)];
    if (!matches.length) return 0;
    return Math.max(...matches.map(m => parseInt(m[1], 10)));
  } catch {
    return 0;
  }
}

async function processSenateVotes(congress, session, lisToBioguide) {
  const totalVotes = await getSenateVoteCount(congress, session);
  if (!totalVotes) { console.log('  No Senate votes found'); return {}; }
  console.log(`  Processing ${totalVotes} Senate votes (congress ${congress}, session ${session})...`);

  // Per-member tallies: { bioguideId: { cast, eligible, withParty, contested, crossParty } }
  const tallies = {};

  const init = (id) => {
    if (!tallies[id]) tallies[id] = { cast: 0, eligible: 0, withParty: 0, contested: 0, crossParty: 0 };
  };

  let done = 0;
  const voteNums = Array.from({ length: totalVotes }, (_, i) => i + 1);

  await pool(voteNums, async (num) => {
    const padded = String(num).padStart(5, '0');
    const url    = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.xml`;
    const xml    = await fetchXml(url);
    if (!xml) return;

    const vote  = xml.roll_call_vote;
    if (!vote)  return;

    // Get members array
    const membersEl = vote.members?.member;
    if (!membersEl) return;
    const members = Array.isArray(membersEl) ? membersEl : [membersEl];

    // Determine majority position per party for this vote
    const partyCounts = { D: { Yea: 0, Nay: 0 }, R: { Yea: 0, Nay: 0 }, I: { Yea: 0, Nay: 0 } };
    for (const m of members) {
      const lisId = m.lis_member_id;
      const info  = lisToBioguide[lisId];
      if (!info) continue;
      const vc = m.vote_cast?.toUpperCase();
      if (vc === 'YEA' || vc === 'NAY') {
        if (partyCounts[info.party]) partyCounts[info.party][vc === 'YEA' ? 'Yea' : 'Nay']++;
      }
    }

    const partyMajority = {};
    for (const [party, counts] of Object.entries(partyCounts)) {
      if (counts.Yea > 0 || counts.Nay > 0) {
        partyMajority[party] = counts.Yea >= counts.Nay ? 'YEA' : 'NAY';
      }
    }

    // Is this a contested vote? (both parties not voting unanimously together)
    const dMaj = partyMajority['D'];
    const rMaj = partyMajority['R'];
    const isContested = dMaj && rMaj && dMaj !== rMaj;

    for (const m of members) {
      const lisId   = m.lis_member_id;
      const info    = lisToBioguide[lisId];
      if (!info) continue;

      const bioId   = info.bioguideId;
      const party   = info.party;
      const vc      = m.vote_cast?.toUpperCase();

      init(bioId);
      tallies[bioId].eligible++;

      if (vc === 'YEA' || vc === 'NAY') {
        tallies[bioId].cast++;
        const majority = partyMajority[party];
        if (majority) {
          if (vc === majority) tallies[bioId].withParty++;
          if (isContested) {
            tallies[bioId].contested++;
            if (vc !== majority) tallies[bioId].crossParty++;
          }
        }
      }
    }

    done++;
    if (done % 50 === 0 || done === totalVotes) {
      process.stdout.write(`\r    Senate: ${done}/${totalVotes} votes processed`);
    }
  }, CONCURRENCY);

  console.log('');
  return tallies;
}

// ─────────────────────────────────────────────────────────────────────────────
// House
// ─────────────────────────────────────────────────────────────────────────────

async function getHouseVoteCount(year) {
  // House vote index is at clerk.house.gov/evs/{year}/index.asp
  try {
    const res  = await fetch(`https://clerk.house.gov/evs/${year}/index.asp`);
    const text = await res.text();
    const matches = [...text.matchAll(/roll(\d+)\.xml/g)];
    if (!matches.length) return 0;
    return Math.max(...matches.map(m => parseInt(m[1], 10)));
  } catch {
    return 0;
  }
}

async function processHouseVotes(year) {
  const totalVotes = await getHouseVoteCount(year);
  if (!totalVotes) { console.log(`  No House votes found for ${year}`); return {}; }
  console.log(`  Processing ${totalVotes} House votes (${year})...`);

  const tallies = {};
  const init = (id) => {
    if (!tallies[id]) tallies[id] = { cast: 0, eligible: 0, withParty: 0, contested: 0, crossParty: 0 };
  };

  let done = 0;
  const voteNums = Array.from({ length: totalVotes }, (_, i) => i + 1);

  await pool(voteNums, async (num) => {
    const padded = String(num).padStart(3, '0');
    const url    = `https://clerk.house.gov/evs/${year}/roll${padded}.xml`;
    const xml    = await fetchXml(url);
    if (!xml) return;

    const voteData = xml['rollcall-vote']?.['vote-data'];
    const voteMeta = xml['rollcall-vote']?.['vote-metadata'];
    if (!voteData || !voteMeta) return;

    const recordedVotes = voteData['recorded-vote'];
    if (!recordedVotes) return;
    const votes = Array.isArray(recordedVotes) ? recordedVotes : [recordedVotes];

    // Determine majority per party
    const partyCounts = {};
    for (const v of votes) {
      const bioId = v.legislator?.$?.['bioguide-id'] ?? v.legislator?.$?.['name-id'];
      const party = v.legislator?.$?.party;
      const vc    = v.vote?._?.toUpperCase() ?? v.vote?.toUpperCase();
      if (!bioId || !party) continue;
      if (!partyCounts[party]) partyCounts[party] = { Yea: 0, Nay: 0 };
      if (vc === 'YEA' || vc === 'AYE') partyCounts[party].Yea++;
      if (vc === 'NAY' || vc === 'NO')  partyCounts[party].Nay++;
    }

    const partyMajority = {};
    for (const [party, counts] of Object.entries(partyCounts)) {
      if (counts.Yea > 0 || counts.Nay > 0) {
        partyMajority[party] = counts.Yea >= counts.Nay ? 'YEA' : 'NAY';
      }
    }

    const dMaj = partyMajority['D'];
    const rMaj = partyMajority['R'];
    const isContested = dMaj && rMaj && dMaj !== rMaj;

    for (const v of votes) {
      const bioId = v.legislator?.$?.['bioguide-id'] ?? v.legislator?.$?.['name-id'];
      const party = v.legislator?.$?.party;
      const vc    = (v.vote?._?.toUpperCase() ?? v.vote?.toUpperCase() ?? '');
      if (!bioId || !party) continue;

      init(bioId);
      tallies[bioId].eligible++;

      const isYea = vc === 'YEA' || vc === 'AYE';
      const isNay = vc === 'NAY' || vc === 'NO';

      if (isYea || isNay) {
        tallies[bioId].cast++;
        const voteNorm  = isYea ? 'YEA' : 'NAY';
        const majority  = partyMajority[party];
        if (majority) {
          if (voteNorm === majority) tallies[bioId].withParty++;
          if (isContested) {
            tallies[bioId].contested++;
            if (voteNorm !== majority) tallies[bioId].crossParty++;
          }
        }
      }
    }

    done++;
    if (done % 50 === 0 || done === totalVotes) {
      process.stdout.write(`\r    House: ${done}/${totalVotes} votes processed`);
    }
  }, CONCURRENCY);

  console.log('');
  return tallies;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compute scores from tallies
// ─────────────────────────────────────────────────────────────────────────────

function computeScores(tally) {
  if (!tally || tally.eligible === 0) return { attendanceScore: null, partyLineScore: null, bipartisanScore: null };

  const attendance  = Math.round((tally.cast / tally.eligible) * 100);
  const partyLine   = tally.cast > 0 ? Math.round((tally.withParty / tally.cast) * 100) : null;
  const bipartisan  = tally.contested > 0 ? Math.round((tally.crossParty / tally.contested) * 100) : null;

  return {
    attendanceScore:  attendance,
    partyLineScore:   partyLine,
    bipartisanScore:  bipartisan,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Update card JSON files with computed scores
// ─────────────────────────────────────────────────────────────────────────────

async function updateCards(tallies) {
  const ids = Object.keys(tallies);
  console.log(`\n  Updating ${ids.length} card files...`);

  let updated = 0;
  for (const bioId of ids) {
    const path = `${CARDS_DIR}/${bioId}.json`;
    if (!existsSync(path)) continue;

    try {
      const card   = JSON.parse(await readFile(path, 'utf8'));
      const scores = computeScores(tallies[bioId]);
      Object.assign(card, scores, { votesSyncedAt: new Date().toISOString() });
      await writeFile(path, JSON.stringify(card, null, 2));
      updated++;
    } catch (e) {
      console.error(`  Error updating ${bioId}:`, e.message);
    }
  }

  console.log(`  Updated ${updated} cards`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export async function syncVotes(congress = CURRENT_CONGRESS, session = CURRENT_SESSION, chamber = 'both') {
  const startTime = Date.now();
  console.log(`\nVotes sync — congress ${congress}, session ${session}, chamber: ${chamber}`);

  const allTallies = {};
  const merge = (tallies) => {
    for (const [id, t] of Object.entries(tallies)) {
      if (!allTallies[id]) allTallies[id] = { cast: 0, eligible: 0, withParty: 0, contested: 0, crossParty: 0 };
      for (const key of Object.keys(t)) allTallies[id][key] += t[key];
    }
  };

  if (chamber === 'senate' || chamber === 'both') {
    const lisToBioguide = await buildLisToBioguide();
    const senateTallies = await processSenateVotes(congress, session, lisToBioguide);
    merge(senateTallies);
  }

  if (chamber === 'house' || chamber === 'both') {
    // House votes indexed by year — congress 119 started Jan 2025
    const startYear = 2025 + (congress - 119) * 2;
    for (let year = startYear; year <= new Date().getFullYear(); year++) {
      const houseTallies = await processHouseVotes(year);
      merge(houseTallies);
    }
  }

  await updateCards(allTallies);

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`\nVotes sync complete in ${elapsed}s`);
  console.log(`  ${Object.keys(allTallies).length} members tallied`);
}

// Run standalone
if (process.argv[1].endsWith('sync-votes.js')) {
  syncVotes(CONGRESS, CURRENT_SESSION, CHAMBER).catch(err => {
    console.error('[FATAL]', err.message);
    process.exit(1);
  });
}