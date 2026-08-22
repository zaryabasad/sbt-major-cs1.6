import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaCalendarAlt, FaTrophy, FaChartLine } from 'react-icons/fa'

import AnimatedBackground from '../components/AnimatedBackground'
import EsportsIllustration from '../components/EsportsIllustration'
import FeatureGrid from '../components/FeatureGrid'
import Footer from '../components/Footer'
import StatCards from '../components/StatCards'

import { useTeams } from '../context/TeamsContext'
import { useFixtures } from '../context/FixturesContext'

const PLAYOFF_STORAGE_KEY = 'sbt-major-pools-playoffs'

function Home() {
  const { teams } = useTeams()
  const { fixtures } = useFixtures()

  const completedFixtures = useMemo(
    () =>
      fixtures.filter(
        (fixture) => fixture.status === 'Completed'
      ),
    [fixtures]
  )

  const upcomingFixtures = useMemo(
    () =>
      fixtures
        .filter(
          (fixture) => fixture.status !== 'Completed'
        )
        .sort((a, b) =>
          `${a.date || ''} ${a.time || ''}`.localeCompare(
            `${b.date || ''} ${b.time || ''}`
          )
        ),
    [fixtures]
  )

  const teamStats = useMemo(() => {
    const rows = teams.map((team) => ({
      ...team,
      played: 0,
      wins: 0,
      losses: 0,
      roundsFor: 0,
      roundsAgainst: 0,
      roundDifference: 0,
      points: 0,
    }))

    const getRow = (id) =>
      rows.find((team) => team.id === id)

    completedFixtures.forEach((fixture) => {
      const home = getRow(fixture.homeTeamId)
      const away = getRow(fixture.awayTeamId)

      if (!home || !away) return

      const homeScore = Number(fixture.homeScore || 0)
      const awayScore = Number(fixture.awayScore || 0)

      home.played += 1
      away.played += 1

      home.roundsFor += homeScore
      home.roundsAgainst += awayScore

      away.roundsFor += awayScore
      away.roundsAgainst += homeScore

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

    rows.forEach((team) => {
      team.roundDifference =
        team.roundsFor - team.roundsAgainst
    })

    return rows.sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.roundDifference - a.roundDifference ||
        b.roundsFor - a.roundsFor
    )
  }, [teams, completedFixtures])

  const nextMatch = upcomingFixtures[0]
  const lastResult =
    completedFixtures[completedFixtures.length - 1]

  const getTeam = (id) =>
    teams.find((team) => team.id === id)

  const nextHome = nextMatch
    ? getTeam(nextMatch.homeTeamId)
    : null

  const nextAway = nextMatch
    ? getTeam(nextMatch.awayTeamId)
    : null

  const resultHome = lastResult
    ? getTeam(lastResult.homeTeamId)
    : null

  const resultAway = lastResult
    ? getTeam(lastResult.awayTeamId)
    : null

  let champion = null

  try {
    const savedPlayoff = JSON.parse(
      localStorage.getItem(
        PLAYOFF_STORAGE_KEY
      ) || 'null'
    )

    champion = savedPlayoff?.finalWinner
      ? getTeam(
          savedPlayoff.finalWinner
        )
      : null
  } catch {
    champion = null
  }

  return (
    <div className="home-page">
      <AnimatedBackground />

      <section className="home-hero">
        <motion.div
          className="hero-copy"
          initial={{
            opacity: 0,
            x: -28,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          transition={{
            duration: 0.7,
          }}
        >
          <p className="eyebrow">
            Counter-Strike 1.6 Tournament
          </p>

          <h1>
            SBT MAJOR <span>CS 1.6</span>
          </h1>

          <p className="page-description">
            Pakistan's Ultimate Counter Strike 1.6
            Auction Tournament
          </p>

          <div className="hero-actions">
            <Link
              className="button button-primary"
              to="/auction"
            >
              Enter Auction
            </Link>

            <Link
              className="button button-secondary"
              to="/teams"
            >
              View Teams
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0,
            scale: 0.85,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          transition={{
            duration: 0.8,
            delay: 0.15,
          }}
        >
          <EsportsIllustration />
        </motion.div>
      </section>

      <StatCards />

      {/* NEXT MATCH + RECENT RESULT */}

      <section className="home-tournament-grid">
        <motion.article
          className="glass-card home-match-card"
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{ once: true }}
        >
          <div className="home-card-heading">
            <div>
              <span className="eyebrow">
                NEXT MATCH
              </span>

              <h2>
                {nextMatch
                  ? 'Upcoming Fixture'
                  : 'No Upcoming Match'}
              </h2>
            </div>

            <FaCalendarAlt />
          </div>

          {nextMatch ? (
            <>
              <div className="home-match-teams">
                <strong>
                  {nextHome?.name ||
                    'Deleted Team'}
                </strong>

                <span>VS</span>

                <strong>
                  {nextAway?.name ||
                    'Deleted Team'}
                </strong>
              </div>

              <div className="home-match-meta">
                <span>
                  Round {nextMatch.round}
                </span>

                <span>
                  {nextMatch.date} ·{' '}
                  {nextMatch.time}
                </span>

                <span>
                  {nextMatch.format}
                </span>
              </div>

              <Link
                className="button button-secondary"
                to="/fixtures"
              >
                View Fixtures
              </Link>
            </>
          ) : (
            <p>
              There are currently no upcoming
              fixtures.
            </p>
          )}
        </motion.article>

        <motion.article
          className="glass-card home-match-card"
          initial={{
            opacity: 0,
            y: 20,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{ once: true }}
        >
          <div className="home-card-heading">
            <div>
              <span className="eyebrow">
                RECENT RESULT
              </span>

              <h2>
                {lastResult
                  ? 'Latest Match'
                  : 'No Results Yet'}
              </h2>
            </div>

            <FaTrophy />
          </div>

          {lastResult ? (
            <>
              <div className="home-match-teams">
                <strong>
                  {resultHome?.name ||
                    'Deleted Team'}
                </strong>

                <span className="home-result-score">
                  {lastResult.homeScore} :{' '}
                  {lastResult.awayScore}
                </span>

                <strong>
                  {resultAway?.name ||
                    'Deleted Team'}
                </strong>
              </div>

              <div className="home-match-meta">
                <span>
                  Round {lastResult.round}
                </span>

                <span>
                  {lastResult.format}
                </span>
              </div>

              <Link
                className="button button-secondary"
                to="/stats"
              >
                View Statistics
              </Link>
            </>
          ) : (
            <p>
              Completed match results will
              appear here.
            </p>
          )}
        </motion.article>
      </section>

      {/* LIVE STANDINGS */}

      <section className="glass-card home-standings-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              LIVE TOURNAMENT
            </span>

            <h2>Current Standings</h2>
          </div>

          <FaChartLine />
        </div>

        {teamStats.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>L</th>
                  <th>MR</th>
                  <th>PTS</th>
                </tr>
              </thead>

              <tbody>
                {teamStats
                  .slice(0, 6)
                  .map((team, index) => (
                    <tr key={team.id}>
                      <td>
                        <strong>
                          #{index + 1}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {team.name}
                        </strong>
                      </td>

                      <td>
                        {team.played}
                      </td>

                      <td>
                        {team.wins}
                      </td>

                      <td>
                        {team.losses}
                      </td>

                      <td>
                        {team.roundDifference >= 0
                          ? `+${team.roundDifference}`
                          : team.roundDifference}
                      </td>

                      <td>
                        <strong>
                          {team.points}
                        </strong>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            Create teams to start the tournament
            standings.
          </p>
        )}

        <div className="home-section-action">
          <Link
            className="button button-secondary"
            to="/stats"
          >
            Full Statistics
          </Link>
        </div>
      </section>

      {/* CHAMPION */}

      {champion && (
        <motion.section
          className="home-champion glass-card"
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          whileInView={{
            opacity: 1,
            scale: 1,
          }}
          viewport={{ once: true }}
        >
          <FaTrophy />

          <span className="eyebrow">
            SBT MAJOR CHAMPION
          </span>

          <h2>{champion.name}</h2>

          <p>
            Congratulations to the tournament
            champion!
          </p>

          <Link
            className="button button-secondary"
            to="/playoffs"
          >
            View Playoffs
          </Link>
        </motion.section>
      )}

      <FeatureGrid />

      <Footer />
    </div>
  )
}

export default Home