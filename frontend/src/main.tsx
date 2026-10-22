import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { isSupabaseConfigured } from './lib/supabase'
import { seedDemoFromUrl } from './lib/demoStore'
import { seedDemoPeople } from './lib/demoPerson'

if (!isSupabaseConfigured && seedDemoFromUrl()) seedDemoPeople()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
