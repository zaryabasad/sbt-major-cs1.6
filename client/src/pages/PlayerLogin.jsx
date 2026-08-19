import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FaBell, FaLock, FaUser } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const STYLES = `
  .player-login-page{min-height:100vh;display:grid;place-items:center;padding:24px 16px;background:radial-gradient(circle at 50% 0,rgba(243,199,71,.09),transparent 35%),#03060d}
  .player-login-shell{width:min(100%,430px)}
  .player-login-brand{display:block;width:fit-content;margin:0 auto 22px;color:#fff;font:800 1.45rem/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;text-transform:uppercase}.player-login-brand span{color:#f3c747}
  .player-login-card{padding:28px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:linear-gradient(145deg,#17181b,#0b0c0e);box-shadow:0 28px 70px rgba(0,0,0,.4)}
  .player-login-card h1{margin:6px 0 8px;color:#fff;font:900 3rem/.9 'Barlow Condensed',sans-serif;text-transform:uppercase}.player-login-intro{margin:0 0 20px;color:#92969e;font-size:.75rem;line-height:1.6}
  .player-login-form{display:grid;gap:14px}.player-login-label span{display:block;margin-bottom:7px;color:#a9adb5;font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .player-login-input{display:flex;align-items:center;gap:9px;min-height:46px;padding:0 12px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.02)}.player-login-input svg{color:#7e838b;font-size:.72rem}.player-login-input input{width:100%;min-width:0;border:0;outline:0;color:#fff;background:transparent}
  .player-login-error{margin:0;padding:10px 11px;color:#ff959d;border:1px solid rgba(255,48,72,.2);border-radius:7px;background:rgba(255,48,72,.055);font-size:.68rem}.player-login-submit{width:100%;justify-content:center;min-height:46px}
  .player-login-links{display:flex;justify-content:space-between;gap:10px;margin-top:16px;font-size:.63rem}.player-login-links a{color:#f3c747}.player-login-note{margin-top:18px;padding:11px 12px;border:1px solid rgba(255,255,255,.06);border-radius:7px;color:#747a84;background:rgba(255,255,255,.018);font-size:.62rem;line-height:1.5}
`

function PlayerLogin() {
  const { user, isPlayer, playerLogin, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <main className="player-login-page"><style>{STYLES}</style><div className="player-login-card">Loading…</div></main>

  if (user && isPlayer) {
    return <Navigate to={location.state?.from?.pathname || '/notifications'} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await playerLogin(email, password)
    setSubmitting(false)

    if (!result.success) {
      setError(result.error || 'Unable to sign in.')
      return
    }

    toast.success('Welcome back')
    navigate(location.state?.from?.pathname || '/notifications', { replace: true })
  }

  return (
    <main className="player-login-page">
      <style>{STYLES}</style>
      <section className="player-login-shell">
        <Link className="player-login-brand" to="/">SBT <span>MAJOR</span></Link>
        <section className="player-login-card">
          <p className="eyebrow"><FaBell /> PLAYER ACCESS</p>
          <h1>Player Login</h1>
          <p className="player-login-intro">Use the email and password from your player account setup. Your account must belong to an approved player registration.</p>

          <form className="player-login-form" onSubmit={handleSubmit}>
            <label className="player-login-label"><span>Email</span><div className="player-login-input"><FaUser /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="player@email.com" required /></div></label>
            <label className="player-login-label"><span>Password</span><div className="player-login-input"><FaLock /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Your password" required /></div></label>
            {error && <p className="player-login-error">{error}</p>}
            <button className="button button-primary player-login-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Login to Player Area'}</button>
          </form>

          <div className="player-login-links">
            <Link to="/player-account">Create Player Account</Link>
            <Link to="/login">Admin Login</Link>
          </div>

          <p className="player-login-note">First time here? Create your player account, then log in after your registration has been approved by the tournament admin.</p>
        </section>
      </section>
    </main>
  )
}

export default PlayerLogin
