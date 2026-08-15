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

const DEFAULT_BUDGET = 100000

// ==========================================
// SUPABASE → FRONTEND
// ==========================================

function mapTeam(team) {
  return {
    ...team,

    startingBudget: Number(
      team.starting_budget ??
        team.startingBudget ??
        team.budget ??
        DEFAULT_BUDGET
    ),
  }
}

// ==========================================
// LOCAL STORAGE
// ==========================================

function readLocalTeams() {
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || '[]'
    )

    if (!Array.isArray(stored)) {
      return []
    }

    return stored.map(mapTeam)
  } catch {
    return []
  }
}

// ==========================================
// PROVIDER
// ==========================================

export function TeamsProvider({ children }) {
  const [teams, setTeams] = useState(
    readLocalTeams
  )

  const [loading, setLoading] = useState(true)

  // ========================================
  // LOAD FROM SUPABASE
  // ========================================

  useEffect(() => {
    let cancelled = false

    async function loadTeams() {
      console.log(
        '=============================='
      )

      console.log(
        'LOADING TEAMS FROM SUPABASE...'
      )

      setLoading(true)

      const {
        data,
        error,
      } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', {
          ascending: true,
        })

      console.log(
        'SUPABASE TEAMS RESULT:',
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
          'TEAMS LOAD ERROR:',
          error
        )

        setLoading(false)

        return
      }

      const mappedTeams =
        (data || []).map(mapTeam)

      setTeams(mappedTeams)

      setLoading(false)

      console.log(
        'TEAMS LOADED:',
        mappedTeams.length
      )
    }

    loadTeams()

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
      JSON.stringify(teams)
    )
  }, [teams])

  // ========================================
  // ADD TEAM
  // ========================================

  const addTeam = async (team) => {
    console.log(
      '=============================='
    )

    console.log(
      'ADD TEAM STARTED'
    )

    console.log(
      'TEAM RECEIVED:',
      team
    )

    const teamName = String(
      team?.name || ''
    ).trim()

    const ownerName = String(
      team?.owner || ''
    ).trim()

    if (!teamName) {
      throw new Error(
        'Team name is required.'
      )
    }

    if (!ownerName) {
      throw new Error(
        'Owner name is required.'
      )
    }

    const startingBudget = Number(
      team?.startingBudget ??
        team?.starting_budget ??
        team?.budget ??
        DEFAULT_BUDGET
    )

    if (
      !Number.isFinite(startingBudget) ||
      startingBudget < 0
    ) {
      throw new Error(
        'Invalid starting budget.'
      )
    }

    // ======================================
    // CHECK CURRENT SUPABASE USER
    // ======================================

    const {
      data: authData,
      error: authError,
    } = await supabase.auth.getUser()

    console.log(
      'CURRENT SUPABASE USER:',
      authData?.user || null
    )

    console.log(
      'AUTH ERROR:',
      authError
    )

    if (authError) {
      console.error(
        'AUTH CHECK ERROR:',
        authError
      )

      throw authError
    }

    if (!authData?.user) {
      throw new Error(
        'You are not logged in to Supabase.'
      )
    }

    // ======================================
    // DUPLICATE TEAM CHECK
    // ======================================

    const normalizedTeamName =
      teamName.toLowerCase()

    const duplicateTeam =
      teams.some((existingTeam) => {
        const existingName =
          String(
            existingTeam?.name || ''
          )
            .trim()
            .toLowerCase()

        return (
          existingName ===
          normalizedTeamName
        )
      })

    if (duplicateTeam) {
      throw new Error(
        'A team with this name already exists.'
      )
    }

    // ======================================
    // SUPABASE INSERT OBJECT
    // ======================================

    const newTeam = {
      id: crypto.randomUUID(),

      created_at:
        new Date().toISOString(),

      name: teamName,

      owner: ownerName,

      logo: team?.logo || '',

      color:
        team?.color || '#F5C542',

      starting_budget:
        startingBudget,
    }

    console.log(
      'INSERTING TEAM:',
      newTeam
    )

    // ======================================
    // INSERT
    // ======================================

    const {
      data,
      error,
    } = await supabase
      .from('teams')
      .insert(newTeam)
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

    const mappedTeam =
      mapTeam(data)

    setTeams(
      (current) => [
        ...current,
        mappedTeam,
      ]
    )

    console.log(
      'TEAM SUCCESSFULLY SAVED:',
      mappedTeam
    )

    console.log(
      'ADD TEAM FINISHED'
    )

    console.log(
      '=============================='
    )

    return mappedTeam
  }

  // ========================================
  // UPDATE TEAM
  // ========================================

  const updateTeam = async (team) => {
    console.log(
      '=============================='
    )

    console.log(
      'UPDATE TEAM STARTED:',
      team
    )

    if (!team?.id) {
      throw new Error(
        'Team ID is required.'
      )
    }

    const teamName = String(
      team.name || ''
    ).trim()

    const ownerName = String(
      team.owner || ''
    ).trim()

    if (!teamName) {
      throw new Error(
        'Team name is required.'
      )
    }

    if (!ownerName) {
      throw new Error(
        'Owner name is required.'
      )
    }

    const startingBudget = Number(
      team.startingBudget ??
        team.starting_budget ??
        team.budget ??
        DEFAULT_BUDGET
    )

    if (
      !Number.isFinite(startingBudget) ||
      startingBudget < 0
    ) {
      throw new Error(
        'Invalid starting budget.'
      )
    }

    // ======================================
    // DUPLICATE NAME CHECK
    // ======================================

    const normalizedTeamName =
      teamName.toLowerCase()

    const duplicateTeam =
      teams.some((existingTeam) => {
        if (
          existingTeam.id ===
          team.id
        ) {
          return false
        }

        const existingName =
          String(
            existingTeam?.name || ''
          )
            .trim()
            .toLowerCase()

        return (
          existingName ===
          normalizedTeamName
        )
      })

    if (duplicateTeam) {
      throw new Error(
        'A team with this name already exists.'
      )
    }

    const updatedTeam = {
      name: teamName,

      owner: ownerName,

      logo: team.logo || '',

      color:
        team.color || '#F5C542',

      starting_budget:
        startingBudget,
    }

    console.log(
      'UPDATING TEAM IN SUPABASE:',
      updatedTeam
    )

    const {
      data,
      error,
    } = await supabase
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

    const mappedTeam =
      mapTeam(data)

    setTeams(
      (current) =>
        current.map((item) =>
          item.id === team.id
            ? mappedTeam
            : item
        )
    )

    console.log(
      'TEAM UPDATED SUCCESSFULLY:',
      mappedTeam
    )

    return mappedTeam
  }

  // ========================================
  // DELETE TEAM
  // ========================================

  const deleteTeam = async (id) => {
    console.log(
      '=============================='
    )

    console.log(
      'DELETE TEAM STARTED:',
      id
    )

    if (!id) {
      throw new Error(
        'Team ID is required.'
      )
    }

    const {
      error,
    } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)

    console.log(
      'SUPABASE DELETE RESULT:',
      {
        error,
      }
    )

    if (error) {
      console.error(
        'TEAM DELETE ERROR:',
        error
      )

      throw error
    }

    setTeams(
      (current) =>
        current.filter(
          (team) =>
            team.id !== id
        )
    )

    console.log(
      'TEAM DELETED SUCCESSFULLY'
    )
  }

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const value = useMemo(
    () => ({
      teams,
      loading,
      addTeam,
      updateTeam,
      deleteTeam,
    }),
    [
      teams,
      loading,
    ]
  )

  return (
    <TeamsContext.Provider
      value={value}
    >
      {children}
    </TeamsContext.Provider>
  )
}

// ==========================================
// HOOK
// ==========================================

export function useTeams() {
  return useContext(
    TeamsContext
  )
}