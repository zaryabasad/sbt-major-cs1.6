import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

const TeamsContext = createContext(null)

const STORAGE_KEY = 'sbt-major-teams'

function readLocalTeams() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    )

    if (!Array.isArray(stored)) {
      return []
    }

    return stored.map((team) => ({
      ...team,
      startingBudget: Number(
        team.startingBudget ??
          team.starting_budget ??
          team.budget ??
          100000
      ),
    }))
  } catch (error) {
    console.error('LOCAL TEAMS READ ERROR:', error)
    return []
  }
}

function mapSupabaseTeam(team) {
  return {
    ...team,
    startingBudget: Number(
      team.starting_budget ?? 100000
    ),
  }
}

export function TeamsProvider({ children }) {
  const [teams, setTeams] = useState(readLocalTeams)
  const [loading, setLoading] = useState(true)

  // ==========================================
  // LOAD TEAMS FROM SUPABASE
  // ==========================================

  useEffect(() => {
    let cancelled = false

    async function loadTeams() {
      console.log('LOADING TEAMS FROM SUPABASE...')

      setLoading(true)

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', {
          ascending: true,
        })

      console.log('SUPABASE LOAD RESULT:', {
        data,
        error,
      })

      if (cancelled) {
        return
      }

      if (error) {
        console.error(
          'SUPABASE TEAMS LOAD ERROR:',
          error
        )

        setLoading(false)
        return
      }

      // Supabase data exists
      if (Array.isArray(data) && data.length > 0) {
        setTeams(data.map(mapSupabaseTeam))
      }

      // If database is empty, keep localStorage
      // so existing local teams don't disappear.

      setLoading(false)
    }

    loadTeams()

    return () => {
      cancelled = true
    }
  }, [])

  // ==========================================
  // LOCAL STORAGE BACKUP
  // ==========================================

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(teams)
      )
    } catch (error) {
      console.error(
        'LOCAL TEAMS SAVE ERROR:',
        error
      )
    }
  }, [teams])

  // ==========================================
  // ADD TEAM
  // ==========================================

  const addTeam = async (team) => {
    const newTeam = {
      name: team.name?.trim() || '',
      owner: team.owner?.trim() || '',
      logo: team.logo || '',
      color: team.color || '',
      starting_budget: Number(
        team.startingBudget ??
          team.starting_budget ??
          team.budget ??
          100000
      ),
    }

    console.log(
      '================================'
    )
    console.log('INSERTING TEAM:')
    console.log(newTeam)
    console.log(
      '================================'
    )

    const { data, error } = await supabase
      .from('teams')
      .insert([newTeam])
      .select('*')
      .single()

    console.log(
      'SUPABASE INSERT RESULT:',
      {
        data,
        error,
      }
    )

    if (error) {
      console.error(
        'TEAM INSERT ERROR:',
        error
      )

      throw error
    }

    const savedTeam = mapSupabaseTeam(data)

    setTeams((current) => [
      ...current,
      savedTeam,
    ])

    return savedTeam
  }

  // ==========================================
  // UPDATE TEAM
  // ==========================================

  const updateTeam = async (team) => {
    const updatedTeam = {
      name: team.name?.trim() || '',
      owner: team.owner?.trim() || '',
      logo: team.logo || '',
      color: team.color || '',
      starting_budget: Number(
        team.startingBudget ??
          team.starting_budget ??
          team.budget ??
          100000
      ),
    }

    console.log(
      'UPDATING TEAM:',
      team.id,
      updatedTeam
    )

    const { data, error } = await supabase
      .from('teams')
      .update(updatedTeam)
      .eq('id', team.id)
      .select('*')
      .single()

    console.log(
      'SUPABASE UPDATE RESULT:',
      {
        data,
        error,
      }
    )

    if (error) {
      console.error(
        'TEAM UPDATE ERROR:',
        error
      )

      throw error
    }

    const savedTeam = mapSupabaseTeam(data)

    setTeams((current) =>
      current.map((item) =>
        item.id === team.id
          ? savedTeam
          : item
      )
    )

    return savedTeam
  }

  // ==========================================
  // DELETE TEAM
  // ==========================================

  const deleteTeam = async (id) => {
    console.log(
      'DELETING TEAM:',
      id
    )

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)

    console.log(
      'SUPABASE DELETE RESULT:',
      error
    )

    if (error) {
      console.error(
        'TEAM DELETE ERROR:',
        error
      )

      throw error
    }

    setTeams((current) =>
      current.filter(
        (team) => team.id !== id
      )
    )
  }

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = useMemo(
    () => ({
      teams,
      loading,
      addTeam,
      updateTeam,
      deleteTeam,
    }),
    [teams, loading]
  )

  return (
    <TeamsContext.Provider value={value}>
      {children}
    </TeamsContext.Provider>
  )
}

export function useTeams() {
  return useContext(TeamsContext)
}