/**
 * Landing.jsx — Politicards hero page
 * First thing visitors see. Explains the concept, shows featured cards,
 * drives them to search or browse.
 */

import { useState, useEffect } from 'react';
import PolitiCard from './PolitiCard';

// Featured members — a bipartisan cross-section to show range
const FEATURED = [
  'S000033',  // Bernie Sanders — IND legend
  'C001035',  // Susan Collins — GOP veteran
  'O000172',  // AOC — DEM rising star
];

const STATS = [
  { val: '538',    lbl: 'Members of Congress' },
  { val: '100%',   lbl: 'Official data'        },
  { val: 'Daily',  lbl: 'Data refresh'         },
  { val: 'Free',   lbl: 'Always'               },
];

export default function Landing({ nav }) {
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Cycle through featured cards every 4s
    const t = setInterval(() => setFeaturedIdx(i => (i + 1) % FEATURED.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#1a1510', fontFamily: 'DM Sans, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float  { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes pulse  { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        .fade-up   { animation: fadeUp 0.7s cubic-bezier(.4,0,.2,1) both; }
        .delay-1   { animation-delay: 0.1s; }
        .delay-2   { animation-delay: 0.2s; }
        .delay-3   { animation-delay: 0.35s; }
        .delay-4   { animation-delay: 0.5s; }
        .floating  { animation: float 5s ease-in-out infinite; }
        .nav-link:hover { color: #c9a84c !important; }
        .cta-primary:hover  { background: #d4b05a !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(201,168,76,0.3) !important; }
        .cta-secondary:hover { border-color: #c9a84c !important; color: #c9a84c !important; transform: translateY(-2px); }
        .stat-card:hover { border-color: #c9a84c44 !important; }
        .feature-card:hover { border-color: #c9a84c44 !important; transform: translateY(-4px); }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 2rem',
        background: scrolled ? 'rgba(26,21,16,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
        borderBottom: scrolled ? '1px solid #2a2018' : 'none',
        transition: 'all 0.3s',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 60,
      }}>
        <div
          onClick={nav.toLanding}
          style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 24, color: '#c9a84c', letterSpacing: 4, cursor: 'pointer' }}
        >
          POLITICARDS
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <span className="nav-link" onClick={nav.toSearch} style={{ fontSize: 13, color: '#8a7a5a', cursor: 'pointer', transition: 'color 0.2s' }}>Search</span>
          <span className="nav-link" onClick={nav.toBrowse} style={{ fontSize: 13, color: '#8a7a5a', cursor: 'pointer', transition: 'color 0.2s' }}>Browse All</span>
          <span
            className="cta-primary"
            onClick={nav.toSearch}
            style={{ fontSize: 12, fontWeight: 500, color: '#1a1510', background: '#c9a84c', padding: '7px 16px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Find your rep
          </span>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '80px 2rem 4rem',
        background: 'radial-gradient(ellipse at 30% 50%, #2a1f10 0%, #1a1510 60%)',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Background texture */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'repeating-linear-gradient(45deg,white 0px,white 1px,transparent 0px,transparent 50%)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />

        {/* Glow */}
        <div style={{ position: 'absolute', top: '20%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap' }}>

          {/* Left — copy */}
          <div style={{ flex: '1 1 420px', minWidth: 300 }}>
            <div className="fade-up" style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: 3, color: '#c9a84c', textTransform: 'uppercase', marginBottom: 16, opacity: 0.8 }}>
              Politics, demystified
            </div>

            <h1 className="fade-up delay-1" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(52px, 8vw, 88px)', color: '#f0ece0', letterSpacing: 4, lineHeight: 0.95, margin: '0 0 24px' }}>
              EVERY<br />
              <span style={{ color: '#c9a84c' }}>LEGISLATOR.</span><br />
              ONE CARD.
            </h1>

            <p className="fade-up delay-2" style={{ fontSize: 16, color: '#8a7a5a', lineHeight: 1.7, maxWidth: 440, margin: '0 0 36px' }}>
              Real voting records, bill history, and legislative stats for all 538 members of Congress — presented as trading cards. No spin. No editorializing. Just the data.
            </p>

            <div className="fade-up delay-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="cta-primary"
                onClick={nav.toSearch}
                style={{ padding: '12px 28px', background: '#c9a84c', border: 'none', borderRadius: 8, color: '#1a1510', fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', letterSpacing: '0.5px', transition: 'all 0.2s' }}
              >
                Find your rep
              </button>
              <button
                className="cta-secondary"
                onClick={nav.toBrowse}
                style={{ padding: '12px 28px', background: 'transparent', border: '1px solid #4a3e28', borderRadius: 8, color: '#8a7a5a', fontSize: 14, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', letterSpacing: '0.5px', transition: 'all 0.2s' }}
              >
                Browse all 538
              </button>
            </div>

            {/* Stats row */}
            <div className="fade-up delay-4" style={{ display: 'flex', gap: 24, marginTop: 48, flexWrap: 'wrap' }}>
              {STATS.map(({ val, lbl }) => (
                <div key={lbl}>
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9a84c', letterSpacing: 2, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: 11, color: '#5a4e38', letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — rotating featured card */}
          <div className="fade-up delay-2" style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
            <div className="floating" style={{ filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.5))' }}>
              <PolitiCard key={FEATURED[featuredIdx]} bioguideId={FEATURED[featuredIdx]} />
            </div>
          </div>
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{ padding: '6rem 2rem', background: '#16120e' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: 3, color: '#c9a84c', marginBottom: 12 }}>HOW IT WORKS</div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 42, color: '#f0ece0', letterSpacing: 3, margin: 0 }}>THE CARD SYSTEM</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              { icon: '◈', title: 'Rarity tiers',      body: 'From Freshman to Legend — based purely on seniority and leadership roles. No ideology involved.' },
              { icon: '◎', title: 'Neutral stats',      body: 'Attendance, bills sponsored, co-sponsorships. Behavioural data only — you decide what it means.' },
              { icon: '◉', title: 'Real data',          body: 'Pulled daily from the official congress.gov API (Library of Congress). Primary source, no middlemen.' },
              { icon: '◐', title: 'Take action',        body: 'Every card links to Legisletter so you can contact your rep directly about the votes that matter to you.' },
            ].map(({ icon, title, body }) => (
              <div key={title} className="feature-card" style={{ background: '#1e1a14', border: '1px solid #2a2018', borderRadius: 12, padding: '1.5rem', transition: 'all 0.2s' }}>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 28, color: '#c9a84c', marginBottom: 12, opacity: 0.7 }}>{icon}</div>
                <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: '#f0ece0', letterSpacing: 1, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#6a5a3e', lineHeight: 1.7 }}>{body}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Neutrality pledge ── */}
      <div style={{ padding: '5rem 2rem', background: '#1a1510', borderTop: '1px solid #2a2018', borderBottom: '1px solid #2a2018' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 11, letterSpacing: 3, color: '#c9a84c', marginBottom: 16 }}>OUR COMMITMENT</div>
          <blockquote style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(28px, 4vw, 42px)', color: '#f0ece0', letterSpacing: 2, lineHeight: 1.2, margin: '0 0 24px' }}>
            "WE DON'T TELL YOU WHAT TO THINK. WE GIVE YOU THE FACTS."
          </blockquote>
          <p style={{ fontSize: 14, color: '#6a5a3e', lineHeight: 1.8, margin: '0 0 32px' }}>
            Every stat on every card is sourced from official government records. Wins and losses reflect legislative outcomes — not political opinions. A bill passed or it didn't. A vote was cast or it wasn't.
          </p>
          <button
            className="cta-secondary"
            onClick={nav.toBrowse}
            style={{ padding: '11px 28px', background: 'transparent', border: '1px solid #4a3e28', borderRadius: 8, color: '#8a7a5a', fontSize: 13, fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Browse all members →
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 18, color: '#3a3028', letterSpacing: 4, marginBottom: 8 }}>POLITICARDS</div>
        <div style={{ fontSize: 11, color: '#3a3028', lineHeight: 1.8 }}>
          Data from <a href="https://api.congress.gov" target="_blank" rel="noreferrer" style={{ color: '#5a4e38' }}>congress.gov API v3</a> (Library of Congress) · Updated daily
          <br />
          Action links via <a href="https://legisletter.org" target="_blank" rel="noreferrer" style={{ color: '#5a4e38' }}>Legisletter.org</a>
        </div>
      </div>
    </div>
  );
}