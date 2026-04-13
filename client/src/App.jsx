import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Shared pages
import LandingPage from './pages/LandingPage';

// Worker pages
import WorkerDashboard from './pages/worker/WorkerDashboard';
import WorkerAttendancePage from './pages/worker/AttendancePage';
import LeavePage from './pages/worker/LeavePage';
import MarkAttendance from './pages/worker/MarkAttendance';
import SubmitReport from './pages/worker/SubmitReport';

// Team Lead pages — pulled from aarya-final into pages/teamlead/
import TeamLeadDashboard from './pages/teamlead/TeamLeadDashboard';
import Tasks from './pages/teamlead/Tasks';
import CreateTask from './pages/teamlead/CreateTask';
import AttendanceReview from './pages/teamlead/AttendanceReview';
import LeaveManagement from './pages/teamlead/LeaveManagement';
import FlaggedRecords from './pages/teamlead/FlaggedRecords';
import FieldReports from './pages/teamlead/FieldReports';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const DashboardPlaceholder = ({ title }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <h1 className="text-2xl font-bold text-[#005F02] mb-4">{title}</h1>
    <p className="text-gray-600">This module is currently under development.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Auth redirects */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/worker/login" element={<Navigate to="/" replace />} />
          <Route path="/teamlead/login" element={<Navigate to="/" replace />} />
          <Route path="/admin/login" element={<Navigate to="/" replace />} />
          <Route path="/team-lead/*" element={<Navigate to="/teamlead" replace />} />

          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <Routes>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<Layout><UserManagement /></Layout>} />
                  <Route path="reports" element={<Layout><DashboardPlaceholder title="System Reports" /></Layout>} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Team Lead Routes */}
          <Route
            path="/teamlead/*"
            element={
              <ProtectedRoute allowedRoles={['TEAM_LEAD']}>
                <Layout>
                  <Routes>
                    <Route index element={<TeamLeadDashboard />} />
                    <Route path="tasks" element={<Tasks />} />
                    <Route path="tasks/create" element={<CreateTask />} />
                    <Route path="attendance" element={<AttendanceReview />} />
                    <Route path="leave" element={<LeaveManagement />} />
                    <Route path="flags" element={<FlaggedRecords />} />
                    <Route path="reports" element={<FieldReports />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Worker Routes */}
          <Route
            path="/worker/*"
            element={
              <ProtectedRoute allowedRoles={['FIELD_WORKER']}>
                <Layout>
                  <Routes>
                    <Route index element={<WorkerDashboard />} />
                    <Route path="attendance" element={<WorkerAttendancePage />} />
                    <Route path="attendance/:taskId" element={<MarkAttendance />} />
                    <Route path="leave" element={<LeavePage />} />
                    <Route path="report/:taskId" element={<SubmitReport />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<LandingPage />} />
          <Route path="/unauthorized" element={<div className="h-screen flex items-center justify-center">Unauthorized Access</div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <ToastContainer position="bottom-right" theme="colored" />
    </AuthProvider>
  );
}

export default App;