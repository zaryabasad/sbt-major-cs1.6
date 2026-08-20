import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const SUPER_ADMIN_EMAIL = String(
  import.meta.env.VITE_ADMIN_EMAIL || ''
)
  .trim()
  .toLowerCase()

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function getEmail(currentUser) {
  return normalizeEmail(currentUser?.email)
}

function getIsSuperAdminByEmail(currentUser) {
  const email = getEmail(currentUser)
  return Boolean(email && SUPER_ADMIN_EMAIL && email === SUPER_ADMIN_EMAIL)
}

async function loadUserProfile(currentUser) {
  if (!currentUser?.id) return null

  const { data: adminData, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id, email, role, team_id')
    .eq('user_id', currentUser.id)
    .maybeSingle()

  if (adminError) console.error('ADMIN PROFILE LOAD ERROR:', adminError)

  if (adminData) {
    return {
      userId: adminData.user_id,
      email: normalizeEmail(adminData.email) || getEmail(currentUser),
      role: adminData.role === 'super_admin' ? 'super_admin' : 'team_admin',
      teamId: adminData.team_id || null,
      playerRegistrationId: null,
    }
  }

  if (getIsSuperAdminByEmail(currentUser)) {
    return {
      userId: currentUser.id,
      email: getEmail(currentUser),
      role: 'super_admin',
      teamId: null,
      playerRegistrationId: null,
    }
  }

  const { data: playerData, error: playerError } = await supabase
    .from('player_registrations')
    .select('id, user_id, email, real_name, nickname, status')
    .eq('user_id', currentUser.id)
    .eq('status', 'Approved')
    .maybeSingle()

  if (playerError) {
    console.error('PLAYER PROFILE LOAD ERROR:', playerError)
    return null
  }

  if (!playerData) return null

  return {
    userId: playerData.user_id,
    email: normalizeEmail(playerData.email) || getEmail(currentUser),
    role: 'player',
    teamId: null,
    playerRegistrationId: playerData.id,
    playerName: playerData.nickname || playerData.real_name || 'Player',
    playerRealName: playerData.real_name || '',
    playerNickname: playerData.nickname || '',
  }
}

async function linkPlayerAccount() {
  const { data, error } = await supabase.rpc('link_player_account')

  if (error) {
    console.error('PLAYER ACCOUNT LINK ERROR:', error)
    return { linked: false, error: error.message }
  }

  return { linked: true, data }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      return null
    }

    const nextProfile = await loadUserProfile(currentUser)
    setProfile(nextProfile)
    return nextProfile
  }

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) console.error('Auth session error:', error)
      if (!mounted) return

      const currentUser = data.session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        await linkPlayerAccount()
        const nextProfile = await loadUserProfile(currentUser)
        if (mounted) setProfile(nextProfile)
      } else {
        setProfile(null)
      }

      if (mounted) setLoading(false)
    }

    void loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (!currentUser) {
        setProfile(null)
        setLoading(false)
        return
      }

      await linkPlayerAccount()
      const nextProfile = await loadUserProfile(currentUser)
      setProfile(nextProfile)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email, password) => {
    const normalizedEmail = normalizeEmail(email)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) return { success: false, error: error.message }

    const currentUser = data.user
    await linkPlayerAccount()
    const nextProfile = await loadUserProfile(currentUser)

    if (!nextProfile || !['super_admin', 'team_admin', 'player'].includes(nextProfile.role)) {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      return {
        success: false,
        error: 'This account is not an approved player or tournament admin.',
      }
    }

    setUser(currentUser)
    setProfile(nextProfile)
    return { success: true, user: currentUser, profile: nextProfile }
  }

  const playerLogin = async (email, password) => {
    const result = await login(email, password)
    if (!result.success) return result

    if (result.profile?.role !== 'player') {
      await logout()
      return {
        success: false,
        error: 'This account is not an approved SBT MAJOR player account.',
      }
    }

    return result
  }

  const playerSignup = async (email, password) => {
    const normalizedEmail = normalizeEmail(email)

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { account_type: 'player' },
      },
    })

    if (error) return { success: false, error: error.message }
    if (!data.user) return { success: false, error: 'Could not create the player account.' }

    if (data.session) {
      const linked = await linkPlayerAccount()

      if (!linked.linked) {
        await supabase.auth.signOut()
        return {
          success: false,
          error: 'Make sure the player has already been approved by the Super Admin.',
        }
      }

      const nextProfile = await loadUserProfile(data.user)
      setUser(data.user)
      setProfile(nextProfile)
    }

    return {
      success: true,
      sessionCreated: Boolean(data.session),
      user: data.user,
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const isSuperAdmin = profile?.role === 'super_admin'
  const isTeamAdmin = profile?.role === 'team_admin'
  const isPlayer = profile?.role === 'player'
  const isAdmin = isSuperAdmin || isTeamAdmin
  const teamId = profile?.teamId || null
  const role = profile?.role || null

  const value = useMemo(
    () => ({
      user,
      loading,
      adminProfile: isAdmin ? profile : null,
      playerProfile: isPlayer ? profile : null,
      profile,
      isAdmin,
      isSuperAdmin,
      isTeamAdmin,
      isPlayer,
      role,
      teamId,
      login,
      playerLogin,
      playerSignup,
      logout,
      refreshAdminProfile: () => refreshProfile(user),
      refreshProfile: () => refreshProfile(user),
    }),
    [user, loading, profile, isAdmin, isSuperAdmin, isTeamAdmin, isPlayer, role, teamId],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
