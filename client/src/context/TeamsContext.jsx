import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const TeamsContext = createContext(null)
const STORAGE_KEY = 'sbt-major-teams'

function readTeams() {
  try {
    const storedTeams = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(storedTeams)
      ? storedTeams.map((team) => ({ ...team, startingBudget: Number(team.startingBudget ?? team.budget ?? 100000) }))
      : []
  } catch {
    return []
  }
}

export function TeamsProvider({ children }) {
  const [teams, setTeams] = useState(readTeams)

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(teams)) }, [teams])

  const addTeam = (team) => setTeams((current) => [...current, { ...team, id: crypto.randomUUID() }])
  const updateTeam = (team) => setTeams((current) => current.map((item) => item.id === team.id ? team : item))
  const deleteTeam = (id) => setTeams((current) => current.filter((team) => team.id !== id))
  const value = useMemo(() => ({ teams, addTeam, updateTeam, deleteTeam }), [teams])

  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>
}

export function useTeams() { return useContext(TeamsContext) }
