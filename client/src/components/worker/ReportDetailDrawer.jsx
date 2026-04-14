import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

function uploadsBaseUrl() {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return raw.replace(/\/api\/?$/, '');
}

function resolveReportImageSrc(stored) {
  if (!stored) return null;
  if (String(stored).startsWith('http')) return stored;
  const base = uploadsBaseUrl();
  const s = String(stored).replace(/^\//, '');
  if (s.startsWith('uploads/')) return `${base}/${s}`;
  if (s.startsWith('reports/')) return `${base}/uploads/${s}`;
  return `${base}/uploads/reports/${s}`;
}

function fmtTaskDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  return x.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function statusBadgeClass(status) {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-[#eff6ff] text-[#2563eb]';
    case 'APPROVED':
      return 'bg-[#f0fdf4] text-[#16a34a]';
    case 'REJECTED':
      return 'bg-[#fef2f2] text-[#dc2626]';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function ReportDetailDrawer({ isOpen, onClose, report, loading }) {
  const task = report?.task;
  const images = Array.isArray(report?.images) ? report.images : [];

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
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-100 bg-white p-4">
              <h2 className="font-bold text-[#005F02]">Report Detail</h2>
              <div className="flex items-center gap-2">
                {report?.status && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(report.status)}`}
                  >
                    {report.status}
                  </span>
                )}
                <button
                  type="button"
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {loading && (
              <div className="p-8 text-center text-sm text-gray-500">Loading…</div>
            )}

            {!loading && report && (
              <div className="space-y-6 p-4 pb-10">
                <div className="rounded-xl bg-[#f7f9f7] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Task</p>
                  <p className="mt-1 font-semibold text-gray-800">{task?.title || '—'}</p>
                  <p className="mt-2 text-sm text-gray-600">{task?.locationName || '—'}</p>
                  <p className="mt-1 text-sm text-gray-600">{fmtTaskDate(task?.date)}</p>
                  <p className="mt-1 text-sm text-gray-600">{task?.workType || '—'}</p>
                </div>

                <div>
                  <h3 className="border-l-4 border-[#005F02] pl-3 font-semibold text-[#005F02]">Description</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-700">{report.description || '—'}</p>
                </div>

                {report.summary ? (
                  <div>
                    <h3 className="border-l-4 border-[#005F02] pl-3 font-semibold text-[#005F02]">Summary</h3>
                    <p className="mt-2 text-sm italic text-gray-600">{report.summary}</p>
                  </div>
                ) : null}

                <div>
                  <h3 className="mb-3 font-semibold text-[#005F02]">Field Photos</h3>
                  {images.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {images.map((path) => {
                        const src = resolveReportImageSrc(path);
                        return (
                          <button
                            key={path}
                            type="button"
                            className="block w-full overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005F02]"
                            onClick={() => src && window.open(src, '_blank', 'noopener,noreferrer')}
                          >
                            {src ? (
                              <img
                                src={src}
                                alt=""
                                className="h-32 w-full object-cover"
                              />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No photos attached</p>
                  )}
                </div>

                {report.status && report.status !== 'SUBMITTED' && (
                  <div>
                    <h3 className="mb-2 font-semibold text-[#005F02]">Review</h3>
                    <p className="text-sm text-gray-600">
                      Reviewed by:{' '}
                      <span className="font-medium text-gray-800">
                        {report.reviewedBy?.fullName || '—'}
                      </span>
                    </p>
                    <div className="mt-2">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${statusBadgeClass(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </span>
                    </div>
                    {report.reviewNote ? (
                      <p className="mt-3 text-sm italic text-gray-600">{report.reviewNote}</p>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
