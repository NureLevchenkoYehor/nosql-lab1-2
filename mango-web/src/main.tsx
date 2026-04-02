import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProfilesPage } from './pages/ProfilesPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { DeviceModelsPage } from './pages/DeviceModelsPage'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Layout />}>
            <Route path="/" element={<div>Теплова мапа — незабаром</div>} />
            <Route path="/admin/profiles" element={<ProfilesPage />} />
            <Route path="/admin/devices" element={<div>Пристрої — незабаром</div>} />
            <Route path="/admin/models" element={<DeviceModelsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
