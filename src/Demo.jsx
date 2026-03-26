/**
 * Demo page — politicards.com
 * Search by name or state, browse cards, click through to legisletter.org
 */

import { useState, useEffect, useRef } from 'react';
import PolitiCard from './PolitiCard';

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC','PR','VI','GU','MP','AS',
];

const STATE_NAMES = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',
  CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',
  HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',
  KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',
  MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',
  OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',
  SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',
  VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
  DC:'Washington DC',PR:'Puerto Rico',VI:'Virgin Islands',GU:'Guam',
  MP:'Northern Mariana Islands',AS:'American Samoa',
};

function legisletterUrl(name, bioguideId) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return `https://legisletter.org/legislator/${slug}-${bioguideId}/votes`;
}

async function searchMembers(query, state) {
  // Read from pre-built local index — no API calls, instant search
  const res = await fetch('/data/members.json');
  if (!res.ok) throw new Error('Member index not found. Has the sync run? (node sync.js)');
  const allMembers = await res.json();

  return allMembers.filter(m => {
    const nicknames = { bernie: "bernard", bill: "william", bob: "robert", joe: "joseph", jim: "james", mike: "michael", dick: "richard", chuck: "charles", tom: "thomas", ted: "edward" };
    const q = query.toLowerCase().trim();
    const nameMatch = !q || (m.name ?? "").toLowerCase().includes(q) || (nicknames[q] && (m.name ?? "").toLowerCase().includes(nicknames[q]));
    const stateMatch = !state || (m.state ?? '').toLowerCase().startsWith(STATE_NAMES[state]?.toLowerCase() ?? state.toLowerCase());
    return nameMatch && stateMatch;
  });
}

function LinkedCard({ member }) {
  const [hovered, setHovered] = useState(false);

  const rawName = member.name ?? '';
  const parts = rawName.split(',').map(s => s.trim());
  const displayName = parts.length >= 2
    ? `${parts[1].split(' ')[0]} ${parts[0]}`
    : rawName;
  const url = legisletterUrl(displayName, member.bioguideId);

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <PolitiCard bioguideId={member.bioguideId} />

      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0) 100%)',
          borderRadius: '0 0 18px 18px',
          padding: '40px 16px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.2s',
          pointerEvents: hovered ? 'auto' : 'none',
          textDecoration: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, color: '#c9a84c', letterSpacing: '0.5px' }}>
          View on Legisletter
        </span>
        <span style={{ fontSize: 12, color: '#c9a84c' }}>↗</span>
      </a>
    </div>
  );
}

export default function Demo() {
  const [query, setQuery]       = useState('');
  const [state, setState]       = useState('');
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [searched, setSearched] = useState(false);
  const debounceRef             = useRef(null);


  useEffect(() => {
    if (!query.trim() && !state) {
      setMembers([]);
      setSearched(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await searchMembers(query, state);
        setMembers(results);
        setSearched(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, state]);

  return (
    <div style={{ minHeight: '100vh', background: '#1a1510', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 1rem 4rem', gap: '2rem', fontFamily: 'DM Sans, sans-serif' }}>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, color: '#c9a84c', letterSpacing: 6, lineHeight: 1 }}>POLITICARDS</div>
        <div style={{ fontSize: 12, color: '#6a5a3e', letterSpacing: 3, marginTop: 4 }}>REAL DATA · CONGRESS.GOV API</div>
      </div>

      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 560, flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 200 }}>
          <input
            type="text"
            placeholder="Search by name (e.g. Collins, Bernie, Warren…)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 38px', background: '#2a2018', border: '1px solid #4a3e28', borderRadius: 8, color: '#f0ece0', fontSize: 13, fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#c9a84c'}
            onBlur={e => e.target.style.borderColor = '#4a3e28'}
          />
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="#c9a84c" strokeWidth="1.5"/>
            <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <select
          value={state}
          onChange={e => setState(e.target.value)}
          style={{ flex: '0 1 160px', padding: '10px 12px', background: '#2a2018', border: '1px solid #4a3e28', borderRadius: 8, color: state ? '#f0ece0' : '#6a5a3e', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', outline: 'none' }}
        >
          <option value="">All states</option>
          {STATES.map(s => (
            <option key={s} value={s}>{s} — {STATE_NAMES[s]}</option>
          ))}
        </select>

        {(query || state) && (
          <button
            onClick={() => { setQuery(''); setState(''); }}
            style={{ padding: '10px 14px', background: 'transparent', border: '1px solid #4a3e28', borderRadius: 8, color: '#6a5a3e', fontSize: 12, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer' }}
          >
            Clear
          </button>
        )}
      </div>

      {loading && <div style={{ fontSize: 12, color: '#6a5a3e', letterSpacing: 1 }}>Searching…</div>}
      {error   && <div style={{ fontSize: 12, color: '#c04040' }}>Error: {error}</div>}
      {searched && !loading && (
        <div style={{ fontSize: 12, color: '#6a5a3e' }}>
          {members.length === 0
            ? 'No members found — try a different name or state'
            : `${members.length} member${members.length !== 1 ? 's' : ''} found`}
        </div>
      )}

      {!searched && !loading && (
        <div style={{ textAlign: 'center', color: '#4a3e28', maxWidth: 360, lineHeight: 1.8, paddingTop: '2rem' }}>
          <div style={{ fontSize: 11, letterSpacing: 1, color: '#3a3028' }}>Search by name or select a state to browse cards</div>
          <div style={{ fontSize: 10, marginTop: 8, color: '#2a2820' }}>Hover any card to visit their Legisletter page</div>
        </div>
      )}

      {members.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center', maxWidth: 1200, width: '100%' }}>
          {members.map(m => (
            <LinkedCard key={m.bioguideId} member={m} />
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: '#3a3028', textAlign: 'center', maxWidth: 400, lineHeight: 1.8, marginTop: 'auto', paddingTop: '2rem' }}>
        Data from <a href="https://api.congress.gov" target="_blank" rel="noreferrer" style={{ color: '#6a5a3e' }}>congress.gov API v3</a> (Library of Congress). Free, official, non-partisan.
        {' '}Action links via <a href="https://legisletter.org" target="_blank" rel="noreferrer" style={{ color: '#6a5a3e' }}>Legisletter.org</a>.
      </div>
    </div>
  );
}