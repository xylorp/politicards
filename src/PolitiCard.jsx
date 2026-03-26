/**
 * PolitiCard.jsx
 *
 * Reads pre-built card data from /data/cards/{bioguideId}.json
 * Data is generated nightly by sync.js — zero live API calls from visitors.
 *
 * Props:
 *   bioguideId  {string}   Required. e.g. 'W000817'
 *   onFlip      {function} Optional. Called when card flips.
 */

import { useState, useEffect } from 'react';

async function loadCardData(bioguideId) {
  const res = await fetch(`/data/cards/${bioguideId}.json`);
  if (!res.ok) throw new Error(`Card data not found for ${bioguideId}. Has the sync run?`);
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function RarityDots({ count }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: i < count ? '#c9a84c' : 'rgba(255,255,255,0.2)',
        }} />
      ))}
    </div>
  );
}

function AttendanceBar({ value }) {
  if (value == null) return <ComingSoon label="Attendance" />;
  const color = value >= 90 ? '#2d7a3a' : value >= 75 ? '#BA7517' : '#a83030';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#8a7a5a', fontWeight: 600 }}>Attendance</span>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color, lineHeight: 1 }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: '#e8e2d0', borderRadius: 4, border: '1px solid #d4c9a8', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, color: '#a83030' }}>0%</span>
        <span style={{ fontSize: 9, color: '#8a7a5a' }}>avg 94%</span>
        <span style={{ fontSize: 9, color: '#2d7a3a' }}>100%</span>
      </div>
    </div>
  );
}

function BipartisanBar({ value }) {
  if (value == null) return <ComingSoon label="Bipartisan" />;
  const tealColor = value > 30 ? '#1D9E75' : value > 15 ? '#5DCAA5' : '#9FE1CB';
  const textColor = value > 30 ? '#0F6E56' : value > 15 ? '#1D9E75' : '#5a4e38';
  const desc = value > 30 ? 'frequent crossover' : value > 15 ? 'of contested votes' : 'rarely crosses lines';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#8a7a5a', fontWeight: 600 }}>Crosses party lines</span>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: textColor, lineHeight: 1 }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: '#e8e2d0', borderRadius: 4, border: '1px solid #d4c9a8', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: tealColor, borderRadius: 4, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, color: '#8a7a5a' }}>Party-loyal</span>
        <span style={{ fontSize: 9, color: textColor }}>{desc}</span>
        <span style={{ fontSize: 9, color: '#0F6E56' }}>Bipartisan</span>
      </div>
    </div>
  );
}

function PartySpectrum({ value, partyColor }) {
  if (value == null) return <ComingSoon label="Party alignment" />;
  let dotLeft, dotColor;
  if (partyColor === 'dem') {
    dotLeft = Math.max(2, Math.min(48, 50 - (value - 50) * 0.9));
    dotColor = '#1a6fb5';
  } else if (partyColor === 'rep') {
    dotLeft = Math.max(52, Math.min(98, 50 + (value - 50) * 0.9));
    dotColor = '#c0392b';
  } else {
    dotLeft = 50;
    dotColor = '#4a7a4a';
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#8a7a5a', fontWeight: 600 }}>Party alignment</span>
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: '#4a3e28', lineHeight: 1 }}>{value}%</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, position: 'relative', margin: '4px 0 2px' }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 5, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, background: '#1a6fb5', opacity: 0.25 }} />
          <div style={{ width: 2, background: '#d4c9a8', flexShrink: 0 }} />
          <div style={{ flex: 1, background: '#c0392b', opacity: 0.25 }} />
        </div>
        <div style={{ width: 14, height: 14, borderRadius: '50%', position: 'absolute', top: '50%', left: `${dotLeft}%`, transform: 'translate(-50%, -50%)', background: dotColor, border: '2px solid #f9f7f2', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left 0.4s cubic-bezier(.4,0,.2,1)', zIndex: 2 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, letterSpacing: 1, fontWeight: 600, color: '#1a6fb5' }}>DEM</span>
        <span style={{ fontSize: 9, color: '#8a7a5a' }}>Center</span>
        <span style={{ fontSize: 9, letterSpacing: 1, fontWeight: 600, color: '#c0392b' }}>GOP</span>
      </div>
    </div>
  );
}

