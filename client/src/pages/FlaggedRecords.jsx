import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext';

const FlaggedRecords = () => {
  useAuth();
  const [records, setRecords] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const fetchRecords = async () => {
    const response = await api.get('/teamlead/attendance/flagged');
    const { data } = response.data;
    setRecords(data || []);
  };
  useEffect(() => {
    fetchRecords();
  }, []);
  useEffect(() => {
    const t = setInterval(fetchRecords, 30000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'ALL') return records;
    return records.filter((r) => (r.flagReasons || []).join(' ').toLowerCase().includes(activeFilter.toLowerCase()));
  }, [records, activeFilter]);

  const resolve = async (action) => {
    if (!selectedRecord || remark.trim().length < 10) return;
    setIsResolving(true);
    try {
      await api.patch(`/teamlead/attendance/flagged/${selectedRecord._id}/resolve`, { action, remark });
      setRecords((prev) => prev.filter((r) => r._id !== selectedRecord._id));
      setDialogOpen(false);
      setSelectedRecord(null);
      setRemark('');
      toast.success('Flagged record resolved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resolve');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <>
      <div className="bg-[#f5f0e8] min-h-screen p-6">
        <div className="flex gap-2 mb-5 flex-wrap">
          {['ALL', 'Location mismatch', 'Face mismatch', 'Incomplete checkout'].map((f) => (
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
              {f}
            </button>
          ))}
        </div>
        <AnimatePresence>
          {filtered.map((record, index) => (
            <motion.div
              key={record._id}
              layout
              exit={{ opacity: 0, height: 0 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
              className="bg-white rounded-xl border border-[#e8e0d0] border-l-4 border-l-red-400 p-5 mb-3"
            >
              <p className="text-sm font-medium text-[#791F1F]">{(record.flagReasons || []).join(', ') || 'Flagged'}</p>
              <p className="text-sm text-gray-600 font-normal mt-1">
                {record.worker?.fullName} · {record.task?.title}
              </p>
              <p className="text-xs text-gray-400 font-normal mt-0.5">
                Distance: {record.distanceAtCheckIn || 0}m (threshold: {record.task?.allowedRadius || 0}m)
              </p>
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  className="bg-white border border-[#e8e0d0] text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSelectedRecord(record);
                    setDialogOpen(true);
                  }}
                >
                  Review
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!filtered.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-[#2d6b2d] mb-3" />
            <p className="text-sm font-medium text-gray-400">No flagged records — all clear</p>
            <p className="text-xs text-gray-300 mt-1 font-normal">Nothing needs your review</p>
          </div>
        ) : null}
      </div>
      <AnimatePresence>
        {dialogOpen && selectedRecord ? (
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
                <p className="text-[#C0B87A] text-sm font-medium">Flagged record — {selectedRecord.worker?.fullName}</p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="text-white/50 hover:text-white transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm font-normal text-[#791F1F] bg-[#fcebeb] border border-[#f0c0c0] rounded-lg p-3 mb-4">
                  {(selectedRecord.flagReasons || []).join(', ') || 'Flagged'}
                </p>
                <textarea
                  className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#1a4a1a] transition-colors placeholder:text-gray-300"
                  rows={3}
                  placeholder="Action remark"
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
                  Dismiss
                </button>
                <button
                  type="button"
                  disabled={isResolving}
                  className="bg-[#fcebeb] text-[#791F1F] border border-[#f0c0c0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#fad8d8] transition-colors"
                  onClick={() => resolve('REJECT')}
                >
                  Reject attendance
                </button>
                <button
                  type="button"
                  disabled={isResolving}
                  className="bg-[#eaf3de] text-[#27500A] border border-[#c5deb0] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-[#d4edbc] transition-colors"
                  onClick={() => resolve('APPROVE')}
                >
                  Mark as present
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default FlaggedRecords;
