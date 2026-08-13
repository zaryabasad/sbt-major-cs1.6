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
  const [loading, setLoading] = useState(true)

  // Load teams from Supabase
  useEffect(() => {
    let cancelled = false

    async function loadTeams() {
      setLoading(true)

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Supabase teams load error:', error)
        setLoading(false)
        return
      }

      if (cancelled) return

      if (data) {
        setTeams(data.map(mapSupabaseTeam))
      }

      setLoading(false)
    }

    loadTeams()

    return () => {
      cancelled = true
    }
  }, [])

  // Keep localStorage as backup
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(teams))
  }, [teams])

  // ADD TEAM
  const addTeam = async (team) => {
    const startingBudget = Number(
      team.startingBudget ??
        team.starting_budget ??
        team.budget ??
        100000
    )

    const newTeamData = {
      name: team.name,
      owner: team.owner ?? '',
      logo: team.logo ?? '',
      color: team.color ?? '',
      starting_budget: startingBudget,
    }

    const { data, error } = await supabase
      .from('teams')
      .insert([newTeamData])
      .select()
      .single()

    if (error) {
      console.error('Add team error:', error)

      return {
        success: false,
        error: error.message,
      }
    }

    const newTeam = mapSupabaseTeam(data)

    setTeams((current) => [...current, newTeam])

    return {
      success: true,
      team: newTeam,
    }
  }

  // UPDATE TEAM
  const updateTeam = async (team) => {
    const updatedTeamData = {
      name: team.name,
      owner: team.owner ?? '',
      logo: team.logo ?? '',
      color: team.color ?? '',
      starting_budget: Number(
        team.startingBudget ??
          team.starting_budget ??
          team.budget ??
          100000
      ),
    }

    const { data, error } = await supabase
      .from('teams')
      .update(updatedTeamData)
      .eq('id', team.id)
      .select()
      .single()

    if (error) {
      console.error('Update team error:', error)

      return {
        success: false,
        error: error.message,
      }
    }

    const updatedTeam = mapSupabaseTeam(data)

    setTeams((current) =>
      current.map((item) =>
        item.id === updatedTeam.id ? updatedTeam : item
      )
    )

    return {
      success: true,
      team: updatedTeam,
    }
  }

  // DELETE TEAM
  const deleteTeam = async (id) => {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete team error:', error)

      return {
        success: false,
        error: error.message,
      }
    }

    setTeams((current) =>
      current.filter((team) => team.id !== id)
    )

    return {
      success: true,
    }
  }

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