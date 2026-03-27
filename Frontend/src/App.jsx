import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Components/Login/Login'
import Dashboard from './Components/DashboardRoles/Dashboard';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path="/Dashboard/:role" element={<Dashboard />} />
      </Routes>
    </Router>
  )
}

export default App;