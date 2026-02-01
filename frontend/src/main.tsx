import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ModelProvider } from './contexts/ModelContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ModelProvider>
        <App />
      </ModelProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
