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
              1000
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
    startingBudget: Number(team.starting_budget ?? 1000),
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
  console.log('ADDING TEAM:', team)

  const newTeam = {
    id: crypto.randomUUID(),
    name: team.name,
    owner: team.owner,
    logo: team.logo || '',
    color: team.color || '',
    starting_budget: Number(team.startingBudget || 1000),
  }

  console.log('SUPABASE INSERT:', newTeam)

  const { data, error } = await supabase
    .from('teams')
    .insert([newTeam])
    .select()
    .single()

  console.log('SUPABASE RESPONSE:', { data, error })

  if (error) {
    alert(`ERROR: ${error.message}`)
    return
  }

  setTeams((current) => [
    ...current,
    mapSupabaseTeam(data),
  ])
}


const updateTeam = async (team) => {
  const updatedTeam = {
    name: team.name,
    owner: team.owner,
    logo: team.logo ?? '',
    color: team.color ?? '',
    starting_budget: Number(
      team.startingBudget ??
      team.starting_budget ??
      team.budget ??
      1000
    ),
  }

  const { data, error } = await supabase
    .from('teams')
    .update(updatedTeam)
    .eq('id', team.id)
    .select()
    .single()

  if (error) {
    console.error('Supabase update team error:', error)
    alert(`Team update failed: ${error.message}`)
    return
  }

  setTeams((current) =>
    current.map((item) =>
      item.id === team.id
        ? mapSupabaseTeam(data)
        : item
    )
  )
}


const deleteTeam = async (id) => {
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Supabase delete team error:', error)
    alert(`Team delete failed: ${error.message}`)
    return
  }

  setTeams((current) =>
    current.filter((team) => team.id !== id)
  )
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