function ComingSoon({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#8a7a5a', fontWeight: 600, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: '#e8e2d0', borderRadius: 4, border: '1px solid #d4c9a8', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
        <span style={{ fontSize: 9, color: '#b0a080', letterSpacing: 1 }}>No voting history</span>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ width: 340, borderRadius: 18, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.15)', border: '2px solid #d4c9a8' }}>
        <div style={{ height: 160, background: '#ddd8c8' }} />
        <div style={{ background: '#f9f7f2', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[60, 12, 12, 12, 1, 52, 70].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 6, background: 'linear-gradient(90deg,#f0ece0 25%,#e8e2d0 50%,#f0ece0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
          ))}
        </div>
      </div>
    </>
  );
}

function ErrorCard({ message, bioguideId }) {
  return (
    <div style={{ width: 340, borderRadius: 18, background: '#f9f7f2', border: '2px solid #e8bebe', padding: 32, textAlign: 'center', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: 13, color: '#a83030', fontWeight: 500, marginBottom: 8 }}>Card not available</div>
      <div style={{ fontSize: 11, color: '#8a7a5a', lineHeight: 1.6, marginBottom: 12 }}>{message}</div>
      <div style={{ fontSize: 10, color: '#b0a080', fontFamily: 'DM Mono, monospace' }}>{bioguideId}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const PARTY_GRADIENT = {
  dem: 'linear-gradient(135deg, #1a3a5c 0%, #1a6fb5 60%, #4a9fd4 100%)',
  rep: 'linear-gradient(135deg, #5c1a1a 0%, #c0392b 60%, #e05a4a 100%)',
  ind: 'linear-gradient(135deg, #2a3a2a 0%, #4a7a4a 60%, #6a9a6a 100%)',
};

export default function PolitiCard({ bioguideId, onFlip }) {
  const [card,    setCard]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!bioguideId) { setError('No bioguideId provided'); setLoading(false); return; }
    setLoading(true); setError(null); setCard(null);
    loadCardData(bioguideId)
      .then(d  => { setCard(d);          setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [bioguideId]);

  if (loading) return <Skeleton />;
  if (error)   return <ErrorCard message={error} bioguideId={bioguideId} />;
  if (!card)   return null;

  const handleFlip = () => { const n = !flipped; setFlipped(n); onFlip?.(n); };

  const cardBase = {
    width: 340, borderRadius: 18, overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)',
    border: '2px solid #d4c9a8', cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif', userSelect: 'none',
    transition: 'transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');
        .politicard:hover { transform: translateY(-4px) rotateY(2deg) !important; box-shadow: 0 16px 60px rgba(0,0,0,0.22) !important; }
      `}</style>

      {/* ── FRONT ── */}
      {!flipped && (
        <div className="politicard" style={{ ...cardBase, background: '#f9f7f2' }} onClick={handleFlip}>

          <div style={{ height: 160, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
            <div style={{ position: 'absolute', inset: 0, background: PARTY_GRADIENT[card.partyColor] }} />
            <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'repeating-linear-gradient(45deg,white 0px,white 1px,transparent 0px,transparent 50%)', backgroundSize: '12px 12px' }} />

            <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <RarityDots count={card.rarityDots} />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, letterSpacing: '1.5px', color: '#c9a84c', textTransform: 'uppercase' }}>{card.rarityTier}</span>
            </div>

            <div style={{ position: 'absolute', top: 14, right: 14, fontFamily: 'Bebas Neue, sans-serif', fontSize: 11, letterSpacing: 2, padding: '4px 10px', borderRadius: 4, color: 'white', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
              {card.partyAbbr}
            </div>

            <div style={{ position: 'relative', zIndex: 2, padding: '0 20px 16px', display: 'flex', alignItems: 'flex-end', gap: 14, width: '100%' }}>
              {card.depiction ? (
                <img src={card.depiction} alt={card.name} style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.6)', objectFit: 'cover', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Bebas Neue, sans-serif', fontSize: 26, color: 'white', flexShrink: 0 }}>
                  {card.initials}
                </div>
              )}
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: 'white', letterSpacing: 1, lineHeight: 1, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{card.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.5px', marginTop: 3, fontWeight: 500 }}>{card.title}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { val: card.yearsLabel,      lbl: 'Years'        },
                { val: card.billsSponsored,  lbl: 'Sponsored'    },
                { val: card.billsCosponsored,lbl: 'Co-sponsored' },
              ].map(({ val, lbl }) => (
                <div key={lbl} style={{ background: '#f0ece0', borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: '1px solid #d4c9a8' }}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#2c2416', lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 9, letterSpacing: 1, color: '#8a7a5a', textTransform: 'uppercase', marginTop: 3, fontWeight: 500 }}>{lbl}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AttendanceBar value={card.attendanceScore} />
              <BipartisanBar value={card.bipartisanScore} />
              <PartySpectrum value={card.partyLineScore} partyColor={card.partyColor} />
            </div>

            <div style={{ height: 1, background: '#d4c9a8', opacity: 0.5 }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: '#e8f5ea', border: '1px solid #b8dfc0', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#2d7a3a', lineHeight: 1 }}>{card.wins}</div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', color: '#3a9a48', textTransform: 'uppercase' }}>Bills Passed</div>
              </div>
              <div style={{ flex: 1, background: '#f9eaea', border: '1px solid #e8bebe', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, color: '#a83030', lineHeight: 1 }}>{card.losses}</div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', color: '#c04040', textTransform: 'uppercase' }}>In Committee</div>
              </div>
            </div>

            {card.sigTitle && (
              <div style={{ background: '#f0ece0', border: '1px solid #d4c9a8', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#8a7a5a', fontWeight: 600, marginBottom: 4 }}>Signature Bill</div>
                <div style={{ fontSize: 11, color: '#2c2416', fontWeight: 500, lineHeight: 1.4, marginBottom: 4 }}>
                  {card.sigTitle.length > 90 ? card.sigTitle.slice(0, 90) + '…' : card.sigTitle}
                </div>
                {card.sigAction && (
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', color: card.sigIsWin ? '#2d7a3a' : '#a83030' }}>
                    {card.sigIsWin ? '✓ ENACTED' : '✗ ' + card.sigAction.slice(0, 50) + (card.sigAction.length > 50 ? '…' : '')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: '10px 18px', borderTop: '1px solid #d4c9a8', background: '#f0ece0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#8a7a5a', letterSpacing: 1 }}>#{card.cardId}</div>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 13, letterSpacing: 2, color: '#4a3e28', padding: '2px 8px', background: '#f9f7f2', border: '1px solid #d4c9a8', borderRadius: 4 }}>{card.state}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#8a7a5a' }}>{card.since}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 0 8px', fontSize: 9, color: '#b0a080', letterSpacing: 1 }}>TAP TO FLIP</div>
        </div>
      )}

      {/* ── BACK ── */}
      {flipped && (
        <div className="politicard" style={{ ...cardBase, background: '#2c2416', border: '2px solid #4a3e28' }} onClick={handleFlip}>
          <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'repeating-linear-gradient(45deg,#2c2416,#2c2416 10px,#332a1c 10px,#332a1c 20px)' }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 40, color: '#c9a84c', letterSpacing: 6, opacity: 0.5 }}>POLITICARDS</div>
          </div>

          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, color: '#c9a84c', letterSpacing: 2, marginBottom: 4 }}>Full record</div>
            {[
              ['Name',          card.name],
              ['Party',         card.party],
              ['State',         card.state],
              ['Role',          card.title],
              ['Terms served',  card.termCount],
              ['In office',     card.since],
              ['Sponsored',     `${card.billsSponsored} bills`],
              ['Co-sponsored',  `${card.billsCosponsored} bills`],
              ['Passed',        `${card.wins} bills enacted`],
              ['Rarity',        `${card.rarityTier} (${'★'.repeat(card.rarityDots)}${'☆'.repeat(5 - card.rarityDots)})`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '0.5px solid #3a3020', paddingBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#7a6a4a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#f0ece0', fontWeight: 500, maxWidth: 180, textAlign: 'right' }}>{value}</span>
              </div>
            ))}
            <a
              href={card.legisletterUrl}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, padding: '9px 0', background: '#3a3020', border: '1px solid #c9a84c44', borderRadius: 8, color: '#c9a84c', fontSize: 12, fontWeight: 500, textDecoration: 'none', letterSpacing: '0.5px' }}
            >
              View on Legisletter ↗
            </a>
            <div style={{ fontSize: 9, color: '#4a4030', textAlign: 'center', letterSpacing: 1, marginTop: 4 }}>
              DATA: CONGRESS.GOV API V3 · LIBRARY OF CONGRESS
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 0 8px', fontSize: 9, color: '#4a4030', letterSpacing: 1 }}>TAP TO FLIP BACK</div>
        </div>
      )}
    </>
  );
}