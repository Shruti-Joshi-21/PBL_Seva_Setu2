import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import WorkerDashboard from './pages/WorkerDashboard';
import MarkAttendance from './pages/MarkAttendance';
import CreateTask from './pages/CreateTask';
import TeamLeadDashboard from './pages/TeamLeadDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import SubmitReport from './pages/SubmitReport';
import AttendanceReview from './pages/AttendanceReview';
import Login from './pages/Login';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DashboardPlaceholder = ({ title }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <h1 className="text-2xl font-bold text-[#005F02] mb-4">{title}</h1>
    <p className="text-gray-600">This module is currently under development. Please check back later.</p>
  </div>
);

const teamLeadNested = (
  <Routes>
    <Route index element={<TeamLeadDashboard />} />
    <Route path="tasks" element={<Navigate to="/teamlead/tasks/create" replace />} />
    <Route
      path="tasks/create"
      element={
        <Layout>
          <CreateTask />
        </Layout>
      }
    />
    <Route
      path="locations"
      element={
        <Layout>
          <DashboardPlaceholder title="Manage Locations" />
        </Layout>
      }
    />
    <Route
      path="attendance"
      element={
        <Layout>
          <AttendanceReview />
        </Layout>
      }
    />
  </Routes>
);

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* Redirect separate login pages to landing page */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/worker/login" element={<Navigate to="/" replace />} />
                    <Route path="/teamlead/login" element={<Navigate to="/" replace />} />
                    <Route path="/admin/login" element={<Navigate to="/" replace />} />

                    <Route
                        path="/admin/*"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <Routes>
                                    <Route index element={<AdminDashboard />} />
                                    <Route
                                        path="users"
                                        element={
                                            <Layout>
                                                <UserManagement />
                                            </Layout>
                                        }
                                    />
                                    <Route
                                        path="reports"
                                        element={
                                            <Layout>
                                                <DashboardPlaceholder title="System Reports" />
                                            </Layout>
                                        }
                                    />
                                </Routes>
                            </ProtectedRoute>
                        }
                    />

          <Route
            path="/teamlead/*"
            element={<ProtectedRoute allowedRoles={['TEAM_LEAD']}>{teamLeadNested}</ProtectedRoute>}
          />
          <Route path="/team-lead/*" element={<Navigate to="/teamlead" replace />} />
          <Route path="/field-worker/*" element={<Navigate to="/worker" replace />} />

          <Route
            path="/worker/*"
            element={
              <ProtectedRoute allowedRoles={['FIELD_WORKER']}>
                <Layout>
                  <Routes>
                    <Route index element={<WorkerDashboard />} />
                    <Route path="attendance/:taskId" element={<MarkAttendance />} />
                    <Route path="report/:taskId" element={<SubmitReport />} />
                    <Route path="leave" element={<DashboardPlaceholder title="Request Leave" />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <ToastContainer position="bottom-right" theme="colored" />
    </AuthProvider>
  );
}

export default App;
