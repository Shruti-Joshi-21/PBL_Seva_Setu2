import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  LogIn,
  LogOut,
  CheckCircle2,
  MapPin,
  Clock,
  Timer,
  Wrench,
  Radio,
  CheckSquare,
  ClipboardList,
  Calendar,
  Activity,
  FileText,
  History,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import CheckInModal from '../../components/worker/CheckInModal';
import CheckOutModal from '../../components/worker/CheckOutModal';

function formatLongDate(d) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function greetingFromHour(h) {
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function parseHM(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hs, ms] = timeStr.split(':');
  const h = parseInt(hs, 10) || 0;
  const m = parseInt(ms, 10) || 0;
  return h * 60 + m;
}

function formatHMFromMinutes(totalMins) {
  let t = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function adjustTimeHM(timeStr, deltaMinutes) {
  if (!timeStr) return '—';
  return formatHMFromMinutes(parseHM(timeStr) + deltaMinutes);
}

function formatTimeAmPmFromDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function deriveAttendanceState(todayAttendance) {
  if (!todayAttendance || !todayAttendance.checkInTime) return 'NOT_CHECKED_IN';
  if (!todayAttendance.checkOutTime) return 'CHECKED_IN';
  return 'COMPLETED';
}

function activityVisuals(item) {
  const { type, status } = item;
  if (type === 'ATTENDANCE') {
    if (status === 'VERIFIED') return { circle: 'bg-green-100', Icon: CheckCircle, iconClass: 'text-green-600' };
    if (status === 'FLAGGED') return { circle: 'bg-amber-100', Icon: AlertTriangle, iconClass: 'text-amber-600' };
    if (status === 'PENDING') return { circle: 'bg-blue-100', Icon: Clock, iconClass: 'text-blue-600' };
    if (status === 'REJECTED') return { circle: 'bg-red-100', Icon: XCircle, iconClass: 'text-red-600' };
  }
  if (type === 'LEAVE') {
    if (status === 'PENDING') return { circle: 'bg-amber-100', Icon: Calendar, iconClass: 'text-amber-600' };
    if (status === 'APPROVED') return { circle: 'bg-green-100', Icon: Calendar, iconClass: 'text-green-600' };
    if (status === 'REJECTED') return { circle: 'bg-red-100', Icon: Calendar, iconClass: 'text-red-600' };
  }
  if (type === 'REPORT') {
    if (status === 'SUBMITTED') return { circle: 'bg-blue-100', Icon: FileText, iconClass: 'text-blue-600' };
    if (status === 'APPROVED') return { circle: 'bg-green-100', Icon: FileText, iconClass: 'text-green-600' };
    if (status === 'REJECTED') return { circle: 'bg-red-100', Icon: FileText, iconClass: 'text-red-600' };
  }
  return { circle: 'bg-gray-100', Icon: Activity, iconClass: 'text-gray-600' };
}

function statusBadgeClass(type, status) {
  if (type === 'ATTENDANCE') {
    if (status === 'VERIFIED') return 'bg-green-100 text-green-700';
    if (status === 'FLAGGED') return 'bg-amber-100 text-amber-700';
    if (status === 'PENDING') return 'bg-blue-100 text-blue-700';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  }
  if (type === 'LEAVE') {
    if (status === 'PENDING') return 'bg-amber-100 text-amber-700';
    if (status === 'APPROVED') return 'bg-green-100 text-green-700';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  }
  if (type === 'REPORT') {
    if (status === 'SUBMITTED') return 'bg-blue-100 text-blue-700';
    if (status === 'APPROVED') return 'bg-green-100 text-green-700';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  }
  return 'bg-gray-100 text-gray-600';
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState('0h 0m 0s');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showCheckOut, setShowCheckOut] = useState(false);

  const fullName = user?.fullName || user?.name || 'there';

  const attendanceState = useMemo(() => deriveAttendanceState(todayAttendance), [todayAttendance]);

  const todayTask = dashboardData?.todayTask ?? null;

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await api.get('/worker/dashboard', { signal: controller.signal });
        const data = res.data?.data;
        setDashboardData(data);
        setTodayAttendance(data?.todayAttendance ?? null);
      } catch (error) {
        const aborted =
          controller.signal.aborted ||
          error.code === 'ERR_CANCELED' ||
          error.name === 'CanceledError' ||
          error.name === 'AbortError';
        if (aborted) return;
        toast.error(error.response?.data?.message || 'Failed to load dashboard', {
          toastId: 'worker-dashboard-load-error',
        });
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, []);

  const refreshDashboard = useCallback(async () => {
    try {
      const res = await api.get('/worker/dashboard');
      const data = res.data?.data;
      setDashboardData(data);
      setTodayAttendance(data?.todayAttendance ?? null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to refresh dashboard', {
        toastId: 'worker-dashboard-refresh-error',
      });
    }
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get('/worker/attendance/today');
        setTodayAttendance(res.data?.data ?? null);
      } catch {
        /* keep last known attendance on poll failure */
      }
    };
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  const checkInIso = todayAttendance?.checkInTime;

  useEffect(() => {
    if (attendanceState !== 'CHECKED_IN' || !checkInIso) {
      setElapsedTime('0h 0m 0s');
      return undefined;
    }
    const tick = () => {
      const diff = Date.now() - new Date(checkInIso).getTime();
      const s = Math.max(0, Math.floor(diff / 1000));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setElapsedTime(`${h}h ${m}m ${sec}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [attendanceState, checkInIso]);

  const hour = new Date().getHours();
  const greeting = greetingFromHour(hour);
  const dateLabel = formatLongDate(new Date());

  const earliestIn = todayTask ? adjustTimeHM(todayTask.startTime, -(todayTask.checkInBuffer ?? 15)) : '—';
  const latestIn = todayTask ? adjustTimeHM(todayTask.startTime, todayTask.checkInBuffer ?? 15) : '—';
  const earliestOut = todayTask ? adjustTimeHM(todayTask.endTime, -(todayTask.checkOutBuffer ?? 15)) : '—';
  const latestOut = todayTask ? adjustTimeHM(todayTask.endTime, todayTask.checkOutBuffer ?? 15) : '—';

  const recentActivity = dashboardData?.recentActivity ?? [];

  const onCheckIn = () => setShowCheckIn(true);
  const onCheckOut = () => setShowCheckOut(true);

  if (loading) {
    return (
      <div className="min-h-[60vh] space-y-6 animate-pulse">
        <div className="h-16 bg-gray-200 rounded-2xl" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-40 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  const weeklyAttendanceCount = dashboardData?.weeklyAttendanceCount ?? 0;
  const totalTasksThisWeek = dashboardData?.totalTasksThisWeek ?? 0;
  const pendingLeaveCount = dashboardData?.pendingLeaveCount ?? 0;

  const statTodayStatus = () => {
    if (attendanceState === 'NOT_CHECKED_IN') {
      return { iconColor: 'text-gray-400', value: '—', label: 'Not Started' };
    }
    if (attendanceState === 'CHECKED_IN') {
      return { iconColor: 'text-[#005F02]', value: 'Active', label: 'In Progress' };
    }
    const st = todayAttendance?.status;
    if (st === 'VERIFIED') return { iconColor: 'text-[#005F02]', value: 'Verified', label: 'Completed' };
    if (st === 'FLAGGED') return { iconColor: 'text-amber-600', value: 'Flagged', label: 'Completed' };
    if (st === 'PENDING') return { iconColor: 'text-blue-600', value: 'Pending', label: 'Completed' };
    if (st === 'REJECTED') return { iconColor: 'text-red-600', value: 'Rejected', label: 'Completed' };
    return { iconColor: 'text-gray-500', value: st || '—', label: 'Completed' };
  };
  const todayStat = statTodayStatus();

  const section = (index) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: 0.1 * index },
  });

  const completedStatusBadge = () => {
    const st = todayAttendance?.status;
    if (st === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-400/30 px-4 py-1.5 text-sm text-white">
          ✓ Verified
        </span>
      );
    }
    if (st === 'FLAGGED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/30 px-4 py-1.5 text-sm text-white">
          ⚠ Flagged
        </span>
      );
    }
    if (st === 'REJECTED') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-400/30 px-4 py-1.5 text-sm text-white">
          ✕ Rejected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-400/30 px-4 py-1.5 text-sm text-white">
        ⏳ Pending Review
      </span>
    );
  };

  return (
    <motion.div
      className="space-y-8 pb-10 bg-[#f7f9f7] -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-4 md:pt-8 min-h-full rounded-b-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Page header */}
      <motion.div {...section(0)} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#005F02]">
            Good {greeting}, {fullName}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">{dateLabel}</p>
        </div>
        <div>
          {todayTask ? (
            <span className="inline-block rounded-full bg-[#005F02] text-white text-xs font-semibold px-4 py-2 shadow-sm">
              1 task assigned today
            </span>
          ) : (
            <span className="inline-block rounded-full bg-gray-200 text-gray-600 text-xs font-semibold px-4 py-2">
              No tasks today
            </span>
          )}
        </div>
      </motion.div>

      {/* Hero */}
      <motion.div {...section(1)}>
        <div className="rounded-2xl shadow-md bg-gradient-to-br from-[#005F02] to-[#427A43] p-6 md:p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={attendanceState}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
            >
              {attendanceState === 'NOT_CHECKED_IN' && (
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="lg:w-[60%] space-y-4">
                    <p className="text-xs uppercase tracking-widest text-white/60">TODAY&apos;S TASK</p>
                    <h2 className="text-xl font-bold text-white">
                      {todayTask ? todayTask.title : <span className="italic text-white/70">No task assigned for today</span>}
                    </h2>
                    {todayTask && (
                      <div className="space-y-2 text-sm text-white/80">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span>{todayTask.locationName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>
                            {todayTask.startTime} – {todayTask.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4 shrink-0" />
                          <span>
                            Check-in window: {adjustTimeHM(todayTask.startTime, -(todayTask.checkInBuffer ?? 15))} to{' '}
                            {adjustTimeHM(todayTask.startTime, todayTask.checkInBuffer ?? 15)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 shrink-0" />
                          <span>{todayTask.workType}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="lg:w-[40%] flex flex-col items-center justify-center gap-3">
                    <motion.button
                      type="button"
                      disabled={!todayTask}
                      onClick={onCheckIn}
                      whileHover={todayTask ? { scale: 1.03 } : {}}
                      whileTap={todayTask ? { scale: 0.97 } : {}}
                      className={`flex items-center gap-2 rounded-2xl px-10 py-4 text-lg font-bold shadow-lg transition-colors ${todayTask
                        ? 'bg-white text-[#005F02] hover:bg-[#F2E3BB]'
                        : 'bg-white/40 text-white/60 cursor-not-allowed'
                        }`}
                    >
                      <LogIn className="w-6 h-6" />
                      CHECK IN
                    </motion.button>
                    <p className="text-xs italic text-white/50 text-center">Captures your GPS + face on click</p>
                  </div>
                </div>
              )}

              {attendanceState === 'CHECKED_IN' && (
                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="lg:w-[60%] space-y-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                      CHECKED IN
                    </span>
                    <p className="text-sm text-white/60">Time Elapsed</p>
                    <p className="text-4xl font-mono font-bold text-white tabular-nums">{elapsedTime}</p>
                    <p className="text-sm text-white/70">
                      Checked in at {formatTimeAmPmFromDate(todayAttendance?.checkInTime)}
                    </p>
                    {todayAttendance?.checkInFaceMatch === true ? (
                      <p className="text-sm text-white/80">Location verified ✓</p>
                    ) : (
                      <p className="text-sm text-amber-200">⚠ Location flagged</p>
                    )}
                  </div>
                  <div className="lg:w-[40%] flex flex-col items-center justify-center gap-3">
                    <motion.button
                      type="button"
                      onClick={onCheckOut}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 rounded-2xl bg-white px-10 py-4 text-lg font-bold text-[#dc2626] shadow-lg transition-colors hover:bg-red-50"
                    >
                      <LogOut className="w-6 h-6" />
                      CHECK OUT
                    </motion.button>
                    <p className="text-xs italic text-white/50 text-center">Captures GPS + after photo on click</p>
                  </div>
                </div>
              )}

              {attendanceState === 'COMPLETED' && (
                <div className="flex flex-col items-center text-center gap-4 py-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
                    <CheckCircle2 className="w-12 h-12 text-white" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-bold text-white">Attendance Recorded</h2>
                  {completedStatusBadge()}
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80">
                      In: {formatTimeAmPmFromDate(todayAttendance?.checkInTime)}
                    </span>
                    <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-white/80">
                      Out: {formatTimeAmPmFromDate(todayAttendance?.checkOutTime)}
                    </span>
                  </div>
                  {todayAttendance?.flagReasons?.length > 0 && (
                    <div className="mt-2 max-w-lg rounded-xl bg-amber-400/20 px-4 py-3 text-sm text-white text-left">
                      Flag reasons: {todayAttendance.flagReasons.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div {...section(2)} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            Icon: CheckSquare,
            iconClass: 'text-[#005F02]',
            value: `${weeklyAttendanceCount} days verified`,
            label: 'This Week',
          },
          {
            Icon: ClipboardList,
            iconClass: 'text-[#427A43]',
            value: String(totalTasksThisWeek),
            label: 'Tasks Assigned',
          },
          {
            Icon: Calendar,
            iconClass: 'text-[#C0B87A]',
            value: String(pendingLeaveCount),
            label: 'Awaiting Approval',
            valueClass: pendingLeaveCount > 0 ? 'text-amber-600' : '',
          },
          {
            Icon: Activity,
            iconClass: todayStat.iconColor,
            value: todayStat.value,
            label: todayStat.label,
          },
        ].map((card, cardIndex) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 * cardIndex }}
            className="rounded-2xl bg-white p-4 shadow-sm"
          >
            <card.Icon className={`mb-3 w-[22px] h-[22px] ${card.iconClass}`} strokeWidth={2} />
            <p className={`text-2xl font-bold text-gray-900 ${card.valueClass || ''}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Today task detail */}
      {todayTask && (
        <motion.div {...section(3)} className="rounded-2xl bg-white shadow-sm p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <span className="font-semibold text-[#005F02]">Today&apos;s Task</span>
            <span className="rounded-full bg-[#F2E3BB] text-[#005F02] text-xs font-semibold px-3 py-1">ACTIVE</span>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#005F02]">{todayTask.title}</h3>
              <p className="text-sm text-gray-500">
                Assigned by {todayTask.createdBy?.fullName || '—'}
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-[#427A43] shrink-0" />
                  {todayTask.locationName}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-[#427A43] shrink-0" />
                  {todayTask.startTime} – {todayTask.endTime}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Wrench className="w-4 h-4 text-[#427A43] shrink-0" />
                  {todayTask.workType}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Radio className="w-4 h-4 text-[#427A43] shrink-0" />
                  Within {todayTask.allowedRadius}m radius
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl bg-[#f7f9f7] p-3 space-y-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">Earliest check-in</p>
                <p className="text-sm font-bold text-[#005F02]">{earliestIn}</p>
                <p className="text-xs uppercase tracking-wide text-gray-400">Latest check-in</p>
                <p className="text-sm font-bold text-[#005F02]">{latestIn}</p>
              </div>
              <div className="rounded-xl bg-[#f7f9f7] p-3 space-y-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">Earliest check-out</p>
                <p className="text-sm font-bold text-[#005F02]">{earliestOut}</p>
                <p className="text-xs uppercase tracking-wide text-gray-400">Latest check-out</p>
                <p className="text-sm font-bold text-[#005F02]">{latestOut}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick actions */}
      <motion.div {...section(4)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Submit Report',
            subtitle: "Document today's fieldwork",
            Icon: FileText,
            circle: 'bg-[#005F02]/10',
            iconColor: '#005F02',
            onClick: () => navigate('/worker/reports'),
          },
          {
            title: 'Request Leave',
            subtitle: 'Apply for time off',
            Icon: Calendar,
            circle: 'bg-[#C0B87A]/20',
            iconColor: '#C0B87A',
            onClick: () => navigate('/worker/leave', { state: { openModal: true } }),
          },
          {
            title: 'View History',
            subtitle: 'Past check-ins & records',
            Icon: History,
            circle: 'bg-[#427A43]/10',
            iconColor: '#427A43',
            onClick: () => navigate('/worker/attendance/history'),
          },
        ].map((action, i) => (
          <motion.button
            key={action.title}
            type="button"
            onClick={action.onClick}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 * i }}
            whileHover={{ scale: 1.02, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            whileTap={{ scale: 0.98 }}
            className="rounded-2xl bg-white p-6 shadow-sm text-left border border-transparent hover:border-gray-100"
          >
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${action.circle}`}
            >
              <action.Icon className="w-7 h-7" style={{ color: action.iconColor }} />
            </div>
            <h3 className="font-semibold text-gray-800 text-center">{action.title}</h3>
            <p className="text-sm text-gray-500 text-center mt-1">{action.subtitle}</p>
          </motion.button>
        ))}
      </motion.div>

      {/* Activity */}
      <motion.div {...section(5)}>
        <h2 className="font-semibold text-[#005F02]">Recent Activity</h2>
        <p className="text-sm text-gray-400 mb-4">Your last 5 actions</p>
        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white shadow-sm">
            <Activity className="w-16 h-16 text-gray-200 mb-3" />
            <p className="text-gray-400">No recent activity</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recentActivity.map((item, itemIndex) => {
              const { circle, Icon, iconClass } = activityVisuals(item);
              return (
                <motion.li
                  key={`${item.type}-${item.time}-${itemIndex}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.04 * itemIndex }}
                  className="flex flex-row items-center gap-4 rounded-xl bg-white p-4 shadow-sm"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${circle}`}>
                    <Icon className={`w-5 h-5 ${iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-800 truncate">{item.label}</span>
                      <span className="text-xs rounded-full bg-gray-100 text-gray-500 px-2 py-0.5">{item.type}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(item.time)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                      item.type,
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </motion.li>
              );
            })}
          </ul>
        )}
      </motion.div>

      <CheckInModal
        isOpen={showCheckIn}
        onClose={() => setShowCheckIn(false)}
        task={dashboardData?.todayTask}
        onSuccess={(result) => {
          setShowCheckIn(false);
          refreshDashboard();
          if (result?.message) toast.success(result.message);
        }}
      />
      <CheckOutModal
        isOpen={showCheckOut}
        onClose={() => setShowCheckOut(false)}
        task={dashboardData?.todayTask}
        attendanceRecord={todayAttendance}
        onSuccess={(result) => {
          setShowCheckOut(false);
          refreshDashboard();
          if (result?.message) toast.success(result.message);
        }}
      />
    </motion.div>
  );
}
