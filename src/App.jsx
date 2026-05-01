import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import Profile from './components/Profile'
import Exercises from './components/Exercises'
import Layout from './components/Layout'
import AuthSlider from './components/AuthSlider'
import UploadExercise from './components/UploadExercise'
import Recommendations from './components/Recommendations'
import Leaderboard from './components/Leaderboard'
import Schedule from './components/Schedule'
import StartExercise from './components/StartExercise'
import Subscription from './components/Subscription'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AuthSlider />} />
        <Route path="/register" element={<AuthSlider />} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/exercises" element={<Layout><Exercises /></Layout>} />
        <Route path="/upload-exercise" element={<Layout><UploadExercise /></Layout>} />
        <Route path="/recommendations" element={<Layout><Recommendations /></Layout>} />
        <Route path="/leaderboard" element={<Layout><Leaderboard /></Layout>} />
        <Route path="/schedule" element={<Layout><Schedule /></Layout>} />
        <Route path="/start/:exercise" element={<Layout><StartExercise /></Layout>} />
        <Route path="/subscription" element={<Layout><Subscription /></Layout>} />
        <Route path="/admin" element={<Layout><AdminDashboard /></Layout>} />
      </Routes>
    </AnimatePresence>
  )
}

export default App 