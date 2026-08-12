import PageHeader from '../components/PageHeader'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { useFixtures } from '../context/FixturesContext'
import { formatCurrency } from '../utils/formatCurrency'

function Stats() {
  const { teams } = useTeams()
  const { players } = usePlayers()
  const { fixtures } = useFixtures()

  // -----------------------------
  // AUCTION STATS
  // -----------------------------

  const soldPlayers = players.filter(
    (player) => player.status === 'Sold'
  )

  const mostExpensivePlayer =
    soldPlayers.length > 0
      ? soldPlayers.reduce((a, b) =>
          Number(a.soldPrice || 0) >
          Number(b.soldPrice || 0)
            ? a
            : b
        )
      : null

  const totalSpent = soldPlayers.reduce(
    (sum, player) =>
      sum + Number(player.soldPrice || 0),
    0
  )

  // -----------------------------
  // MATCH STATS
  // -----------------------------

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
          isHome
            ? fixture.homeScore || 0
            : fixture.awayScore || 0
        )

        const opponentScore = Number(
          isHome
            ? fixture.awayScore || 0
            : fixture.homeScore || 0
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

      const roundDifference =
        roundsFor - roundsAgainst

      const roster = players.filter(
        (player) =>
          player.status === 'Sold' &&
          player.teamId === team.id
      )

      const spent = roster.reduce(
        (total, player) =>
          total + Number(player.soldPrice || 0),
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

  // -----------------------------
  // TOURNAMENT TOTALS
  // -----------------------------

  const totalMatches = fixtures.length
  const completedMatches = completedFixtures.length
  const remainingMatches =
    totalMatches - completedMatches

  const totalRoundsPlayed = completedFixtures.reduce(
    (sum, fixture) =>
      sum +
      Number(fixture.homeScore || 0) +
      Number(fixture.awayScore || 0),
    0
  )

  const topTeam = teamStats[0] || null

  return (
    <main>
      <PageHeader
        eyebrow="SBT MAJOR · TOURNAMENT ANALYTICS"
        title="Statistics"
        description="Live tournament statistics calculated from auction data and completed fixtures."
      />

      {/* TOURNAMENT OVERVIEW */}

      <section className="stats-grid">
        <div className="glass-card stat-card">
          <span className="eyebrow">
            MATCHES PLAYED
          </span>

          <strong>
            {completedMatches}
          </strong>

          <span>
            of {totalMatches} total
          </span>
        </div>

        <div className="glass-card stat-card">
          <span className="eyebrow">
            REMAINING
          </span>

          <strong>
            {remainingMatches}
          </strong>

          <span>
            upcoming matches
          </span>
        </div>

        <div className="glass-card stat-card">
          <span className="eyebrow">
            ROUNDS PLAYED
          </span>

          <strong>
            {totalRoundsPlayed}
          </strong>

          <span>
            rounds recorded
          </span>
        </div>

        <div className="glass-card stat-card">
          <span className="eyebrow">
            TOTAL SPENT
          </span>

          <strong>
            {formatCurrency(totalSpent)}
          </strong>

          <span>
            player auction value
          </span>
        </div>
      </section>

      {/* CURRENT LEADER */}

      {topTeam && (
        <section className="stats-highlight glass-card">
          <div>
            <span className="eyebrow">
              CURRENT LEADER
            </span>

            <h2>
              {topTeam.name}
            </h2>

            <p>
              {topTeam.points} points · {topTeam.wins} wins ·{' '}
              {topTeam.roundDifference >= 0 ? '+' : ''}
              {topTeam.roundDifference} round difference
            </p>
          </div>
        </section>
      )}

      {/* TEAM STANDINGS */}

      <section className="glass-card stats-table-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              TEAM PERFORMANCE
            </span>

            <h2>Standings</h2>
          </div>
        </div>

        <div className="table-wrap">
          <table>
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
                  <td>
                    #{index + 1}
                  </td>

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

                  <td>
                    <strong>{team.points}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* AUCTION LEADERBOARD */}

      <section className="stats-grid">
        <div className="glass-card">
          <span className="eyebrow">
            MOST EXPENSIVE PLAYER
          </span>

          {mostExpensivePlayer ? (
            <>
              <h2>
                {mostExpensivePlayer.nickname}
              </h2>

              <p>
                {formatCurrency(
                  mostExpensivePlayer.soldPrice
                )}
              </p>
            </>
          ) : (
            <p>No player sold yet</p>
          )}
        </div>

        <div className="glass-card">
          <span className="eyebrow">
            TOTAL SOLD PLAYERS
          </span>

          <h2>{soldPlayers.length}</h2>

          <p>
            players purchased through auction
          </p>
        </div>
      </section>
    </main>
  )
}

export default Stats