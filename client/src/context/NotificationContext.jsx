import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user, isPlayer } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  const loadNotifications = useCallback(async () => {
    if (!user || !isPlayer) {
      setNotifications([])
      return
    }

    setLoading(true)

    const { data, error } = await supabase
      .from('player_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('NOTIFICATIONS LOAD ERROR:', error)
    } else {
      setNotifications(data || [])
    }

    setLoading(false)
  }, [user, isPlayer])

  useEffect(() => {
    void loadNotifications()

    if (!user || !isPlayer) return undefined

    const channel = supabase
      .channel(`player-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((current) => [payload.new, ...current].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadNotifications, user, isPlayer])

  const markRead = async (id) => {
    if (!id || !user || !isPlayer) return

    const { error } = await supabase
      .from('player_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (!error) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      )
    }
  }

  const markAllRead = async () => {
    if (!user || !isPlayer) return

    const { error } = await supabase
      .from('player_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (!error) {
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
    }
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length

  const value = useMemo(
    () => ({
      notifications,
      loading,
      unreadCount,
      loadNotifications,
      markRead,
      markAllRead,
    }),
    [notifications, loading, unreadCount, loadNotifications]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
