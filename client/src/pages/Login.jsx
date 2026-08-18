import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FaArrowRight, FaLock, FaUser, FaUserPlus } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

const LOGIN_STYLES = `
  .login-page {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 30px 18px;
    background:
      radial-gradient(circle at 50% 0, rgba(255,48,72,.10), transparent 36%),
      #03060d;
  }

  .login-shell {
    width: min(100%, 460px);
  }

  .login-brand {
    display: block;
    width: fit-content;
    margin: 0 auto 24px;
    color: #f7f7f5;
    font: 800 1.5rem/1 'Barlow Condensed', sans-serif;
    letter-spacing: .10em;
    text-transform: uppercase;
  }

  .login-brand span {
    color: #ff3048;
  }

  .login-card {
    padding: 30px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px;
    background:
      radial-gradient(circle at 90% 0, rgba(255,48,72,.09), transparent 32%),
      linear-gradient(145deg, #17181b, #0b0c0e);
    box-shadow:
      0 28px 70px rgba(0,0,0,.40),
      inset 0 1px rgba(255,255,255,.025);
  }

  .login-card h1 {
    margin: 7px 0 8px;
    color: #fff;
    font: 900 clamp(2.6rem, 7vw, 4rem)/.9 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
  }

  .login-intro {
    margin: 0 0 22px;
    color: #92969e;
    line-height: 1.55;
    font-size: .78rem;
  }

  .login-card form {
    display: grid;
    gap: 14px;
  }

  .login-card label > span {
    display: block;
    margin-bottom: 7px;
    color: #a9adb5;
    font-size: .63rem;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .input-wrap {
    display: flex;
    align-items: center;
    min-height: 46px;
    padding: 0 12px;
    gap: 9px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 7px;
    background: rgba(255,255,255,.02);
  }

  .input-wrap svg {
    flex: 0 0 auto;
    color: #7e838b;
    font-size: .72rem;
  }

  .input-wrap:focus-within {
    border-color: rgba(255,48,72,.40);
    box-shadow: 0 0 0 3px rgba(255,48,72,.07);
  }

  .input-wrap input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    color: #fff;
    background: transparent;
  }

  .input-wrap input::placeholder {
    color: #62676f;
  }

  .login-card .button-primary {
    width: 100%;
    justify-content: center;
    min-height: 46px;
    margin-top: 2px;
  }

  .login-error {
    margin: 0;
    padding: 10px 11px;
    color: #ff8a98;
    border: 1px solid rgba(255,48,72,.20);
    border-radius: 7px;
    background: rgba(255,48,72,.055);
    font-size: .69rem;
  }

  .player-join {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 18px;
    padding: 15px 16px;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 9px;
    background: rgba(255,255,255,.018);
  }

  .player-join-copy strong {
    display: block;
    color: #fff;
    font-size: .75rem;
  }

  .player-join-copy span {
    display: block;
    margin-top: 4px;
    color: #777c84;
    font-size: .62rem;
    line-height: 1.45;
  }

  .player-join-link {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    flex: 0 0 auto;
    padding: 9px 11px;
    color: #fff;
    border: 1px solid rgba(255,48,72,.24);
    border-radius: 6px;
    background: rgba(255,48,72,.06);
    font-size: .62rem;
    font-weight: 900;
    letter-spacing: .04em;
    text-transform: uppercase;
  }

  .player-join-link:hover {
    border-color: rgba(255,48,72,.42);
    background: rgba(255,48,72,.10);
  }

  @media (max-width: 520px) {
    .login-card {
      padding: 22px;
    }

    .player-join {
      align-items: flex-start;
      flex-direction: column;
    }

    .player-join-link {
      width: 100%;
      justify-content: center;
      box-sizing: border-box;
    }
  }
`

function Login() {
  const { user, isAdmin, login, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (loading) {
    return (
      <main className="login-page">
        <style>{LOGIN_STYLES}</style>
        <section className="login-card">
          <p className="eyebrow">SBT MAJOR · AUTHENTICATION</p>
          <h1>Checking access…</h1>
        </section>
      </main>
    )
  }

  if (user) {
    return (
      <Navigate
        to={isAdmin ? '/admin' : '/'}
        replace
      />
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setIsSubmitting(true)

    const result = await login(
      credentials.email,
      credentials.password
    )

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error || 'Invalid email or password.')
      return
    }

    navigate(
      isAdmin
        ? location.state?.from?.pathname || '/admin'
        : '/',
      { replace: true }
    )
  }

  return (
    <main className="login-page">
      <style>{LOGIN_STYLES}</style>

      <section className="login-shell">
        <Link className="login-brand" to="/">
          SBT <span>MAJOR</span>
        </Link>

        <section className="login-card">
          <p className="eyebrow">CONTROL CENTER</p>

          <h1>Admin Login</h1>

          <p className="login-intro">
            Sign in with the tournament administrator account to manage
            teams, players, auction, fixtures and playoffs.
          </p>

          <form onSubmit={handleSubmit}>
            <label>
              <span>Email</span>

              <div className="input-wrap">
                <FaUser />

                <input
                  type="email"
                  value={credentials.email}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  autoComplete="email"
                  placeholder="Enter admin email"
                  required
                />
              </div>
            </label>

            <label>
              <span>Password</span>

              <div className="input-wrap">
                <FaLock />

                <input
                  type="password"
                  value={credentials.password}
                  onChange={(event) =>
                    setCredentials((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  autoComplete="current-password"
                  placeholder="Enter password"
                  required
                />
              </div>
            </label>

            {error && (
              <p className="login-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="button button-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Signing in…'
                : 'Login to Dashboard'}
            </button>
          </form>

          <div className="player-join">
            <div className="player-join-copy">
              <strong>Are you a player?</strong>
              <span>
                Create your profile and send it directly to the admin
                for approval.
              </span>
            </div>

            <Link
              className="player-join-link"
              to="/player-register"
            >
              <FaUserPlus />
              Join as Player
              <FaArrowRight />
            </Link>
          </div>
        </section>
      </section>
    </main>
  )
}

export default Login