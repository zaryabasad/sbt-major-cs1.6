import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ChatContext = createContext(null)

const MAX_MESSAGE_LENGTH = 300

export function ChatProvider({ children }) {
  const { user } = useAuth()

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [restricted, setRestricted] = useState(false)
  const [restrictionLoading, setRestrictionLoading] =
    useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadChat(
      showLoading = false
    ) {
      if (showLoading) {
        setLoading(true)
        setRestrictionLoading(true)
      }

      const [
        messagesResult,
        restrictionResult,
      ] = await Promise.all([
        supabase
          .from('chat_messages')
          .select(
            'id, user_id, nickname, message, created_at'
          )
          .order('created_at', {
            ascending: false,
          })
          .limit(150),
        user
          ? supabase
              .from('chat_restrictions')
              .select(
                'user_id, restricted_until'
              )
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),
      ])

      if (cancelled) {
        return
      }

      if (!messagesResult.error) {
        setMessages(
          [
            ...(messagesResult.data || []),
          ].reverse()
        )
      } else {
        console.error(
          'CHAT LOAD ERROR:',
          messagesResult.error
        )
      }

      if (!restrictionResult.error) {
        const row =
          restrictionResult.data

        setRestricted(
          Boolean(
            row &&
              (
                !row.restricted_until ||
                new Date(
                  row.restricted_until
                ).getTime() > Date.now()
              )
          )
        )
      } else {
        console.error(
          'CHAT RESTRICTION LOAD ERROR:',
          restrictionResult.error
        )
      }

      if (showLoading) {
        setLoading(false)
        setRestrictionLoading(false)
      }
    }

    loadChat(true)

    if (!user) {
      return () => {
        cancelled = true
      }
    }

    const channel =
      supabase
        .channel(
          'sbt-major-live-chat'
        )
        .on(
          'broadcast',
          {
            event: 'chat_message',
          },
          ({ payload }) => {
            if (!payload?.id) {
              return
            }

            setMessages((current) => {
              if (
                current.some(
                  (item) =>
                    String(item.id) ===
                    String(payload.id)
                )
              ) {
                return current
              }

              return [
                ...current,
                payload,
              ].slice(-150)
            })
          }
        )
        .on(
          'broadcast',
          {
            event: 'chat_restriction',
          },
          ({ payload }) => {
            if (
              String(payload?.user_id) !==
              String(user.id)
            ) {
              return
            }

            const until =
              payload?.restricted_until

            setRestricted(
              Boolean(
                !until ||
                  new Date(
                    until
                  ).getTime() >
                    Date.now()
              )
            )
          }
        )
        .subscribe((status) => {
          console.log(
            'CHAT BROADCAST STATUS:',
            status
          )
        })

    // Keep a small fallback sync in case a client reconnects
    // while a message is being sent.
    const syncTimer =
      window.setInterval(() => {
        loadChat(false)
      }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(syncTimer)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const sendMessage = async (
    message,
    nickname
  ) => {
    const cleaned = String(
      message || ''
    ).trim()

    if (!user) {
      return {
        success: false,
        error:
          'You must be logged in to chat.',
      }
    }

    if (!cleaned) {
      return {
        success: false,
        error:
          'Message cannot be empty.',
      }
    }

    if (
      cleaned.length >
      MAX_MESSAGE_LENGTH
    ) {
      return {
        success: false,
        error:
          `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`,
      }
    }

    if (restricted) {
      return {
        success: false,
        error:
          'You are currently restricted from chat.',
      }
    }

    const {
      data,
      error,
    } = await supabase
      .from('chat_messages')
      .insert({
        user_id:
          user.id,
        nickname:
          String(
            nickname || ''
          ).trim() ||
          user.email?.split(
            '@'
          )[0] ||
          'Member',
        message:
          cleaned,
      })
      .select()
      .single()

    if (error) {
      console.error(
        'CHAT SEND ERROR:',
        error
      )

      return {
        success: false,
        error:
          error.message ||
          'Could not send message.',
      }
    }

    // Update sender instantly as well; other clients receive
    // the DB-triggered Broadcast on the shared channel.
    setMessages((current) => {
      if (
        current.some(
          (item) =>
            String(item.id) ===
            String(data.id)
        )
      ) {
        return current
      }

      return [
        ...current,
        data,
      ].slice(-150)
    })

    return {
      success: true,
      message: data,
    }
  }

  const restrictMember = async (
    memberUserId,
    restrictedUntil = null,
    reason = ''
  ) => {
    if (!user) {
      return {
        success: false,
        error: 'Authentication required.',
      }
    }

    const { error } = await supabase
      .from('chat_restrictions')
      .upsert({
        user_id: memberUserId,
        restricted_by: user.id,
        restricted_until:
          restrictedUntil,
        reason:
          String(reason || '').trim() ||
          null,
      })

    if (error) {
      console.error(
        'CHAT RESTRICT ERROR:',
        error
      )

      return {
        success: false,
        error:
          error.message ||
          'Could not restrict member.',
      }
    }

    return {
      success: true,
    }
  }

  const unrestrictMember = async (
    memberUserId
  ) => {
    if (!user) {
      return {
        success: false,
        error: 'Authentication required.',
      }
    }

    const {
      error,
    } = await supabase
      .from('chat_restrictions')
      .delete()
      .eq('user_id', memberUserId)

    if (error) {
      console.error(
        'CHAT UNRESTRICT ERROR:',
        error
      )

      return {
        success: false,
        error:
          error.message ||
          'Could not remove restriction.',
      }
    }

    return {
      success: true,
    }
  }

  const deleteMessage = async (
    messageId
  ) => {
    const {
      error,
    } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId)

    if (error) {
      console.error(
        'CHAT DELETE ERROR:',
        error
      )

      return {
        success: false,
        error:
          error.message ||
          'Could not delete message.',
      }
    }

    setMessages((current) =>
      current.filter(
        (item) =>
          String(item.id) !==
          String(messageId)
      )
    )

    return {
      success: true,
    }
  }

  const value = useMemo(
    () => ({
      messages,
      loading,
      restricted,
      restrictionLoading,
      sendMessage,
      restrictMember,
      unrestrictMember,
      deleteMessage,
      maxMessageLength:
        MAX_MESSAGE_LENGTH,
    }),
    [
      messages,
      loading,
      restricted,
      restrictionLoading,
    ]
  )

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  return useContext(ChatContext)
}