import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../utils/api.js';
import { useAuth } from '../../context/AuthContext';

const FieldReports = () => {
  useAuth();
  const [reports, setReports] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedReport, setSelectedReport] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [isForwarding, setIsForwarding] = useState(false);
  const [errorText, setErrorText] = useState('');

  const fetchReports = async () => {
    const response = await api.get('/teamlead/field-reports');
    const { data } = response.data;
    setReports(data || []);
  };
  useEffect(() => {
    fetchReports();
  }, []);
  useEffect(() => {
    const t = setInterval(fetchReports, 60000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'ALL') return reports;
    if (activeFilter === 'Pending review') return reports.filter((r) => r.status !== 'FORWARDED');
    return reports.filter((r) => r.status === 'FORWARDED' || r.forwardedToAdmin);
  }, [reports, activeFilter]);

  const forward = async () => {
    if (!selectedReport) return;
    setIsForwarding(true);
    setErrorText('');
    try {
      await api.post(`/teamlead/field-reports/${selectedReport._id}/forward`, { summary });
      setReports((prev) =>
        prev.map((r) => (r._id === selectedReport._id ? { ...r, status: 'FORWARDED', forwardedToAdmin: true } : r))
      );
      toast.success('Report forwarded to admin');
      setDialogOpen(false);
      setSelectedReport(null);
      setSummary('');
    } catch (err) {
      setErrorText(err.response?.data?.message || 'Failed to forward report');
    } finally {
      setIsForwarding(false);
    }
  };

  const reportStatusBadge = (s) =>
    s === 'FORWARDED' || s === 'APPROVED' || s === 'COMPLETED'
      ? 'bg-[#eaf3de] text-[#27500A]'
      : s === 'REJECTED'
        ? 'bg-[#fcebeb] text-[#791F1F]'
        : s === 'PENDING'
          ? 'bg-[#faeeda] text-[#633806]'
          : 'bg-[#faeeda] text-[#633806]';

  const wordCount = summary.trim() ? summary.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <>
      <div className="bg-[#f5f0e8] min-h-screen p-6">
        <div className="flex gap-2 mb-5 flex-wrap">
          {['ALL', 'Pending review', 'Forwarded'].map((f) => (
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((report, index) => (
            <motion.div
              key={report._id}
              className="bg-white rounded-xl border border-[#e8e0d0] p-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
            >
              <div className="flex justify-between items-start gap-2">
                <h2 className="text-sm font-medium text-gray-800">{report.task?.title || 'Task'}</h2>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-normal shrink-0">
                  {report.task?.workType || 'General'}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-normal mt-1">
                {report.worker?.fullName || 'Worker'} · {new Date(report.createdAt).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 font-normal mt-2 line-clamp-2">
                {report.description || report.summary || ''}
              </p>
              <div className="flex justify-between items-center mt-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${reportStatusBadge(report.status)}`}>
                  {report.status}
                </span>
                <button
                  type="button"
                  className="bg-white border border-[#e8e0d0] text-gray-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    setSelectedReport(report);
                    setDialogOpen(true);
                    setErrorText('');
                  }}
                >
                  View & forward
                </button>
              </div>
            </motion.div>
          ))}
        </div>
        {!filtered.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-400">No reports submitted yet</p>
            <p className="text-xs text-gray-300 mt-1 font-normal">Check back after workers file reports</p>
          </div>
        ) : null}
      </div>
      <AnimatePresence>
        {dialogOpen && selectedReport ? (
          <motion.div
            className="bg-black/40 fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className="bg-white rounded-xl border border-[#e8e0d0] w-full max-w-lg mx-4 overflow-hidden"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.15 }}
            >
              <div className="bg-[#1a4a1a] px-5 py-4 flex justify-between items-center">
                <p className="text-[#C0B87A] text-sm font-medium">{selectedReport.task?.title || 'Field report'}</p>
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="text-white/50 hover:text-white transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>
              <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">Worker&apos;s report</p>
                <p className="text-sm text-gray-700 font-normal">{selectedReport.description || selectedReport.summary || 'No details provided'}</p>
                <div className="border-t border-[#e8e0d0] my-4" />
                {selectedReport.forwardedToAdmin ? (
                  <div className="bg-[#eaf3de] border border-[#c5deb0] rounded-lg p-3 text-sm text-[#27500A] flex items-center gap-2 font-normal">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Forwarded to admin
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">Forward to admin</p>
                    <textarea
                      rows={4}
                      className="w-full border border-[#e8e0d0] rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:border-[#1a4a1a] transition-colors placeholder:text-gray-300"
                      placeholder="Summarize key outcomes, issues, and highlights of this task..."
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                    />
                    <p
                      className={`text-xs mt-1 font-normal ${wordCount >= 10 ? 'text-[#2d6b2d]' : 'text-gray-400'}`}
                    >
                      {wordCount} words{wordCount >= 10 ? ' ✓' : ''}
                    </p>
                    <button
                      type="button"
                      disabled={!summary.trim() || isForwarding}
                      className="w-full mt-3 bg-[#1a4a1a] hover:bg-[#2d6b2d] text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50"
                      onClick={forward}
                    >
                      Forward to admin
                    </button>
                    {errorText ? <p className="text-sm text-red-600 mt-2 font-normal">{errorText}</p> : null}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};

export default FieldReports;
