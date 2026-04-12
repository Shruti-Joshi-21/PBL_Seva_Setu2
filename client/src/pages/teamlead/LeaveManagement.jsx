import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext';

const LeaveManagement = () => {
  useAuth();
  const [leaves, setLeaves] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchLeaves = async () => {
    const query = activeFilter === 'ALL' ? '' : `?status=${activeFilter}`;
    const response = await api.get(`/teamlead/leave-requests${query}`);
    const { data } = response.data;
    setLeaves(data || []);
  };

  useEffect(() => {
    fetchLeaves();
  }, [activeFilter]);
  useEffect(() => {
    const t = setInterval(fetchLeaves, 60000);
    return () => clearInterval(t);
  }, [activeFilter]);

  const list = useMemo(() => leaves, [leaves]);

  const updateLeave = async (status) => {
    if (!selectedLeave) return;
    setIsUpdating(true);
    try {
      const response = await api.patch(`/teamlead/leave-requests/${selectedLeave._id}`, { status, remark });
      const { data } = response.data;
      setLeaves((prev) => prev.map((l) => (l._id === data._id ? data : l)));
      toast.success('Leave request updated');
      setDialogOpen(false);
      setSelectedLeave(null);
      setRemark('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update leave');
    } finally {
      setIsUpdating(false);
    }
  };

  const statusBadge = (s) =>
    s === 'PENDING'
      ? 'bg-[#faeeda] text-[#633806]'
      : s === 'APPROVED'
        ? 'bg-[#eaf3de] text-[#27500A]'
        : s === 'REJECTED'
          ? 'bg-[#fcebeb] text-[#791F1F]'
          : 'bg-gray-100 text-gray-500';

  const leaveTypeLabel = (t) => {
    if (!t) return '';
    const s = String(t).replace(/_/g, ' ').toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const initials = (name) => {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0].length) return parts[0].slice(0, 2).toUpperCase();
    return '—';
  };

  return (
    <>
      <div className="bg-[#f5f0e8] min-h-screen p-6">
        <div className="flex gap-2 mb-5 flex-wrap">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActiveFilter(f)}
              className={
                activeFilter === f
                  ? 'bg-[#1a4a1a] text-white text-sm font-medium px-4 py-1.5 rounded-lg'
                  : 'bg-white border border-[#e8e0d0] text-gray-500 text-sm font-normal px-4 py-1.5 rounded-lg hover:bg-gray-50 transition-colors'
              }
            >
              {f === 'ALL' ? 'All' : f[0] + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {list.map((leave, index) => (
            <motion.div
              key={leave._id}
              className="bg-white rounded-xl border border-[#e8e0d0] p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#faeeda] text-[#633806] text-xs font-medium flex items-center justify-center shrink-0">
                    {initials(leave.workerName || leave.worker?.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {leave.workerName || leave.worker?.fullName}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-1 font-normal">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {new Date(leave.fromDate).toLocaleDateString()} to {new Date(leave.toDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(leave.status)}`}>
                    {leave.status}
                  </span>
                  {leave.totalDays != null ? (
                    <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full font-normal">
                      {leave.totalDays} days
                    </span>
                  ) : null}
                </div>
              </div>
              {leave.leaveType ? (
                <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-full bg-[#faeeda] text-[#633806]">
                  {leaveTypeLabel(leave.leaveType)}
                </span>
              ) : null}
              <p className="text-sm text-gray-500 font-normal italic bg-[#f9f9f9] border border-[#e8e0d0] rounded-lg p-3 mt-3">
                &ldquo;{leave.reason}&rdquo;
              </p>
              {leave.status === 'PENDING' ? (
                <div className="flex justify-end gap-2 mt-3">
                  <button
                    type="button"
                    className="bg-[#fcebeb] text-[#791F1F] border border-[#f0c0c0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#fad8d8] transition-colors"
                    onClick={() => {
                      setSelectedLeave(leave);
                      setDialogOpen(true);
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="bg-[#eaf3de] text-[#27500A] border border-[#c5deb0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#d4edbc] transition-colors"
                    onClick={() => {
                      setSelectedLeave(leave);
                      setDialogOpen(true);
                    }}
                  >
                    Approve
                  </button>
                </div>
              ) : null}
            </motion.div>
          ))}
        </div>
        {!list.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-400">No leave requests found</p>
            <p className="text-xs text-gray-300 mt-1 font-normal">Try another filter</p>
          </div>
        ) : null}
      </div>
      <AnimatePresence>
        {dialogOpen && selectedLeave ? (
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
                <p className="text-[#C0B87A] text-sm font-medium">
                  Leave request — {selectedLeave.workerName || selectedLeave.worker?.fullName}
                </p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="text-white/50 hover:text-white transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <div className="px-5 py-4">
                <textarea
                  rows={2}
                  className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#1a4a1a] transition-colors placeholder:text-gray-300"
                  placeholder="Add a note for the worker..."
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>
              <div className="px-5 py-4 border-t border-[#e8e0d0] flex justify-end gap-2 flex-wrap">
                <button
                  type="button"
                  className="bg-white border border-[#e8e0d0] text-gray-600 text-sm font-normal px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  className="bg-[#fcebeb] text-[#791F1F] border border-[#f0c0c0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#fad8d8] transition-colors"
                  onClick={() => updateLeave('REJECTED')}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  className="bg-[#eaf3de] text-[#27500A] border border-[#c5deb0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#d4edbc] transition-colors"
                  onClick={() => updateLeave('APPROVED')}
                >
                  Approve
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default LeaveManagement;
