import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import BrainDumpPage from './pages/BrainDumpPage'
import AssistantPage from './pages/AssistantPage'
import FocusPage from './pages/FocusPage'
import FocusHistoryPage from './pages/FocusHistoryPage'
import MemoryPage from './pages/MemoryPage'
import InsightsPage from './pages/InsightsPage'
import SettingsPage from './pages/SettingsPage'
import MissionPlannerPage from './pages/MissionPlannerPage'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<LoginPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/braindump" element={<BrainDumpPage />} />
                <Route path="/assistant" element={<AssistantPage />} />
                <Route path="/focus" element={<FocusPage />} />
                <Route path="/focus/history" element={<FocusHistoryPage />} />
                <Route path="/memory" element={<MemoryPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/mission" element={<MissionPlannerPage />} />
            </Routes>
        </Router>
    )
}

export default App