import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaUsers, FaVolumeUp } from 'react-icons/fa'
import toast from 'react-hot-toast'

import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const VOICE_CHANNEL = 'sbt-major-team-admin-voice'
const SIGNAL_EVENT = 'voice-signal'

function VoiceChatFixed() {
  const { user, isSuperAdmin, isTeamAdmin } = useAuth()
  const allowed = Boolean(user && (isTeamAdmin || isSuperAdmin))

  const channelRef = useRef(null)
  const localStreamRef = useRef(null)
  const peersRef = useRef(new Map())
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const [muted, setMuted] = useState(false)
  const [participants, setParticipants] = useState([])
  const [remoteStreams, setRemoteStreams] = useState({})
  const [error, setError] = useState('')

  const displayName = useMemo(
    () => user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Team Admin',
    [user],
  )

  const sendSignal = useCallback((to, data) => {
    const channel = channelRef.current
    if (!channel || !user) return
    void channel.send({
      type: 'broadcast',
      event: SIGNAL_EVENT,
      payload: { from: user.id, to, data },
    })
  }, [user])

  const cleanupPeer = useCallback((peerId) => {
    const peer = peersRef.current.get(peerId)
    if (peer) {
      peer.close()
      peersRef.current.delete(peerId)
    }
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

    localStreamRef.current?.getTracks().forEach((track) => {
      peer.addTrack(track, localStreamRef.current)
    })

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) sendSignal(peerId, { type: 'candidate', candidate })
    }

    peer.ontrack = ({ streams }) => {
      const stream = streams?.[0]
      if (stream) setRemoteStreams((current) => ({ ...current, [peerId]: stream }))
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
    const offer = await peer.createOffer()
    await peer.setLocalDescription(offer)
    sendSignal(peerId, { type: 'offer', offer: peer.localDescription })
  }, [createPeer, sendSignal])

  const handleSignal = useCallback(async (payload) => {
    if (!user || payload?.to !== user.id || !payload.from || !payload.data) return

    try {
      const peerId = payload.from
      const signal = payload.data
      const peer = createPeer(peerId)

      if (signal.type === 'offer') {
        await peer.setRemoteDescription(signal.offer)
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        sendSignal(peerId, { type: 'answer', answer: peer.localDescription })
      } else if (signal.type === 'answer') {
        await peer.setRemoteDescription(signal.answer)
      } else if (signal.type === 'candidate' && signal.candidate) {
        await peer.addIceCandidate(signal.candidate)
      }
    } catch (signalError) {
      console.error('VOICE SIGNAL ERROR:', signalError)
    }
  }, [createPeer, sendSignal, user])

  const refreshPresence = useCallback(() => {
    const channel = channelRef.current
    if (!channel) return []

    const state = channel.presenceState()
    const users = Object.entries(state).flatMap(([id, values]) => {
      const first = values?.[0]
      return first ? [{ id, name: first.name || 'Team Admin', role: first.role || 'team_admin' }] : []
    })
    setParticipants(users)
    return users
  }, [])

  const leaveRoom = useCallback(() => {
    const channel = channelRef.current
    peersRef.current.forEach((peer) => peer.close())
    peersRef.current.clear()

    if (channel) {
      void channel.untrack()
      void supabase.removeChannel(channel)
    }

    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    channelRef.current = null
    setRemoteStreams({})
    setParticipants([])
    setJoined(false)
    setJoining(false)
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

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const accessToken = sessionData.session?.access_token
      if (!accessToken) throw new Error('Authentication session expired. Please log in again.')

      // Private Realtime channels must receive the current Supabase JWT before subscribe.
      supabase.realtime.setAuth(accessToken)

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      localStreamRef.current = stream

      const channel = supabase.channel(VOICE_CHANNEL, {
        config: {
          private: true,
          broadcast: { self: false },
          presence: { key: user.id },
        },
      })
      channelRef.current = channel

      channel
        .on('broadcast', { event: SIGNAL_EVENT }, ({ payload }) => void handleSignal(payload))
        .on('presence', { event: 'sync' }, () => {
          const users = refreshPresence()
          users.forEach((participant) => {
            if (participant.id !== user.id && user.id < participant.id) {
              void makeOffer(participant.id)
            }
          })
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          refreshPresence()
          if (key && key !== user.id && user.id < key) void makeOffer(key)
          const name = newPresences?.[0]?.name
          if (name && key !== user.id) toast(`${name} joined voice chat`)
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          refreshPresence()
          if (key) cleanupPeer(key)
        })

      const status = await new Promise((resolve, reject) => {
        channel.subscribe((state, subscribeError) => {
          if (state === 'SUBSCRIBED') resolve(state)
          else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
            reject(subscribeError || new Error(`Realtime channel status: ${state}`))
          }
        })
      })

      if (status !== 'SUBSCRIBED') throw new Error('Could not connect to the voice room.')

      await channel.track({
        name: displayName,
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
        void supabase.removeChannel(channelRef.current)
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
    return () => leaveRoom()
  }, [allowed, leaveRoom])

  if (!allowed) {
    return (
      <section className="voice-page"><style>{VOICE_STYLES}</style><div className="glass-card voice-denied"><FaUsers /><h2>Team Admin Voice Chat</h2><p>This room is available only to Team Admins and the Super Admin.</p></div></section>
    )
  }

  return (
    <section className="voice-page">
      <style>{VOICE_STYLES}</style>
      <PageHeader title="Team Admin Voice" description="One shared live voice room for all Team Admins and the Super Admin." />
      <section className="glass-card voice-shell">
        <div className="voice-topbar">
          <div><span className="eyebrow">PRIVATE TEAM CHANNEL</span><h2>Admin Voice Room</h2><p>Talk live with every tournament admin in one room.</p></div>
          <div className={`voice-status ${joined ? 'online' : ''}`}><span />{joined ? 'CONNECTED' : 'OFFLINE'}</div>
        </div>
        <div className="voice-controls">
          {!joined ? (
            <button className="button button-primary" type="button" onClick={joinRoom} disabled={joining}><FaMicrophone />{joining ? 'Joining…' : 'Join Voice'}</button>
          ) : (
            <><button className="button button-secondary" type="button" onClick={toggleMute}>{muted ? <FaMicrophoneSlash /> : <FaMicrophone />}{muted ? 'Unmute' : 'Mute'}</button><button className="button voice-leave" type="button" onClick={leaveRoom}><FaPhoneSlash />Leave Voice</button></>
          )}
        </div>
        {error && <p className="voice-error">{error}</p>}
        <div className="voice-room-grid">
          <div className="voice-participants"><div className="voice-section-title"><FaUsers /><span>In Room</span><strong>{participants.length}</strong></div>{participants.length ? <div className="voice-member-list">{participants.map((participant) => <div className="voice-member" key={participant.id}><div className="voice-avatar">{participant.name.slice(0,1).toUpperCase()}</div><div><strong>{participant.name}{participant.id === user.id ? ' (You)' : ''}</strong><span>{participant.role === 'super_admin' ? 'Super Admin' : 'Team Admin'}</span></div></div>)}</div> : <p className="voice-empty">No admins are connected yet.</p>}</div>
          <div className="voice-audio-area"><FaVolumeUp /><h3>Live audio</h3><p>{joined ? 'Your microphone is live. Use Mute any time.' : 'Join the room to start talking.'}</p></div>
        </div>
        {Object.entries(remoteStreams).map(([peerId, stream]) => <audio key={peerId} autoPlay playsInline ref={(element) => { if (element && element.srcObject !== stream) { element.srcObject = stream; void element.play().catch(() => undefined) } }} />)}
      </section>
    </section>
  )
}

