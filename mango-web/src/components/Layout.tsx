import { NavLink, Outlet } from "react-router-dom"
import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material"

export function Layout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Глобальний Navbar */}
      <AppBar position="static" color="primary">
        <Toolbar>
          {/* Логотип / Назва застосунку */}
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mr: 4 }}>
            ATRIOC
          </Typography>

          {/* Навігаційні посилання */}
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
            <Button
              component={NavLink}
              to="/"
              sx={{
                color: 'white',
                // Стилізація активного стану (NavLink автоматично додає клас .active)
                '&.active': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontWeight: 'bold'
                }
              }}
            >
              Теплова мапа
            </Button>

            <Button
              component={NavLink}
              to="/admin/profiles"
              sx={{
                color: 'white',
                '&.active': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontWeight: 'bold'
                }
              }}
            >
              Профілі
            </Button>

            <Button
              component={NavLink}
              to="/admin/devices"
              sx={{
                color: 'white',
                '&.active': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontWeight: 'bold'
                }
              }}
            >
              Пристрої
            </Button>

            <Button
              component={NavLink}
              to="/admin/models"
              sx={{
                color: 'white',
                '&.active': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontWeight: 'bold'
                }
              }}
            >
              Моделі
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Контейнер для сторінок */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  )
}