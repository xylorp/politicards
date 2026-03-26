/**
 * DetailPage.jsx — full legislator detail view
 * Shows the card + expanded stats + legisletter CTA
 */

import { useState, useEffect } from 'react';
import PolitiCard from './PolitiCard';

export default function DetailPage({ id, nav }) {
  const [card, setCard]   = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/data/cards/${id}.json`)
      .then(r => { if (!r.ok) throw new Error('Card not found'); return r.json(); })
      .then(setCard)
      .catch(e => setError(e.message));
  }, [id]);

  const PARTY_COLOR = { dem:'#1a6fb5', rep:'#c0392b', ind:'#4a7a4a' };
  const accent = card ? (PARTY_COLOR[card.partyColor] ?? '#c9a84c') : '#c9a84c';

  return (
    <div style={{ minHeight:'100vh', background:'#1a1510', fontFamily:'DM Sans,sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Nav */}
      <nav style={{ padding:'0 2rem', background:'rgba(26,21,16,0.95)', borderBottom:'1px solid #2a2018', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div onClick={nav.toLanding} style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:22, color:'#c9a84c', letterSpacing:4, cursor:'pointer' }}>POLITICARDS</div>
        <div style={{ display:'flex', gap:20 }}>
          <span onClick={nav.toSearch} style={{ fontSize:13, color:'#8a7a5a', cursor:'pointer' }}>Search</span>
          <span onClick={nav.toBrowse} style={{ fontSize:13, color:'#8a7a5a', cursor:'pointer' }}>Browse</span>
        </div>
      </nav>

      {error && (
        <div style={{ textAlign:'center', padding:'4rem', color:'#a83030' }}>
          <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:24, marginBottom:8 }}>CARD NOT FOUND</div>
          <div style={{ fontSize:13, color:'#6a5a3e', marginBottom:24 }}>{error}</div>
          <button onClick={nav.toBrowse} style={{ padding:'10px 20px', background:'transparent', border:'1px solid #4a3e28', borderRadius:8, color:'#8a7a5a', fontSize:13, fontFamily:'DM Sans,sans-serif', cursor:'pointer' }}>← Back to browse</button>
        </div>
      )}

      {card && (
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'3rem 1.5rem' }}>

          {/* Back link */}
          <button onClick={() => window.history.back()} style={{ marginBottom:'2rem', padding:'8px 14px', background:'transparent', border:'1px solid #2a2018', borderRadius:6, color:'#5a4e38', fontSize:12, fontFamily:'DM Sans,sans-serif', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
            ← Back
          </button>

          <div style={{ display:'flex', gap:'3rem', flexWrap:'wrap', alignItems:'flex-start' }}>

            {/* Left — card */}
            <div style={{ flex:'0 0 auto' }}>
              <PolitiCard bioguideId={id} />
            </div>

            {/* Right — expanded detail */}
            <div style={{ flex:'1 1 340px', minWidth:280 }}>

              <div style={{ marginBottom:'0.5rem', fontFamily:'DM Mono,monospace', fontSize:10, color:'#5a4e38', letterSpacing:2 }}>#{card.cardId}</div>
              <h1 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:48, color:'#f0ece0', letterSpacing:3, margin:'0 0 4px', lineHeight:1 }}>{card.name}</h1>
              <div style={{ fontSize:14, color:'#8a7a5a', marginBottom:'2rem' }}>{card.title} · {card.state} · {card.since}</div>

              {/* Rarity badge */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 14px', background:'#2a2018', borderRadius:99, border:'1px solid #3a3020', marginBottom:'2rem' }}>
                <div style={{ display:'flex', gap:3 }}>
                  {Array.from({length:5}).map((_,i)=>(
                    <div key={i} style={{ width:7,height:7,borderRadius:'50%',background:i<card.rarityDots?'#c9a84c':'#3a3020' }} />
                  ))}
                </div>
                <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#c9a84c', letterSpacing:2 }}>{card.rarityTier}</span>
              </div>

              {/* Stats grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'2rem' }}>
                {[
                  ['Years in office', card.yearsLabel],
                  ['Terms served',    card.termCount],
                  ['Bills sponsored', card.billsSponsored],
                  ['Co-sponsored',    card.billsCosponsored],
                  ['Bills enacted',   card.wins],
                  ['In committee',    card.losses],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{ background:'#1e1a14', border:'1px solid #2a2018', borderRadius:8, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, color:'#5a4e38', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>{lbl}</div>
                    <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:26, color:'#f0ece0', lineHeight:1 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Signature bill */}
              {card.sigTitle && (
                <div style={{ background:'#1e1a14', border:'1px solid #2a2018', borderRadius:10, padding:'1rem 1.25rem', marginBottom:'2rem' }}>
                  <div style={{ fontSize:10, color:'#5a4e38', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Signature Bill</div>
                  <div style={{ fontSize:14, color:'#f0ece0', fontWeight:500, lineHeight:1.5, marginBottom:8 }}>{card.sigTitle}</div>
                  {card.sigAction && (
                    <div style={{ fontSize:12, color: card.sigIsWin ? '#3a9a48' : '#c04040', fontWeight:500 }}>
                      {card.sigIsWin ? '✓ ENACTED' : '✗ ' + card.sigAction}
                    </div>
                  )}
                </div>
              )}

              {/* Legisletter CTA */}
              <a href={card.legisletterUrl} target="_blank" rel="noreferrer"
                style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'14px 24px', background:accent+'22', border:`1px solid ${accent}55`, borderRadius:10, textDecoration:'none', transition:'all 0.2s' }}
              >
                <div>
                  <div style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:16, color:accent, letterSpacing:2 }}>CONTACT {card.name.split(' ').pop().toUpperCase()}</div>
                  <div style={{ fontSize:11, color:'#5a4e38', marginTop:2 }}>View voting record & send a message on Legisletter ↗</div>
                </div>
              </a>

              <div style={{ marginTop:'1.5rem', fontSize:11, color:'#3a3028', lineHeight:1.7 }}>
                Data sourced from <a href="https://api.congress.gov" target="_blank" rel="noreferrer" style={{ color:'#5a4e38' }}>congress.gov API v3</a> (Library of Congress). Updated daily.
                <br/>Last synced: {new Date(card.syncedAt).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}