import { FaChartLine, FaCoins, FaCrown, FaCrosshairs, FaMedal, FaTrophy, FaUsers } from 'react-icons/fa'
import PageHeader from '../components/PageHeader'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { useFixtures } from '../context/FixturesContext'
import { formatCurrency } from '../utils/formatCurrency'

const STATS_STYLES = `
  .stats-page {
    width: min(1400px, calc(100% - 48px));
    margin: 0 auto;
    padding: 34px 0 80px;
  }

  .stats-page .page-header {
    margin-bottom: 24px;
  }

  .stats-page .page-header h1 {
    margin: 0 0 9px;
    color: #f7f7f5;
    font: 900 clamp(3.6rem, 6vw, 5.6rem)/.86 'Barlow Condensed', sans-serif;
    letter-spacing: -.035em;
    text-transform: uppercase;
  }

  .stats-page .page-header p {
    max-width: 680px;
    margin: 0;
    color: #969aa2;
    font-size: .88rem;
    line-height: 1.55;
  }

  /* KPI strip */
  .stats-page .stats-kpis {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
    margin: 20px 0 18px;
  }

  .stats-page .stats-kpi {
    position: relative;
    min-height: 132px;
    padding: 20px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    background:
      radial-gradient(circle at 92% 4%, rgba(255,48,72,.09), transparent 32%),
      linear-gradient(145deg, #17181b, #0b0c0e);
    box-shadow: 0 16px 38px rgba(0,0,0,.24), inset 0 1px rgba(255,255,255,.025);
  }

  .stats-page .stats-kpi::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 3px;
    height: 100%;
    background: #ff3048;
  }

  .stats-page .stats-kpi-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    margin-bottom: 16px;
    color: #ff3048;
    border: 1px solid rgba(255,48,72,.22);
    border-radius: 8px;
    background: rgba(255,48,72,.06);
    box-sizing: border-box;
  }

  .stats-page .stats-kpi-label {
    display: block;
    color: #81868e;
    font-size: .60rem;
    font-weight: 900;
    letter-spacing: .10em;
    text-transform: uppercase;
  }

  .stats-page .stats-kpi-value {
    display: block;
    margin-top: 6px;
    color: #fff;
    font: 900 2.25rem/1 'Barlow Condensed', sans-serif;
  }

  .stats-page .stats-kpi-sub {
    display: block;
    margin-top: 6px;
    color: #6f747c;
    font-size: .63rem;
  }

  /* Leader + auction overview */
  .stats-page .stats-feature-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr);
    gap: 14px;
    margin-bottom: 18px;
  }

  .stats-page .stats-feature-card,
  .stats-page .stats-panel {
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    background:
      linear-gradient(145deg, #17181b, #0b0c0e);
    box-shadow: 0 18px 42px rgba(0,0,0,.26), inset 0 1px rgba(255,255,255,.025);
  }

  .stats-page .stats-feature-card {
    position: relative;
    min-height: 190px;
    padding: 24px;
    overflow: hidden;
  }

  .stats-page .stats-feature-card::after {
    content: "";
    position: absolute;
    right: -54px;
    top: -58px;
    width: 180px;
    height: 180px;
    border: 1px solid rgba(255,48,72,.14);
    border-radius: 50%;
    box-shadow: 0 0 0 24px rgba(255,48,72,.018), 0 0 0 48px rgba(255,48,72,.01);
  }

  .stats-page .eyebrow {
    color: #ff3048 !important;
    font-size: .60rem;
    font-weight: 900;
    letter-spacing: .11em;
  }

  .stats-page .stats-feature-card h2 {
    margin: 10px 0 7px;
    color: #fff;
    font: 900 clamp(2rem, 4vw, 3.4rem)/.88 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
  }

  .stats-page .stats-feature-card p {
    margin: 0;
    color: #92979f;
    font-size: .72rem;
  }

  .stats-page .stats-feature-metrics {
    position: relative;
    z-index: 1;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 22px;
  }

  .stats-page .stats-feature-metric {
    min-width: 92px;
    padding: 9px 11px;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 7px;
    background: rgba(255,255,255,.018);
  }

  .stats-page .stats-feature-metric span {
    display: block;
    color: #767c84;
    font-size: .54rem;
    font-weight: 900;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .stats-page .stats-feature-metric strong {
    display: block;
    margin-top: 4px;
    color: #fff;
    font: 900 1.15rem/1 'Barlow Condensed', sans-serif;
  }

  .stats-page .stats-feature-metric strong.red {
    color: #ff5368;
  }

  /* Auction highlight */
  .stats-page .auction-highlight {
    padding: 22px;
  }

  .stats-page .auction-highlight-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }

  .stats-page .auction-highlight-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    color: #ff3048;
    border: 1px solid rgba(255,48,72,.22);
    border-radius: 9px;
    background: rgba(255,48,72,.06);
  }

  .stats-page .auction-price {
    margin-top: 18px;
    color: #ff5368;
    font: 900 2.25rem/1 'Barlow Condensed', sans-serif;
  }

  .stats-page .auction-name {
    margin-top: 6px;
    color: #fff;
    font-size: 1rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .stats-page .auction-muted {
    margin-top: 5px;
    color: #757b83;
    font-size: .64rem;
  }

  /* Standings */
  .stats-page .stats-panel {
    padding: 22px;
    margin-bottom: 18px;
  }

  .stats-page .stats-panel-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
    padding-bottom: 14px;
    margin-bottom: 15px;
    border-bottom: 1px solid rgba(255,255,255,.065);
  }

  .stats-page .stats-panel-head h2 {
    margin: 5px 0 0;
    color: #fff;
    font: 800 2.25rem/1 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
  }

  .stats-page .stats-panel-meta {
    color: #737880;
    font-size: .60rem;
    font-weight: 800;
    letter-spacing: .07em;
    text-transform: uppercase;
  }

  .stats-page .table-wrap {
    width: 100%;
    overflow-x: auto;
    border: 1px solid rgba(255,255,255,.055);
    border-radius: 9px;
    background: rgba(0,0,0,.12);
  }

  .stats-page .standings-table {
    width: 100%;
    min-width: 780px;
    table-layout: fixed;
    border-collapse: collapse;
  }

  .stats-page .standings-table thead {
    background: rgba(255,48,72,.035);
  }

  .stats-page .standings-table th {
    padding: 12px 10px;
    color: #777c84;
    border-bottom: 1px solid rgba(255,255,255,.07);
    font-size: .57rem;
    font-weight: 900;
    letter-spacing: .08em;
    text-align: center;
    text-transform: uppercase;
  }

  .stats-page .standings-table td {
    padding: 13px 10px;
    color: #d9dce1;
    border-bottom: 1px solid rgba(255,255,255,.045);
    font-size: .70rem;
    text-align: center;
  }

  .stats-page .standings-table tbody tr {
    transition: background .16s ease;
  }

  .stats-page .standings-table tbody tr:hover {
    background: rgba(255,48,72,.045);
  }

  .stats-page .standings-table tbody tr:first-child {
    background: rgba(255,48,72,.025);
    box-shadow: inset 3px 0 0 #ff3048;
  }

  .stats-page .standings-table th:nth-child(1),
  .stats-page .standings-table td:nth-child(1) {
    width: 52px;
  }

  .stats-page .standings-table th:nth-child(2),
  .stats-page .standings-table td:nth-child(2) {
    width: 36%;
    text-align: left;
  }

  .stats-page .standings-table td:nth-child(2) strong {
    color: #fff;
    font-size: .78rem;
    text-transform: uppercase;
  }

  .stats-page .standings-table td:first-child {
    color: #ff5368;
    font-weight: 900;
  }

  .stats-page .standings-table td:last-child {
    color: #ff5368;
    font-weight: 900;
  }

  /* Small indicators */
  .stats-page .team-form {
    display: inline-flex;
    gap: 4px;
    margin-left: 8px;
    vertical-align: middle;
  }

  .stats-page .team-form i {
    display: block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #3c4148;
  }

  .stats-page .team-form i.win {
    background: #63e6a6;
  }

  .stats-page .team-form i.loss {
    background: #ff5368;
  }

  /* Auction footer metrics */
  .stats-page .stats-mini-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .stats-page .stats-mini-card {
    min-height: 135px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    background: linear-gradient(145deg, #17181b, #0b0c0e);
    box-shadow: 0 15px 35px rgba(0,0,0,.24);
  }

  .stats-page .stats-mini-card h3 {
    margin: 10px 0 4px;
    color: #fff;
    font: 800 1.5rem/1 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
  }

  .stats-page .stats-mini-card p {
    margin: 0;
    color: #7b8088;
    font-size: .66rem;
  }

  .stats-page .stats-mini-card .value {
    margin-top: 7px;
    color: #ff5368;
    font: 900 1.85rem/1 'Barlow Condensed', sans-serif;
  }

  .stats-page .stats-mini-card .icon {
    color: #ff3048;
  }

  @media (max-width: 1050px) {
    .stats-page .stats-kpis {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .stats-page .stats-feature-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 680px) {
    .stats-page {
      width: min(100% - 24px, 620px);
      padding-bottom: 45px;
    }

    .stats-page .stats-kpis,
    .stats-page .stats-mini-grid {
      grid-template-columns: 1fr;
    }

    .stats-page .stats-panel {
      padding: 16px;
    }

    .stats-page .stats-panel-head {
      align-items: flex-start;
      flex-direction: column;
    }

    .stats-page .stats-kpi {
      min-height: 108px;
    }

    .stats-page .stats-feature-card {
      min-height: 170px;
      padding: 19px;
    }
  }
`

