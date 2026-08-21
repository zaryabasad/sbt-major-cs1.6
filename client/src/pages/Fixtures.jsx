import { useState } from 'react'
import { FaEdit, FaPlus, FaRandom, FaTrash } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

import FixtureModal from '../components/FixtureModal'
import { useFixtures } from '../context/FixturesContext'
import { useTeams } from '../context/TeamsContext'

function generateRoundRobin(teams, date, time, format) {
  const rotation = [...teams]

  if (rotation.length % 2) {
    rotation.push(null)
  }

  const totalRounds = rotation.length - 1
  const matches = []

  const start = new Date(`${date}T${time}`)

  for (let round = 0; round < totalRounds; round += 1) {
    for (
      let index = 0;
      index < rotation.length / 2;
      index += 1
    ) {
      const home = rotation[index]
      const away = rotation[rotation.length - 1 - index]

      if (home && away) {
        const matchDate = new Date(start)

        matchDate.setMinutes(
          start.getMinutes() + matches.length * 75
        )

        matches.push({
          id: crypto.randomUUID(),
          round: round + 1,
          homeTeamId: home.id,
          awayTeamId: away.id,
          date: matchDate.toISOString().slice(0, 10),
          time: matchDate.toTimeString().slice(0, 5),
          format,
          status: 'Upcoming',
          winnerId: '',
        })
      }
    }

    rotation.splice(1, 0, rotation.pop())
  }

  return matches
}

