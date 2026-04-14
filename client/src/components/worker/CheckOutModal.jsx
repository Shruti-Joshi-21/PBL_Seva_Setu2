import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  MapPin,
  Camera,
  ImagePlus,
  X,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import api from "../../utils/api";
import StepIndicator from './StepIndicator';

const STEPS = ['GPS Location', 'Face Capture', 'After Photo', 'Confirm'];

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: 'image/jpeg' });
}

export default function CheckOutModal({ isOpen, onClose, task, attendanceRecord, onSuccess }) {
  const [step, setStep] = useState(0);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState('');
  const [gpsData, setGpsData] = useState(null);
  const [distanceM, setDistanceM] = useState(null);
  const [inRange, setInRange] = useState(true);

  const webcamRef = useRef(null);
  const fieldInputRef = useRef(null);
  const [camDenied, setCamDenied] = useState(false);
  const [facePreview, setFacePreview] = useState(null);
  const [faceImageFile, setFaceImageFile] = useState(null);

  const [fieldImageFile, setFieldImageFile] = useState(null);
  const [fieldPreviewUrl, setFieldPreviewUrl] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setGpsLoading(true);
      setGpsError('');
      setGpsData(null);
      setDistanceM(null);
      setInRange(true);
      setCamDenied(false);
      setFacePreview(null);
      setFaceImageFile(null);
      setFieldImageFile(null);
      setFieldPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setSubmitting(false);
      setResult(null);
    }
  }, [isOpen]);

  const captureGps = useCallback(() => {
    if (!isOpen || !task) return;
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setGpsData({ latitude, longitude });
        const d = getDistanceMeters(latitude, longitude, task.latitude, task.longitude);
        setDistanceM(Math.round(d));
        setInRange(d <= task.allowedRadius);
        setGpsLoading(false);
      },
      () => {
        setGpsError('Could not get location. Please enable GPS and try again.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [isOpen, task]);

  useEffect(() => {
    if (isOpen && step === 0 && task) {
      captureGps();
    }
  }, [isOpen, step, task, captureGps]);

  const handleCaptureFace = async () => {
    const shot = webcamRef.current?.getScreenshot();
    if (!shot) return;
    setFacePreview(shot);
    const file = await dataUrlToFile(shot, 'face.jpg');
    setFaceImageFile(file);
  };

  const handleFieldFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFieldPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFieldImageFile(file);
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!attendanceRecord?._id || !gpsData || !faceImageFile || !fieldImageFile) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('attendanceId', attendanceRecord._id);
      formData.append('latitude', String(gpsData.latitude));
      formData.append('longitude', String(gpsData.longitude));
      formData.append('faceImage', faceImageFile);
      formData.append('fieldImage', fieldImageFile);

      const res = await api.post('/worker/checkout', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data?.data ?? {};
      setResult({
        ...data,
        message: res.data?.message || data.message,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseResult = () => {
    if (result && onSuccess) onSuccess(result);
    onClose();
  };

  const existingFlags = attendanceRecord?.flagReasons?.length
    ? attendanceRecord.flagReasons
    : [];

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative mt-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            style={{ maxHeight: '90vh' }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>

            {(!task || !attendanceRecord) && (
              <p className="text-center text-gray-600">Missing task or attendance record.</p>
            )}

            {task && attendanceRecord && result && (
              <div className="space-y-6 pt-2 text-center">
                {result.finalStatus === 'FLAGGED' ? (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                      className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-100"
                    >
                      <AlertTriangle className="h-12 w-12 text-amber-600" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-amber-700">Checked Out with Flags</h3>
                    <ul className="space-y-2 text-left">
                      {(result.flagReasons || []).map((r, i) => (
                        <li key={`${i}-${r}`} className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                          {r}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                      className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#005F02]"
                    >
                      <CheckCircle2 className="h-12 w-12 text-white" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-[#005F02]">Attendance Verified!</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        In:{' '}
                        {result.checkInTime
                          ? new Date(result.checkInTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                          : '—'}
                      </p>
                      <p>
                        Out:{' '}
                        {result.checkOutTime
                          ? new Date(result.checkOutTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })
                          : '—'}
                      </p>
                    </div>
                    <p className="text-gray-500">Great work today!</p>
                  </>
                )}
                <button
                  type="button"
                  className="w-full rounded-2xl bg-[#005F02] py-3 font-semibold text-white hover:opacity-95"
                  onClick={handleCloseResult}
                >
                  Close
                </button>
              </div>
            )}

            {task && attendanceRecord && !result && (
              <>
                <h2 className="pr-8 text-lg font-bold text-[#005F02]">Check Out</h2>
                <div className="mb-6 mt-4">
                  <StepIndicator steps={STEPS} currentStep={step} />
                </div>

                <div className="max-h-[calc(90vh-12rem)] overflow-y-auto pr-1">
                  {step === 0 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-gray-900">Capturing Your Location</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#F2E3BB] px-3 py-1 text-xs font-medium text-[#005F02]">
                          {task.title}
                        </span>
                        <span className="rounded-full bg-[#f7f9f7] px-3 py-1 text-xs text-gray-600">
                          {task.locationName}
                        </span>
                      </div>
                      {gpsLoading && (
                        <div className="flex flex-col items-center py-8">
                          <div className="relative flex h-24 w-24 items-center justify-center">
                            {[0, 1, 2].map((i) => (
                              <motion.span
                                key={i}
                                className="absolute rounded-full border-2 border-[#005F02]/30"
                                style={{ width: 48 + i * 28, height: 48 + i * 28 }}
                                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2.2, delay: i * 0.25 }}
                              />
                            ))}
                            <MapPin className="relative z-10 h-10 w-10 text-[#005F02]" />
                          </div>
                          <p className="mt-4 text-sm text-gray-600">Fetching GPS coordinates...</p>
                        </div>
                      )}
                      {!gpsLoading && gpsError && (
                        <div className="space-y-3">
                          <p className="text-sm text-red-600">{gpsError}</p>
                          <button
                            type="button"
                            className="w-full rounded-xl bg-[#005F02] py-2.5 font-medium text-white"
                            onClick={captureGps}
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      {!gpsLoading && gpsData && !gpsError && (
                        <div className="space-y-4">
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex justify-center"
                          >
                            <CheckCircle2 className="h-14 w-14 text-green-600" />
                          </motion.div>
                          <p className="font-mono text-sm text-gray-600">
                            Lat: {gpsData.latitude.toFixed(5)}, Lng: {gpsData.longitude.toFixed(5)}
                          </p>
                          {inRange ? (
                            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                              ✓ Within range ({distanceM}m)
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                              ⚠ {distanceM}m from site (limit: {task.allowedRadius}m) — will be flagged
                            </span>
                          )}
                          <button
                            type="button"
                            className="w-full rounded-xl bg-[#005F02] py-3 font-semibold text-white"
                            onClick={() => setStep(1)}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-gray-900">Verify Your Identity</h3>
                      <p className="text-sm text-gray-500">Look at the camera and click capture</p>
                      {camDenied ? (
                        <div className="flex flex-col items-center py-8 text-center">
                          <Camera className="mb-2 h-12 w-12 text-red-400" />
                          <p className="text-sm text-red-600">
                            Camera access denied. Please allow camera permissions.
                          </p>
                        </div>
                      ) : !facePreview ? (
                        <>
                          <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            mirrored
                            videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
                            onUserMediaError={() => setCamDenied(true)}
                            className="aspect-[4/3] w-full rounded-xl bg-black object-cover"
                          />
                          <button
                            type="button"
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#005F02] py-3 font-semibold text-white"
                            onClick={handleCaptureFace}
                          >
                            <Camera className="h-5 w-5" />
                            Capture
                          </button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <img
                            src={facePreview}
                            alt="Face capture"
                            className="aspect-[4/3] w-full rounded-xl border-4 border-green-500 object-cover"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="flex-1 rounded-xl border-2 border-gray-300 py-2.5 font-medium text-gray-700"
                              onClick={() => {
                                setFacePreview(null);
                                setFaceImageFile(null);
                              }}
                            >
                              Retake
                            </button>
                            <button
                              type="button"
                              className="flex-1 rounded-xl bg-[#005F02] py-2.5 font-semibold text-white"
                              onClick={() => setStep(2)}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-gray-900">Upload After Photo</h3>
                      <p className="text-sm text-gray-500">
                        Take a photo of the field AFTER completing work
                      </p>
                      <input
                        ref={fieldInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFieldFile}
                      />
                      {!fieldPreviewUrl ? (
                        <button
                          type="button"
                          onClick={() => fieldInputRef.current?.click()}
                          className="flex min-h-[200px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-[#f7f9f7] transition-colors hover:border-[#427A43]"
                        >
                          <ImagePlus className="mb-2 h-14 w-14 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Tap to capture or upload field photo
                          </span>
                        </button>
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 shadow"
                            onClick={() => {
                              setFieldPreviewUrl((prev) => {
                                if (prev) URL.revokeObjectURL(prev);
                                return null;
                              });
                              setFieldImageFile(null);
                            }}
                            aria-label="Remove photo"
                          >
                            <X className="h-4 w-4 text-gray-700" />
                          </button>
                          <img
                            src={fieldPreviewUrl}
                            alt="Field"
                            className="max-h-64 w-full rounded-2xl object-cover"
                          />
                          <p className="mt-2 text-sm text-gray-500">
                            {fieldImageFile?.name} ({Math.round((fieldImageFile?.size || 0) / 1024)} KB)
                          </p>
                          <button
                            type="button"
                            className="mt-3 w-full rounded-xl bg-[#005F02] py-3 font-semibold text-white"
                            onClick={() => setStep(3)}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-base font-semibold text-gray-900">Review & Check Out</h3>
                      <div className="rounded-xl bg-[#f7f9f7] p-4 text-sm space-y-2">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Task</span>
                          <span className="font-medium text-gray-900 text-right">{task.title}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Location</span>
                          <span className="text-gray-800 text-right">{task.locationName}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Checked In At</span>
                          <span className="text-gray-800">
                            {attendanceRecord.checkInTime
                              ? new Date(attendanceRecord.checkInTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true,
                              })
                              : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Time</span>
                          <span className="text-gray-800">
                            {new Date().toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2 items-center">
                          <span className="text-gray-500">GPS</span>
                          {inRange ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              ✓ Within range ({distanceM}m)
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                              ⚠ {distanceM}m — flagged
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between gap-2 items-center">
                          <span className="text-gray-500">Face</span>
                          <span className="text-green-700 font-medium">Captured ✓</span>
                        </div>
                        <div className="flex justify-between gap-2 items-center">
                          <span className="text-gray-500">Field Photo</span>
                          {fieldPreviewUrl && (
                            <img
                              src={fieldPreviewUrl}
                              alt=""
                              className="h-10 w-10 rounded-md object-cover"
                            />
                          )}
                        </div>
                      </div>
                      {existingFlags.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <span className="font-medium">Existing flags from check-in: </span>
                          {existingFlags.join(', ')}
                        </div>
                      )}
                      {!inRange && (
                        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                          <p>
                            Your location was flagged. Check-out will be submitted but team lead will be
                            notified.
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#dc2626] py-4 text-lg font-bold text-white disabled:opacity-60"
                        onClick={handleSubmit}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin" />
                            Checking out...
                          </>
                        ) : (
                          'CHECK OUT'
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {step > 0 && !result && (
                  <button
                    type="button"
                    className="mt-4 w-full text-sm text-gray-500 hover:text-gray-800"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                  >
                    Back
                  </button>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
