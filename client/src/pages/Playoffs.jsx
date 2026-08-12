import { useEffect, useMemo, useState } from 'react'
import { FaTrophy, FaUsers, FaMedal } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useTeams } from '../context/TeamsContext'
import { useFixtures } from '../context/FixturesContext'
import PageHeader from '../components/PageHeader'

const PLAYOFF_STORAGE_KEY = 'sbt-major-pools-playoffs'

function splitIntoPools(teams) {
  const sorted = [...teams]

  const poolASize = Math.ceil(sorted.length / 2)

  return {
    poolA: sorted.slice(0, poolASize),
    poolB: sorted.slice(poolASize),
  }
}

function getTeam(teams, id) {
  return teams.find((team) => team.id === id)
}

function calculateStandings(teams, fixtures) {
  const table = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    played: 0,
    wins: 0,
    losses: 0,
    rf: 0,
    ra: 0,
    mr: 0,
    points: 0,
  }))

  const findRow = (id) => table.find((row) => row.teamId === id)

  fixtures
    .filter(
      (fixture) =>
        fixture.status === 'Completed' &&
        Number.isFinite(Number(fixture.homeScore)) &&
        Number.isFinite(Number(fixture.awayScore))
    )
    .forEach((fixture) => {
      const home = findRow(fixture.homeTeamId)
      const away = findRow(fixture.awayTeamId)

      if (!home || !away) return

      const homeScore = Number(fixture.homeScore)
      const awayScore = Number(fixture.awayScore)

      home.played += 1
      away.played += 1

      home.rf += homeScore
      home.ra += awayScore

      away.rf += awayScore
      away.ra += homeScore

      if (homeScore > awayScore) {
        home.wins += 1
        home.points += 3
        away.losses += 1
      } else if (awayScore > homeScore) {
        away.wins += 1
        away.points += 3
        home.losses += 1
      }
    })

  table.forEach((row) => {
    row.mr = row.rf - row.ra
  })

  return table.sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.mr - a.mr ||
      b.rf - a.rf
  )
}