function Fixtures() {
  const { teams } = useTeams()
  const { isAdmin, isSuperAdmin } = useAuth()

  const {
    fixtures,
    replaceFixtures,
    updateFixture,
  } = useFixtures()

  const [selectedFixture, setSelectedFixture] = useState(null)
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isClearingPool, setIsClearingPool] = useState(false)

  const [generator, setGenerator] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '18:00',
    format: 'BO1',
  })

  const getTeam = (id) => teams.find((team) => team.id === id)

  const generateFixtures = async (event) => {
    if (!isSuperAdmin) {
      toast.error('Only the Super Admin can generate fixtures')
      return
    }

    event.preventDefault()

    if (teams.length < 2) {
      toast.error('Create at least two teams before generating fixtures')
      return
    }

    const newFixtures = generateRoundRobin(
      teams,
      generator.date,
      generator.time,
      generator.format
    )

    try {
      await replaceFixtures(newFixtures)
      setIsGeneratorOpen(false)
      toast.success(`${newFixtures.length} Round Robin fixtures generated`)
    } catch (error) {
      toast.error(error?.message || 'Failed to generate fixtures')
    }
  }

  const clearFixtures = async () => {
    if (!isSuperAdmin || isClearing) return

    if (fixtures.length === 0) {
      toast.error('There are no fixtures to clear')
      return
    }

    const confirmed = window.confirm(
      `Clear all ${fixtures.length} fixtures? This will permanently remove the current schedule.`
    )

    if (!confirmed) return

    setIsClearing(true)

    try {
      await replaceFixtures([])
      setSelectedFixture(null)
      toast.success('All fixtures cleared')
    } catch (error) {
      toast.error(error?.message || 'Failed to clear fixtures')
    } finally {
      setIsClearing(false)
    }
  }

  const clearPoolFixtures = async () => {
    if (!isSuperAdmin || isClearingPool) return

    const poolFixtures = fixtures.filter(
      (fixture) => String(fixture.pool || '').trim()
    )

    if (poolFixtures.length === 0) {
      toast.error('No Pool A/B fixtures found to clear')
      return
    }

    const confirmed = window.confirm(
      `Clear all ${poolFixtures.length} Pool A/B fixtures? Other fixtures will remain.`
    )

    if (!confirmed) return

    setIsClearingPool(true)

    try {
      const remainingFixtures = fixtures.filter(
        (fixture) => !String(fixture.pool || '').trim()
      )

      await replaceFixtures(remainingFixtures)
      setSelectedFixture(null)
      toast.success('Pool fixtures cleared')
    } catch (error) {
      toast.error(error?.message || 'Failed to clear pool fixtures')
    } finally {
      setIsClearingPool(false)
    }
  }

  const saveFixture = async (fixture) => {
    if (!isSuperAdmin) {
      toast.error('Only the Super Admin can edit fixtures')
      return
    }

    try {
      await updateFixture(fixture)
      setSelectedFixture(null)
      toast.success('Fixture updated')
    } catch (error) {
      toast.error(error?.message || 'Failed to update fixture')
    }
  }

  return (
    <section className="fixtures-page">
      <style>{`
        .fixtures-readonly-note {
          padding: 6px 9px;
          border: 1px solid rgba(112,157,235,.20);
          border-radius: 6px;
          color: #9eb7e6;
          background: rgba(65,105,180,.06);
          font-size: .56rem;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .fixtures-heading-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .fixtures-clear-button {
          color: #ff9aa5;
          border-color: rgba(255,48,72,.22);
          background: rgba(255,48,72,.05);
        }

        .fixtures-clear-button:hover {
          color: #fff;
          border-color: rgba(255,48,72,.42);
          background: rgba(255,48,72,.10);
        }

        .fixtures-pool-clear-button {
          color: #f3c747;
          border-color: rgba(243,199,71,.22);
          background: rgba(243,199,71,.05);
        }

        .fixtures-pool-clear-button:hover {
          color: #171207;
          border-color: rgba(243,199,71,.45);
          background: rgba(243,199,71,.16);
        }
      `}</style>

      <header className="fixtures-heading">
        <div>
          <p className="eyebrow">SBT Major · Tournament Schedule</p>
          <h1>Fixtures</h1>
          <p>Generate and manage the tournament's Round Robin stage.</p>
        </div>

        {isAdmin && !isSuperAdmin && (
          <div className="fixtures-readonly-note">Team Admin · Read Only</div>
        )}

        {isSuperAdmin && (
          <div className="fixtures-heading-actions">
            <button
              className="button button-secondary fixtures-pool-clear-button"
              type="button"
              onClick={clearPoolFixtures}
              disabled={isClearingPool}
            >
              <FaTrash />
              {isClearingPool ? 'Clearing Pool…' : 'Clear Pool'}
            </button>

            {fixtures.length > 0 && (
              <button
                className="button button-secondary fixtures-clear-button"
                type="button"
                onClick={clearFixtures}
                disabled={isClearing}
              >
                <FaTrash />
                {isClearing ? 'Clearing…' : 'Clear Fixtures'}
              </button>
            )}

            <button
              className="button button-primary"
              type="button"
              onClick={() => setIsGeneratorOpen(true)}
            >
              <FaRandom />
              Generate Round Robin
            </button>
          </div>
        )}
      </header>

      {fixtures.length === 0 ? (
        <section className="empty-teams glass-card">
          <FaPlus />
          <h2>No fixtures generated</h2>
          <p>Create a Round Robin schedule from your existing team roster.</p>

          {isSuperAdmin && (
            <button
              className="button button-primary"
              type="button"
              onClick={() => setIsGeneratorOpen(true)}
            >
              <FaRandom />
              Generate Fixtures
            </button>
          )}
        </section>
      ) : (
        <div className="fixtures-list">
          {fixtures.map((fixture) => {
            const home = getTeam(fixture.homeTeamId)
            const away = getTeam(fixture.awayTeamId)
            const winner = getTeam(fixture.winnerId)

            return (
              <article
                className={`fixture-card glass-card ${
                  fixture.status === 'Completed' ? 'fixture-completed' : ''
                }`}
                key={fixture.id}
              >
                <div className="fixture-top">
                  <span>
                    {fixture.pool ? `Pool ${fixture.pool}` : `Round ${fixture.round}`}
                  </span>
                  <span>{fixture.date} · {fixture.time}</span>
                </div>

                <div className="fixture-match">
                  <strong className={winner?.id === home?.id ? 'winner' : ''}>
                    {home?.name || 'Deleted Team'}
                  </strong>
                  <span className="fixture-vs">VS</span>
                  <strong className={winner?.id === away?.id ? 'winner' : ''}>
                    {away?.name || 'Deleted Team'}
                  </strong>
                </div>

                <div className="fixture-bottom">
                  <span className="fixture-format">{fixture.format}</span>
                  <div className="fixture-score">
                    <span>{fixture.homeScore ?? 0}</span>
                    <b>:</b>
                    <span>{fixture.awayScore ?? 0}</span>
                  </div>
                  <span className={fixture.status === 'Completed' ? 'fixture-status completed' : 'fixture-status'}>
                    {fixture.status === 'Completed'
                      ? `Winner: ${winner?.name || 'Winner pending'}`
                      : 'Upcoming'}
                  </span>
                  {isSuperAdmin && (
                    <button
                      className="icon-button"
                      type="button"
                      onClick={() => setSelectedFixture(fixture)}
                      aria-label="Edit fixture"
                    >
                      <FaEdit />
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {isSuperAdmin && isGeneratorOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setIsGeneratorOpen(false)}
        >
          <section
            className="team-modal fixture-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="generator-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">Tournament Schedule</p>
                <h2 id="generator-title">Generate Round Robin</h2>
              </div>
            </header>

            <form onSubmit={generateFixtures}>
              <p>
                {teams.length} teams will produce{' '}
                {teams.length > 1 ? (teams.length * (teams.length - 1)) / 2 : 0}{' '}
                fixtures.
              </p>
              <p>Matches are scheduled 75 minutes apart.</p>

              <label>
                First Match Date
                <input
                  type="date"
                  value={generator.date}
                  onChange={(event) => setGenerator({ ...generator, date: event.target.value })}
                  required
                />
              </label>

              <label>
                First Match Time
                <input
                  type="time"
                  value={generator.time}
                  onChange={(event) => setGenerator({ ...generator, time: event.target.value })}
                  required
                />
              </label>

              <label>
                Match Format
                <select
                  value={generator.format}
                  onChange={(event) => setGenerator({ ...generator, format: event.target.value })}
                >
                  <option value="BO1">BO1</option>
                  <option value="BO3">BO3</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setIsGeneratorOpen(false)}
                >
                  Cancel
                </button>
                <button className="button button-primary" type="submit">
                  Generate Fixtures
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isSuperAdmin && selectedFixture && (
        <FixtureModal
          fixture={selectedFixture}
          teams={teams}
          onClose={() => setSelectedFixture(null)}
          onSave={saveFixture}
        />
      )}
    </section>
  )
}

export default Fixtures
