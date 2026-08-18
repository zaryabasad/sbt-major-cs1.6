import { useEffect, useMemo, useState } from 'react'
import { FaMedal, FaTrophy, FaUsers } from 'react-icons/fa'
import PageHeader from '../components/PageHeader'
import { useFixtures } from '../context/FixturesContext'
import { useTeams } from '../context/TeamsContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const PLAYOFF_STORAGE_KEY = 'sbt-major-playoffs'

function readPlayoffState() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(PLAYOFF_STORAGE_KEY) || 'null'
    )

    return stored || null
  } catch {
    return null
  }
}

function Playoffs() {
  const { teams } = useTeams()
  const { fixtures } = useFixtures()
  const {
    isAdmin,
    isSuperAdmin,
  } = useAuth()

  const [playoff, setPlayoff] = useState(readPlayoffState)
  const [playoffLoading, setPlayoffLoading] = useState(true)
  const [playoffSaving, setPlayoffSaving] = useState(false)

  const getTeam = (id) =>
    teams.find((team) => team.id === id)

  const completedFixtures = useMemo(
    () =>
      fixtures.filter(
        (fixture) =>
          fixture.status === 'Completed' &&
          fixture.winnerId
      ),
    [fixtures]
  )

  const standings = useMemo(() => {
    return teams
      .map((team) => {
        let played = 0
        let wins = 0
        let losses = 0
        let roundsFor = 0
        let roundsAgainst = 0

        completedFixtures.forEach((fixture) => {
          const isHome = fixture.homeTeamId === team.id
          const isAway = fixture.awayTeamId === team.id

          if (!isHome && !isAway) return

          played += 1

          const homeScore = Number(fixture.homeScore || 0)
          const awayScore = Number(fixture.awayScore || 0)

          if (isHome) {
            roundsFor += homeScore
            roundsAgainst += awayScore
          }

          if (isAway) {
            roundsFor += awayScore
            roundsAgainst += homeScore
          }

          if (fixture.winnerId === team.id) {
            wins += 1
          } else {
            losses += 1
          }
        })

        return {
          ...team,
          played,
          wins,
          losses,
          roundsFor,
          roundsAgainst,
          mr: roundsFor - roundsAgainst,
          points: wins * 3,
        }
      })
      .sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points
        }

        if (b.wins !== a.wins) {
          return b.wins - a.wins
        }

        if (b.mr !== a.mr) {
          return b.mr - a.mr
        }

        if (b.roundsFor !== a.roundsFor) {
          return b.roundsFor - a.roundsFor
        }

        return 0
      })
  }, [teams, completedFixtures])

  const qualifierCount =
    teams.length >= 8
      ? 8
      : teams.length >= 4
        ? 4
        : 0

  const qualifiedTeams = standings.slice(
    0,
    qualifierCount
  )

  useEffect(() => {
    let cancelled = false

    async function loadPlayoffState() {
      setPlayoffLoading(true)

      const {
        data,
        error,
      } = await supabase
        .from('playoff_state')
        .select('id, state')
        .eq('id', 1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error(
          'PLAYOFF LOAD ERROR:',
          error
        )

        setPlayoffLoading(false)
        return
      }

      if (data?.state) {
        setPlayoff(data.state)
        localStorage.setItem(
          PLAYOFF_STORAGE_KEY,
          JSON.stringify(data.state)
        )
      } else {
        const localState = readPlayoffState()

        if (localState) {
          setPlayoff(localState)

          if (isSuperAdmin) {
            const { error: migrationError } =
              await supabase
                .from('playoff_state')
                .upsert({
                  id: 1,
                  state: localState,
                })

            if (migrationError) {
              console.error(
                'PLAYOFF MIGRATION ERROR:',
                migrationError
              )
            }
          }
        } else {
          setPlayoff(null)
        }
      }

      setPlayoffLoading(false)
    }

    loadPlayoffState()

    return () => {
      cancelled = true
    }
  }, [isSuperAdmin])

  useEffect(() => {
    if (playoff) {
      localStorage.setItem(
        PLAYOFF_STORAGE_KEY,
        JSON.stringify(playoff)
      )
    }
  }, [playoff])

  const savePlayoffState = async (nextState) => {
    if (!isSuperAdmin) return false

    setPlayoffSaving(true)

    const {
      error,
    } = await supabase
      .from('playoff_state')
      .upsert({
        id: 1,
        state: nextState,
      })

    setPlayoffSaving(false)

    if (error) {
      console.error(
        'PLAYOFF SAVE ERROR:',
        error
      )
      alert(
        error.message ||
          'Failed to save playoff state.'
      )
      return false
    }

    localStorage.setItem(
      PLAYOFF_STORAGE_KEY,
      JSON.stringify(nextState)
    )

    return true
  }

  const generatePlayoffs = async () => {
    if (!isSuperAdmin) {
      return false
    }
    if (qualifiedTeams.length < 4) return

    const seeds = qualifiedTeams.map(
      (team) => team.id
    )

    if (qualifiedTeams.length === 8) {
      const nextState = {
        type: '8-team',
        seeds,

        quarterFinals: [
          {
            id: crypto.randomUUID(),
            homeTeamId: seeds[0],
            awayTeamId: seeds[7],
            winnerId: '',
          },
          {
            id: crypto.randomUUID(),
            homeTeamId: seeds[3],
            awayTeamId: seeds[4],
            winnerId: '',
          },
          {
            id: crypto.randomUUID(),
            homeTeamId: seeds[1],
            awayTeamId: seeds[6],
            winnerId: '',
          },
          {
            id: crypto.randomUUID(),
            homeTeamId: seeds[2],
            awayTeamId: seeds[5],
            winnerId: '',
          },
        ],

        semiFinals: [
          {
            id: crypto.randomUUID(),
            homeTeamId: '',
            awayTeamId: '',
            winnerId: '',
          },
          {
            id: crypto.randomUUID(),
            homeTeamId: '',
            awayTeamId: '',
            winnerId: '',
          },
        ],

        final: {
          id: crypto.randomUUID(),
          homeTeamId: '',
          awayTeamId: '',
          winnerId: '',
        },
      }

      setPlayoff(nextState)
      await savePlayoffState(nextState)

      return
    }

    const nextState = {
      type: '4-team',
      seeds,

      quarterFinals: [],

      semiFinals: [
        {
          id: crypto.randomUUID(),
          homeTeamId: seeds[0],
          awayTeamId: seeds[3],
          winnerId: '',
        },
        {
          id: crypto.randomUUID(),
          homeTeamId: seeds[1],
          awayTeamId: seeds[2],
          winnerId: '',
        },
      ],

      final: {
        id: crypto.randomUUID(),
        homeTeamId: '',
        awayTeamId: '',
        winnerId: '',
      },
    }
  }

 const setMatchWinner = async (
  round,
  index,
  winnerId
) => {
  if (!isSuperAdmin) return false
  if (!playoff || !winnerId) return false

  const next = structuredClone(playoff)

  // Grand Final is an object, not an array
  if (round === 'final') {
    next.final.winnerId = winnerId
    setPlayoff(next)
    return await savePlayoffState(
      next
    )
  }

  // Quarter Finals / Semi Finals
  next[round][index].winnerId = winnerId

  if (round === 'quarterFinals' && next.type === '8-team') {
    if (index === 0) {
      next.semiFinals[0].homeTeamId = winnerId
    }

    if (index === 1) {
      next.semiFinals[0].awayTeamId = winnerId
    }

    if (index === 2) {
      next.semiFinals[1].homeTeamId = winnerId
    }

    if (index === 3) {
      next.semiFinals[1].awayTeamId = winnerId
    }

    // Reset later stages when QF changes
    next.semiFinals[index < 2 ? 0 : 1].winnerId = ''

    next.final.homeTeamId = ''
    next.final.awayTeamId = ''
    next.final.winnerId = ''
  }

  if (round === 'semiFinals') {
    if (index === 0) {
      next.final.homeTeamId = winnerId
    }

    if (index === 1) {
      next.final.awayTeamId = winnerId
    }

    // Reset final winner if semifinal changes
    next.final.winnerId = ''
  }

  setPlayoff(next)
}
  

  const resetPlayoffs = () => {
    setPlayoff(null)

    localStorage.removeItem(
      PLAYOFF_STORAGE_KEY
    )
  }

  const MatchCard = ({
    match,
    round,
    index,
    label,
  }) => {
    const home = getTeam(match?.homeTeamId)
    const away = getTeam(match?.awayTeamId)

    const ready = home && away

    return (
      <article className="glass-card playoff-match">

        <span className="playoff-match-number">
          {label}
        </span>

        <div
          className={
            match?.winnerId === home?.id
              ? 'playoff-team winner'
              : 'playoff-team'
          }
        >
          <span>
            {home?.name || 'TBD'}
          </span>

          {match?.winnerId === home?.id && (
            <FaTrophy />
          )}
        </div>

        <div className="playoff-vs">
          VS
        </div>

        <div
          className={
            match?.winnerId === away?.id
              ? 'playoff-team winner'
              : 'playoff-team'
          }
        >
          <span>
            {away?.name || 'TBD'}
          </span>

          {match?.winnerId === away?.id && (
            <FaTrophy />
          )}
        </div>

        {ready && isSuperAdmin ? (
          <label style={{ marginTop: 14 }}>
            Winner

            <select
              value={match.winnerId}
              onChange={(event) =>
                setMatchWinner(
                  round,
                  index,
                  event.target.value
                )
              }
            >
              <option value="">
                Select winner
              </option>

              <option value={home.id}>
                {home.name}
              </option>

              <option value={away.id}>
                {away.name}
              </option>
            </select>
          </label>
        ) : (
          <small className="playoff-status">
            Waiting for previous round
          </small>
        )}

      </article>
    )
  }

  const champion = playoff?.final?.winnerId
    ? getTeam(playoff.final.winnerId)
    : null

  return (
    <section className="playoffs-page">
      <style>{`
        .playoffs-readonly-note {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin:0 0 16px;
          padding:10px 13px;
          border:1px solid rgba(112,157,235,.18);
          border-radius:8px;
          background:rgba(65,105,180,.05);
        }

        .playoffs-readonly-note strong {
          color:#dce7ff;
          font-size:.64rem;
          text-transform:uppercase;
          letter-spacing:.06em;
        }

        .playoffs-readonly-note span {
          color:#7f91ae;
          font-size:.58rem;
        }

        @media (max-width: 720px) {
          .playoffs-readonly-note {
            flex-direction:column;
            align-items:flex-start;
          }
        }
      `}</style>

      <PageHeader
        title="Playoffs"
        description="Follow the road to the SBT MAJOR championship."
      />

      {isAdmin && !isSuperAdmin && (
        <section className="glass-card playoffs-readonly-note">
          <strong>Team Admin · Read Only</strong>
          <span>
            Playoff bracket and results are controlled by the Super Admin.
          </span>
        </section>
      )}

      {playoffLoading && (
        <section className="glass-card playoff-empty">
          Loading championship data…
        </section>
      )}

      <div className="playoffs-summary">

        <div className="glass-card playoff-summary-card">
          <FaUsers />

          <div>
            <span>Total Teams</span>
            <strong>{teams.length}</strong>
          </div>
        </div>

        <div className="glass-card playoff-summary-card">
          <FaMedal />

          <div>
            <span>Qualified</span>
            <strong>{qualifierCount}</strong>
          </div>
        </div>

        <div className="glass-card playoff-summary-card">
          <FaTrophy />

          <div>
            <span>Champion</span>
            <strong>
              {champion?.name || 'TBD'}
            </strong>
          </div>
        </div>

      </div>

      <section className="glass-card">

        <header className="playoff-round-header">
          <div>
            <span>Round Robin</span>
            <h2>Standings</h2>
          </div>
        </header>

        <div style={{ overflowX: 'auto' }}>

          <table className="leaderboard-table">

            <thead>
              <tr>
                <th>Seed</th>
                <th>Team</th>
                <th>P</th>
                <th>W</th>
                <th>L</th>
                <th>RF</th>
                <th>RA</th>
                <th>MR</th>
                <th>Points</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {standings.map((team, index) => {
                const qualified =
                  index < qualifierCount

                return (
                  <tr key={team.id}>

                    <td>
                      #{index + 1}
                    </td>

                    <td>
                      <strong>
                        {team.name}
                      </strong>
                    </td>

                    <td>{team.played}</td>

                    <td>{team.wins}</td>

                    <td>{team.losses}</td>

                    <td>{team.roundsFor}</td>

                    <td>{team.roundsAgainst}</td>

                    <td>
                      <strong>
                        {team.mr > 0
                          ? `+${team.mr}`
                          : team.mr}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {team.points}
                      </strong>
                    </td>

                    <td>
                      {qualified
                        ? 'QUALIFIED'
                        : 'ELIMINATED'}
                    </td>

                  </tr>
                )
              })}
            </tbody>

          </table>

        </div>

        <p style={{ marginTop: 15 }}>
          Tie-break order: Points → Wins → MR → Rounds For.
        </p>

      </section>

      {teams.length < 4 && (
        <section className="glass-card playoff-empty">

          <FaUsers />

          <h2>Not enough teams</h2>

          <p>
            Create at least 4 teams to start
            the playoff stage.
          </p>

        </section>
      )}

      {!playoffLoading && teams.length >= 4 && !playoff && (
        <section className="glass-card playoff-empty">

          <FaTrophy />

          <h2>Playoff Bracket Ready</h2>

          <p>
            {teams.length === 8
              ? 'All 8 teams will enter the Quarter Finals.'
              : 'The top 4 teams will enter the Semi Finals.'}
          </p>

          {isSuperAdmin ? (
            <button
              className="button button-primary"
              onClick={generatePlayoffs}
              disabled={
                completedFixtures.length === 0 ||
                playoffSaving
              }
            >
              {playoffSaving
                ? 'Saving…'
                : 'Generate Playoff Bracket'}
            </button>
          ) : (
            <small>
              Playoff management is controlled by the Super Admin.
            </small>
          )}

          {completedFixtures.length === 0 && (
            <small>
              Complete Round Robin matches first.
            </small>
          )}

        </section>
      )}

      {!playoffLoading && playoff && (
        <section className="glass-card">

          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 25,
            }}
          >

            <div>
              <p className="eyebrow">
                Championship Stage
              </p>

              <h2>
                {playoff.type === '8-team'
                  ? '8-Team Playoffs'
                  : 'Top 4 Playoffs'}
              </h2>
            </div>

            {isSuperAdmin && (
              <button
                className="button button-secondary"
                onClick={resetPlayoffs}
                disabled={playoffSaving}
              >
                {playoffSaving
                  ? 'Saving…'
                  : 'Reset Playoffs'}
              </button>
            )}

          </header>

          <div className="playoff-bracket">

            {playoff.type === '8-team' && (
              <section className="playoff-round">

                <header className="playoff-round-header">
                  <span>Round 1</span>
                  <h2>Quarter Finals</h2>
                </header>

                {playoff.quarterFinals.map(
                  (match, index) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      round="quarterFinals"
                      index={index}
                      label={`QF ${index + 1}`}
                    />
                  )
                )}

              </section>
            )}

            <section className="playoff-round">

              <header className="playoff-round-header">
                <span>
                  {playoff.type === '8-team'
                    ? 'Round 2'
                    : 'Round 1'}
                </span>

                <h2>Semi Finals</h2>
              </header>

              {playoff.semiFinals.map(
                (match, index) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    round="semiFinals"
                    index={index}
                    label={`SF ${index + 1}`}
                  />
                )
              )}

            </section>

            <section className="playoff-round final-round">

              <header className="playoff-round-header">
                <span>Grand Final</span>
                <h2>Final</h2>
              </header>

              <MatchCard
                match={playoff.final}
                round="final"
                index={0}
                label="FINAL"
              />

              <div
                className="champion-box"
                style={{ marginTop: 20 }}
              >

                <FaTrophy />

                <span>
                  SBT MAJOR CHAMPION
                </span>

                <strong>
                  {champion?.name || 'TBD'}
                </strong>

              </div>

            </section>

          </div>

        </section>
      )}

    </section>
  )
}

export default Playoffs