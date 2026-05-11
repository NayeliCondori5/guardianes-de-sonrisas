import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/Dashboard/AdminDashboard';
import ParentDashboard from './pages/Dashboard/ParentDashboard';
import SitterDashboard from './pages/Dashboard/SitterDashboard';
import SearchSitters from './pages/SearchSitters';
import SitterProfile from './pages/SitterProfile';
import ParentProfile from './pages/ParentProfile';
import Navbar from './components/common/Navbar';

// Private Route Wrapper
const PrivateRoute = ({ children, roleRequired }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roleRequired && user.role !== roleRequired) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <div className="App min-h-screen text-gray-800 font-sans">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<SearchSitters />} />
          <Route path="/sitter/:id" element={<SitterProfile />} />
          <Route path="/parent/:id" element={<ParentProfile />} />
          
          <Route path="/dashboard/admin/*" element={
            <PrivateRoute roleRequired="admin">
              <AdminDashboard />
            </PrivateRoute>
          } />
          
          <Route path="/dashboard/parent/*" element={
            <PrivateRoute roleRequired="parent">
              <ParentDashboard />
            </PrivateRoute>
          } />

          <Route path="/dashboard/sitter/*" element={
            <PrivateRoute roleRequired="sitter">
              <SitterDashboard />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
