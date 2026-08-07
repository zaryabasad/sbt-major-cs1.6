import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Admin from '../pages/Admin'
import Auction from '../pages/Auction'
import Fixtures from '../pages/Fixtures'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Playoffs from '../pages/Playoffs'
import Stats from '../pages/Stats'
import Teams from '../pages/Teams'
import ProtectedRoute from '../components/ProtectedRoute'
import Players from '../pages/Players'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/auction" element={<Auction />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/playoffs" element={<Playoffs />} />
          <Route path="/stats" element={<Stats />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/players" element={<Players />} />
          </Route>
        </Route>
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
