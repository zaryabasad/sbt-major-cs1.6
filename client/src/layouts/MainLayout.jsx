import { Outlet } from 'react-router-dom'
import Header from '../components/Header'

function MainLayout() {
  return (
    <div className="app-shell">
      <Header />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}

export default MainLayout
