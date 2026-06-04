import { useState, useEffect }                from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase }                           from './lib/supabase'
import Login                                  from './pages/Login'
import Layout                                 from './components/Layout'
import Dashboard                              from './pages/Dashboard'
import Meldungen                              from './pages/Meldungen'
import MeldungDetail                          from './pages/MeldungDetail'
import Benutzer                               from './pages/Benutzer'
import Prueffaelle                            from './pages/Prueffaelle'

function ProtectedRoute({ session, children }) {
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = noch nicht geprüft

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
    }, () => setSession(null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <p className="text-gray-500 text-sm">Lade…</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={session ? <Navigate to="/" replace /> : <Login onLogin={() => {}} />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute session={session}>
              <Layout>
                <Routes>
                  <Route path="/"               element={<Dashboard />} />
                  <Route path="/meldungen"      element={<Meldungen />} />
                  <Route path="/meldungen/:id"  element={<MeldungDetail />} />
                  <Route path="/benutzer"        element={<Benutzer />} />
                  <Route path="/prueffaelle"    element={<Prueffaelle />} />
                  <Route path="*"               element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
