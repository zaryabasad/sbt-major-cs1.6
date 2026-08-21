import { useMemo, useState } from 'react'
import { FaEdit, FaRandom, FaTrash, FaUsers } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { useFixtures } from '../context/FixturesContext'
import { useTeams } from '../context/TeamsContext'
import Fixtures from './Fixtures'

function getPools(teams) {
  const ordered = [...teams].sort((a, b) => {
    const nameCompare = String(a.name || '').localeCompare(String(b.name || ''))
    return nameCompare || String(a.id).localeCompare(String(b.id))
  })

  return {
    poolA: [ordered[0], ordered[2], ordered[4]].filter(Boolean),
    poolB: [ordered[1], ordered[3], ordered[5]].filter(Boolean),
  }
}

function generatePoolFixtures(poolA, poolB, date, time) {
  const matches = []
  const start = new Date(`${date}T${time}`)

  for (let round = 0; round < 3; round += 1) {
    for (let index = 0; index < 3; index += 1) {
      const home = poolA[index]
      const away = poolB[(index + round) % 3]
      const offset = matches.length * 75
      const matchDate = new Date(start)
      matchDate.setMinutes(start.getMinutes() + offset)

      matches.push({
        id: crypto.randomUUID(),
        round: round + 1,
        pool: 'A-B',
        homeTeamId: home.id,
        awayTeamId: away.id,
        date: matchDate.toISOString().slice(0, 10),
        time: matchDate.toTimeString().slice(0, 5),
        format: 'BO1',
        status: 'Upcoming',
        homeScore: 0,
        awayScore: 0,
        winnerId: '',
      })
    }
  }

  return matches
}

