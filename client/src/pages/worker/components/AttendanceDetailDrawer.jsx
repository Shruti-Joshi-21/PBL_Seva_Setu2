import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Calendar, Clock, Wrench, AlertTriangle } from 'lucide-react';

function uploadsBaseUrl() {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return raw.replace(/\/api\/?$/, '');
}

function resolveImageSrc(stored) {
  if (!stored) return null;
  if (String(stored).startsWith('http')) return stored;
  const base = uploadsBaseUrl();
  const s = String(stored).replace(/^\//, '');
  if (s.startsWith('uploads/')) return `${base}/${s}`;
  if (s.startsWith('attendance/')) return `${base}/uploads/${s}`;
  return `${base}/uploads/attendance/${s}`;
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtTaskDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  return x.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function durationLabel(inIso, outIso) {
  if (!inIso || !outIso) return null;
  const ms = new Date(outIso) - new Date(inIso);
  if (ms < 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function statusBadgeClass(status) {
  switch (status) {
    case 'VERIFIED':
      return 'bg-green-50 text-green-700 border border-green-200';
    case 'FLAGGED':
      return 'bg-amber-50 text-amber-700 border border-amber-200';
    case 'PENDING':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'REJECTED':
      return 'bg-red-50 text-red-700 border border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border border-gray-200';
  }
}

export default function AttendanceDetailDrawer({ isOpen, onClose, record, loading }) {
  const task = record?.task;
  const beforeSrc = resolveImageSrc(record?.beforeImage);
  const afterSrc = resolveImageSrc(record?.afterImage);

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 h-full w-[420px] max-w-[100vw] overflow-y-auto bg-white shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-4">
              <h2 className="font-bold text-[#005F02]">Attendance Detail</h2>
              <button
                type="button"
                aria-label="Close"
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {loading && (
              <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
            )}
            {!loading && record && (
              <>
                <div className="px-4 pt-3">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                      record.status
                    )}`}
                  >
                    {record.status}
                  </span>
                </div>

                <div className="mx-4 mt-4 rounded-xl bg-[#f7f9f7] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Task</p>
                  <p className="mt-1 font-semibold text-gray-800">{task?.title || '—'}</p>
                  <div className="mt-2 flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <span>{task?.locationName || '—'}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                    <span>{fmtTaskDate(task?.date)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                    <span>
                      {task?.startTime && task?.endTime
                        ? `${task.startTime} – ${task.endTime}`
                        : '—'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <Wrench className="h-4 w-4 shrink-0 text-gray-400" />
                    <span>{task?.workType || '—'}</span>
                  </div>
                </div>

                <div className="mx-4 mt-4 border-l-4 border-[#005F02] pl-3">
                  <h3 className="font-semibold text-[#005F02]">Check-In</h3>
                </div>
                <div className="mx-4 mt-3 space-y-3 text-sm">
                  <div>
                    <span className="text-gray-500">Time</span>
                    <p className="font-medium text-gray-800">{fmtDateTime(record.checkInTime)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">GPS</span>
                    <p className="font-mono text-xs text-gray-800">
                      {record.checkInLocation?.latitude != null &&
                      record.checkInLocation?.longitude != null
                        ? `${record.checkInLocation.latitude}, ${record.checkInLocation.longitude}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Face</span>
                    <div className="mt-1">
                      {record.checkInFaceMatch === true ? (
                        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          ✓ Matched
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          ✗ No Match
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Before Photo</p>
                    {beforeSrc ? (
                      <a href={beforeSrc} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                        <img
                          src={beforeSrc}
                          alt="Before"
                          className="mt-2 max-h-48 w-full rounded-xl object-cover"
                        />
                      </a>
                    ) : (
                      <div className="mt-2 flex min-h-[100px] items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
                        No photo uploaded
                      </div>
                    )}
                  </div>
                </div>

                <div className="mx-4 mt-6 border-l-4 border-[#427A43] pl-3">
                  <h3 className="font-semibold text-[#005F02]">Check-Out</h3>
                </div>
                <div className="mx-4 mt-3 space-y-3 text-sm">
                  {!record.checkOutTime ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                      Check-out not recorded yet
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="text-gray-500">Time</span>
                        <p className="font-medium text-gray-800">{fmtDateTime(record.checkOutTime)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">GPS</span>
                        <p className="font-mono text-xs text-gray-800">
                          {record.checkOutLocation?.latitude != null &&
                          record.checkOutLocation?.longitude != null
                            ? `${record.checkOutLocation.latitude}, ${record.checkOutLocation.longitude}`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Face</span>
                        <div className="mt-1">
                          {record.checkOutFaceMatch === true ? (
                            <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              ✓ Matched
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              ✗ No Match
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">After Photo</p>
                        {afterSrc ? (
                          <a href={afterSrc} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                            <img
                              src={afterSrc}
                              alt="After"
                              className="mt-2 max-h-48 w-full rounded-xl object-cover"
                            />
                          </a>
                        ) : (
                          <div className="mt-2 flex min-h-[100px] items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400">
                            No photo uploaded
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {record.flagReasons?.length > 0 && (
                  <div className="mx-4 mt-6">
                    <div className="mb-2 flex items-center gap-2 font-semibold text-amber-700">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      Flags Raised
                    </div>
                    <ul className="space-y-2">
                      {record.flagReasons.map((reason, i) => (
                        <li
                          key={`${i}-${reason}`}
                          className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                        >
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs italic text-gray-400">
                      Team lead has been notified of these flags
                    </p>
                  </div>
                )}

                {record.checkInTime && record.checkOutTime && (
                  <div className="mx-4 mb-8 mt-6 border-l-4 border-[#005F02] bg-white p-4 shadow-sm">
                    <p className="text-sm text-gray-500">Total Duration</p>
                    <p className="text-2xl font-bold text-[#005F02]">
                      {durationLabel(record.checkInTime, record.checkOutTime) || '—'}
                    </p>
                  </div>
                )}
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
