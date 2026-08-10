import { useMemo } from 'react'
import { FaTrophy, FaUsers } from 'react-icons/fa'
import PageHeader from '../components/PageHeader'
import { useFixtures } from '../context/FixturesContext'
import { useTeams } from '../context/TeamsContext'

function Playoffs() {
  const { teams } = useTeams()
  const { fixtures } = useFixtures()

  const getTeam = (id) => teams.find((team) => team.id === id)

  const completedFixtures = useMemo(
    () => fixtures.filter(
      (fixture) =>
        fixture.status === 'Completed' &&
        fixture.winnerId
    ),
    [fixtures]
  )

  const getWinner = (fixture) => getTeam(fixture?.winnerId)

  const getLoser = (fixture) => {
    if (!fixture) return null

    const winnerId = fixture.winnerId

    if (winnerId === fixture.homeTeamId) {
      return getTeam(fixture.awayTeamId)
    }

    if (winnerId === fixture.awayTeamId) {
      return getTeam(fixture.homeTeamId)
    }

    return null
  }

  /*
   * For now playoffs are built from completed fixtures.
   *
   * The latest completed matches are used to populate
   * the playoff rounds.
   */

  const quarterFinals = completedFixtures.slice(0, 4)
  const semiFinals = completedFixtures.slice(4, 6)
  const finalMatch = completedFixtures[6]

  const champion = finalMatch
    ? getWinner(finalMatch)
    : null

  return (
    <section className="playoffs-page">

      <PageHeader
        title="Playoffs"
        description="Follow the road to the SBT MAJOR championship."
      />

      <div className="playoffs-summary">

        <div className="glass-card playoff-summary-card">
          <FaUsers />
          <div>
            <span>Teams</span>
            <strong>{teams.length}</strong>
          </div>
        </div>

        <div className="glass-card playoff-summary-card">
          <FaTrophy />
          <div>
            <span>Completed Matches</span>
            <strong>{completedFixtures.length}</strong>
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

      {teams.length < 4 ? (
        <section className="glass-card playoff-empty">
          <FaUsers />
          <h2>Not enough teams</h2>
          <p>
            Create at least 4 teams to start the playoff bracket.
          </p>
        </section>
      ) : (
        <div className="playoff-bracket">

          {/* QUARTER FINALS */}

          <section className="playoff-round">

            <header className="playoff-round-header">
              <span>Round 1</span>
              <h2>Quarter Finals</h2>
            </header>

            {[0, 1, 2, 3].map((index) => {
              const fixture = quarterFinals[index]
              const winner = getWinner(fixture)

              return (
                <article
                  className="glass-card playoff-match"
                  key={fixture?.id || `quarter-${index}`}
                >

                  <span className="playoff-match-number">
                    QF {index + 1}
                  </span>

                  {fixture ? (
                    <>
                      <div
                        className={
                          fixture.winnerId === fixture.homeTeamId
                            ? 'playoff-team winner'
                            : 'playoff-team'
                        }
                      >
                        <span>
                          {getTeam(fixture.homeTeamId)?.name ||
                            'Unknown Team'}
                        </span>

                        {fixture.winnerId === fixture.homeTeamId && (
                          <FaTrophy />
                        )}
                      </div>

                      <div className="playoff-vs">
                        VS
                      </div>

                      <div
                        className={
                          fixture.winnerId === fixture.awayTeamId
                            ? 'playoff-team winner'
                            : 'playoff-team'
                        }
                      >
                        <span>
                          {getTeam(fixture.awayTeamId)?.name ||
                            'Unknown Team'}
                        </span>

                        {fixture.winnerId === fixture.awayTeamId && (
                          <FaTrophy />
                        )}
                      </div>

                      <small className="playoff-status">
                        Winner: {winner?.name || 'TBD'}
                      </small>
                    </>
                  ) : (
                    <div className="playoff-tbd">
                      <strong>TBD</strong>
                      <span>Waiting for result</span>
                    </div>
                  )}

                </article>
              )
            })}

          </section>

          {/* SEMI FINALS */}

          <section className="playoff-round">

            <header className="playoff-round-header">
              <span>Round 2</span>
              <h2>Semi Finals</h2>
            </header>

            {[0, 1].map((index) => {
              const fixture = semiFinals[index]
              const winner = getWinner(fixture)

              return (
                <article
                  className="glass-card playoff-match"
                  key={fixture?.id || `semi-${index}`}
                >

                  <span className="playoff-match-number">
                    SF {index + 1}
                  </span>

                  {fixture ? (
                    <>
                      <div
                        className={
                          fixture.winnerId === fixture.homeTeamId
                            ? 'playoff-team winner'
                            : 'playoff-team'
                        }
                      >
                        <span>
                          {getTeam(fixture.homeTeamId)?.name ||
                            'Unknown Team'}
                        </span>

                        {fixture.winnerId === fixture.homeTeamId && (
                          <FaTrophy />
                        )}
                      </div>

                      <div className="playoff-vs">
                        VS
                      </div>

                      <div
                        className={
                          fixture.winnerId === fixture.awayTeamId
                            ? 'playoff-team winner'
                            : 'playoff-team'
                        }
                      >
                        <span>
                          {getTeam(fixture.awayTeamId)?.name ||
                            'Unknown Team'}
                        </span>

                        {fixture.winnerId === fixture.awayTeamId && (
                          <FaTrophy />
                        )}
                      </div>

                      <small className="playoff-status">
                        Winner: {winner?.name || 'TBD'}
                      </small>
                    </>
                  ) : (
                    <div className="playoff-tbd">
                      <strong>TBD</strong>
                      <span>Waiting for result</span>
                    </div>
                  )}

                </article>
              )
            })}

          </section>

          {/* FINAL */}

          <section className="playoff-round final-round">

            <header className="playoff-round-header">
              <span>Grand Final</span>
              <h2>Final</h2>
            </header>

            <article className="glass-card playoff-match final-match">

              <span className="playoff-match-number">
                FINAL
              </span>

              {finalMatch ? (
                <>
                  <div
                    className={
                      finalMatch.winnerId === finalMatch.homeTeamId
                        ? 'playoff-team winner'
                        : 'playoff-team'
                    }
                  >
                    <span>
                      {getTeam(finalMatch.homeTeamId)?.name ||
                        'Unknown Team'}
                    </span>

                    {finalMatch.winnerId === finalMatch.homeTeamId && (
                      <FaTrophy />
                    )}
                  </div>

                  <div className="playoff-vs">
                    VS
                  </div>

                  <div
                    className={
                      finalMatch.winnerId === finalMatch.awayTeamId
                        ? 'playoff-team winner'
                        : 'playoff-team'
                    }
                  >
                    <span>
                      {getTeam(finalMatch.awayTeamId)?.name ||
                        'Unknown Team'}
                    </span>

                    {finalMatch.winnerId === finalMatch.awayTeamId && (
                      <FaTrophy />
                    )}
                  </div>

                  <div className="champion-box">

                    <FaTrophy />

                    <span>Champion</span>

                    <strong>
                      {champion?.name || 'TBD'}
                    </strong>

                  </div>

                </>
              ) : (
                <div className="playoff-tbd">
                  <strong>Final TBD</strong>
                  <span>
                    Complete the semi finals first.
                  </span>
                </div>
              )}

            </article>

          </section>

        </div>
      )}

      {completedFixtures.length === 0 && teams.length >= 4 && (
        <section className="glass-card playoff-empty">

          <FaTrophy />

          <h2>No playoff results yet</h2>

          <p>
            Complete fixtures and select a winning team.
            The playoff results will appear here automatically.
          </p>

        </section>
      )}

    </section>
  )
}

export default Playoffs