import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  Plus,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Clock,
  CalendarDays,
  FileText,
  User,
  Loader2,
} from 'lucide-react';
import api from '../../utils/api';
import LeaveRequestModal from '../../components/worker/LeaveRequestModal';

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

function formatDateRange(fromIso, toIso) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const d1 = from.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const d2 = to.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${d1} → ${d2}`;
}

function leaveSpanDays(fromIso, toIso) {
  return Math.ceil((new Date(toIso) - new Date(fromIso)) / (1000 * 60 * 60 * 24)) + 1;
}

function truncate(s, n) {
  if (!s) return '';
  const t = String(s);
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

function leaveTypeBadgeClass(type) {
  switch (type) {
    case 'SICK':
      return 'border border-red-200 bg-red-50 text-red-700';
    case 'EMERGENCY':
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    case 'CASUAL':
    default:
      return 'border border-blue-200 bg-blue-50 text-blue-700';
  }
}

function statusPillClass(status) {
  switch (status) {
    case 'APPROVED':
      return 'border border-green-200 bg-[#f0fdf4] text-[#16a34a]';
    case 'REJECTED':
      return 'border border-red-200 bg-[#fef2f2] text-[#dc2626]';
    case 'PENDING':
    default:
      return 'border border-blue-200 bg-[#eff6ff] text-[#2563eb]';
  }
}

export default function LeavePage() {
  const location = useLocation();
  const [leaveData, setLeaveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchLeaveData = useCallback(async () => {
    try {
      const res = await api.get('/worker/leave');
      const data = res.data?.data;
      if (data) setLeaveData(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  useEffect(() => {
    if (location.state?.openModal) {
      setShowModal(true);
    }
  }, [location.state]);

  const handleCancel = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave request?')) return;
    setCancellingId(leaveId);
    try {
      await api.delete(`/worker/leave/${leaveId}`);
      toast.success('Leave request cancelled');
      await fetchLeaveData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not cancel request');
    } finally {
      setCancellingId(null);
    }
  };

  const leaves = leaveData?.leaves ?? [];
  const balance = leaveData?.balance ?? {
    total: 12,
    used: 0,
    remaining: 12,
    pending: 0,
  };
  const { total, used, remaining, pending } = balance;
  const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

  const remainingValueClass =
    remaining >= 6 ? 'text-[#16a34a]' : remaining >= 3 ? 'text-[#d97706]' : 'text-[#dc2626]';
  const usedValueClass = used > 0 ? 'text-[#d97706]' : 'text-gray-600';
  const pendingValueClass = pending > 0 ? 'text-[#2563eb]' : 'text-gray-600';

  const balanceCards = [
    {
      key: 'total',
      icon: Calendar,
      iconColor: '#005F02',
      value: total,
      label: 'Days Per Year',
      sub: 'Annual entitlement',
      valueClass: 'text-gray-900',
      cardClass: '',
    },
    {
      key: 'used',
      icon: CheckCircle2,
      iconColor: '#d97706',
      value: used,
      label: 'Days Used',
      sub: null,
      valueClass: usedValueClass,
      cardClass: '',
    },
    {
      key: 'rem',
      icon: TrendingUp,
      iconColor: remaining >= 3 ? '#16a34a' : '#dc2626',
      value: remaining,
      label: 'Days Remaining',
      sub: null,
      valueClass: remainingValueClass,
      cardClass: remaining === 0 ? 'bg-[#fef2f2]' : '',
    },
    {
      key: 'pend',
      icon: Clock,
      iconColor: '#2563eb',
      value: pending,
      label: 'Awaiting Approval',
      sub: null,
      valueClass: pendingValueClass,
      cardClass: '',
    },
  ];

  return (
    <motion.div
      className="min-h-full bg-[#f7f9f7] px-4 pb-10 pt-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#005F02]">Leave Requests</h1>
            <p className="text-sm text-gray-500">Manage your time-off requests</p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#005F02] px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Request Leave
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {loading
            ? [0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl bg-white shadow-sm"
                />
              ))
            : balanceCards.map((c, index) => (
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 * index }}
                  className={`rounded-2xl bg-white p-4 shadow-sm ${c.cardClass}`}
                >
                  <div className="flex items-start gap-3">
                    <c.icon className="h-6 w-6 shrink-0" style={{ color: c.iconColor }} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-2xl font-bold tabular-nums ${c.valueClass}`}>{c.value}</p>
                      <p className="text-sm text-gray-600">{c.label}</p>
                      {c.sub && <p className="mt-1 text-xs text-gray-400">{c.sub}</p>}
                    </div>
                  </div>
                </motion.div>
              ))}
        </div>

        {!loading && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-[#005F02]"
                initial={{ width: 0 }}
                animate={{ width: `${usedPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-1 text-right text-xs text-gray-500">
              {used} of {total} days used
            </p>
          </div>
        )}

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-[#005F02]">Leave History</h2>
            <span className="rounded-full bg-[#F2E3BB] px-2 py-0.5 text-xs text-[#005F02]">
              {leaves.length} requests
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-white shadow-sm" />
              ))}
            </div>
          ) : leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-sm">
              <Calendar className="mb-4 h-48 w-48 text-gray-300" strokeWidth={1} />
              <p className="font-medium text-gray-600">No leave requests yet</p>
              <p className="mt-1 text-sm text-gray-400">Click &apos;Request Leave&apos; to apply</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {leaves.map((leave, index) => {
                const lt = leave.leaveType || 'CASUAL';
                const days = leaveSpanDays(leave.fromDate, leave.toDate);
                return (
                  <motion.li
                    key={leave._id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.04 * index }}
                    className="rounded-2xl bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
                      <div className="flex w-full shrink-0 flex-col items-center text-center sm:w-24">
                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-semibold uppercase ${leaveTypeBadgeClass(lt)}`}
                        >
                          {lt}
                        </span>
                        <p className="mt-1 text-xs text-gray-500">
                          {days} day{days !== 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-[#427A43]" />
                          {formatDateRange(leave.fromDate, leave.toDate)}
                        </div>
                        <div className="flex items-start gap-2 text-sm text-gray-500">
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                          <span className="min-w-0">{truncate(leave.reason, 60)}</span>
                        </div>
                        {leave.exceedsEntitlement && (leave.excessUnpaidDays ?? 0) > 0 && (
                          <p className="text-xs font-medium text-amber-800">
                            Includes {leave.excessUnpaidDays} unpaid/extra day
                            {leave.excessUnpaidDays !== 1 ? 's' : ''} (beyond paid allowance at request) — team
                            lead notified.
                          </p>
                        )}
                        {(leave.status === 'APPROVED' || leave.status === 'REJECTED') && (
                          <>
                            {leave.reviewedBy?.fullName && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                <User className="h-3 w-3 shrink-0" />
                                Reviewed by {leave.reviewedBy.fullName}
                              </div>
                            )}
                            {leave.reviewNote ? (
                              <p className="text-xs italic text-gray-400">&ldquo;{leave.reviewNote}&rdquo;</p>
                            ) : null}
                          </>
                        )}
                        <p className="text-xs text-gray-400">
                          Applied {formatRelativeTime(leave.createdAt)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-center justify-center gap-2 sm:items-end">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${statusPillClass(leave.status)}`}
                        >
                          {leave.status}
                        </span>
                        {leave.status === 'PENDING' && (
                          <button
                            type="button"
                            disabled={cancellingId === leave._id}
                            onClick={() => handleCancel(leave._id)}
                            className="text-xs text-red-500 underline disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {cancellingId === leave._id ? (
                              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                            ) : (
                              'Cancel'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <LeaveRequestModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        remainingDays={leaveData?.balance?.remaining ?? 0}
        onSuccess={() => {
          setShowModal(false);
          fetchLeaveData();
          toast.success('Leave request submitted!');
        }}
      />
    </motion.div>
  );
}
