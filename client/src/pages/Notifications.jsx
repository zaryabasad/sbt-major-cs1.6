import { FaArrowLeft, FaBell, FaCheckDouble, FaCircle } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../context/AuthContext'

const STYLES = `
  .notifications-page{padding:10px 0 60px}
  .notifications-shell{width:min(100%,860px);margin:0 auto}
  .notifications-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:24px}
  .notifications-header h1{margin:0 0 8px;font:900 clamp(2.7rem,6vw,4.7rem)/.9 'Barlow Condensed',sans-serif;text-transform:uppercase}
  .notifications-header p{margin:0;color:#8f99ac;font-size:.76rem}
  .notifications-actions{display:flex;gap:9px;align-items:center}
  .notifications-mark{display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:0 12px;color:#f3c747;border:1px solid rgba(243,199,71,.28);border-radius:6px;background:rgba(243,199,71,.05);cursor:pointer;font-size:.63rem;font-weight:900;text-transform:uppercase}
  .notification-list{display:grid;gap:10px}
  .notification-card{position:relative;display:grid;grid-template-columns:44px 1fr auto;gap:13px;align-items:start;padding:17px;border-radius:10px}
  .notification-card.unread{border-color:rgba(243,199,71,.35);box-shadow:0 0 0 1px rgba(243,199,71,.04),0 15px 35px rgba(0,0,0,.2)}
  .notification-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:9px;color:#181205;background:#f3c747}
  .notification-card h2{margin:0 0 5px;color:#fff;font-size:.84rem}
  .notification-card p{margin:0;color:#8d98ab;font-size:.7rem;line-height:1.55}
  .notification-time{color:#727c8d;font-size:.57rem;white-space:nowrap}
  .notification-unread-dot{position:absolute;left:7px;top:8px;color:#f3c747;font-size:.48rem}
  .notification-empty{padding:45px 20px;text-align:center;border-radius:10px}
  .notification-empty svg{color:#f3c747;font-size:2rem;margin-bottom:10px}
  .notification-empty h2{margin:0 0 6px;font:800 1.9rem/1 'Barlow Condensed',sans-serif;text-transform:uppercase}
  .notification-empty p{margin:0;color:#7f899c;font-size:.7rem}
  .notifications-back{display:inline-flex;align-items:center;gap:7px;margin-bottom:18px;color:#a0a9ba;font-size:.62rem;font-weight:800;text-transform:uppercase}
  @media (max-width:620px){.notifications-header{align-items:flex-start;flex-direction:column}.notification-card{grid-template-columns:38px 1fr}.notification-icon{width:38px;height:38px}.notification-time{grid-column:2}.notifications-actions{width:100%}.notifications-mark{width:100%;justify-content:center}}
`

function Notifications() {
  const { isPlayer } = useAuth()
  const { notifications, loading, markRead, markAllRead, unreadCount } = useNotifications()

  if (!isPlayer) {
    return (
      <section className="notifications-page">
        <style>{STYLES}</style>
        <div className="glass-card notification-empty">
          <FaBell />
          <h2>Player Login Required</h2>
          <p>Sign in with your approved player account to view personal notifications.</p>
          <Link className="button button-primary" to="/player-login" style={{ marginTop: 18 }}>Player Login</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="notifications-page">
      <style>{STYLES}</style>
      <div className="notifications-shell">
        <Link className="notifications-back" to="/"><FaArrowLeft /> Back to Tournament</Link>

        <header className="notifications-header">
          <div>
            <p className="eyebrow">SBT MAJOR · PLAYER AREA</p>
            <h1>Notifications</h1>
            <p>{unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You are all caught up.'}</p>
          </div>

          {unreadCount > 0 && (
            <div className="notifications-actions">
              <button className="notifications-mark" type="button" onClick={markAllRead}><FaCheckDouble /> Mark all read</button>
            </div>
          )}
        </header>

        {loading ? (
          <div className="glass-card notification-empty"><p>Loading notifications…</p></div>
        ) : notifications.length === 0 ? (
          <div className="glass-card notification-empty">
            <FaBell />
            <h2>No notifications yet</h2>
            <p>When your registration, auction, fixtures or tournament status changes, updates will appear here.</p>
          </div>
        ) : (
          <div className="notification-list">
            {notifications.map((item) => (
              <article className={`glass-card notification-card${item.is_read ? '' : ' unread'}`} key={item.id} onClick={() => !item.is_read && markRead(item.id)}>
                {!item.is_read && <FaCircle className="notification-unread-dot" />}
                <div className="notification-icon"><FaBell /></div>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.message}</p>
                </div>
                <time className="notification-time">{new Date(item.created_at).toLocaleString()}</time>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Notifications
