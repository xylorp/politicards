/**
 * SearchPage.jsx — search and filter members of Congress
 */

import { useState, useEffect, useRef } from 'react';
import PolitiCard from './PolitiCard';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','PR','VI','GU','MP','AS'];
const STATE_NAMES = {AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'Washington DC',PR:'Puerto Rico',VI:'Virgin Islands',GU:'Guam',MP:'Northern Mariana Islands',AS:'American Samoa'};
const NICKNAMES = {bernie:'bernard',bill:'william',bob:'robert',joe:'joseph',jim:'james',mike:'michael',dick:'richard',chuck:'charles',tom:'thomas',ted:'edward',liz:'elizabeth',al:'albert',alex:'alexander'};

function LinkedCard({ member, nav }) {
  const [hovered, setHovered] = useState(false);
  const parts = (member.name ?? '').split(',').map(s => s.trim());
  const displayName = parts.length >= 2 ? `${parts[1].split(' ')[0]} ${parts[0]}` : member.name;
  const legisletterUrl = `https://legisletter.org/legislator/${displayName.toLowerCase().replace(/[^a-z\s]/g,'').trim().replace(/\s+/g,'-')}-${member.bioguideId}/votes`;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div onClick={() => nav.toDetail(member.bioguideId)} style={{ cursor: 'pointer' }}>
        <PolitiCard bioguideId={member.bioguideId} />
      </div>
      <a href={legisletterUrl} target="_blank" rel="noreferrer"
        style={{ position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0) 100%)',borderRadius:'0 0 18px 18px',padding:'40px 16px 16px',display:'flex',alignItems:'center',justifyContent:'center',gap:8,opacity:hovered?1:0,transition:'opacity 0.2s',pointerEvents:hovered?'auto':'none',textDecoration:'none' }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ fontFamily:'DM Sans,sans-serif',fontSize:12,fontWeight:500,color:'#c9a84c',letterSpacing:'0.5px' }}>View on Legisletter ↗</span>
      </a>
    </div>
  );
}

export default function SearchPage({ nav }) {
  const [query, setQuery]     = useState('');
  const [state, setState]     = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim() && !state) { setMembers([]); setSearched(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/data/members.json');
        const all = await res.json();
        const q   = query.toLowerCase().trim();
        const alt = NICKNAMES[q] ?? null;
        const fullState = (STATE_NAMES[state] ?? '').toLowerCase();
        setMembers(all.filter(m => {
          const name      = (m.name ?? '').toLowerCase();
          const nameMatch = !q || name.includes(q) || (alt && name.includes(alt));
          const stateMatch = !state || (m.state ?? '').toLowerCase() === fullState;
          return nameMatch && stateMatch;
        }));
        setSearched(true);
      } finally { setLoading(false); }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, state]);

  return (
    <div style={{ minHeight:'100vh', background:'#1a1510', fontFamily:'DM Sans,sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Nav */}
      <nav style={{ padding:'0 2rem', background:'rgba(26,21,16,0.95)', borderBottom:'1px solid #2a2018', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div onClick={nav.toLanding} style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, color:'#c9a84c', letterSpacing:4, cursor:'pointer' }}>POLITICARDS</div>
        <div style={{ display:'flex', gap:20 }}>
          <span onClick={nav.toBrowse} style={{ fontSize:13, color:'#8a7a5a', cursor:'pointer' }}>Browse all</span>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'3rem 1.5rem' }}>
        <div style={{ textAlign:'center', marginBottom:'2rem' }}>
          <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, color:'#f0ece0', letterSpacing:3, marginBottom:4 }}>FIND A LEGISLATOR</div>
          <div style={{ fontSize:13, color:'#5a4e38' }}>Search by name or filter by state</div>
        </div>

        {/* Search bar */}
        <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap', marginBottom:'1.5rem' }}>
          <div style={{ position:'relative', flex:'1 1 300px', maxWidth:420 }}>
            <input type="text" placeholder="Name (e.g. Collins, Bernie, Warren…)" value={query} onChange={e=>setQuery(e.target.value)}
              style={{ width:'100%', padding:'11px 14px 11px 40px', background:'#2a2018', border:'1px solid #4a3e28', borderRadius:8, color:'#f0ece0', fontSize:14, fontFamily:'DM Sans,sans-serif', outline:'none', boxSizing:'border-box' }}
              onFocus={e=>e.target.style.borderColor='#c9a84c'} onBlur={e=>e.target.style.borderColor='#4a3e28'} />
            <svg style={{ position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',opacity:0.4 }} width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="#c9a84c" strokeWidth="1.5"/>
              <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <select value={state} onChange={e=>setState(e.target.value)}
            style={{ flex:'0 1 180px', padding:'11px 12px', background:'#2a2018', border:'1px solid #4a3e28', borderRadius:8, color:state?'#f0ece0':'#6a5a3e', fontSize:13, fontFamily:'DM Sans,sans-serif', cursor:'pointer', outline:'none' }}>
            <option value="">All states</option>
            {STATES.map(s => <option key={s} value={s}>{s} — {STATE_NAMES[s]}</option>)}
          </select>
          {(query||state) && (
            <button onClick={()=>{setQuery('');setState('');}} style={{ padding:'11px 16px', background:'transparent', border:'1px solid #4a3e28', borderRadius:8, color:'#6a5a3e', fontSize:13, fontFamily:'DM Sans,sans-serif', cursor:'pointer' }}>Clear</button>
          )}
        </div>

        {/* Status */}
        {loading  && <div style={{ textAlign:'center', color:'#6a5a3e', fontSize:13, marginBottom:'1rem' }}>Searching…</div>}
        {searched && !loading && (
          <div style={{ textAlign:'center', color:'#5a4e38', fontSize:12, marginBottom:'2rem' }}>
            {members.length === 0 ? 'No members found' : `${members.length} member${members.length!==1?'s':''} found`}
          </div>
        )}

        {/* Empty state */}
        {!searched && !loading && (
          <div style={{ textAlign:'center', color:'#3a3028', paddingTop:'4rem' }}>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:18, letterSpacing:2, marginBottom:8 }}>START SEARCHING</div>
            <div style={{ fontSize:12 }}>Or <span onClick={nav.toBrowse} style={{ color:'#c9a84c', cursor:'pointer' }}>browse all 538 members →</span></div>
          </div>
        )}

        {/* Results grid */}
        {members.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'2rem', justifyContent:'center' }}>
            {members.map(m => <LinkedCard key={m.bioguideId} member={m} nav={nav} />)}
          </div>
        )}
      </div>
    </div>
  );
}