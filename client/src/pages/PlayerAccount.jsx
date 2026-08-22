import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle, FaLock, FaUser } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

const STYLES = `
  .player-account-page{min-height:100vh;display:grid;place-items:center;padding:28px 16px;background:radial-gradient(circle at 50% 0,rgba(243,199,71,.09),transparent 35%),#03060d}
  .player-account-card{width:min(100%,470px);padding:28px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:linear-gradient(145deg,#17181b,#0b0c0e);box-shadow:0 28px 70px rgba(0,0,0,.4)}
  .player-account-brand{display:block;width:max-content;margin:0 auto 20px;color:#fff;font:800 1.45rem/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;text-transform:uppercase}.player-account-brand span{color:#f3c747}
  .player-account-card h1{margin:6px 0 8px;color:#fff;font:900 3rem/.9 'Barlow Condensed',sans-serif;text-transform:uppercase}
  .player-account-copy{margin:0 0 20px;color:#92969e;font-size:.73rem;line-height:1.6}
  .player-account-form{display:grid;gap:13px}.player-account-field span{display:block;margin-bottom:6px;color:#a9adb5;font-size:.59rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .player-account-input{display:flex;align-items:center;gap:9px;min-height:46px;padding:0 12px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.02)}.player-account-input svg{color:#7e838b;font-size:.72rem}.player-account-input input{width:100%;border:0;outline:0;color:#fff;background:transparent}
  .player-account-error{margin:0;padding:10px 11px;color:#ff959d;border:1px solid rgba(255,48,72,.2);border-radius:7px;background:rgba(255,48,72,.055);font-size:.66rem}.player-account-submit{width:100%;justify-content:center;min-height:46px}
  .player-account-note{margin:16px 0 0;padding:11px 12px;border:1px solid rgba(255,255,255,.06);border-radius:7px;color:#747a84;background:rgba(255,255,255,.018);font-size:.62rem;line-height:1.55}
  .player-account-success{text-align:center;padding:18px 4px}.player-account-success svg{color:#75df9a;font-size:2.3rem;margin-bottom:12px}.player-account-success h2{margin:0 0 8px;color:#fff;font:900 2.2rem/1 'Barlow Condensed',sans-serif;text-transform:uppercase}.player-account-success p{margin:0;color:#858c98;font-size:.7rem;line-height:1.6}
`

function PlayerAccount() {
  const { user, isPlayer, playerSignup } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (user && isPlayer) {
    navigate('/notifications', { replace: true })
    return null
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('Passwords do not match.')

    setBusy(true)
    const result = await playerSignup(email, password)
    setBusy(false)

    if (!result.success) {
      setError(result.error || 'Could not create the account.')
      return
    }

    if (result.sessionCreated) {
      setDone(true)
      setTimeout(() => navigate('/notifications', { replace: true }), 900)
      return
    }

    setDone(true)
  }

  return (
    <main className="player-account-page">
      <style>{STYLES}</style>
      <section className="player-account-card">
        <Link className="player-account-brand" to="/">SBT <span>MAJOR</span></Link>

        {done ? (
          <div className="player-account-success">
            <FaCheckCircle />
            <p className="eyebrow">PLAYER ACCOUNT</p>
            <h2>Account Created</h2>
            <p>
              Your account has been created. If email confirmation is enabled in Supabase, confirm your email first, then use Player Login. After approval/linking, your personal notifications will appear automatically.
            </p>
            <Link className="button button-primary" to="/player-login" style={{ marginTop: 18 }}>Go to Player Login</Link>
          </div>
        ) : (
          <>
            <p className="eyebrow">PLAYER ACCOUNT SETUP</p>
            <h1>Create Login</h1>
            <p className="player-account-copy">Use the same email you used for player registration. The account is linked only when your registration has been approved by the Super Admin.</p>

            <form className="player-account-form" onSubmit={submit}>
              <label className="player-account-field"><span>Email</span><div className="player-account-input"><FaUser /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="player@email.com" autoComplete="email" required /></div></label>
              <label className="player-account-field"><span>Password</span><div className="player-account-input"><FaLock /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" required /></div></label>
              <label className="player-account-field"><span>Confirm Password</span><div className="player-account-input"><FaLock /><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" autoComplete="new-password" required /></div></label>
              {error && <p className="player-account-error">{error}</p>}
              <button className="button button-primary player-account-submit" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create Player Login'}</button>
            </form>

            <p className="player-account-note">Already have an account? <Link to="/player-login">Player Login</Link>. Your player profile must be approved before it can be linked to your account.</p>
            <Link to="/" style={{ display:'inline-flex',alignItems:'center',gap:7,marginTop:15,color:'#858d9a',fontSize:'.62rem',fontWeight:800 }}><FaArrowLeft /> Back to tournament</Link>
          </>
        )}
      </section>
    </main>
  )
}

export default PlayerAccount
