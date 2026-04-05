import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import {
  Bell,
  LayoutDashboard,
  CheckSquare,
  ClipboardList,
  Flag,
  CalendarDays,
  FileText,
  LogOut,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';

const SIDEBAR_W = 'w-[230px] min-w-[230px]';

function initialsFromName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function sentenceCase(s) {
  if (!s) return '';
  const t = String(s).replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function statusBadgeClass(status) {
  if (status === 'ACTIVE') return 'bg-[#eaf3de] text-[#27500a]';
  if (status === 'COMPLETED') return 'bg-[#eaf3de] text-[#27500a]';
  if (status === 'CANCELLED') return 'bg-gray-100 text-gray-600';
  return 'bg-gray-100 text-gray-600';
}

function taskDotClass(status) {
  if (status === 'ACTIVE') return 'bg-[#2d6b2d]';
  if (status === 'COMPLETED') return 'bg-[#C0B87A]';
  if (status === 'CANCELLED') return 'bg-gray-400';
  return 'bg-gray-400';
}

const sectionMotion = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay },
});

const TeamLeadDashboardContent = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [clock, setClock] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState(null);
  const [data, setData] = useState(null);

  const [flagModal, setFlagModal] = useState(null);
  const [leaveModal, setLeaveModal] = useState(null);

  const fetchSummary = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/teamlead/dashboard-summary');
      const { data: payload } = response.data;
      setData(payload);
      setLastFetch(new Date());
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchSummary();
    }, 30000);
    return () => clearInterval(id);
  }, [fetchSummary]);

  const stats = data?.stats;
  const todaysTasks = data?.todaysTasks ?? [];
  const workerAttendance = data?.workerAttendance ?? [];
  const flaggedRecords = data?.flaggedRecords ?? [];
  const leaveRequests = data?.leaveRequests ?? [];

  const badgeTasks = stats?.activeTasks ?? 0;
  const badgeFlagged = stats?.flaggedToday ?? 0;
  const badgeLeaves = stats?.pendingLeaves ?? 0;

  const navItems = useMemo(
    () => [
      { key: 'overview', label: 'Overview', path: '/teamlead', icon: LayoutDashboard, badge: null },
      { key: 'tasks', label: 'Tasks', path: '/teamlead/tasks', icon: CheckSquare, badge: badgeTasks },
      { key: 'attendance', label: 'Attendance', path: '/teamlead/attendance', icon: ClipboardList, badge: null },
      { key: 'flagged', label: 'Flagged records', path: '/teamlead/attendance', icon: Flag, badge: badgeFlagged },
      { key: 'leave', label: 'Leave requests', path: '/teamlead', icon: CalendarDays, badge: badgeLeaves },
      { key: 'reports', label: 'Field reports', path: '/teamlead', icon: FileText, badge: null },
    ],
    [badgeTasks, badgeFlagged, badgeLeaves]
  );

  const lastUpdatedLabel = lastFetch
    ? formatDistanceShort(lastFetch)
    : 'just now';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f0e8]">
      <aside className={`${SIDEBAR_W} flex flex-col bg-[#1a4a1a] text-white`}>
        <div className="px-4 py-4 border-b border-white/10">
          <div className="text-white text-[17px] font-medium tracking-tight">SevaSetu</div>
          <div className="text-white/45 text-[11px] mt-1 font-normal">Smart field workforce</div>
        </div>
        <nav className="flex-1 py-2 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = item.key === 'overview';
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left w-full text-[13px] font-normal transition-colors ${
                  active
                    ? 'bg-white/[0.12] text-white border-l-[3px] border-[#C0B87A] -ml-[3px] pl-[14px]'
                    : 'text-white/70 border-l-[3px] border-transparent hover:bg-white/[0.06]'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0 opacity-90" strokeWidth={1.75} />
                <span className="flex-1 min-w-0">{item.label}</span>
                {item.badge != null && item.badge > 0 ? (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-white/15 text-white/90 min-w-[20px] text-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#2d6b2d] flex items-center justify-center text-[11px] font-medium text-white">
            {initialsFromName(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-white/80 truncate font-normal">{user?.fullName || 'Team lead'}</div>
            <div className="text-[10px] text-white/40 font-normal">Team lead</div>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-[52px] min-h-[52px] bg-white border-b border-[#e8e0d0] px-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-[15px] font-medium text-[#1a1a1a] truncate">Overview</h1>
            <span className="text-[12px] font-normal text-[#6b6560] tabular-nums">
              {format(clock, 'HH:mm:ss')}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[11px] font-normal text-[#9a9288] hidden sm:inline">
              Last updated {lastUpdatedLabel}
            </span>
            <div className="relative">
              <Bell className="w-5 h-5 text-[#5c574f]" strokeWidth={1.75} />
              <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#C0B87A]" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#1a4a1a] flex items-center justify-center text-[10px] font-medium text-white">
              {initialsFromName(user?.fullName)}
            </div>
            <button
              type="button"
              onClick={() => navigate('/teamlead/tasks/create')}
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#1a4a1a] text-white hover:bg-[#2d6b2d] transition-colors"
            >
              Create task
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-white p-4 text-[13px] text-[#791f1f] font-normal">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                {...sectionMotion(i * 0.05)}
                className="bg-white rounded-[12px] border-[0.5px] border-[#e8e0d0] p-4 min-h-[100px]"
              >
                {loading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-2.5 bg-[#ece6dc] rounded w-1/2" />
                    <div className="h-7 bg-[#ece6dc] rounded w-1/3" />
                    <div className="h-2 bg-[#ece6dc] rounded w-2/3" />
                  </div>
                ) : (
                  <>
                    {i === 0 && (
                      <>
                        <div className="text-[12px] font-normal text-[#5c574f]">Active tasks</div>
                        <div className="text-[22px] font-medium text-[#1a1a1a] mt-1">{stats?.activeTasks ?? 0}</div>
                        <div className="text-[11px] font-normal text-[#9a9288] mt-1">Assigned by you</div>
                      </>
                    )}
                    {i === 1 && (
                      <>
                        <div className="text-[12px] font-normal text-[#5c574f]">Workers present today</div>
                        <div className="text-[22px] font-medium text-[#1a1a1a] mt-1">
                          {stats?.workersPresent ?? 0}
                          <span className="text-[14px] font-normal text-[#9a9288]">
                            {' '}
                            / {stats?.workersTotal ?? 0}
                          </span>
                        </div>
                        <div className="text-[11px] font-normal text-[#9a9288] mt-1">Checked in at least once</div>
                      </>
                    )}
                    {i === 2 && (
                      <>
                        <div className="text-[12px] font-normal text-[#5c574f]">Flagged today</div>
                        <div className="text-[22px] font-medium text-[#1a1a1a] mt-1">{stats?.flaggedToday ?? 0}</div>
                        <div className="text-[11px] font-normal text-[#791f1f] mt-1">Needs attention</div>
                      </>
                    )}
                    {i === 3 && (
                      <>
                        <div className="text-[12px] font-normal text-[#5c574f]">Pending leaves</div>
                        <div className="text-[22px] font-medium text-[#1a1a1a] mt-1">{stats?.pendingLeaves ?? 0}</div>
                        <div className="text-[11px] font-normal text-[#633806] mt-1">Awaiting your review</div>
                      </>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-4">
            <motion.div
              {...sectionMotion(0.08)}
              className="lg:col-span-3 bg-white rounded-[12px] border-[0.5px] border-[#e8e0d0] p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-medium text-[#1a1a1a]">Today&apos;s tasks</h2>
                <button
                  type="button"
                  onClick={() => navigate('/teamlead/tasks')}
                  className="text-[12px] font-medium text-[#2d6b2d] inline-flex items-center gap-0.5 hover:underline"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-14 rounded-lg bg-[#ece6dc] animate-pulse" />
                  ))}
                </div>
              ) : todaysTasks.length === 0 ? (
                <p className="text-[13px] text-[#9a9288] font-normal">No tasks scheduled for today.</p>
              ) : (
                <ul className="space-y-3">
                  {todaysTasks.map((t) => {
                    const pct =
                      t.totalWorkers > 0 ? Math.min(100, Math.round((t.checkedInCount / t.totalWorkers) * 100)) : 0;
                    return (
                      <li
                        key={t.id}
                        className="border-[0.5px] border-[#ece6dc] rounded-[10px] p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${taskDotClass(t.status)}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-[#1a1a1a] truncate">{t.title}</div>
                            <div className="text-[11px] font-normal text-[#9a9288] mt-0.5">
                              {t.startTime} – {t.endTime} · {t.totalWorkers} workers · {t.allowedRadius}m radius ·{' '}
                              {t.locationName}
                            </div>
                            <div className="mt-2 h-1.5 rounded-full bg-[#ece6dc] overflow-hidden">
                              <div
                                className="h-full bg-[#C0B87A] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[11px] font-normal text-[#6b6560]">
                                {t.checkedInCount} of {t.totalWorkers} checked in
                              </span>
                              <span
                                className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${statusBadgeClass(t.status)}`}
                              >
                                {sentenceCase(t.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </motion.div>

            <motion.div
              {...sectionMotion(0.1)}
              className="lg:col-span-2 bg-white rounded-[12px] border-[0.5px] border-[#e8e0d0] p-4"
            >
              <h2 className="text-[14px] font-medium text-[#1a1a1a] mb-3">Worker attendance</h2>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((k) => (
                    <div key={k} className="h-12 rounded-lg bg-[#ece6dc] animate-pulse" />
                  ))}
                </div>
              ) : workerAttendance.length === 0 ? (
                <p className="text-[13px] text-[#9a9288] font-normal">No workers assigned to you yet.</p>
              ) : (
                <ul className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {workerAttendance.map((w) => (
                    <li
                      key={w.workerId}
                      className="flex items-center gap-3 py-2 border-b border-[#f0ebe3] last:border-0"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#eaf3de] text-[#27500a] flex items-center justify-center text-[11px] font-medium flex-shrink-0">
                        {initialsFromName(w.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#1a1a1a] truncate">{w.fullName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded-md bg-[#f5f0e8] text-[#5c574f]">
                            {sentenceCase(w.taskWorkType || w.taskTitle || 'No task')}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          w.presence === 'in'
                            ? 'bg-[#2d6b2d]'
                            : w.presence === 'out'
                              ? 'bg-amber-400'
                              : 'bg-gray-300'
                        }`}
                        title={w.presence === 'in' ? 'Checked in' : w.presence === 'out' ? 'Checked out' : 'Absent'}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <motion.div
              {...sectionMotion(0.12)}
              className="bg-white rounded-[12px] border-[0.5px] border-[#e8e0d0] p-4"
            >
              <h2 className="text-[14px] font-medium text-[#1a1a1a] mb-3">Flagged records</h2>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="h-16 rounded-lg bg-[#ece6dc] animate-pulse" />
                  ))}
                </div>
              ) : flaggedRecords.length === 0 ? (
                <p className="text-[13px] text-[#9a9288] font-normal">No flagged records.</p>
              ) : (
                <ul className="space-y-2">
                  {flaggedRecords.map((r) => (
                    <li
                      key={r.id}
                      className="flex gap-3 items-start p-2 rounded-[10px] border-[0.5px] border-[#fcebeb] bg-[#fffbfb]"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[#fcebeb] flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-[#791f1f]" strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#1a1a1a] truncate">{r.title}</div>
                        <div className="text-[11px] font-normal text-[#6b6560] mt-0.5 line-clamp-2">{r.description}</div>
                        <div className="text-[10px] font-normal text-[#9a9288] mt-1">
                          {r.workerName ? `${r.workerName} · ` : ''}
                          {r.time ? format(new Date(r.time), 'MMM d, HH:mm') : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFlagModal(r)}
                        className="text-[12px] font-medium text-[#2d6b2d] px-2 py-1 rounded-md hover:bg-[#eaf3de] flex-shrink-0"
                      >
                        Review
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            <motion.div
              {...sectionMotion(0.14)}
              className="bg-white rounded-[12px] border-[0.5px] border-[#e8e0d0] p-4"
            >
              <h2 className="text-[14px] font-medium text-[#1a1a1a] mb-3">Leave requests</h2>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((k) => (
                    <div key={k} className="h-20 rounded-lg bg-[#ece6dc] animate-pulse" />
                  ))}
                </div>
              ) : leaveRequests.length === 0 ? (
                <p className="text-[13px] text-[#9a9288] font-normal">No pending leave requests.</p>
              ) : (
                <ul className="space-y-3">
                  {leaveRequests.map((lr) => (
                    <li
                      key={lr.id}
                      className="flex gap-3 items-center p-2 rounded-[10px] border-[0.5px] border-[#faeeda] bg-[#fffdf8]"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#faeeda] text-[#633806] flex items-center justify-center text-[11px] font-medium flex-shrink-0">
                        {initialsFromName(lr.workerName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#1a1a1a] truncate">{lr.workerName}</div>
                        <div className="text-[11px] font-normal text-[#6b6560]">
                          {format(new Date(lr.fromDate), 'MMM d')} – {format(new Date(lr.toDate), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setLeaveModal({ ...lr, action: 'approve' })}
                          className="text-[11px] font-medium px-2 py-1 rounded-md bg-[#eaf3de] text-[#27500a] hover:opacity-90"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeaveModal({ ...lr, action: 'reject' })}
                          className="text-[11px] font-medium px-2 py-1 rounded-md bg-[#fcebeb] text-[#791f1f] hover:opacity-90"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>
        </main>
      </div>

      {flagModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setFlagModal(null)}
        >
          <div
            className="bg-white rounded-[12px] border-[0.5px] border-[#e8e0d0] max-w-md w-full p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-medium text-[#1a1a1a]">Review flagged record</h3>
            <p className="text-[13px] font-normal text-[#5c574f] mt-2">{flagModal.title}</p>
            <p className="text-[12px] font-normal text-[#6b6560] mt-2">{flagModal.description}</p>
            <p className="text-[11px] font-normal text-[#9a9288] mt-2">
              {flagModal.workerName} · {flagModal.time ? format(new Date(flagModal.time), 'PPp') : ''}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFlagModal(null)}
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[#e8e0d0] text-[#5c574f] hover:bg-[#f5f0e8]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.info('Open attendance review when available.');
                  setFlagModal(null);
                  navigate('/teamlead/attendance');
                }}
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#1a4a1a] text-white hover:bg-[#2d6b2d]"
              >
                Go to attendance
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {leaveModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLeaveModal(null)}
        >
          <div
            className="bg-white rounded-[12px] border-[0.5px] border-[#e8e0d0] max-w-md w-full p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-medium text-[#1a1a1a]">
              {leaveModal.action === 'approve' ? 'Approve leave' : 'Reject leave'}
            </h3>
            <p className="text-[13px] font-normal text-[#5c574f] mt-2">{leaveModal.workerName}</p>
            <p className="text-[12px] font-normal text-[#6b6560] mt-1">
              {format(new Date(leaveModal.fromDate), 'MMM d')} – {format(new Date(leaveModal.toDate), 'MMM d, yyyy')}
            </p>
            <p className="text-[12px] font-normal text-[#6b6560] mt-2">{leaveModal.reason}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setLeaveModal(null)}
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-[#e8e0d0] text-[#5c574f]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.info('Leave actions for team leads will be available in a future update.');
                  setLeaveModal(null);
                }}
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#1a4a1a] text-white"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function formatDistanceShort(d) {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ago`;
}

const TeamLeadDashboard = () => (
  <ProtectedRoute allowedRoles={['TEAM_LEAD']}>
    <TeamLeadDashboardContent />
  </ProtectedRoute>
);

export default TeamLeadDashboard;
