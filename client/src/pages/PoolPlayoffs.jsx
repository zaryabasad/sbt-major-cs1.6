import { useEffect, useMemo, useState } from 'react'
import { FaMedal, FaTrophy, FaUsers } from 'react-icons/fa'
import PageHeader from '../components/PageHeader'
import { useFixtures } from '../context/FixturesContext'
import { useTeams } from '../context/TeamsContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Playoffs from './Playoffs'

const PLAYOFF_STORAGE_KEY = 'sbt-major-playoffs'

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

function readLocalState() {
  try {
    return JSON.parse(localStorage.getItem(PLAYOFF_STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

function calculateStandings(pool, fixtures) {
  return pool.map((team) => {
    let played = 0
    let wins = 0
    let losses = 0
    let roundsFor = 0
    let roundsAgainst = 0

    fixtures.forEach((fixture) => {
      if (fixture.homeTeamId !== team.id && fixture.awayTeamId !== team.id) return
      if (fixture.status !== 'Completed' || !fixture.winnerId) return

      played += 1
      const homeScore = Number(fixture.homeScore || 0)
      const awayScore = Number(fixture.awayScore || 0)

      if (fixture.homeTeamId === team.id) {
        roundsFor += homeScore
        roundsAgainst += awayScore
      } else {
        roundsFor += awayScore
        roundsAgainst += homeScore
      }

      if (fixture.winnerId === team.id) wins += 1
      else losses += 1
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
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.mr !== a.mr) return b.mr - a.mr
    if (b.roundsFor !== a.roundsFor) return b.roundsFor - a.roundsFor
    return String(a.name).localeCompare(String(b.name))
  })
}

function PoolPlayoffs() {
  const { teams } = useTeams()
  const { fixtures } = useFixtures()
  const { isAdmin, isSuperAdmin } = useAuth()
  const [playoff, setPlayoff] = useState(readLocalState)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isPoolStage = teams.length === 6
  const { poolA, poolB } = useMemo(() => getPools(teams), [teams])
  const poolFixtures = useMemo(() => fixtures.filter((fixture) => fixture.pool === 'A-B'), [fixtures])
  const completedPoolFixtures = useMemo(
    () => poolFixtures.filter((fixture) => fixture.status === 'Completed' && fixture.winnerId),
    [poolFixtures],
  )

  const standingsA = useMemo(() => calculateStandings(poolA, completedPoolFixtures), [poolA, completedPoolFixtures])
  const standingsB = useMemo(() => calculateStandings(poolB, completedPoolFixtures), [poolB, completedPoolFixtures])
  const qualifiedTeams = useMemo(() => [standingsA[0], standingsA[1], standingsB[0], standingsB[1]].filter(Boolean), [standingsA, standingsB])
  const stageComplete = poolFixtures.length === 9 && completedPoolFixtures.length === 9

  useEffect(() => {
    if (!isPoolStage) return undefined
    let cancelled = false

    async function load() {
      const { data, error } = await supabase
        .from('playoff_state')
        .select('id, state')
        .eq('id', 1)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        console.error('POOL PLAYOFF LOAD ERROR:', error)
        setLoading(false)
        return
      }

      const state = data?.state && data.state.type === '6-pool' ? data.state : null
      setPlayoff(state)
      if (state) localStorage.setItem(PLAYOFF_STORAGE_KEY, JSON.stringify(state))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [isPoolStage])

  const save = async (nextState) => {
    if (!isSuperAdmin) return false
    setSaving(true)
    const { error } = await supabase.from('playoff_state').upsert({ id: 1, state: nextState })
    setSaving(false)

    if (error) {
      console.error('POOL PLAYOFF SAVE ERROR:', error)
      alert(error.message || 'Failed to save playoff state.')
      return false
    }

    setPlayoff(nextState)
    localStorage.setItem(PLAYOFF_STORAGE_KEY, JSON.stringify(nextState))
    return true
  }

  const generateSemis = async () => {
    if (!isSuperAdmin || !stageComplete || qualifiedTeams.length !== 4) return

    const a1 = standingsA[0]
    const a2 = standingsA[1]
    const b1 = standingsB[0]
    const b2 = standingsB[1]

    const nextState = {
      type: '6-pool',
      pools: {
        A: poolA.map((team) => team.id),
        B: poolB.map((team) => team.id),
      },
      qualified: qualifiedTeams.map((team) => team.id),
      semiFinals: [
        { id: crypto.randomUUID(), homeTeamId: a1.id, awayTeamId: b2.id, winnerId: '' },
        { id: crypto.randomUUID(), homeTeamId: b1.id, awayTeamId: a2.id, winnerId: '' },
      ],
      final: {
        id: crypto.randomUUID(),
        homeTeamId: '',
        awayTeamId: '',
        winnerId: '',
      },
    }

    await save(nextState)
  }

  const setWinner = async (round, index, winnerId) => {
    if (!isSuperAdmin || !playoff || !winnerId) return
    const next = structuredClone(playoff)

    if (round === 'semiFinals') {
      next.semiFinals[index].winnerId = winnerId
      if (index === 0) next.final.homeTeamId = winnerId
      if (index === 1) next.final.awayTeamId = winnerId
      next.final.winnerId = ''
    } else {
      next.final.winnerId = winnerId
    }

    await save(next)
  }

  const reset = async () => {
    if (!isSuperAdmin) return
    const { error } = await supabase.from('playoff_state').delete().eq('id', 1)
    if (error) {
      alert(error.message || 'Failed to reset playoffs.')
      return
    }
    setPlayoff(null)
    localStorage.removeItem(PLAYOFF_STORAGE_KEY)
  }

  if (!isPoolStage) return <Playoffs />

  const getTeam = (id) => teams.find((team) => team.id === id)
  const champion = playoff?.final?.winnerId ? getTeam(playoff.final.winnerId) : null

  const standingsTable = (name, rows) => (
    <section className="glass-card" key={name}>
      <header className="playoff-round-header">
        <div>
          <span>Pool {name}</span>
          <h2>Standings</h2>
        </div>
      </header>
      <div style={{ overflowX: 'auto' }}>
        <table className="leaderboard-table">
          <thead><tr><th>Seed</th><th>Team</th><th>P</th><th>W</th><th>L</th><th>RF</th><th>RA</th><th>MR</th><th>Pts</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((team, index) => (
              <tr key={team.id}>
                <td>#{index + 1}</td>
                <td><strong>{team.name}</strong></td>
                <td>{team.played}</td><td>{team.wins}</td><td>{team.losses}</td>
                <td>{team.roundsFor}</td><td>{team.roundsAgainst}</td>
                <td><strong>{team.mr > 0 ? `+${team.mr}` : team.mr}</strong></td>
                <td><strong>{team.points}</strong></td>
                <td>{index < 2 ? 'QUALIFIED' : 'ELIMINATED'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  const MatchCard = ({ match, round, index, label }) => {
    const home = getTeam(match?.homeTeamId)
    const away = getTeam(match?.awayTeamId)
    const ready = Boolean(home && away)

    return (
      <article className="glass-card playoff-match">
        <span className="playoff-match-number">{label}</span>
        <div className={match?.winnerId === home?.id ? 'playoff-team winner' : 'playoff-team'}><span>{home?.name || 'TBD'}</span>{match?.winnerId === home?.id && <FaTrophy />}</div>
        <div className="playoff-vs">VS</div>
        <div className={match?.winnerId === away?.id ? 'playoff-team winner' : 'playoff-team'}><span>{away?.name || 'TBD'}</span>{match?.winnerId === away?.id && <FaTrophy />}</div>
        {ready && isSuperAdmin ? (
          <label style={{ marginTop: 14 }}>Winner
            <select value={match.winnerId} onChange={(event) => setWinner(round, index, event.target.value)}>
              <option value="">Select winner</option>
              <option value={home.id}>{home.name}</option>
              <option value={away.id}>{away.name}</option>
            </select>
          </label>
        ) : (
          <small className="playoff-status">Waiting for previous round</small>
        )}
      </article>
    )
  }

  return (
    <section className="playoffs-page">
      <PageHeader title="Playoffs" description="6-Team Pool Stage → Top 2 from each pool → Semi Finals → Final." />

      {isAdmin && !isSuperAdmin && (
        <section className="glass-card playoffs-readonly-note"><strong>Team Admin · Read Only</strong><span>Playoff bracket and results are controlled by the Super Admin.</span></section>
      )}

      <div className="playoffs-summary">
        <div className="glass-card playoff-summary-card"><FaUsers /><div><span>Total Teams</span><strong>6</strong></div></div>
        <div className="glass-card playoff-summary-card"><FaMedal /><div><span>Qualified</span><strong>4</strong></div></div>
        <div className="glass-card playoff-summary-card"><FaTrophy /><div><span>Champion</span><strong>{champion?.name || 'TBD'}</strong></div></div>
      </div>

      {standingsTable('A', standingsA)}
      <div style={{ height: 14 }} />
      {standingsTable('B', standingsB)}

      {!loading && !playoff && (
        <section className="glass-card playoff-empty" style={{ marginTop: 14 }}>
          <FaTrophy />
          <h2>{stageComplete ? 'Semi Finals Ready' : 'Complete Pool Stage'}</h2>
          <p>{stageComplete ? 'Top 2 from Pool A face Top 2 from Pool B in cross-pool semi finals.' : `${completedPoolFixtures.length}/9 pool matches completed.`}</p>
          {isSuperAdmin && (
            <button className="button button-primary" onClick={generateSemis} disabled={!stageComplete || saving}>
              {saving ? 'Saving…' : 'Generate Semi Finals'}
            </button>
          )}
        </section>
      )}

      {playoff && (
        <section className="glass-card" style={{ marginTop: 14 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 25 }}>
            <div><p className="eyebrow">Championship Stage</p><h2>Cross-Pool Semi Finals</h2></div>
            {isSuperAdmin && <button className="button button-secondary" onClick={reset} disabled={saving}>Reset Playoffs</button>}
          </header>

          <div className="playoff-bracket">
            <section className="playoff-round">
              <header className="playoff-round-header"><span>Round 1</span><h2>Semi Finals</h2></header>
              {playoff.semiFinals.map((match, index) => <MatchCard key={match.id} match={match} round="semiFinals" index={index} label={`SF ${index + 1}`} />)}
            </section>

            <section className="playoff-round final-round">
              <header className="playoff-round-header"><span>Grand Final</span><h2>Final</h2></header>
              <MatchCard match={playoff.final} round="final" index={0} label="FINAL" />
              <div className="champion-box" style={{ marginTop: 20 }}><FaTrophy /><span>SBT MAJOR CHAMPION</span><strong>{champion?.name || 'TBD'}</strong></div>
            </section>
          </div>
        </section>
      )}
    </section>
  )
}

export default PoolPlayoffs
