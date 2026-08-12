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
    const storedTeams = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    )

    return Array.isArray(storedTeams)
      ? storedTeams.map((team) => ({
          ...team,
          startingBudget: Number(
            team.startingBudget ??
              team.starting_budget ??
              team.budget ??
              100000
          ),
        }))
      : []
  } catch {
    return []
  }
}

function mapSupabaseTeam(team) {
  return {
    ...team,
    startingBudget: Number(team.starting_budget ?? 100000),
  }
}

export function TeamsProvider({ children }) {
  const [teams, setTeams] = useState(readLocalTeams)

  useEffect(() => {
    let cancelled = false

    async function loadTeams() {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Supabase teams error:', error)
        return
      }

      if (cancelled) return

      // If Supabase already has teams, use them.
      if (data && data.length > 0) {
        setTeams(data.map(mapSupabaseTeam))
      }

      // If Supabase is empty, keep existing localStorage teams.
      // This prevents your current teams from disappearing.
    }

    loadTeams()

    return () => {
      cancelled = true
    }
  }, [])

  // Keep localStorage as a backup for now.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams))
  }, [teams])

  const addTeam = (team) => {
    const newTeam = {
      ...team,
      id: crypto.randomUUID(),
      startingBudget: Number(
        team.startingBudget ??
          team.starting_budget ??
          team.budget ??
          100000
      ),
    }

    setTeams((current) => [...current, newTeam])
  }

  const updateTeam = (team) => {
    setTeams((current) =>
      current.map((item) =>
        item.id === team.id ? team : item
      )
    )
  }

  const deleteTeam = (id) => {
    setTeams((current) =>
      current.filter((team) => team.id !== id)
    )
  }

  const value = useMemo(
    () => ({
      teams,
      addTeam,
      updateTeam,
      deleteTeam,
    }),
    [teams]
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