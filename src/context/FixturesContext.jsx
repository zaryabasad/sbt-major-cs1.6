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

// ==========================================
// SUPABASE → FRONTEND
// ==========================================

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
      fixture.home_score === null ||
      fixture.home_score === undefined
        ? ''
        : Number(fixture.home_score),

    awayScore:
      fixture.away_score === null ||
      fixture.away_score === undefined
        ? ''
        : Number(fixture.away_score),

    winnerId: fixture.winner_id || '',
  }
}

// ==========================================
// LOCAL STORAGE FALLBACK
// ==========================================

function readLocalFixtures() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    )

    if (!Array.isArray(stored)) {
      return []
    }

    return stored.map((fixture) => ({
      ...fixture,

      round: Number(fixture.round ?? 1),

      pool: fixture.pool || '',

      homeTeamId:
        fixture.homeTeamId ||
        fixture.home_team_id ||
        '',

      awayTeamId:
        fixture.awayTeamId ||
        fixture.away_team_id ||
        '',

      date: fixture.date || '',
      time: fixture.time || '',

      format: fixture.format || 'BO1',

      status:
        fixture.status || 'Upcoming',

      homeScore:
        fixture.homeScore ??
        fixture.home_score ??
        '',

      awayScore:
        fixture.awayScore ??
        fixture.away_score ??
        '',

      winnerId:
        fixture.winnerId ||
        fixture.winner_id ||
        '',
    }))
  } catch {
    return []
  }
}

// ==========================================
// PROVIDER
// ==========================================

