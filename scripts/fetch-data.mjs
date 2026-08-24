// Fetches fresh data from the public Fantasy Premier League API and writes it to data.json
// at the repo root. Runs in GitHub Actions (server-side, so no browser CORS issue) on a
// schedule, or manually via `node scripts/fetch-data.mjs`.

import { writeFileSync } from "node:fs";

const LEAGUE_ID = process.env.LEAGUE_ID || "754072";
const SEASON = process.env.SEASON || "2026/27";
const CONCURRENCY = 6;
const HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; fpl-league-tracker/1.0)" };

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStandings(leagueId) {
  let page = 1;
  let hasNext = true;
  let leagueMeta = null;
  const results = [];
  while (hasNext) {
    const data = await fetchJson(
      `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/?page_standings=${page}`
    );
    if (!leagueMeta) leagueMeta = data.league;
    results.push(...data.standings.results);
    hasNext = data.standings.has_next;
    page++;
  }
  return { leagueMeta, results };
}

async function fetchAllHistories(managers) {
  const points = {};
  let idx = 0;

  async function worker() {
    while (idx < managers.length) {
      const i = idx++;
      const m = managers[i];
      const hist = await fetchJson(
        `https://fantasy.premierleague.com/api/entry/${m.entry}/history/`
      );
      const p = {};
      for (const gw of hist.current) p[gw.event] = gw.points;
      points[m.entry] = p;
      await sleep(150); // be polite to the API
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return points;
}

async function main() {
  console.log(`Fetching bootstrap-static...`);
  const bootstrap = await fetchJson("https://fantasy.premierleague.com/api/bootstrap-static/");
  const events = bootstrap.events.map((e) => ({ id: e.id, deadline: e.deadline_time }));
  const currentEvent = bootstrap.events.find((e) => e.is_current)?.id ?? null;
  const playedEvents = bootstrap.events.filter((e) => e.finished).map((e) => e.id);

  console.log(`Fetching league ${LEAGUE_ID} standings...`);
  const { leagueMeta, results } = await fetchStandings(LEAGUE_ID);
  const managers = results.map((s) => ({
    entry: s.entry,
    team: s.entry_name,
    manager: s.player_name,
  }));
  console.log(`Found ${managers.length} managers. Fetching per-manager history...`);

  const points = await fetchAllHistories(managers);

  const output = {
    league: {
      id: Number(LEAGUE_ID),
      name: leagueMeta.name,
      season: SEASON,
      lastUpdated: new Date().toISOString(),
    },
    events,
    currentEvent,
    playedEvents,
    managers,
    points,
  };

  writeFileSync(new URL("../data.json", import.meta.url), JSON.stringify(output, null, 2) + "\n");
  console.log(
    `Wrote data.json — ${managers.length} managers, current GW ${currentEvent}, ${playedEvents.length} finished GWs.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
