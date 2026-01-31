import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CostElements from './pages/CostElements'
import Opportunities from './pages/Opportunities'
import Barriers from './pages/Barriers'
import Actors from './pages/Actors'
import Relationships from './pages/Relationships'
import Explorer from './pages/Explorer'
import Scenarios from './pages/Scenarios'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cost-elements" element={<CostElements />} />
        <Route path="/opportunities" element={<Opportunities />} />
        <Route path="/barriers" element={<Barriers />} />
        <Route path="/actors" element={<Actors />} />
        <Route path="/relationships" element={<Relationships />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/scenarios" element={<Scenarios />} />
      </Routes>
    </Layout>
  )
}

export default App
