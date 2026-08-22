import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaBan,
  FaComments,
  FaPaperPlane,
  FaTrash,
  FaUnlock,
} from 'react-icons/fa'
import toast from 'react-hot-toast'

import { useAuth } from '../context/AuthContext'
import { useChat } from '../context/ChatContext'

function GroupChat() {
  const { user, isAdmin } = useAuth()
  const {
    messages,
    loading,
    restricted,
    sendMessage,
    restrictMember,
    unrestrictMember,
    deleteMessage,
    maxMessageLength,
  } = useChat()

  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [restrictionMinutes, setRestrictionMinutes] = useState('30')
  const bottomRef = useRef(null)

  const myNickname =
    user?.user_metadata?.nickname ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Member'

  const members = useMemo(() => {
    const seen = new Map()
    messages.forEach((item) => {
      if (item.user_id && !seen.has(item.user_id)) {
        seen.set(item.user_id, item.nickname || 'Member')
      }
    })
    return [...seen.entries()]
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const submitMessage = async (event) => {
    event.preventDefault()
    if (busy || !draft.trim()) return

    setBusy(true)
    const result = await sendMessage(draft, myNickname)
    setBusy(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setDraft('')
  }

  const handleRestrict = async (memberUserId) => {
    const minutes = Number(restrictionMinutes)
    const until = Number.isFinite(minutes) && minutes > 0
      ? new Date(Date.now() + minutes * 60 * 1000).toISOString()
      : null

    const result = await restrictMember(
      memberUserId,
      until,
      `Restricted by ${myNickname}`,
    )

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(until ? `Member restricted for ${minutes} minutes.` : 'Member restricted.')
  }

  const handleUnrestrict = async (memberUserId) => {
    const result = await unrestrictMember(memberUserId)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Chat restriction removed.')
  }

  const handleDelete = async (messageId) => {
    const result = await deleteMessage(messageId)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    toast.success('Message deleted.')
  }

  return (
    <main className="group-chat-page">
      <style>{`
        .group-chat-page {
          width: min(100%, 1000px);
          margin: 0 auto;
          padding: 24px 16px 40px;
          color: #f7f4e9;
        }
        .group-chat-shell {
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          background: linear-gradient(145deg,#12161c,#070a0f);
          box-shadow: 0 22px 60px rgba(0,0,0,.28);
        }
        .group-chat-header {
          display:flex;
          align-items:center;
          gap:12px;
          padding:15px 17px;
          border-bottom:1px solid rgba(255,255,255,.07);
          background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.01));
        }
        .group-chat-icon {
          width:42px;
          height:42px;
          display:grid;
          place-items:center;
          border-radius:50%;
          color:#07101f;
          background:#f3c747;
        }
        .group-chat-title h1 {
          margin:0;
          color:#fff;
          font:900 1.45rem/.95 'Barlow Condensed',sans-serif;
          text-transform:uppercase;
        }
        .group-chat-title p {
          margin:4px 0 0;
          color:#7e8792;
          font-size:.58rem;
        }
        .group-chat-body {
          display:grid;
          grid-template-columns:minmax(0,1fr) 220px;
          min-height:620px;
        }
        .group-chat-main {
          display:flex;
          flex-direction:column;
          min-width:0;
          min-height:620px;
        }
        .group-chat-messages {
          flex:1;
          overflow:auto;
          padding:18px 16px;
          background:
            radial-gradient(circle at 15% 10%,rgba(243,199,71,.035),transparent 25%),
            radial-gradient(circle at 85% 90%,rgba(39,103,207,.04),transparent 28%);
        }
        .group-chat-empty {
          min-height:530px;
          display:grid;
          place-items:center;
          text-align:center;
          color:#747d89;
          font-size:.7rem;
        }
        .group-chat-message {
          display:flex;
          gap:9px;
          margin-bottom:12px;
        }
        .group-chat-message.own {
          flex-direction:row-reverse;
        }
        .group-chat-avatar {
          width:31px;
          height:31px;
          flex:0 0 31px;
          display:grid;
          place-items:center;
          border-radius:50%;
          color:#dfe6ef;
          background:#1a2432;
          font-size:.61rem;
          font-weight:900;
        }
        .group-chat-bubble {
          max-width:min(75%, 580px);
          padding:8px 10px 7px;
          border:1px solid rgba(255,255,255,.06);
          border-radius:10px;
          background:#141a22;
        }
        .own .group-chat-bubble {
          background:#26351f;
          border-color:rgba(243,199,71,.12);
        }
        .group-chat-meta {
          display:flex;
          align-items:center;
          gap:8px;
          margin-bottom:4px;
        }
        .group-chat-name {
          color:#fff;
          font-size:.62rem;
          font-weight:900;
        }
        .group-chat-time {
          color:#6d7580;
          font-size:.5rem;
        }
        .group-chat-text {
          color:#d0d6df;
          font-size:.67rem;
          line-height:1.48;
          white-space:pre-wrap;
          word-break:break-word;
        }
        .group-chat-actions {
          display:flex;
          gap:5px;
          margin-top:7px;
        }
        .group-chat-action {
          border:1px solid rgba(255,255,255,.07);
          border-radius:5px;
          padding:5px 6px;
          color:#aab3bf;
          background:rgba(255,255,255,.025);
          cursor:pointer;
        }
        .group-chat-action:hover { color:#fff; }
        .group-chat-compose {
          display:flex;
          gap:8px;
          padding:11px;
          border-top:1px solid rgba(255,255,255,.07);
          background:#0a0e14;
        }
        .group-chat-compose input {
          flex:1;
          min-width:0;
          min-height:43px;
          border:1px solid rgba(255,255,255,.08);
          border-radius:22px;
          outline:0;
          padding:0 15px;
          color:#fff;
          background:#121821;
        }
        .group-chat-send {
          width:43px;
          height:43px;
          flex:0 0 43px;
          display:grid;
          place-items:center;
          border:0;
          border-radius:50%;
          color:#07101f;
          background:#f3c747;
          cursor:pointer;
        }
        .group-chat-send:disabled { opacity:.45; cursor:not-allowed; }
        .group-chat-restricted {
          padding:9px 12px;
          color:#ff8c99;
          border-top:1px solid rgba(255,48,72,.12);
          background:rgba(255,48,72,.05);
          font-size:.58rem;
        }
        .group-chat-side {
          padding:14px;
          border-left:1px solid rgba(255,255,255,.07);
          background:rgba(255,255,255,.015);
        }
        .group-chat-side h2 {
          margin:0 0 4px;
          color:#fff;
          font:800 1rem/1 'Barlow Condensed',sans-serif;
          text-transform:uppercase;
        }
        .group-chat-side p {
          margin:0 0 14px;
          color:#717b87;
          font-size:.55rem;
          line-height:1.45;
        }
        .group-chat-member {
          padding:9px 0;
          border-bottom:1px solid rgba(255,255,255,.05);
        }
        .group-chat-member-name {
          color:#dce1e8;
          font-size:.61rem;
          font-weight:800;
          word-break:break-word;
        }
        .group-chat-member-tools {
          display:flex;
          gap:5px;
          margin-top:6px;
        }
        .group-chat-member-tools input {
          width:58px;
          border:1px solid rgba(255,255,255,.08);
          border-radius:5px;
          padding:5px;
          color:#fff;
          background:#0f141c;
          font-size:.54rem;
        }
        @media (max-width:760px) {
          .group-chat-body { grid-template-columns:1fr; }
          .group-chat-side {
            border-left:0;
            border-top:1px solid rgba(255,255,255,.07);
          }
          .group-chat-main { min-height:560px; }
          .group-chat-messages { min-height:430px; }
          .group-chat-bubble { max-width:82%; }
        }
      `}</style>

      <section className="group-chat-shell">
        <header className="group-chat-header">
          <div className="group-chat-icon"><FaComments /></div>
          <div className="group-chat-title">
            <h1>SBT MAJOR GROUP</h1>
            <p>Tournament group chat · realtime</p>
          </div>
        </header>

        <div className="group-chat-body">
          <section className="group-chat-main">
            <div className="group-chat-messages">
              {loading ? (
                <div className="group-chat-empty">Loading group chat…</div>
              ) : messages.length === 0 ? (
                <div className="group-chat-empty">
                  <div>
                    <strong style={{display:'block',color:'#dfe5ec',fontSize:'.9rem',marginBottom:6}}>Welcome to SBT MAJOR</strong>
                    Start the tournament conversation here.
                  </div>
                </div>
              ) : (
                messages.map((item) => {
                  const own = String(item.user_id) === String(user?.id)
                  return (
                    <article className={`group-chat-message${own ? ' own' : ''}`} key={item.id}>
                      <div className="group-chat-avatar">
                        {String(item.nickname || 'M').trim().slice(0,1).toUpperCase()}
                      </div>
                      <div className="group-chat-bubble">
                        <div className="group-chat-meta">
                          <span className="group-chat-name">{item.nickname}</span>
                          <span className="group-chat-time">
                            {new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="group-chat-text">{item.message}</div>
                        {isAdmin && (
                          <div className="group-chat-actions">
                            <button className="group-chat-action" type="button" title="Restrict" onClick={() => handleRestrict(item.user_id)}><FaBan /></button>
                            <button className="group-chat-action" type="button" title="Delete" onClick={() => handleDelete(item.id)}><FaTrash /></button>
                          </div>
                        )}
                      </div>
                    </article>
                  )
                })
              )}
              <div ref={bottomRef} />
            </div>

            {restricted && (
              <div className="group-chat-restricted">You are currently restricted from sending messages.</div>
            )}

            <form className="group-chat-compose" onSubmit={submitMessage}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={maxMessageLength}
                placeholder={restricted ? 'Chat restricted' : 'Message the SBT MAJOR group…'}
                disabled={busy || restricted || !user}
              />
              <button className="group-chat-send" type="submit" disabled={busy || restricted || !draft.trim() || !user} aria-label="Send message">
                <FaPaperPlane />
              </button>
            </form>
          </section>

          <aside className="group-chat-side">
            <h2>Group Members</h2>
            <p>Everyone uses the same SBT MAJOR group. Admins can moderate messages.</p>

            {isAdmin && (
              <div style={{marginBottom:12}}>
                <input
                  type="number"
                  min="1"
                  value={restrictionMinutes}
                  onChange={(event) => setRestrictionMinutes(event.target.value)}
                  style={{width:'100%',boxSizing:'border-box',marginBottom:6,border:'1px solid rgba(255,255,255,.08)',borderRadius:5,padding:7,color:'#fff',background:'#0f141c',fontSize:'.55rem'}}
                  aria-label="Restriction minutes"
                />
              </div>
            )}

            {members.length ? members.map(([memberId, name]) => (
              <div className="group-chat-member" key={memberId}>
                <div className="group-chat-member-name">{name}</div>
                {isAdmin && (
                  <div className="group-chat-member-tools">
                    <button className="group-chat-action" type="button" title="Restrict" onClick={() => handleRestrict(memberId)}><FaBan /></button>
                    <button className="group-chat-action" type="button" title="Unrestrict" onClick={() => handleUnrestrict(memberId)}><FaUnlock /></button>
                  </div>
                )}
              </div>
            )) : (
              <p>No members yet.</p>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}

export default GroupChat