function PoolFixtures() {
  const { teams } = useTeams()
  const {
    fixtures,
    replaceFixtures,
    clearPoolFixtures,
    updateFixture,
  } = useFixtures()
  const { isAdmin, isSuperAdmin } = useAuth()

  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [isClearing, setIsClearing] = useState(false)
  const [generator, setGenerator] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '18:00',
  })
  const [draft, setDraft] = useState(null)

  const { poolA, poolB } = useMemo(() => getPools(teams), [teams])
  const poolFixtures = useMemo(
    () => fixtures.filter((fixture) => fixture.pool === 'A-B'),
    [fixtures],
  )
  const hasPools = poolFixtures.length > 0

  if (teams.length !== 6) return <Fixtures />

  const getTeam = (id) => teams.find((team) => team.id === id)
  const stageReady = poolFixtures.length === 9
  const completedCount = poolFixtures.filter(
    (fixture) => fixture.status === 'Completed' && fixture.winnerId,
  ).length

  const generate = async (event) => {
    event.preventDefault()
    if (!isSuperAdmin) return

    if (teams.length !== 6) {
      toast.error('The pool format requires exactly 6 teams.')
      return
    }

    const nextFixtures = generatePoolFixtures(
      poolA,
      poolB,
      generator.date,
      generator.time,
    )

    try {
      await replaceFixtures(nextFixtures)
      setIsGeneratorOpen(false)
      toast.success('2 pools created · 9 BO1 cross-pool fixtures generated')
    } catch (error) {
      toast.error(error?.message || 'Could not generate pool fixtures')
    }
  }

  const clearPools = async () => {
    if (!isSuperAdmin || isClearing) return

    const confirmed = window.confirm(
      'Clear Pool A and Pool B? This will remove all 9 pool fixtures, but will keep teams, players and auction data.'
    )
    if (!confirmed) return

    try {
      setIsClearing(true)
      await clearPoolFixtures()
      setEditing(null)
      setDraft(null)
      toast.success('Pool A and Pool B cleared')
    } catch (error) {
      toast.error(error?.message || 'Could not clear pools')
    } finally {
      setIsClearing(false)
    }
  }

  const openEdit = (fixture) => {
    if (!isSuperAdmin) return
    setEditing(fixture)
    setDraft({
      homeScore: Number(fixture.homeScore ?? 0),
      awayScore: Number(fixture.awayScore ?? 0),
      status: fixture.status || 'Upcoming',
    })
  }

  const saveEdit = async () => {
    if (!editing || !draft || !isSuperAdmin) return

    const homeScore = Number(draft.homeScore)
    const awayScore = Number(draft.awayScore)

    if (
      !Number.isFinite(homeScore) ||
      !Number.isFinite(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      toast.error('Enter valid scores')
      return
    }

    if (draft.status === 'Completed' && homeScore === awayScore) {
      toast.error('A completed BO1 match must have a winner.')
      return
    }

    const winnerId =
      draft.status === 'Completed'
        ? homeScore > awayScore
          ? editing.homeTeamId
          : editing.awayTeamId
        : ''

    try {
      await updateFixture({
        ...editing,
        homeScore,
        awayScore,
        status: draft.status,
        winnerId,
      })
      toast.success('Match result updated')
      setEditing(null)
      setDraft(null)
    } catch (error) {
      toast.error(error?.message || 'Could not update match')
    }
  }

  const renderPool = (name, pool) => (
    <section className="glass-card" key={name}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <FaUsers />
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>POOL {name}</p>
          <h2 style={{ margin: 0 }}>{pool.map((team) => team?.name).join(' · ')}</h2>
        </div>
      </header>
      <div style={{ display: 'grid', gap: 8 }}>
        {pool.map((team, index) => (
          <div
            key={team.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '10px 12px',
              border: '1px solid rgba(255,255,255,.06)',
              borderRadius: 8,
            }}
          >
            <strong>#{index + 1} {team.name}</strong>
            <span style={{ color: '#7e8795', fontSize: '.7rem' }}>Pool {name}</span>
          </div>
        ))}
      </div>
    </section>
  )

  return (
    <section className="fixtures-page">
      <style>{`
        .pool-fixture-grid{display:grid;gap:12px}
        .pool-fixture-card{padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.018)}
        .pool-fixture-top,.pool-fixture-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
        .pool-fixture-top{color:#7d8795;font-size:.64rem;text-transform:uppercase;letter-spacing:.06em}
        .pool-fixture-match{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;margin:14px 0;font-size:.9rem}
        .pool-fixture-match strong:last-child{text-align:right}
        .pool-fixture-vs{color:#f3c747;font-weight:900}
        .pool-fixture-done{border-color:rgba(72,210,127,.25)}
        .pool-stage-note{margin:0 0 16px;padding:10px 13px;border:1px solid rgba(243,199,71,.18);border-radius:8px;color:#d8c37f;background:rgba(243,199,71,.04);font-size:.68rem;line-height:1.5}
        .pool-controls{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}
      `}</style>

      <header className="fixtures-heading">
        <div>
          <p className="eyebrow">SBT MAJOR · POOL STAGE</p>
          <h1>Pool A vs Pool B</h1>
          <p>6 teams → 2 pools of 3 → every team plays the opposite pool once.</p>
        </div>

        {isAdmin && !isSuperAdmin && (
          <div className="fixtures-readonly-note">Team Admin · Read Only</div>
        )}

        {isSuperAdmin && (
          <div className="pool-controls">
            {hasPools && (
              <button
                className="button button-secondary"
                type="button"
                onClick={clearPools}
                disabled={isClearing}
                title="Remove Pool A and Pool B"
              >
                <FaTrash /> {isClearing ? 'Clearing…' : 'Clear Pools'}
              </button>
            )}
            <button
              className="button button-primary"
              type="button"
              onClick={() => setIsGeneratorOpen(true)}
            >
              <FaRandom /> {hasPools ? 'Regenerate Pool Stage' : 'Generate Pool Stage'}
            </button>
          </div>
        )}
      </header>

      <p className="pool-stage-note">
        Pool A and Pool B each contain 3 teams. Each team plays all 3 teams from the opposite pool once, giving 9 BO1 matches total. Top 2 from each pool advance to the Semi Finals.
      </p>

      {!hasPools ? (
        <section className="glass-card playoff-empty">
          <FaRandom />
          <h2>No pools created</h2>
          <p>Pool A and Pool B are currently cleared. Generate the 9 cross-pool BO1 fixtures when you are ready.</p>
        </section>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14, marginBottom: 18 }}>
            {renderPool('A', poolA)}
            {renderPool('B', poolB)}
          </div>

          <div className="pool-fixture-grid">
            {[1, 2, 3].map((round) => (
              <section className="glass-card" key={round}>
                <p className="eyebrow">ROUND {round}</p>
                <div className="pool-fixture-grid">
                  {poolFixtures.filter((fixture) => fixture.round === round).map((fixture) => {
                    const home = getTeam(fixture.homeTeamId)
                    const away = getTeam(fixture.awayTeamId)
                    const completed = fixture.status === 'Completed' && fixture.winnerId

                    return (
                      <article
                        className={`pool-fixture-card ${completed ? 'pool-fixture-done' : ''}`}
                        key={fixture.id}
                      >
                        <div className="pool-fixture-top">
                          <span>{fixture.date} · {fixture.time}</span>
                          <span>{fixture.format}</span>
                        </div>

                        <div className="pool-fixture-match">
                          <strong>
                            {home?.name || 'TBD'} {completed && fixture.winnerId === home?.id ? '✓' : ''}
                          </strong>
                          <span className="pool-fixture-vs">VS</span>
                          <strong>
                            {away?.name || 'TBD'} {completed && fixture.winnerId === away?.id ? '✓' : ''}
                          </strong>
                        </div>

                        <div className="pool-fixture-bottom">
                          <span>{fixture.homeScore ?? 0} : {fixture.awayScore ?? 0}</span>
                          <span>
                            {completed
                              ? `Winner: ${getTeam(fixture.winnerId)?.name || 'TBD'}`
                              : 'Upcoming'}
                          </span>
                          {isSuperAdmin && (
                            <button
                              className="icon-button"
                              type="button"
                              onClick={() => openEdit(fixture)}
                              aria-label="Edit match"
                            >
                              <FaEdit />
                            </button>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {stageReady && (
            <section className="glass-card" style={{ marginTop: 16 }}>
              <strong>{completedCount}/9 pool matches completed</strong>
              <p style={{ margin: '6px 0 0' }}>
                When all 9 are complete, the top 2 teams from Pool A and Pool B can advance to the Semi Finals.
              </p>
            </section>
          )}
        </>
      )}

      {isSuperAdmin && isGeneratorOpen && (
        <div className="modal-backdrop" onMouseDown={() => setIsGeneratorOpen(false)}>
          <section
            className="team-modal fixture-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Tournament Schedule</p>
            <h2>Generate 2-Pool Stage</h2>
            <p>Exactly 6 teams will be split into Pool A and Pool B. 9 BO1 matches will be generated.</p>

            <form onSubmit={generate}>
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

              <div className="modal-actions">
                <button className="button button-secondary" type="button" onClick={() => setIsGeneratorOpen(false)}>
                  Cancel
                </button>
                <button className="button button-primary" type="submit">
                  Generate 9 Fixtures
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {isSuperAdmin && editing && draft && (
        <div className="modal-backdrop" onMouseDown={() => setEditing(null)}>
          <section
            className="team-modal fixture-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Match Result</p>
            <h2>{getTeam(editing.homeTeamId)?.name} vs {getTeam(editing.awayTeamId)?.name}</h2>

            <label>
              Home Score
              <input
                type="number"
                min="0"
                value={draft.homeScore}
                onChange={(event) => setDraft({ ...draft, homeScore: event.target.value })}
              />
            </label>

            <label>
              Away Score
              <input
                type="number"
                min="0"
                value={draft.awayScore}
                onChange={(event) => setDraft({ ...draft, awayScore: event.target.value })}
              />
            </label>

            <label>
              Status
              <select
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              >
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
              </select>
            </label>

            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="button button-primary" type="button" onClick={saveEdit}>
                Save Result
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

export default PoolFixtures
