/**
 * BrowsePage.jsx — paginated grid of all 538 members
 */

import { useState, useEffect } from 'react';
import PolitiCard from './PolitiCard';

const PAGE_SIZE = 12;
const PARTY_FILTERS = ['All', 'Democratic', 'Republican', 'Independent'];
const CHAMBER_FILTERS = ['All', 'Senate', 'House'];

export default function BrowsePage({ nav }) {
  const [all, setAll]           = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage]         = useState(0);
  const [party, setParty]       = useState('All');
  const [chamber, setChamber]   = useState('All');
  const [sortBy, setSortBy]     = useState('seniority');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch('/data/members.json')
      .then(r => r.json())
      .then(data => { setAll(data); setLoading(false); });
  }, []);

  useEffect(() => {
    let result = [...all];

    if (party !== 'All')   result = result.filter(m => (m.partyName ?? '').includes(party));
    if (chamber !== 'All') result = result.filter(m => {
      const terms = Array.isArray(m.terms) ? m.terms : (m.terms?.item ?? []);
      const ch = chamber === 'Senate' ? 'Senate' : 'House of Representatives';
      return terms.some(t => t.chamber === ch);
    });

    if (sortBy === 'seniority') {
      result.sort((a, b) => {
        const aYear = Math.min(...(Array.isArray(a.terms) ? a.terms : (a.terms?.item ?? [])).map(t => parseInt(t.startYear)||9999));
        const bYear = Math.min(...(Array.isArray(b.terms) ? b.terms : (b.terms?.item ?? [])).map(t => parseInt(t.startYear)||9999));
        return aYear - bYear;
      });
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    } else if (sortBy === 'state') {
      result.sort((a, b) => (a.state ?? '').localeCompare(b.state ?? ''));
    }

    setFiltered(result);
    setPage(0);
  }, [all, party, chamber, sortBy]);

  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
  const pageMembers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const btnStyle = (active) => ({
    padding: '7px 16px', borderRadius: 6, fontSize: 12, fontFamily: 'DM Sans,sans-serif',
    cursor: 'pointer', transition: 'all 0.15s',
    background: active ? '#c9a84c' : 'transparent',
    border: `1px solid ${active ? '#c9a84c' : '#3a3020'}`,
    color: active ? '#1a1510' : '#6a5a3e',
    fontWeight: active ? 600 : 400,
  });

  return (
    <div style={{ minHeight:'100vh', background:'#1a1510', fontFamily:'DM Sans,sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Nav */}
      <nav style={{ padding:'0 2rem', background:'rgba(26,21,16,0.95)', borderBottom:'1px solid #2a2018', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div onClick={nav.toLanding} style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, color:'#c9a84c', letterSpacing:4, cursor:'pointer' }}>POLITICARDS</div>
        <span onClick={nav.toSearch} style={{ fontSize:13, color:'#8a7a5a', cursor:'pointer' }}>Search</span>
      </nav>

      <div style={{ maxWidth:1300, margin:'0 auto', padding:'3rem 1.5rem' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:12, marginBottom:'2rem' }}>
          <div>
            <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, color:'#f0ece0', letterSpacing:3, lineHeight:1 }}>ALL MEMBERS</div>
            <div style={{ fontSize:12, color:'#5a4e38', marginTop:4 }}>{loading ? '…' : `${filtered.length} members`}</div>
          </div>

          {/* Filters */}
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {/* Party */}
            <div style={{ display:'flex', gap:4 }}>
              {PARTY_FILTERS.map(p => (
                <button key={p} onClick={() => setParty(p)} style={btnStyle(party===p)}>
                  {p === 'Democratic' ? 'DEM' : p === 'Republican' ? 'GOP' : p === 'Independent' ? 'IND' : p}
                </button>
              ))}
            </div>
            <div style={{ width:1, height:24, background:'#2a2018' }} />
            {/* Chamber */}
            <div style={{ display:'flex', gap:4 }}>
              {CHAMBER_FILTERS.map(c => (
                <button key={c} onClick={() => setChamber(c)} style={btnStyle(chamber===c)}>{c}</button>
              ))}
            </div>
            <div style={{ width:1, height:24, background:'#2a2018' }} />
            {/* Sort */}
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
              style={{ padding:'7px 10px', background:'#2a2018', border:'1px solid #3a3020', borderRadius:6, color:'#6a5a3e', fontSize:12, fontFamily:'DM Sans,sans-serif', cursor:'pointer', outline:'none' }}>
              <option value="seniority">By seniority</option>
              <option value="name">By name</option>
              <option value="state">By state</option>
            </select>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign:'center', color:'#5a4e38', padding:'4rem', fontSize:13 }}>Loading members…</div>
        )}

        {/* Card grid */}
        {!loading && (
          <>
            <div style={{ display:'flex', flexWrap:'wrap', gap:'1.5rem', justifyContent:'center', marginBottom:'3rem' }}>
              {pageMembers.map(m => (
                <div key={m.bioguideId} onClick={() => nav.toDetail(m.bioguideId)} style={{ cursor:'pointer' }}>
                  <PolitiCard bioguideId={m.bioguideId} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, flexWrap:'wrap' }}>
                <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page===0}
                  style={{ ...btnStyle(false), opacity: page===0 ? 0.3 : 1 }}>← Prev</button>

                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  const p = totalPages <= 7 ? i
                    : page < 4 ? i
                    : page > totalPages-5 ? totalPages-7+i
                    : page-3+i;
                  return (
                    <button key={p} onClick={() => setPage(p)} style={btnStyle(page===p)}>{p+1}</button>
                  );
                })}

                <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page===totalPages-1}
                  style={{ ...btnStyle(false), opacity: page===totalPages-1 ? 0.3 : 1 }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}