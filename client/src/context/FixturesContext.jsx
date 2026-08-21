import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

const FixturesContext = createContext(null)

const STORAGE_KEY = 'sbt-major-fixtures'

function mapSupabaseFixture(fixture) {
  return {
    ...fixture,
    round: Number(fixture.round ?? 1),
    pool: fixture.pool || '',
    homeTeamId: fixture.home_team_id || '',
    awayTeamId: fixture.away_team_id || '',
    date: fixture.date || '',
    time: fixture.time || '',
    format: fixture.format || 'BO1',
    status: fixture.status || 'Upcoming',
    homeScore:
      fixture.home_score === null || fixture.home_score === undefined
        ? ''
        : Number(fixture.home_score),
    awayScore:
      fixture.away_score === null || fixture.away_score === undefined
        ? ''
        : Number(fixture.away_score),
    winnerId: fixture.winner_id || '',
  }
}

function readLocalFixtures() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(stored)) return []
    return stored.map((fixture) => ({
      ...fixture,
      round: Number(fixture.round ?? 1),
      pool: fixture.pool || '',
      homeTeamId: fixture.homeTeamId || fixture.home_team_id || '',
      awayTeamId: fixture.awayTeamId || fixture.away_team_id || '',
      date: fixture.date || '',
      time: fixture.time || '',
      format: fixture.format || 'BO1',
      status: fixture.status || 'Upcoming',
      homeScore: fixture.homeScore ?? fixture.home_score ?? '',
      awayScore: fixture.awayScore ?? fixture.away_score ?? '',
      winnerId: fixture.winnerId || fixture.winner_id || '',
    }))
  } catch {
    return []
  }
}

export function FixturesProvider({ children }) {
  const [fixtures, setFixtures] = useState(readLocalFixtures)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadFixtures() {
      setLoading(true)
      const { data, error } = await supabase
        .from('fixtures')
        .select('*')
        .order('round', { ascending: true })
        .order('date', { ascending: true })
        .order('time', { ascending: true })

      if (cancelled) return
      if (error) {
        console.error('FIXTURES LOAD ERROR:', error)
        setLoading(false)
        return
      }

      setFixtures((data || []).map(mapSupabaseFixture))
      setLoading(false)
    }

    loadFixtures()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixtures))
  }, [fixtures])

  const replaceFixtures = async (nextFixtures) => {
    if (!Array.isArray(nextFixtures)) {
      throw new Error('Fixtures must be an array')
    }

    const { error: deleteError } = await supabase
      .from('fixtures')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) throw deleteError

    const rows = nextFixtures.map((fixture) => ({
      id: fixture.id || crypto.randomUUID(),
      round: Number(fixture.round ?? 1),
      pool: fixture.pool || '',
      home_team_id: fixture.homeTeamId || fixture.home_team_id || null,
      away_team_id: fixture.awayTeamId || fixture.away_team_id || null,
      date: fixture.date || '',
      time: fixture.time || '',
      format: fixture.format || 'BO1',
      status: fixture.status || 'Upcoming',
      home_score:
        fixture.homeScore === '' || fixture.homeScore === null || fixture.homeScore === undefined
          ? 0
          : Number(fixture.homeScore),
      away_score:
        fixture.awayScore === '' || fixture.awayScore === null || fixture.awayScore === undefined
          ? 0
          : Number(fixture.awayScore),
      winner_id: fixture.winnerId || null,
    }))

    if (rows.length === 0) {
      setFixtures([])
      return []
    }

    const { data, error } = await supabase
      .from('fixtures')
      .insert(rows)
      .select()

    if (error) throw error

    const mapped = (data || []).map(mapSupabaseFixture)
    setFixtures(mapped)
    return mapped
  }

  const clearPoolFixtures = async () => {
    const { error } = await supabase
      .from('fixtures')
      .delete()
      .eq('pool', 'A-B')

    if (error) throw error

    setFixtures((current) => current.filter((fixture) => fixture.pool !== 'A-B'))
  }

  const updateFixture = async (fixture) => {
    if (!fixture?.id) throw new Error('Fixture ID is required')

    const updatedFixture = {
      round: Number(fixture.round ?? 1),
      pool: fixture.pool || '',
      home_team_id: fixture.homeTeamId || fixture.home_team_id || null,
      away_team_id: fixture.awayTeamId || fixture.away_team_id || null,
      date: fixture.date || '',
      time: fixture.time || '',
      format: fixture.format || 'BO1',
      status: fixture.status || 'Upcoming',
      home_score:
        fixture.homeScore === '' || fixture.homeScore === null || fixture.homeScore === undefined
          ? 0
          : Number(fixture.homeScore),
      away_score:
        fixture.awayScore === '' || fixture.awayScore === null || fixture.awayScore === undefined
          ? 0
          : Number(fixture.awayScore),
      winner_id: fixture.winnerId || null,
    }

    const { data, error } = await supabase
      .from('fixtures')
      .update(updatedFixture)
      .eq('id', fixture.id)
      .select()
      .single()

    if (error) throw error

    const mapped = mapSupabaseFixture(data)
    setFixtures((current) => current.map((item) => (item.id === fixture.id ? mapped : item)))
    return mapped
  }

  const deleteFixture = async (id) => {
    const { error } = await supabase.from('fixtures').delete().eq('id', id)
    if (error) throw error
    setFixtures((current) => current.filter((fixture) => fixture.id !== id))
  }

  const value = useMemo(
    () => ({
      fixtures,
      loading,
      replaceFixtures,
      clearPoolFixtures,
      updateFixture,
      deleteFixture,
    }),
    [fixtures, loading],
  )

  return <FixturesContext.Provider value={value}>{children}</FixturesContext.Provider>
}

export function useFixtures() {
  return useContext(FixturesContext)
}
