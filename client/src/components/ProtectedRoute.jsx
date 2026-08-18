import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute() {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
        }}
      >
        <div
          className="glass-card"
          style={{
            padding: 24,
            textAlign: 'center',
            minWidth: 260,
          }}
        >
          <p className="eyebrow">SBT MAJOR · AUTHENTICATION</p>
          <h2 style={{ margin: '8px 0' }}>Checking access…</h2>
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  if (!isAdmin) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location,
          error: 'Admin access required',
        }}
      />
    )
  }

  return <Outlet />
}

export default ProtectedRoute