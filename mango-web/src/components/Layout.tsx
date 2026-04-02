import { NavLink, Outlet } from "react-router-dom"

export function Layout() {
  return (
    <div>
      {/* Глобальний Navbar */}
      <nav style={{
        display: "flex",
        gap: "20px",
        padding: "16px",
        borderBottom: "1px solid #ccc",
        marginBottom: "24px"
      }}>
        <NavLink
          to="/"
          style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal", textDecoration: "none", color: "black" })}
        >
          Теплова мапа
        </NavLink>
        <NavLink
          to="/admin/profiles"
          style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal", textDecoration: "none", color: "black" })}
        >
          Профілі
        </NavLink>
        <NavLink
          to="/admin/devices"
          style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal", textDecoration: "none", color: "black" })}
        >
          Пристрої
        </NavLink>
        <NavLink
          to="/admin/models"
          style={({ isActive }) => ({ fontWeight: isActive ? "bold" : "normal", textDecoration: "none", color: "black" })}
        >
          Моделі
        </NavLink>
      </nav>

      {/* Контейнер для сторінок */}
      <main style={{ padding: "0 16px" }}>
        <Outlet />
      </main>
    </div>
  )
}