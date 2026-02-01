import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CostElements from './pages/CostElements'
import Opportunities from './pages/Opportunities'
import Barriers from './pages/Barriers'
import Levers from './pages/Levers'
import Actors from './pages/Actors'
import Relationships from './pages/Relationships'
import Explorer from './pages/Explorer'
import Models from './pages/Models'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cost-elements" element={<CostElements />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/barriers" element={<Barriers />} />
        <Route path="/levers" element={<Levers />} />
        <Route path="/actors" element={<Actors />} />
        <Route path="/relationships" element={<Relationships />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/models" element={<Models />} />
      </Routes>
    </Layout>
  )
}

export default App
