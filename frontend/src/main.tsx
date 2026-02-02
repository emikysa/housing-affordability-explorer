import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ModelProvider } from './contexts/ModelContext'
import { OccupancyProvider } from './contexts/OccupancyContext'
import { LifestyleProvider } from './contexts/LifestyleContext'
import { UtilityProvider } from './contexts/UtilityContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ModelProvider>
        <OccupancyProvider>
          <LifestyleProvider>
            <UtilityProvider>
              <App />
            </UtilityProvider>
          </LifestyleProvider>
        </OccupancyProvider>
      </ModelProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
