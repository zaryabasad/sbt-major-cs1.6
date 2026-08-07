import PageHeader from '../components/PageHeader'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { formatCurrency } from '../utils/formatCurrency'

function Stats() {
  const { teams } = useTeams()
  const { players } = usePlayers()

  const leaderboard = teams
    .map((team) => {
      const roster = players.filter(
        (player) => player.status === 'Sold' && player.teamId === team.id
      )

      const spent = roster.reduce(
        (total, player) => total + Number(player.soldPrice || 0),
        0
      )

      const remaining =
        Number(team.startingBudget ?? 100000) - spent

      return {
        ...team,
        players: roster.length,
        spent,
        remaining,
      }
    })
    .sort((a, b) => b.players - a.players)
const soldPlayers = players.filter(player => player.status === 'Sold')

const mostExpensivePlayer =
  soldPlayers.length > 0
    ? soldPlayers.reduce((a, b) =>
        Number(a.soldPrice) > Number(b.soldPrice) ? a : b
      )
    : null

const totalSpent = soldPlayers.reduce(
  (sum, player) => sum + Number(player.soldPrice || 0),
  0
)
  return (
    <section className="stats-page">
      <PageHeader
        title="Leaderboard"
        description="Live tournament standings"
      />
<div className="stats-summary">

  <div className="glass-card summary-card">
    <h3>Total Teams</h3>
    <h1>{teams.length}</h1>
  </div>

  <div className="glass-card summary-card">
    <h3>Total Players Sold</h3>
    <h1>{soldPlayers.length}</h1>
  </div>

  <div className="glass-card summary-card">
    <h3>Total Money Spent</h3>
    <h1>{formatCurrency(totalSpent)}</h1>
  </div>

  <div className="glass-card summary-card">
    <h3>Most Expensive Player</h3>

    {mostExpensivePlayer ? (
      <>
        <h2>{mostExpensivePlayer.nickname}</h2>
        <p>{formatCurrency(mostExpensivePlayer.soldPrice)}</p>
      </>
    ) : (
      <p>No player sold yet</p>
    )}
  </div>

</div>
      <div className="glass-card">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Players</th>
              <th>Spent</th>
              <th>Remaining</th>
            </tr>
          </thead>

          <tbody>
            {leaderboard.map((team, index) => (
              <tr key={team.id}>
                <td>#{index + 1}</td>
                <td>{team.name}</td>
                <td>{team.players}</td>
                <td>{formatCurrency(team.spent)}</td>
                <td>{formatCurrency(team.remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default Stats