function PoolTable({ title, teams, fixtures, isFinished }) {
  const standings = useMemo(
    () => calculateStandings(teams, fixtures),
    [teams, fixtures]
  )

  return (
    <section className="pool-section glass-card">
      <div className="pool-heading">
        <div>
          <span className="eyebrow">{title}</span>
          <h2>{title === 'Pool A' ? 'Pool A' : 'Pool B'}</h2>
        </div>

        <span className="pool-team-count">
          <FaUsers /> {teams.length} Teams
        </span>
      </div>

      {teams.length === 0 ? (
        <div className="empty-state">No teams in this pool.</div>
      ) : (
        <div className="standings-table-wrap">
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
              {standings.map((row, index) => (
                <tr key={row.teamId}>
                  <td>
                    <span
                      className={
                        index < 2
                          ? 'qualification-seed qualified'
                          : 'qualification-seed'
                      }
                    >
                      {index + 1}
                    </span>
                  </td>

                  <td>
                    <strong>{row.teamName}</strong>
                    {isFinished && index < 2 && (
  <small className="qualified-label">
    QUALIFIED
  </small>
)}
                  </td>

                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.rf}</td>
                  <td>{row.ra}</td>

                  <td
                    className={
                      row.mr > 0
                        ? 'mr-positive'
                        : row.mr < 0
                          ? 'mr-negative'
                          : ''
                    }
                  >
                    {row.mr > 0 ? `+${row.mr}` : row.mr}
                  </td>

                  <td>
                    <strong>{row.points}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pool-note">
        Tie-break: Points → Wins → MR → Rounds For
      </div>
    </section>
  )
}

function PlayoffMatch({
  title,
  homeTeam,
  awayTeam,
  winnerId,
  onWinnerChange,
}) {
  return (
    <article className="playoff-match glass-card">
      <div className="playoff-match-title">{title}</div>

      <div className="playoff-team">
        {homeTeam?.name || 'TBD'}
        {winnerId === homeTeam?.id && <FaTrophy />}
      </div>

      <div className="vs-divider">VS</div>

      <div className="playoff-team">
        {awayTeam?.name || 'TBD'}
        {winnerId === awayTeam?.id && <FaTrophy />}
      </div>

      {homeTeam && awayTeam && (
        <label className="winner-select">
          Winner
          <select
            value={winnerId || ''}
            onChange={(event) => onWinnerChange(event.target.value)}
          >
            <option value="">Select winner</option>
            <option value={homeTeam.id}>{homeTeam.name}</option>
            <option value={awayTeam.id}>{awayTeam.name}</option>
          </select>
        </label>
      )}
    </article>
  )
}

function Playoffs() {
  const { teams } = useTeams()
  const { fixtures } = useFixtures()

  const [playoff, setPlayoff] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(PLAYOFF_STORAGE_KEY) || 'null')
    } catch {
      return null
    }
  })

  const { poolA, poolB } = useMemo(
    () => splitIntoPools(teams),
    [teams]
  )

  const poolAFixtures = useMemo(
    () =>
      fixtures.filter(
        (fixture) =>
          poolA.some((team) => team.id === fixture.homeTeamId) &&
          poolA.some((team) => team.id === fixture.awayTeamId)
      ),
    [fixtures, poolA]
  )

  const poolBFixtures = useMemo(
    () =>
      fixtures.filter(
        (fixture) =>
          poolB.some((team) => team.id === fixture.homeTeamId) &&
          poolB.some((team) => team.id === fixture.awayTeamId)
      ),
    [fixtures, poolB]
  )

  const standingsA = useMemo(
    () => calculateStandings(poolA, poolAFixtures),
    [poolA, poolAFixtures]
  )

  const standingsB = useMemo(
    () => calculateStandings(poolB, poolBFixtures),
    [poolB, poolBFixtures]
  )

  const poolAFinished =
  poolA.length > 0 &&
  poolAFixtures.length > 0 &&
  poolAFixtures.every(
    (fixture) => fixture.status === 'Completed'
  )

const poolBFinished =
  poolB.length > 0 &&
  poolBFixtures.length > 0 &&
  poolBFixtures.every(
    (fixture) => fixture.status === 'Completed'
  )

const qualifiedA = poolAFinished
  ? standingsA.slice(0, 2)
  : []

const qualifiedB = poolBFinished
  ? standingsB.slice(0, 2)
  : []

  const semi1Home = qualifiedA[0]
    ? getTeam(teams, qualifiedA[0].teamId)
    : null

  const semi1Away = qualifiedB[1]
    ? getTeam(teams, qualifiedB[1].teamId)
    : null

  const semi2Home = qualifiedB[0]
    ? getTeam(teams, qualifiedB[0].teamId)
    : null

  const semi2Away = qualifiedA[1]
    ? getTeam(teams, qualifiedA[1].teamId)
    : null

  const semi1Winner = playoff?.semi1Winner || ''
  const semi2Winner = playoff?.semi2Winner || ''

  const finalHome = getTeam(teams, semi1Winner)
  const finalAway = getTeam(teams, semi2Winner)

  const updatePlayoff = (changes) => {
    setPlayoff((current) => {
      const next = {
        ...(current || {}),
        ...changes,
      }

      localStorage.setItem(
        PLAYOFF_STORAGE_KEY,
        JSON.stringify(next)
      )

      return next
    })
  }

  const resetPlayoffs = () => {
    localStorage.removeItem(PLAYOFF_STORAGE_KEY)
    setPlayoff(null)
    toast.success('Playoffs reset')
  }

  useEffect(() => {
    if (!teams.length) return

    const poolIds = new Set(
      [...poolA, ...poolB].map((team) => team.id)
    )

    if (poolIds.size !== teams.length) {
      setPlayoff(null)
    }
  }, [teams.length])

  const finalWinner = playoff?.finalWinner || ''

  const champion = getTeam(teams, finalWinner)

  const enoughTeams = teams.length >= 4

  return (
    <main className="page-shell">
      <PageHeader
        title="PLAYOFFS"
        description="Two-pool championship system — qualify, battle, and become the SBT MAJOR champion."
      />

      <section className="playoff-hero glass-card">
        <div>
          <span className="eyebrow">CHAMPIONSHIP FORMAT</span>
          <h2>
            {teams.length} Teams · 2 Pools
          </h2>

          <p>
            Top 2 teams from each pool advance to the Semi Finals.
          </p>
        </div>

        <div className="format-badge">
          POOL A <span>VS</span> POOL B
        </div>
      </section>

      {!enoughTeams ? (
        <section className="empty-state glass-card">
          <FaUsers />
          <h2>Need at least 4 teams</h2>
          <p>
            Add at least 4 teams to create the championship stage.
          </p>
        </section>
      ) : (
        <>
          <section className="pools-grid">
            {isFinished && index < 2 && (
  <small className="qualified-label">
    QUALIFIED
  </small>
)}

            <PoolTable
  title="Pool B"
  teams={poolB}
  fixtures={poolBFixtures}
  isFinished={poolBFinished}
/>
          </section>

          <section className="qualification-banner glass-card">
            <FaMedal />

            <div>
              <strong>Qualification</strong>
              <span>
                Top 2 from Pool A + Top 2 from Pool B → Semi Finals
              </span>
            </div>
          </section>

          <section className="championship-stage">
            <div className="section-heading">
              <div>
                <span className="eyebrow">CHAMPIONSHIP STAGE</span>
                <h2>Top 4 Playoffs</h2>
              </div>

              <button
                className="button button-secondary"
                onClick={resetPlayoffs}
              >
                RESET PLAYOFFS
              </button>
            </div>

            <div className="bracket-grid">
              <div>
                <div className="bracket-round-label">
                  SEMI FINALS
                </div>

                <PlayoffMatch
                  title="SF 1 · A1 vs B2"
                  homeTeam={semi1Home}
                  awayTeam={semi1Away}
                  winnerId={semi1Winner}
                  onWinnerChange={(winnerId) =>
                    updatePlayoff({
                      semi1Winner: winnerId,
                      finalWinner: '',
                    })
                  }
                />

                <PlayoffMatch
                  title="SF 2 · B1 vs A2"
                  homeTeam={semi2Home}
                  awayTeam={semi2Away}
                  winnerId={semi2Winner}
                  onWinnerChange={(winnerId) =>
                    updatePlayoff({
                      semi2Winner: winnerId,
                      finalWinner: '',
                    })
                  }
                />
              </div>

              <div className="final-column">
                <div className="bracket-round-label">
                  GRAND FINAL
                </div>

                <PlayoffMatch
                  title="FINAL"
                  homeTeam={finalHome}
                  awayTeam={finalAway}
                  winnerId={finalWinner}
                  onWinnerChange={(winnerId) =>
                    updatePlayoff({
                      finalWinner: winnerId,
                    })
                  }
                />

                {champion && (
                  <div className="champion-card">
                    <FaTrophy />

                    <span>CHAMPION</span>

                    <h2>{champion.name}</h2>

                    <p>SBT MAJOR CS 1.6</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

export default Playoffs