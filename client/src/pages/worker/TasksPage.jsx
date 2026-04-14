import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import {
  MapPin,
  Clock,
  Timer,
  Wrench,
  FileText,
  CheckCircle2,
  Calendar,
  History,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from 'lucide-react';
import api from '../../utils/api';

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

function taskAttendanceState(todayAttendance, taskId) {
  if (!todayAttendance || !taskId) return 'NOT_CHECKED_IN';
  const tid = String(taskId);
  const attTask = todayAttendance.task?._id ?? todayAttendance.task;
  if (String(attTask) !== tid) return 'NOT_CHECKED_IN';
  if (todayAttendance.checkInTime && !todayAttendance.checkOutTime) return 'CHECKED_IN';
  if (todayAttendance.checkInTime && todayAttendance.checkOutTime) return 'COMPLETED';
  return 'NOT_CHECKED_IN';
}

function statusBadgeClass(status) {
  if (status === 'ACTIVE') return 'bg-[#E8F5E9] text-[#1B5E20]';
  if (status === 'COMPLETED') return 'bg-gray-100 text-gray-600';
  if (status === 'CANCELLED') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

const TAB_TODAY = 'TODAY';
const TAB_UPCOMING = 'UPCOMING';
const TAB_PAST = 'PAST';

export default function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(TAB_TODAY);
  const [expandedDesc, setExpandedDesc] = useState({});
  const tabInitRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksOutcome, attOutcome] = await Promise.allSettled([
        api.get('/worker/tasks/all'),
        api.get('/worker/attendance/today'),
      ]);
      if (tasksOutcome.status === 'fulfilled') {
        const tasksRes = tasksOutcome.value;
        const list = tasksRes.data?.data?.tasks ?? tasksRes.data?.data;
        const normalized = Array.isArray(list) ? list : [];
        setTasks(normalized);
      } else {
        const e = tasksOutcome.reason;
        toast.error(e.response?.data?.message || 'Failed to load tasks');
        setTasks([]);
      }
      if (attOutcome.status === 'fulfilled') {
        setTodayAttendance(attOutcome.value.data?.data ?? null);
      } else {
        setTodayAttendance(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const g = { TODAY: [], UPCOMING: [], PAST: [] };
    for (const t of tasks) {
      const c = t.category;
      if (g[c]) g[c].push(t);
    }
    return g;
  }, [tasks]);

  useEffect(() => {
    if (loading || tabInitRef.current) return;
    tabInitRef.current = true;
    if (grouped.TODAY.length > 0) setActiveTab(TAB_TODAY);
    else if (grouped.UPCOMING.length > 0) setActiveTab(TAB_UPCOMING);
    else setActiveTab(TAB_PAST);
  }, [loading, grouped.TODAY.length, grouped.UPCOMING.length]);

  const counts = useMemo(
    () => ({
      [TAB_TODAY]: grouped.TODAY.length,
      [TAB_UPCOMING]: grouped.UPCOMING.length,
      [TAB_PAST]: grouped.PAST.length,
    }),
    [grouped]
  );

  const visibleTasks = grouped[activeTab] || [];

  const toggleDesc = (id) => {
    setExpandedDesc((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setActiveTab(key)}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
        activeTab === key
          ? 'bg-[#005F02] text-white shadow-md'
          : 'bg-white text-gray-600 border border-gray-200 hover:border-[#005F02]/40'
      }`}
    >
      {label}
      <span
        className={`rounded-full px-2 py-0.5 text-xs ${
          activeTab === key ? 'bg-white/20 text-white' : 'bg-[#F2E3BB] text-[#005F02]'
        }`}
      >
        {counts[key]}
      </span>
    </button>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className="min-h-full bg-[#f7f9f7] -mx-4 md:-mx-8 -mt-4 md:-mt-8 px-4 md:px-8 pt-4 md:pt-8 pb-10">
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => navigate('/worker')}
          className="flex items-center gap-2 text-sm font-medium text-[#427A43] hover:text-[#005F02] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#005F02]">My Tasks</h1>
          <p className="text-gray-500 text-sm mt-1">All your assigned tasks</p>
        </header>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabBtn(TAB_TODAY, 'Today')}
          {tabBtn(TAB_UPCOMING, 'Upcoming')}
          {tabBtn(TAB_PAST, 'Past')}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-2xl bg-white border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-white border border-gray-100 text-center px-6">
            {activeTab === TAB_TODAY && (
              <>
                <Calendar className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">No tasks assigned for today</p>
              </>
            )}
            {activeTab === TAB_UPCOMING && (
              <>
                <Clock className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">No upcoming tasks</p>
              </>
            )}
            {activeTab === TAB_PAST && (
              <>
                <History className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-600 font-medium">No past tasks yet</p>
              </>
            )}
          </div>
        ) : (
          <motion.ul
            className="space-y-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            key={activeTab}
          >
            <AnimatePresence mode="popLayout">
              {visibleTasks.map((task) => {
                const id = String(task._id);
                const attState = taskAttendanceState(todayAttendance, task._id);
                const inBuf = task.checkInBuffer ?? 15;
                const outBuf = task.checkOutBuffer ?? 15;
                const desc = task.description?.trim();
                const expanded = !!expandedDesc[id];
                const showActions =
                  (activeTab === TAB_TODAY || activeTab === TAB_UPCOMING) &&
                  task.status !== 'CANCELLED' &&
                  task.status !== 'COMPLETED';

                return (
                  <motion.li
                    key={id}
                    variants={cardVariants}
                    layout
                    className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <h2 className="text-lg font-bold text-[#005F02] flex-1 min-w-0">{task.title}</h2>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadgeClass(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3 items-center">
                      <Wrench className="w-3.5 h-3.5 text-[#427A43]" aria-hidden />
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-[#F2E3BB] text-[#005F02]">
                        {task.workType}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#427A43] shrink-0" />
                        <span>{task.locationName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#427A43] shrink-0" />
                        <span>{task.date ? format(new Date(task.date), 'EEE, d MMM yyyy') : '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#427A43] shrink-0" />
                        <span>
                          {task.startTime} – {task.endTime}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Assigned by:{' '}
                        <span className="font-medium text-gray-700">{task.createdBy?.fullName || '—'}</span>
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#f7f9f7] p-3 text-xs text-gray-600 space-y-2 mb-3">
                      <div className="flex items-start gap-2">
                        <Timer className="w-3.5 h-3.5 text-[#005F02] shrink-0 mt-0.5" />
                        <span>
                          Check-in window: {adjustTimeHM(task.startTime, -inBuf)} –{' '}
                          {adjustTimeHM(task.startTime, inBuf)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Timer className="w-3.5 h-3.5 text-[#005F02] shrink-0 mt-0.5" />
                        <span>
                          Check-out window: {adjustTimeHM(task.endTime, -outBuf)} –{' '}
                          {adjustTimeHM(task.endTime, outBuf)}
                        </span>
                      </div>
                    </div>

                    {desc ? (
                      <div className="mb-3">
                        <p className={`text-sm text-gray-600 ${expanded ? '' : 'line-clamp-2'}`}>{desc}</p>
                        {desc.length > 100 && (
                          <button
                            type="button"
                            onClick={() => toggleDesc(id)}
                            className="mt-1 flex items-center gap-1 text-xs font-medium text-[#005F02]"
                          >
                            {expanded ? (
                              <>
                                Read less <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                Read more <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-gray-100">
                      {task.reportStatus == null && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate('/worker/reports', { state: { openModal: true, taskId: task._id } })
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#005F02] text-[#005F02] text-xs font-semibold px-3 py-2 hover:bg-[#005F02]/5"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Submit Report
                        </button>
                      )}
                      {task.reportStatus === 'SUBMITTED' && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          Report Submitted
                        </span>
                      )}
                      {task.reportStatus === 'APPROVED' && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800">
                          Report Approved
                        </span>
                      )}
                      {task.reportStatus === 'REJECTED' && (
                        <>
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-100 text-red-800">
                            Report Rejected
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              navigate('/worker/reports', { state: { openModal: true, taskId: task._id } })
                            }
                            className="rounded-lg border border-red-600 text-red-600 text-xs font-semibold px-3 py-2 hover:bg-red-50"
                          >
                            Resubmit
                          </button>
                        </>
                      )}
                    </div>

                    {showActions && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {attState === 'NOT_CHECKED_IN' && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate('/worker', { state: { openCheckIn: true, taskId: task._id } })
                            }
                            className="rounded-xl bg-[#005F02] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#427A43]"
                          >
                            Check In
                          </button>
                        )}
                        {attState === 'CHECKED_IN' && (
                          <button
                            type="button"
                            onClick={() => navigate('/worker', { state: { openCheckOut: true } })}
                            className="rounded-xl bg-red-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-red-700"
                          >
                            Check Out
                          </button>
                        )}
                        {attState === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-[#005F02]">
                            <CheckCircle2 className="w-4 h-4" />
                            Attendance Done
                          </span>
                        )}
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </div>
  );
}
