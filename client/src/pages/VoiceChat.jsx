import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaUsers, FaVolumeUp } from 'react-icons/fa'
import toast from 'react-hot-toast'

import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const VOICE_CHANNEL = 'sbt-major-team-admin-voice'
const SIGNAL_EVENT = 'voice-signal'

function VoiceChat() {
  const { user, isSuperAdmin, isTeamAdmin } = useAuth()
  const allowed = Boolean(user && (isTeamAdmin || isSuperAdmin))

  const channelRef = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map())
  const remoteStreamsRef = useRef(new Map())

  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const [muted, setMuted] = useState(false)
  const [participants, setParticipants] = useState([])
  const [remoteStreams, setRemoteStreams] = useState({})
  const [error, setError] = useState('')

  const displayName = useMemo(
    () => user?.user_metadata?.name || user?.email?.split('@')[0] || 'Team Admin',
    [user]
  )

  const sendSignal = useCallback((to, data) => {
    const channel = channelRef.current
    if (!channel || !user) return

    channel.send({
      type: 'broadcast',
      event: SIGNAL_EVENT,
      payload: {
        from: user.id,
        to,
        data,
      },
    })
  }, [user])

  const cleanupPeer = useCallback((peerId) => {
    const peer = peersRef.current.get(peerId)
    if (peer) {
      peer.ontrack = null
      peer.onicecandidate = null
      peer.close()
      peersRef.current.delete(peerId)
    }

    remoteStreamsRef.current.delete(peerId)
    setRemoteStreams((current) => {
      const next = { ...current }
      delete next[peerId]
      return next
    })
  }, [])

  const createPeer = useCallback((peerId) => {
    const existing = peersRef.current.get(peerId)
    if (existing) return existing

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    })

    const localStream = localStreamRef.current
    localStream?.getTracks().forEach((track) => {
      peer.addTrack(track, localStream)
    })

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerId, {
          type: 'candidate',
          candidate: event.candidate,
        })
      }
    }

    peer.ontrack = (event) => {
      const stream = event.streams?.[0]
      if (!stream) return

      remoteStreamsRef.current.set(peerId, stream)
      setRemoteStreams((current) => ({
        ...current,
        [peerId]: stream,
      }))
    }

    peer.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(peer.connectionState)) {
        cleanupPeer(peerId)
      }
    }

    peersRef.current.set(peerId, peer)
    return peer
  }, [cleanupPeer, sendSignal])

  const makeOffer = useCallback(async (peerId) => {
    const peer = createPeer(peerId)
    if (!peer) return

    try {
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      sendSignal(peerId, {
        type: 'offer',
        offer,
      })
    } catch (offerError) {
      console.error('VOICE OFFER ERROR:', offerError)
    }
  }, [createPeer, sendSignal])

  const handleSignal = useCallback(async (payload) => {
    if (!user || payload?.to !== user.id || !payload.from) return

    const peerId = payload.from
    const signal = payload.data
    if (!signal) return

    try {
      const peer = createPeer(peerId)

      if (signal.type === 'offer') {
        await peer.setRemoteDescription(signal.offer)
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        sendSignal(peerId, {
          type: 'answer',
          answer,
        })
        return
      }

      if (signal.type === 'answer') {
        await peer.setRemoteDescription(signal.answer)
        return
      }

      if (signal.type === 'candidate' && signal.candidate) {
        try {
          await peer.addIceCandidate(signal.candidate)
        } catch (candidateError) {
          console.warn('VOICE ICE CANDIDATE ERROR:', candidateError)
        }
      }
    } catch (signalError) {
      console.error('VOICE SIGNAL ERROR:', signalError)
    }
  }, [createPeer, sendSignal, user])

  const refreshPresence = useCallback(() => {
    const channel = channelRef.current
    if (!channel) return

    const state = channel.presenceState()
    const users = Object.entries(state).map(([key, values]) => {
      const first = values?.[0] || {}
      return {
        id: key,
        name: first.name || 'Team Admin',
        email: first.email || '',
      }
    })

    setParticipants(users)
  }, [])

  const leaveRoom = useCallback(() => {
    const channel = channelRef.current

    peersRef.current.forEach((peer) => peer.close())
    peersRef.current.clear()
    remoteStreamsRef.current.clear()
    setRemoteStreams({})

    if (channel) {
      channel.untrack()
      supabase.removeChannel(channel)
      channelRef.current = null
    }

    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null

    setJoined(false)
    setJoining(false)
    setParticipants([])
    setMuted(false)
  }, [])

  const joinRoom = async () => {
    if (!allowed || !user || joined || joining) return

    setJoining(true)
    setError('')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Your browser does not support microphone access.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      localStreamRef.current = stream

      const channel = supabase.channel(VOICE_CHANNEL, {
        config: {
          broadcast: { self: false },
          presence: { key: user.id },
        },
      })

      channelRef.current = channel

      channel
        .on('broadcast', { event: SIGNAL_EVENT }, ({ payload }) => {
          void handleSignal(payload)
        })
        .on('presence', { event: 'sync' }, () => {
          refreshPresence()
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          refreshPresence()
          if (key && key !== user.id) {
            const otherId = key
            if (user.id < otherId) {
              void makeOffer(otherId)
            }
          }

          const joinedName = newPresences?.[0]?.name
          if (joinedName && key !== user.id) {
            toast(`${joinedName} joined voice chat`)
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          refreshPresence()
          if (key) cleanupPeer(key)
        })

      const status = await channel.subscribe()
      if (status !== 'SUBSCRIBED') {
        throw new Error('Could not connect to the voice room.')
      }

      await channel.track({
        name: displayName,
        email: user.email || '',
        role: isSuperAdmin ? 'super_admin' : 'team_admin',
      })

      setJoined(true)
      setJoining(false)
      refreshPresence()
      toast.success('Joined team admin voice chat')
    } catch (joinError) {
      console.error('VOICE JOIN ERROR:', joinError)
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setJoining(false)
      setError(joinError?.message || 'Could not join voice chat.')
    }
  }

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks?.()[0]
    if (!track) return

    track.enabled = !track.enabled
    setMuted(!track.enabled)
  }

  useEffect(() => {
    if (!allowed) return undefined

    return () => {
      const channel = channelRef.current
      peersRef.current.forEach((peer) => peer.close())
      peersRef.current.clear()
      channel?.untrack()
      if (channel) supabase.removeChannel(channel)
      localStreamRef.current?.getTracks().forEach((track) => track.stop())
      channelRef.current = null
      localStreamRef.current = null
    }
  }, [allowed])

  if (!allowed) {
    return (
      <section className="voice-page">
        <style>{VOICE_STYLES}</style>
        <div className="glass-card voice-denied">
          <FaUsers />
          <h2>Team Admin Voice Chat</h2>
          <p>This room is available only to Team Admins and the Super Admin.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="voice-page">
      <style>{VOICE_STYLES}</style>
      <PageHeader
        title="Team Admin Voice"
        description="One shared live voice room for all Team Admins and the Super Admin."
      />

      <section className="glass-card voice-shell">
        <div className="voice-topbar">
          <div>
            <span className="eyebrow">PRIVATE TEAM CHANNEL</span>
            <h2>Admin Voice Room</h2>
            <p>Talk live with every tournament admin in one room.</p>
          </div>
          <div className={`voice-status ${joined ? 'online' : ''}`}>
            <span /> {joined ? 'CONNECTED' : 'OFFLINE'}
          </div>
        </div>

        <div className="voice-controls">
          {!joined ? (
            <button className="button button-primary" type="button" onClick={joinRoom} disabled={joining}>
              <FaMicrophone />
              {joining ? 'Joining…' : 'Join Voice'}
            </button>
          ) : (
            <>
              <button className="button button-secondary" type="button" onClick={toggleMute}>
                {muted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button className="button voice-leave" type="button" onClick={leaveRoom}>
                <FaPhoneSlash />
                Leave Voice
              </button>
            </>
          )}
        </div>

        {error && <p className="voice-error">{error}</p>}

        <div className="voice-room-grid">
          <div className="voice-participants">
            <div className="voice-section-title">
              <FaUsers />
              <span>In Room</span>
              <strong>{participants.length}</strong>
            </div>

            {participants.length === 0 ? (
              <p className="voice-empty">No admins are connected yet.</p>
            ) : (
              <div className="voice-member-list">
                {participants.map((participant) => (
                  <div className="voice-member" key={participant.id}>
                    <div className="voice-avatar">
                      {participant.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <strong>
                        {participant.name}
                        {participant.id === user.id ? ' (You)' : ''}
                      </strong>
                      <span>{participant.id === user.id ? 'Your microphone' : 'Connected'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="voice-audio-area">
            <FaVolumeUp />
            <h3>Live audio</h3>
            <p>
              {joined
                ? 'Keep this page open while you talk. Your microphone stays off only when you mute it.'
                : 'Join the room to start talking.'}
            </p>
          </div>
        </div>

        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <audio
            key={peerId}
            autoPlay
            playsInline
            ref={(element) => {
              if (element && element.srcObject !== stream) {
                element.srcObject = stream
              }
            }}
          />
        ))}
      </section>
    </section>
  )
}

const VOICE_STYLES = `
  .voice-shell { padding: 24px; border-radius: 12px; }
  .voice-topbar { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; padding-bottom:20px; border-bottom:1px solid rgba(165,185,220,.13); }
  .voice-topbar h2 { margin:5px 0 6px; font:800 2rem/1 'Barlow Condensed',sans-serif; text-transform:uppercase; }
  .voice-topbar p { margin:0; color:#8f9bb1; font-size:.76rem; }
  .voice-status { display:inline-flex; align-items:center; gap:7px; color:#8f9bb1; font-size:.62rem; font-weight:900; letter-spacing:.08em; }
  .voice-status span { width:8px; height:8px; border-radius:50%; background:#6c7180; }
  .voice-status.online { color:#7fe8ab; }
  .voice-status.online span { background:#48d27f; box-shadow:0 0 12px rgba(72,210,127,.7); }
  .voice-controls { display:flex; gap:10px; margin:20px 0; }
  .voice-leave { color:#fff; background:#9e3138; border:1px solid #d45159; }
  .voice-error { margin:0 0 16px; color:#ff9393; font-size:.72rem; }
  .voice-room-grid { display:grid; grid-template-columns:1.1fr .9fr; gap:16px; }
  .voice-participants, .voice-audio-area { min-height:250px; padding:18px; border:1px solid rgba(151,180,232,.14); border-radius:10px; background:rgba(5,10,20,.42); }
  .voice-section-title { display:flex; align-items:center; gap:8px; color:#f3c747; font-size:.7rem; font-weight:800; text-transform:uppercase; letter-spacing:.07em; }
  .voice-section-title strong { margin-left:auto; color:#fff; }
  .voice-member-list { display:grid; gap:8px; margin-top:14px; }
  .voice-member { display:flex; align-items:center; gap:10px; padding:10px; border-radius:8px; background:rgba(255,255,255,.025); }
  .voice-avatar { display:grid; place-items:center; width:34px; height:34px; border-radius:50%; color:#171207; background:#f3c747; font-weight:900; }
  .voice-member strong, .voice-member span { display:block; }
  .voice-member strong { color:#f5f5f1; font-size:.72rem; }
  .voice-member span { margin-top:3px; color:#7e899d; font-size:.58rem; }
  .voice-empty { margin-top:20px; color:#7e899d; font-size:.7rem; }
  .voice-audio-area { display:grid; place-content:center; text-align:center; }
  .voice-audio-area svg { margin:0 auto 10px; color:#f3c747; font-size:1.8rem; }
  .voice-audio-area h3 { margin:0 0 7px; font:800 1.4rem/1 'Barlow Condensed',sans-serif; text-transform:uppercase; }
  .voice-audio-area p { max-width:260px; margin:0 auto; color:#7e899d; font-size:.68rem; line-height:1.5; }
  .voice-denied { padding:36px; text-align:center; border-radius:12px; }
  .voice-denied > svg { color:#f3c747; font-size:2rem; }
  .voice-denied h2 { margin:12px 0 6px; }
  .voice-denied p { margin:0; color:#8f9bb1; font-size:.76rem; }
  @media (max-width:720px) { .voice-shell { padding:16px; } .voice-topbar { flex-direction:column; } .voice-controls { display:grid; grid-template-columns:1fr; } .voice-room-grid { grid-template-columns:1fr; } }
`

export default VoiceChat
