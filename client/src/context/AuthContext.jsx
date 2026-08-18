import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

// Super admin email. Team admins are loaded from the
// public.admin_users table after authentication.
//
// .env:
// VITE_ADMIN_EMAIL=your-super-admin-email@example.com
const SUPER_ADMIN_EMAIL = String(
  import.meta.env.VITE_ADMIN_EMAIL || ''
)
  .trim()
  .toLowerCase()

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
}

function getEmail(currentUser) {
  return normalizeEmail(currentUser?.email)
}

function getIsSuperAdmin(currentUser) {
  const email = getEmail(currentUser)

  return Boolean(
    email &&
      SUPER_ADMIN_EMAIL &&
      email === SUPER_ADMIN_EMAIL
  )
}

async function loadAdminProfile(currentUser) {
  if (!currentUser?.id) {
    return null
  }

  // Super admin does not require a database row.
  if (getIsSuperAdmin(currentUser)) {
    return {
      userId: currentUser.id,
      email: getEmail(currentUser),
      role: 'super_admin',
      teamId: null,
    }
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, role, team_id')
    .eq('user_id', currentUser.id)
    .maybeSingle()

  if (error) {
    console.error(
      'ADMIN PROFILE LOAD ERROR:',
      error
    )
    return null
  }

  if (!data) {
    return null
  }

  const role =
    data.role === 'super_admin'
      ? 'super_admin'
      : 'team_admin'

  return {
    userId: data.user_id,
    email:
      normalizeEmail(data.email) ||
      getEmail(currentUser),
    role,
    teamId: data.team_id || null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [adminProfile, setAdminProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshAdminProfile = async (
    currentUser
  ) => {
    if (!currentUser) {
      setAdminProfile(null)
      return null
    }

    const profile =
      await loadAdminProfile(currentUser)

    setAdminProfile(profile)

    return profile
  }

  useEffect(() => {
    let mounted = true

    const loadSession = async () => {
      const {
        data,
        error,
      } = await supabase.auth.getSession()

      if (error) {
        console.error(
          'Auth session error:',
          error
        )
      }

      if (!mounted) return

      const currentUser =
        data.session?.user ?? null

      setUser(currentUser)

      if (currentUser) {
        const profile =
          await loadAdminProfile(
            currentUser
          )

        if (mounted) {
          setAdminProfile(profile)
        }
      } else {
        setAdminProfile(null)
      }

      if (mounted) {
        setLoading(false)
      }
    }

    loadSession()

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        async (_event, session) => {
          const currentUser =
            session?.user ?? null

          setUser(currentUser)

          if (!currentUser) {
            setAdminProfile(null)
            setLoading(false)
            return
          }

          const profile =
            await loadAdminProfile(
              currentUser
            )

          setAdminProfile(profile)
          setLoading(false)
        }
      )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (
    email,
    password
  ) => {
    const normalizedEmail =
      normalizeEmail(email)

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    const currentUser = data.user

    const profile =
      await loadAdminProfile(
        currentUser
      )

    // A Supabase account alone is not enough.
    // It must be the super admin or exist in admin_users.
    if (!profile) {
      await supabase.auth.signOut()
      setUser(null)
      setAdminProfile(null)

      return {
        success: false,
        error:
          'This account is not authorized for tournament admin access.',
      }
    }

    setUser(currentUser)
    setAdminProfile(profile)

    return {
      success: true,
      user: currentUser,
      profile,
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setAdminProfile(null)
  }

  const isAdmin = Boolean(
    adminProfile
  )

  const isSuperAdmin =
    adminProfile?.role ===
    'super_admin'

  const isTeamAdmin =
    adminProfile?.role ===
    'team_admin'

  const teamId =
    adminProfile?.teamId || null

  const role =
    adminProfile?.role || null

  const value = useMemo(
    () => ({
      user,
      loading,
      adminProfile,

      isAdmin,
      isSuperAdmin,
      isTeamAdmin,

      role,
      teamId,

      login,
      logout,

      refreshAdminProfile: () =>
        refreshAdminProfile(user),
    }),
    [
      user,
      loading,
      adminProfile,
      isAdmin,
      isSuperAdmin,
      isTeamAdmin,
      role,
      teamId,
    ]
  )

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(
    AuthContext
  )
}