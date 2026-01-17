import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { AuthGuard } from './components/AuthGuard'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ClockIn from './pages/ClockIn'
import Announcements from './pages/Announcements'
import AnnouncementDetail from './pages/AnnouncementDetail'
import CreateAnnouncement from './pages/CreateAnnouncement'
import Records from './pages/Records'
import Stats from './pages/Stats'
import OCR from './pages/OCR'

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="announcement/:id" element={<AnnouncementDetail />} />
          <Route path="announcements/create" element={
            <AuthGuard>
              <CreateAnnouncement />
            </AuthGuard>
          } />
          
          {/* Protected Routes */}
          <Route path="clock-in" element={
            <AuthGuard>
              <ClockIn />
            </AuthGuard>
          } />
          <Route path="records" element={
            <AuthGuard>
              <Records />
            </AuthGuard>
          } />
          <Route path="stats" element={
            <AuthGuard>
              <Stats />
            </AuthGuard>
          } />
          <Route path="ocr" element={
            <AuthGuard>
              <OCR />
            </AuthGuard>
          } />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
