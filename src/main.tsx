import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initGame } from './game/world'
import './index.css'

// Saved upgrades and checkpoint, and the first sector's world, before anything renders.
initGame()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