function Stats() {
  const { teams } = useTeams()
  const { players } = usePlayers()
  const { fixtures } = useFixtures()

  const soldPlayers = players.filter(
    (player) => player.status === 'Sold'
  )

  const mostExpensivePlayer =
    soldPlayers.length > 0
      ? soldPlayers.reduce((a, b) =>
          Number(a.soldPrice || 0) > Number(b.soldPrice || 0)
            ? a
            : b
        )
      : null

  const totalSpent = soldPlayers.reduce(
    (sum, player) => sum + Number(player.soldPrice || 0),
    0
  )

  const completedFixtures = fixtures.filter(
    (fixture) => fixture.status === 'Completed'
  )

  const teamStats = teams
    .map((team) => {
      const teamFixtures = completedFixtures.filter(
        (fixture) =>
          fixture.homeTeamId === team.id ||
          fixture.awayTeamId === team.id
      )

      let played = 0
      let wins = 0
      let losses = 0
      let roundsFor = 0
      let roundsAgainst = 0
      let points = 0

      teamFixtures.forEach((fixture) => {
        const isHome = fixture.homeTeamId === team.id

        const ownScore = Number(
          isHome ? fixture.homeScore || 0 : fixture.awayScore || 0
        )

        const opponentScore = Number(
          isHome ? fixture.awayScore || 0 : fixture.homeScore || 0
        )

        played += 1
        roundsFor += ownScore
        roundsAgainst += opponentScore

        if (ownScore > opponentScore) {
          wins += 1
          points += 3
        } else if (ownScore < opponentScore) {
          losses += 1
        }
      })

      const roundDifference = roundsFor - roundsAgainst

      const roster = players.filter(
        (player) =>
          player.status === 'Sold' && player.teamId === team.id
      )

      const spent = roster.reduce(
        (total, player) => total + Number(player.soldPrice || 0),
        0
      )

      const remaining =
        Number(team.startingBudget ?? 100000) - spent

      return {
        ...team,
        played,
        wins,
        losses,
        roundsFor,
        roundsAgainst,
        roundDifference,
        points,
        players: roster.length,
        spent,
        remaining,
      }
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.roundDifference - a.roundDifference ||
        b.roundsFor - a.roundsFor
    )

  const totalMatches = fixtures.length
  const completedMatches = completedFixtures.length
  const remainingMatches = totalMatches - completedMatches

  const totalRoundsPlayed = completedFixtures.reduce(
    (sum, fixture) =>
      sum +
      Number(fixture.homeScore || 0) +
      Number(fixture.awayScore || 0),
    0
  )

  const topTeam = teamStats[0] || null

  return (
    <main className="page-shell stats-page">
      <style>{STATS_STYLES}</style>

      <PageHeader
        eyebrow="SBT MAJOR · TOURNAMENT ANALYTICS"
        title="Statistics"
        description="A clear snapshot of tournament progress, team performance, and auction activity."
      />

      <section className="stats-kpis">
        <article className="stats-kpi">
          <div className="stats-kpi-icon"><FaCrosshairs /></div>
          <span className="stats-kpi-label">Matches Played</span>
          <strong className="stats-kpi-value">{completedMatches}</strong>
          <span className="stats-kpi-sub">of {totalMatches} scheduled</span>
        </article>

        <article className="stats-kpi">
          <div className="stats-kpi-icon"><FaChartLine /></div>
          <span className="stats-kpi-label">Remaining</span>
          <strong className="stats-kpi-value">{remainingMatches}</strong>
          <span className="stats-kpi-sub">matches still upcoming</span>
        </article>

        <article className="stats-kpi">
          <div className="stats-kpi-icon"><FaTrophy /></div>
          <span className="stats-kpi-label">Rounds Recorded</span>
          <strong className="stats-kpi-value">{totalRoundsPlayed}</strong>
          <span className="stats-kpi-sub">across completed fixtures</span>
        </article>

        <article className="stats-kpi">
          <div className="stats-kpi-icon"><FaCoins /></div>
          <span className="stats-kpi-label">Total Auction Spend</span>
          <strong className="stats-kpi-value">{formatCurrency(totalSpent)}</strong>
          <span className="stats-kpi-sub">{soldPlayers.length} players sold</span>
        </article>
      </section>

      <section className="stats-feature-grid">
        {topTeam ? (
          <article className="stats-feature-card">
            <span className="eyebrow">CURRENT LEADER</span>
            <h2>{topTeam.name}</h2>
            <p>
              {topTeam.points} points · {topTeam.wins} wins ·{' '}
              {topTeam.roundDifference >= 0 ? '+' : ''}
              {topTeam.roundDifference} round difference
            </p>

            <div className="stats-feature-metrics">
              <div className="stats-feature-metric">
                <span>Played</span>
                <strong>{topTeam.played}</strong>
              </div>
              <div className="stats-feature-metric">
                <span>Wins</span>
                <strong className="red">{topTeam.wins}</strong>
              </div>
              <div className="stats-feature-metric">
                <span>Players</span>
                <strong>{topTeam.players}</strong>
              </div>
              <div className="stats-feature-metric">
                <span>Budget Left</span>
                <strong>{formatCurrency(topTeam.remaining)}</strong>
              </div>
            </div>
          </article>
        ) : (
          <article className="stats-feature-card">
            <span className="eyebrow">CURRENT LEADER</span>
            <h2>NO LEADER YET</h2>
            <p>Complete fixtures to start building the standings.</p>
          </article>
        )}

        <article className="stats-panel auction-highlight">
          <div className="auction-highlight-head">
            <div>
              <span className="eyebrow">AUCTION HIGHLIGHT</span>
              <div className="auction-muted">Most expensive player</div>
            </div>
            <div className="auction-highlight-icon"><FaMedal /></div>
          </div>

          {mostExpensivePlayer ? (
            <>
              <div className="auction-price">
                {formatCurrency(mostExpensivePlayer.soldPrice)}
              </div>
              <div className="auction-name">
                {mostExpensivePlayer.nickname}
              </div>
              <div className="auction-muted">
                {mostExpensivePlayer.realName || 'Auction player'}
              </div>
            </>
          ) : (
            <>
              <div className="auction-price">—</div>
              <div className="auction-name">NO SALE YET</div>
              <div className="auction-muted">Auction results will appear here.</div>
            </>
          )}
        </article>
      </section>

      <section className="stats-panel">
        <header className="stats-panel-head">
          <div>
            <span className="eyebrow">TEAM PERFORMANCE</span>
            <h2>Standings</h2>
          </div>
          <span className="stats-panel-meta">
            {teams.length} teams · {completedMatches} completed matches
          </span>
        </header>

        {teamStats.length ? (
          <div className="table-wrap">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>L</th>
                  <th>RF</th>
                  <th>RA</th>
                  <th>MR</th>
                  <th>PTS</th>
                </tr>
              </thead>

              <tbody>
                {teamStats.map((team, index) => (
                  <tr key={team.id}>
                    <td>#{index + 1}</td>
                    <td>
                      <strong>{team.name}</strong>
                    </td>
                    <td>{team.played}</td>
                    <td>{team.wins}</td>
                    <td>{team.losses}</td>
                    <td>{team.roundsFor}</td>
                    <td>{team.roundsAgainst}</td>
                    <td>
                      {team.roundDifference >= 0
                        ? `+${team.roundDifference}`
                        : team.roundDifference}
                    </td>
                    <td><strong>{team.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <FaUsers />
            <h2>No teams yet</h2>
            <p>Create teams to start tracking tournament performance.</p>
          </div>
        )}
      </section>

      <section className="stats-mini-grid">
        <article className="stats-mini-card">
          <div className="icon"><FaUsers /></div>
          <span className="eyebrow">TOTAL SOLD PLAYERS</span>
          <h3>{soldPlayers.length} Players</h3>
          <p>Players purchased through the auction.</p>
        </article>

        <article className="stats-mini-card">
          <div className="icon"><FaCoins /></div>
          <span className="eyebrow">AUCTION VALUE</span>
          <div className="value">{formatCurrency(totalSpent)}</div>
          <p>Combined sold-player value.</p>
        </article>

        <article className="stats-mini-card">
          <div className="icon"><FaCrown /></div>
          <span className="eyebrow">LEADER</span>
          <h3>{topTeam?.name || 'TBD'}</h3>
          <p>{topTeam ? `${topTeam.points} points` : 'Complete matches first.'}</p>
        </article>

        <article className="stats-mini-card">
          <div className="icon"><FaTrophy /></div>
          <span className="eyebrow">MOST EXPENSIVE</span>
          <h3>{mostExpensivePlayer?.nickname || 'TBD'}</h3>
          <p>
            {mostExpensivePlayer
              ? formatCurrency(mostExpensivePlayer.soldPrice)
              : 'No player sold yet.'}
          </p>
        </article>
      </section>
    </main>
  )
}

export default Stats