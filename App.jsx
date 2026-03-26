/**
 * App.jsx — Politicards root
 * Handles routing between landing, search/browse, and detail pages.
 * Pure hash-based routing — no React Router needed, works with static hosting.
 *
 * Routes:
 *   /              → Landing
 *   /#search       → Search & browse
 *   /#browse       → All members paginated
 *   /#/id/W000817  → Card detail page
 */

import { useState, useEffect } from 'react';
import Landing from './Landing';
import SearchPage from './SearchPage';
import BrowsePage from './BrowsePage';
import DetailPage from './DetailPage';

function getRoute() {
  const hash = window.location.hash;
  if (!hash || hash === '#')       return { page: 'landing' };
  if (hash === '#search')          return { page: 'search' };
  if (hash === '#browse')          return { page: 'browse' };
  if (hash.startsWith('#/id/'))    return { page: 'detail', id: hash.replace('#/id/', '') };
  return { page: 'landing' };
}

export default function App() {
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const nav = {
    toSearch:  () => { window.location.hash = 'search';      },
    toBrowse:  () => { window.location.hash = 'browse';      },
    toDetail:  (id) => { window.location.hash = `/id/${id}`; },
    toLanding: () => { window.location.hash = '';            },
  };

  if (route.page === 'search') return <SearchPage nav={nav} />;
  if (route.page === 'browse') return <BrowsePage nav={nav} />;
  if (route.page === 'detail') return <DetailPage id={route.id} nav={nav} />;
  return <Landing nav={nav} />;
}