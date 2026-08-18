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

function Chat() {
  const {
    user,
    isAdmin,
    isSuperAdmin,
  } = useAuth()

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
  const [restrictionMinutes, setRestrictionMinutes] =
    useState('30')

  const bottomRef = useRef(null)

  const myNickname =
    user?.user_metadata?.nickname ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Member'

  const memberIds = useMemo(
    () =>
      [...new Set(
        messages
          .map((item) => item.user_id)
          .filter(Boolean)
      )],
    [messages]
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages.length])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (busy) return

    setBusy(true)

    const result = await sendMessage(
      draft,
      myNickname
    )

    setBusy(false)

    if (!result.success) {
      toast.error(result.error)
      return
    }

    setDraft('')
  }

  const handleRestrict = async (
    memberUserId
  ) => {
    if (!isAdmin) return

    const minutes = Number(
      restrictionMinutes
    )

    const until =
      Number.isFinite(minutes) &&
      minutes > 0
        ? new Date(
            Date.now() +
              minutes * 60 * 1000
          ).toISOString()
        : null

    const result =
      await restrictMember(
        memberUserId,
        until,
        `Restricted by ${myNickname}`
      )

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(
      until
        ? `Member restricted for ${minutes} minutes.`
        : 'Member restricted.'
    )
  }

  const handleUnrestrict = async (
    memberUserId
  ) => {
    const result =
      await unrestrictMember(
        memberUserId
      )

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success(
      'Chat restriction removed.'
    )
  }

  const handleDelete = async (
    messageId
  ) => {
    if (!isAdmin) return

    const result =
      await deleteMessage(
        messageId
      )

    if (!result.success) {
      toast.error(result.error)
      return
    }

    toast.success('Message deleted.')
  }

  return (
    <main className="chat-page">
      <style>{`
        .chat-page {
          width: min(100%, 1050px);
          margin: 0 auto;
          padding: 28px 18px 42px;
        }

        .chat-header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:14px;
          margin-bottom:16px;
        }

        .chat-title {
          display:flex;
          align-items:center;
          gap:11px;
        }

        .chat-title-icon {
          width:40px;
          height:40px;
          display:grid;
          place-items:center;
          border-radius:9px;
          color:#ff3048;
          background:rgba(255,48,72,.07);
          border:1px solid rgba(255,48,72,.20);
        }

        .chat-title h1 {
          margin:0;
          color:#fff;
          font:900 2rem/.95 'Barlow Condensed',sans-serif;
          text-transform:uppercase;
        }

        .chat-title p {
          margin:4px 0 0;
          color:#7d838d;
          font-size:.64rem;
        }

        .chat-main {
          display:grid;
          grid-template-columns:minmax(0,1fr) 250px;
          gap:14px;
        }

        .chat-card,
        .chat-members-card {
          border:1px solid rgba(255,255,255,.07);
          border-radius:12px;
          background:linear-gradient(145deg,#14171b,#090b0e);
          box-shadow:0 18px 40px rgba(0,0,0,.22);
        }

        .chat-card {
          display:flex;
          flex-direction:column;
          min-height:640px;
          overflow:hidden;
        }

        .chat-messages {
          flex:1;
          min-height:0;
          overflow:auto;
          padding:17px;
        }

        .chat-message {
          display:flex;
          gap:9px;
          margin-bottom:11px;
        }

        .chat-avatar {
          width:30px;
          height:30px;
          flex:0 0 auto;
          display:grid;
          place-items:center;
          border-radius:50%;
          background:rgba(255,255,255,.06);
          color:#dfe4eb;
          font-size:.63rem;
          font-weight:900;
        }

        .chat-message-body {
          min-width:0;
          flex:1;
          padding:9px 11px;
          border:1px solid rgba(255,255,255,.05);
          border-radius:9px;
          background:rgba(255,255,255,.025);
        }

        .chat-message-top {
          display:flex;
          align-items:center;
          gap:8px;
          margin-bottom:4px;
        }

        .chat-message-name {
          color:#fff;
          font-size:.67rem;
          font-weight:900;
        }

        .chat-message-time {
          color:#6f7680;
          font-size:.53rem;
        }

        .chat-message-text {
          color:#bfc5ce;
          font-size:.68rem;
          line-height:1.5;
          white-space:pre-wrap;
          word-break:break-word;
        }

        .chat-message-actions {
          display:flex;
          gap:6px;
          margin-top:7px;
        }

        .chat-icon-button {
          border:1px solid rgba(255,255,255,.07);
          border-radius:6px;
          padding:6px 7px;
          color:#abb3be;
          background:rgba(255,255,255,.025);
          cursor:pointer;
        }

        .chat-icon-button:hover {
          color:#fff;
          background:rgba(255,255,255,.06);
        }

        .chat-composer {
          display:flex;
          gap:8px;
          padding:12px;
          border-top:1px solid rgba(255,255,255,.06);
          background:rgba(0,0,0,.15);
        }

        .chat-composer input {
          flex:1;
          min-width:0;
          min-height:42px;
          border:1px solid rgba(255,255,255,.07);
          border-radius:7px;
          outline:0;
          padding:0 11px;
          color:#fff;
          background:rgba(255,255,255,.025);
        }

        .chat-send {
          width:44px;
          display:grid;
          place-items:center;
          border:0;
          border-radius:7px;
          color:#05070b;
          background:#f3c747;
          cursor:pointer;
        }

        .chat-send:disabled {
          opacity:.45;
          cursor:not-allowed;
        }

        .chat-restricted {
          padding:11px 12px;
          border-top:1px solid rgba(255,48,72,.14);
          color:#ff8b99;
          background:rgba(255,48,72,.05);
          font-size:.62rem;
        }

        .chat-members-card {
          padding:14px;
        }

        .chat-members-title {
          display:flex;
          align-items:center;
          justify-content:space-between;
          margin-bottom:11px;
        }

        .chat-members-title strong {
          color:#fff;
          font-size:.66rem;
          text-transform:uppercase;
          letter-spacing:.07em;
        }

        .chat-members-title span {
          color:#707781;
          font-size:.53rem;
        }

        .chat-member {
          padding:8px 0;
          border-bottom:1px solid rgba(255,255,255,.05);
        }

        .chat-member:last-child {
          border-bottom:0;
        }

        .chat-member-name {
          color:#d9dee6;
          font-size:.63rem;
          font-weight:800;
          word-break:break-word;
        }

        .chat-member-controls {
          display:flex;
          gap:6px;
          margin-top:7px;
        }

        .chat-member-controls input {
          width:70px;
          min-width:0;
          border:1px solid rgba(255,255,255,.07);
          border-radius:5px;
          padding:6px;
          color:#fff;
          background:rgba(255,255,255,.02);
          font-size:.56rem;
        }

        .chat-empty {
          min-height:100%;
          display:grid;
          place-items:center;
          color:#6f7680;
          font-size:.7rem;
        }

        @media (max-width: 820px) {
          .chat-main {
            grid-template-columns:1fr;
          }

          .chat-members-card {
            order:2;
          }

          .chat-card {
            min-height:560px;
          }
        }
      `}</style>

      <header className="chat-header">
        <div className="chat-title">
          <div className="chat-title-icon">
            <FaComments />
          </div>
          <div>
            <h1>Live Chat</h1>
            <p>
              Players, Team Admins and Super Admins · realtime tournament chat
            </p>
          </div>
        </div>
      </header>

      <div className="chat-main">
        <section className="chat-card">
          <div className="chat-messages">
            {loading ? (
              <div className="chat-empty">
                Loading chat…
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-empty">
                Start the conversation.
              </div>
            ) : (
              messages.map((item) => (
                <article
                  className="chat-message"
                  key={item.id}
                >
                  <div className="chat-avatar">
                    {String(
                      item.nickname || 'M'
                    )
                      .trim()
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div className="chat-message-body">
                    <div className="chat-message-top">
                      <strong className="chat-message-name">
                        {item.nickname}
                      </strong>
                      <span className="chat-message-time">
                        {new Date(
                          item.created_at
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </span>
                    </div>

                    <div className="chat-message-text">
                      {item.message}
                    </div>

                    {isAdmin && (
                      <div className="chat-message-actions">
                        <button
                          className="chat-icon-button"
                          type="button"
                          title="Restrict member"
                          onClick={() =>
                            handleRestrict(
                              item.user_id
                            )
                          }
                        >
                          <FaBan />
                        </button>

                        <button
                          className="chat-icon-button"
                          type="button"
                          title="Delete message"
                          onClick={() =>
                            handleDelete(
                              item.id
                            )
                          }
                        >
                          <FaTrash />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))
            )}

            <div ref={bottomRef} />
          </div>

          {restricted && (
            <div className="chat-restricted">
              You are currently restricted from sending chat messages.
            </div>
          )}

          <form
            className="chat-composer"
            onSubmit={handleSubmit}
          >
            <input
              value={draft}
              onChange={(event) =>
                setDraft(event.target.value)
              }
              maxLength={maxMessageLength}
              placeholder={
                restricted
                  ? 'Chat restricted'
                  : 'Write a message…'
              }
              disabled={
                busy ||
                restricted
              }
            />

            <button
              className="chat-send"
              type="submit"
              disabled={
                busy ||
                restricted ||
                !draft.trim()
              }
              aria-label="Send message"
            >
              <FaPaperPlane />
            </button>
          </form>
        </section>

        <aside className="chat-members-card">
          <div className="chat-members-title">
            <strong>Moderation</strong>
            <span>
              {memberIds.length} members
            </span>
          </div>

          {isAdmin ? (
            <>
              <p style={{
                margin: '0 0 10px',
                color: '#777e87',
                fontSize: '.56rem',
                lineHeight: 1.5,
              }}>
                Team Admins and Super Admins can restrict any chat member.
              </p>

              {memberIds.map(
                (memberId) => {
                  const lastMessage =
                    [...messages]
                      .reverse()
                      .find(
                        (item) =>
                          item.user_id ===
                          memberId
                      )

                  if (!lastMessage) {
                    return null
                  }

                  return (
                    <div
                      className="chat-member"
                      key={memberId}
                    >
                      <div className="chat-member-name">
                        {lastMessage.nickname}
                      </div>

                      <div className="chat-member-controls">
                        <input
                          type="number"
                          min="1"
                          value={
                            restrictionMinutes
                          }
                          onChange={(event) =>
                            setRestrictionMinutes(
                              event.target.value
                            )
                          }
                          aria-label="Restriction minutes"
                        />

                        <button
                          className="chat-icon-button"
                          type="button"
                          title="Restrict"
                          onClick={() =>
                            handleRestrict(
                              memberId
                            )
                          }
                        >
                          <FaBan />
                        </button>

                        <button
                          className="chat-icon-button"
                          type="button"
                          title="Remove restriction"
                          onClick={() =>
                            handleUnrestrict(
                              memberId
                            )
                          }
                        >
                          <FaUnlock />
                        </button>
                      </div>
                    </div>
                  )
                }
              )}
            </>
          ) : (
            <p style={{
              margin: 0,
              color: '#777e87',
              fontSize: '.58rem',
              lineHeight: 1.5,
            }}>
              Everyone can participate until a Team Admin or Super Admin applies a chat restriction.
            </p>
          )}
        </aside>
      </div>
    </main>
  )
}

export default Chat