const VOICE_STYLES = `
.voice-shell{padding:24px;border-radius:12px}.voice-topbar{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding-bottom:20px;border-bottom:1px solid rgba(165,185,220,.13)}.voice-topbar h2{margin:5px 0 6px;font:800 2rem/1 'Barlow Condensed',sans-serif;text-transform:uppercase}.voice-topbar p{margin:0;color:#8f9bb1;font-size:.76rem}.voice-status{display:inline-flex;align-items:center;gap:7px;color:#8f9bb1;font-size:.62rem;font-weight:900;letter-spacing:.08em}.voice-status span{width:8px;height:8px;border-radius:50%;background:#6c7180}.voice-status.online{color:#7fe8ab}.voice-status.online span{background:#48d27f;box-shadow:0 0 12px rgba(72,210,127,.7)}.voice-controls{display:flex;gap:10px;margin:20px 0}.voice-leave{color:#fff;background:#9e3138;border:1px solid #d45159}.voice-error{margin:0 0 16px;color:#ff9393;font-size:.72rem}.voice-room-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}.voice-participants,.voice-audio-area{min-height:250px;padding:18px;border:1px solid rgba(151,180,232,.14);border-radius:10px;background:rgba(5,10,20,.42)}.voice-section-title{display:flex;align-items:center;gap:8px;color:#f3c747;font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em}.voice-section-title strong{margin-left:auto;color:#fff}.voice-member-list{display:grid;gap:8px;margin-top:14px}.voice-member{display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;background:rgba(255,255,255,.025)}.voice-avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;color:#171207;background:#f3c747;font-weight:900}.voice-member strong,.voice-member span{display:block}.voice-member strong{color:#f5f5f1;font-size:.72rem}.voice-member span{margin-top:3px;color:#7e899d;font-size:.58rem}.voice-empty{margin-top:20px;color:#7e899d;font-size:.7rem}.voice-audio-area{display:grid;place-items:center;text-align:center;align-content:center}.voice-audio-area svg{font-size:2rem;color:#f3c747}.voice-audio-area h3{margin:12px 0 6px;color:#fff;font:800 1.4rem 'Barlow Condensed',sans-serif;text-transform:uppercase}.voice-audio-area p{max-width:300px;margin:0;color:#8190a7;font-size:.66rem;line-height:1.6}.voice-denied{max-width:700px;margin:30px auto;padding:30px;text-align:center}.voice-denied svg{font-size:2rem;color:#f3c747}.voice-denied h2{margin:12px 0 6px;color:#fff;font:800 2rem 'Barlow Condensed',sans-serif;text-transform:uppercase}.voice-denied p{margin:0;color:#8793a7}@media(max-width:820px){.voice-topbar{flex-direction:column}.voice-room-grid{grid-template-columns:1fr}.voice-controls{flex-wrap:wrap}}
`

export default VoiceChatFixed
