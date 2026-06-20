import { Routes, Route, Link, useLocation } from 'react-router-dom'
import VenueLayout from './pages/VenueLayout.jsx'
import EquipmentSelect from './pages/EquipmentSelect.jsx'
import BillPreview from './pages/BillPreview.jsx'
import BookingList from './pages/BookingList.jsx'
import AdminDiscounts from './pages/AdminDiscounts.jsx'
import './App.css'

function App() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: '场馆平面' },
    { path: '/bookings', label: '我的预约' },
    { path: '/admin', label: '后台管理' },
  ]

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">🏟️ 对战场地预约系统</h1>
          <nav className="nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<VenueLayout />} />
          <Route path="/equipment" element={<EquipmentSelect />} />
          <Route path="/bill" element={<BillPreview />} />
          <Route path="/bookings" element={<BookingList />} />
          <Route path="/admin" element={<AdminDiscounts />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
