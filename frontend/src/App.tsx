import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import UserPage from './pages/UserPage'
import AdminPage from './pages/AdminPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-vault-dark">
        <nav className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <h1 className="text-2xl font-bold text-vault-blue">
                  Tesseract Demo Vault
                </h1>
                <div className="flex gap-4">
                  <Link to="/" className="text-slate-300 hover:text-white transition-colors">
                    Vault
                  </Link>
                  <Link to="/admin" className="text-slate-300 hover:text-white transition-colors">
                    Admin
                  </Link>
                </div>
              </div>
              <ConnectButton />
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<UserPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