export function FixturesProvider({ children }) {
  const [fixtures, setFixtures] = useState(
    readLocalFixtures
  )

  const [loading, setLoading] = useState(true)

  // ========================================
  // LOAD FROM SUPABASE
  // ========================================

  useEffect(() => {
    let cancelled = false

    async function loadFixtures() {
      console.log(
        '=============================='
      )

      console.log(
        'LOADING FIXTURES FROM SUPABASE...'
      )

      setLoading(true)

      const {
        data,
        error,
      } = await supabase
        .from('fixtures')
        .select('*')
        .order('round', {
          ascending: true,
        })
        .order('date', {
          ascending: true,
        })
        .order('time', {
          ascending: true,
        })

      console.log(
        'SUPABASE FIXTURES RESULT:',
        {
          data,
          error,
        }
      )

      if (cancelled) {
        return
      }

      if (error) {
        console.error(
          'FIXTURES LOAD ERROR:',
          error
        )

        setLoading(false)

        return
      }

      setFixtures(
        (data || []).map(
          mapSupabaseFixture
        )
      )

      setLoading(false)

      console.log(
        'FIXTURES LOADED:',
        data?.length || 0
      )
    }

    loadFixtures()

    return () => {
      cancelled = true
    }
  }, [])

  // ========================================
  // LOCAL STORAGE BACKUP
  // ========================================

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(fixtures)
    )
  }, [fixtures])

  // ========================================
  // REPLACE ALL FIXTURES
  // ========================================

  const replaceFixtures = async (
    nextFixtures
  ) => {
    console.log(
      '=============================='
    )

    console.log(
      'REPLACING FIXTURES:',
      nextFixtures
    )

    if (!Array.isArray(nextFixtures)) {
      throw new Error(
        'Fixtures must be an array'
      )
    }

    // Delete old fixtures
    const {
      error: deleteError,
    } = await supabase
      .from('fixtures')
      .delete()
      .neq(
        'id',
        '00000000-0000-0000-0000-000000000000'
      )

    console.log(
      'OLD FIXTURES DELETE RESULT:',
      deleteError
    )

    if (deleteError) {
      console.error(
        'FIXTURES DELETE ERROR:',
        deleteError
      )

      throw deleteError
    }

    // Prepare new fixtures
    const rows = nextFixtures.map(
      (fixture) => ({
        id:
          fixture.id ||
          crypto.randomUUID(),

        round:
          Number(
            fixture.round ?? 1
          ),

        pool:
          fixture.pool || '',

        home_team_id:
          fixture.homeTeamId ||
          fixture.home_team_id ||
          null,

        away_team_id:
          fixture.awayTeamId ||
          fixture.away_team_id ||
          null,

        date:
          fixture.date || '',

        time:
          fixture.time || '',

        format:
          fixture.format || 'BO1',

        status:
          fixture.status ||
          'Upcoming',

        home_score:
          fixture.homeScore === '' ||
          fixture.homeScore === null ||
          fixture.homeScore === undefined
            ? 0
            : Number(
                fixture.homeScore
              ),

        away_score:
          fixture.awayScore === '' ||
          fixture.awayScore === null ||
          fixture.awayScore === undefined
            ? 0
            : Number(
                fixture.awayScore
              ),

        winner_id:
          fixture.winnerId ||
          null,
      })
    )

    if (rows.length === 0) {
      setFixtures([])
      return []
    }

    // Insert new fixtures
    const {
      data,
      error,
    } = await supabase
      .from('fixtures')
      .insert(rows)
      .select()

    console.log(
      'NEW FIXTURES INSERT RESULT:',
      {
        data,
        error,
      }
    )

    if (error) {
      console.error(
        'FIXTURES INSERT ERROR:',
        error
      )

      throw error
    }

    const mapped =
      (data || []).map(
        mapSupabaseFixture
      )

    setFixtures(mapped)

    console.log(
      'FIXTURES SAVED:',
      mapped.length
    )

    return mapped
  }

  // ========================================
  // UPDATE SINGLE FIXTURE
  // ========================================

  const updateFixture = async (
    fixture
  ) => {
    console.log(
      '=============================='
    )

    console.log(
      'UPDATING FIXTURE:',
      fixture
    )

    if (!fixture?.id) {
      throw new Error(
        'Fixture ID is required'
      )
    }

    const updatedFixture = {
      round:
        Number(
          fixture.round ?? 1
        ),

      pool:
        fixture.pool || '',

      home_team_id:
        fixture.homeTeamId ||
        fixture.home_team_id ||
        null,

      away_team_id:
        fixture.awayTeamId ||
        fixture.away_team_id ||
        null,

      date:
        fixture.date || '',

      time:
        fixture.time || '',

      format:
        fixture.format || 'BO1',

      status:
        fixture.status ||
        'Upcoming',

      home_score:
        fixture.homeScore === '' ||
        fixture.homeScore === null ||
        fixture.homeScore === undefined
          ? 0
          : Number(
              fixture.homeScore
            ),

      away_score:
        fixture.awayScore === '' ||
        fixture.awayScore === null ||
        fixture.awayScore === undefined
          ? 0
          : Number(
              fixture.awayScore
            ),

      winner_id:
        fixture.winnerId ||
        null,
    }

    const {
      data,
      error,
    } = await supabase
      .from('fixtures')
      .update(updatedFixture)
      .eq('id', fixture.id)
      .select()
      .single()

    console.log(
      'FIXTURE UPDATE RESULT:',
      {
        data,
        error,
      }
    )

    if (error) {
      console.error(
        'FIXTURE UPDATE ERROR:',
        error
      )

      throw error
    }

    const mapped =
      mapSupabaseFixture(data)

    setFixtures(
      (current) =>
        current.map((item) =>
          item.id === fixture.id
            ? mapped
            : item
        )
    )

    console.log(
      'FIXTURE UPDATED SUCCESSFULLY:',
      mapped
    )

    return mapped
  }

  // ========================================
  // DELETE SINGLE FIXTURE
  // ========================================

  const deleteFixture = async (
    id
  ) => {
    console.log(
      'DELETE FIXTURE:',
      id
    )

    const {
      error,
    } = await supabase
      .from('fixtures')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(
        'FIXTURE DELETE ERROR:',
        error
      )

      throw error
    }

    setFixtures(
      (current) =>
        current.filter(
          (fixture) =>
            fixture.id !== id
        )
    )
  }

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value = useMemo(
    () => ({
      fixtures,
      loading,
      replaceFixtures,
      updateFixture,
      deleteFixture,
    }),
    [
      fixtures,
      loading,
    ]
  )

  return (
    <FixturesContext.Provider
      value={value}
    >
      {children}
    </FixturesContext.Provider>
  )
}

// ==========================================
// HOOK
// ==========================================

export function useFixtures() {
  return useContext(
    FixturesContext
  )
}