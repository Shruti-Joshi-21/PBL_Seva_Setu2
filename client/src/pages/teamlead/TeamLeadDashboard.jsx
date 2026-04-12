import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { CheckCircle2, X } from 'lucide-react';
import api from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext';

const TeamLeadDashboard = () => {
  const navigate = useNavigate();
  useAuth();
  const [stats, setStats] = useState({});
  const [todaysTasks, setTodaysTasks] = useState([]);
  const [workerAttendance, setWorkerAttendance] = useState([]);
  const [flaggedRecords, setFlaggedRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [clock, setClock] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [remark, setRemark] = useState('');

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/teamlead/dashboard-summary');
      const { data } = response.data;
      setStats(data.stats || {});
      setTodaysTasks(data.todaysTasks || []);
      setWorkerAttendance(data.workerAttendance || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const refresh = setInterval(fetchDashboard, 30000);
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => {
      clearInterval(refresh);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const fetchFallback = async () => {
      try {
        const [flagsRes, leavesRes] = await Promise.all([
          api.get('/teamlead/attendance/flagged'),
          api.get('/teamlead/leave-requests?status=PENDING'),
        ]);
        setFlaggedRecords(flagsRes.data.data || []);
        setLeaveRequests(leavesRes.data.data || []);
      } catch {
        setFlaggedRecords([]);
        setLeaveRequests([]);
      }
    };
    fetchFallback();
  }, []);

  const handleResolveFlag = async (action) => {
    if (!selectedFlag || remark.trim().length < 10) return;
    try {
      await api.patch(`/teamlead/attendance/flagged/${selectedFlag._id}/resolve`, { action, remark });
      setFlaggedRecords((prev) => prev.filter((r) => r._id !== selectedFlag._id));
      setSelectedFlag(null);
      setRemark('');
      toast.success('Record updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleLeave = async (status) => {
    if (!selectedLeave) return;
    try {
      await api.patch(`/teamlead/leave-requests/${selectedLeave._id}`, { status, remark });
      setLeaveRequests((prev) => prev.filter((l) => l._id !== selectedLeave._id));
      setSelectedLeave(null);
      setRemark('');
      toast.success('Leave request updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const liveTime = useMemo(() => clock.toLocaleTimeString('en-GB', { hour12: false }), [clock]);

  const taskStatusBadge = (status) =>
    status === 'FLAGGED'
      ? 'bg-[#fcebeb] text-[#791F1F]'
      : status === 'PENDING'
        ? 'bg-[#faeeda] text-[#633806]'
        : status === 'CANCELLED'
          ? 'bg-gray-100 text-gray-500'
          : 'bg-[#eaf3de] text-[#27500A]';

  return (
    <>
      <div className="bg-[#f5f0e8] min-h-screen p-6 space-y-6">
        <div className="flex items-center justify-end gap-3">
          <span className="text-xs font-normal text-gray-400">{liveTime}</span>
          <button
            type="button"
            onClick={() => navigate('/teamlead/tasks/create')}
            className="bg-[#1a4a1a] hover:bg-[#2d6b2d] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Create task
          </button>
        </div>
        {error ? <p className="text-sm font-normal text-red-600">{error}</p> : null}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active tasks', value: stats.activeTasks || 0 },
            { label: 'Workers present', value: `${stats.presentToday || 0}/${stats.totalWorkers || 0}` },
            { label: 'Flagged today', value: stats.flaggedToday || 0, sub: 'Needs review' },
            { label: 'Pending leaves', value: stats.pendingLeaves || 0, sub: 'Awaiting action' },
          ].map((item, index) => (
            <motion.div
              key={item.label}
              className="bg-white rounded-xl border border-[#e8e0d0] p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
            >
              <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1 font-normal">{item.label}</p>
              <p className="text-2xl font-medium text-gray-800">{item.value}</p>
              {item.sub ? <p className="text-xs mt-1.5 font-normal text-gray-500">{item.sub}</p> : null}
            </motion.div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-3 bg-white rounded-xl border border-[#e8e0d0] p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-gray-800">Today&apos;s tasks</h2>
              <Link className="text-xs text-[#1a4a1a] hover:underline font-normal" to="/teamlead/tasks">
                View all
              </Link>
            </div>
            {(loading ? [] : todaysTasks.slice(0, 5)).map((task) => (
              <div key={task._id} className="py-3 border-b border-[#e8e0d0] last:border-0">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-sm font-normal text-gray-800">{task.title}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${taskStatusBadge(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                <p className="text-xs font-normal text-gray-400 mt-1">
                  {task.startTime}–{task.endTime} · {task.totalWorkers} workers · {task.allowedRadius} m
                </p>
              </div>
            ))}
            {!loading && !todaysTasks.length ? (
              <p className="text-sm font-normal text-gray-400">No tasks scheduled today</p>
            ) : null}
          </div>
          <div className="md:col-span-2 bg-white rounded-xl border border-[#e8e0d0] p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-gray-800">Worker attendance</h2>
              <Link className="text-xs text-[#1a4a1a] hover:underline font-normal" to="/teamlead/attendance">
                Live view
              </Link>
            </div>
            {workerAttendance.slice(0, 6).map((worker) => (
              <div key={worker._id} className="flex items-center gap-3 py-2.5 border-b border-[#e8e0d0] last:border-0">
                <div className="w-7 h-7 rounded-full bg-[#eaf3de] text-[#27500A] text-xs font-medium flex items-center justify-center shrink-0">
                  {worker.initials || 'NA'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-normal text-gray-800 truncate">{worker.name}</p>
                  {worker.topWorkType ? (
                    <span className="inline-block mt-0.5 bg-gray-100 text-gray-600 text-xs font-normal px-2 py-0.5 rounded-full">
                      {worker.topWorkType}
                    </span>
                  ) : null}
                </div>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${worker.checkedIn ? 'bg-[#27500A]' : 'bg-gray-300'}`}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-[#e8e0d0] p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-gray-800">Flagged records</h2>
              <Link className="text-xs text-[#1a4a1a] hover:underline font-normal" to="/teamlead/flags">
                Review all
              </Link>
            </div>
            {flaggedRecords.slice(0, 3).map((f) => (
              <div
                key={f._id}
                className="flex justify-between items-center gap-2 py-3 border-l-4 border-l-red-400 border border-[#e8e0d0] border-l pl-3 pr-3 rounded-r-lg mb-2 bg-white"
              >
                <p className="text-sm font-normal text-gray-600">
                  {f.worker?.fullName || 'Worker'} · {f.task?.title || 'Task'}
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedFlag(f)}
                  className="bg-white border border-[#e8e0d0] text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
                >
                  Review
                </button>
              </div>
            ))}
            {!flaggedRecords.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="w-10 h-10 text-[#2d6b2d] mb-3" />
                <p className="text-sm font-medium text-gray-400">No flags today</p>
                <p className="text-xs text-gray-300 mt-1 font-normal">You&apos;re all caught up</p>
              </div>
            ) : null}
          </div>
          <div className="bg-white rounded-xl border border-[#e8e0d0] p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-medium text-gray-800">Leave requests</h2>
              <Link className="text-xs text-[#1a4a1a] hover:underline font-normal" to="/teamlead/leave">
                View all
              </Link>
            </div>
            {leaveRequests.slice(0, 2).map((leave) => (
              <div key={leave._id} className="flex justify-between items-center py-3 border-b border-[#e8e0d0] last:border-0">
                <p className="text-sm font-normal text-gray-600">
                  {leave.worker?.fullName} · {new Date(leave.fromDate).toLocaleDateString()} —{' '}
                  {new Date(leave.toDate).toLocaleDateString()}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLeave(leave);
                    setRemark('');
                  }}
                  className="bg-white border border-[#e8e0d0] text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Review
                </button>
              </div>
            ))}
            {!leaveRequests.length ? (
              <p className="text-sm font-normal text-gray-400">No pending leave requests</p>
            ) : null}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {selectedFlag ? (
          <motion.div
            className="bg-black/40 fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="bg-white rounded-xl border border-[#e8e0d0] w-full max-w-md mx-4 overflow-hidden"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-[#1a4a1a] px-5 py-4 flex justify-between items-center">
                <p className="text-[#C0B87A] text-sm font-medium">Flagged record</p>
                <button type="button" onClick={() => setSelectedFlag(null)} className="text-white/50 hover:text-white transition-colors text-lg leading-none">
                  ×
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm font-normal text-[#791F1F] bg-[#fcebeb] border border-[#f0c0c0] rounded-lg p-3 mb-4">
                  {(selectedFlag.flagReasons || []).join(', ') || 'Flagged'}
                </p>
                <textarea
                  rows={3}
                  className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#1a4a1a] transition-colors placeholder:text-gray-300"
                  placeholder="Action remark"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>
              <div className="px-5 py-4 border-t border-[#e8e0d0] flex justify-end gap-2 flex-wrap">
                <button
                  type="button"
                  className="bg-white border border-[#e8e0d0] text-gray-600 text-sm font-normal px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedFlag(null)}
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  className="bg-[#fcebeb] text-[#791F1F] border border-[#f0c0c0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#fad8d8] transition-colors"
                  onClick={() => handleResolveFlag('REJECT')}
                >
                  Reject attendance
                </button>
                <button
                  type="button"
                  className="bg-[#eaf3de] text-[#27500A] border border-[#c5deb0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#d4edbc] transition-colors"
                  onClick={() => handleResolveFlag('APPROVE')}
                >
                  Mark as present
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {selectedLeave ? (
          <motion.div
            className="bg-black/40 fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="bg-white rounded-xl border border-[#e8e0d0] w-full max-w-md mx-4 overflow-hidden"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-[#1a4a1a] px-5 py-4 flex justify-between items-center">
                <p className="text-[#C0B87A] text-sm font-medium">Leave request</p>
                <button type="button" onClick={() => setSelectedLeave(null)} className="text-white/50 hover:text-white transition-colors text-lg leading-none">
                  ×
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm font-normal text-gray-600">{selectedLeave.worker?.fullName}</p>
                <textarea
                  rows={2}
                  className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#1a4a1a] transition-colors placeholder:text-gray-300 mt-3"
                  placeholder="Remarks (optional)"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>
              <div className="px-5 py-4 border-t border-[#e8e0d0] flex justify-end gap-2 flex-wrap">
                <button
                  type="button"
                  className="bg-white border border-[#e8e0d0] text-gray-600 text-sm font-normal px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedLeave(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-[#fcebeb] text-[#791F1F] border border-[#f0c0c0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#fad8d8] transition-colors"
                  onClick={() => handleLeave('REJECTED')}
                >
                  Reject leave
                </button>
                <button
                  type="button"
                  className="bg-[#eaf3de] text-[#27500A] border border-[#c5deb0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#d4edbc] transition-colors"
                  onClick={() => handleLeave('APPROVED')}
                >
                  Approve leave
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default TeamLeadDashboard;
