import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Flashlight,
  Check,
  AlertTriangle,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { enqueueOfflineUpload, isDeviceOnline } from '../../lib/offlineQueue';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureComplete: (files: File[]) => void;
}

interface CapturedPage {
  id: string;
  blob: Blob;
  dataUrl: string;
  sizeKb: number;
  quality: {
    blurScore: number;
    brightness: number;
    glarePct: number;
    warnings: string[];
    isAcceptable: boolean;
  };
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCaptureComplete,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [capturedPages, setCapturedPages] = useState<CapturedPage[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [online, setOnline] = useState<boolean>(isDeviceOnline());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }

      const track = mediaStream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
      setHasTorch(Boolean(capabilities && capabilities.torch));
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError(
        'Camera access unavailable. Grant camera permissions in your browser or upload a PDF/image file.'
      );
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
      setCapturedPages([]);
      setTorchOn(false);
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const nextTorch = !torchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const evaluateQuality = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): CapturedPage['quality'] => {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let totalBrightness = 0;
    let glarePixels = 0;

    const sampleStep = 4;
    let sampledCount = 0;
    const grayscale: number[] = [];

    for (let i = 0; i < data.length; i += 4 * sampleStep) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += lum;
      if (r > 248 && g > 248 && b > 248) {
        glarePixels++;
      }
      grayscale.push(lum);
      sampledCount++;
    }

    const avgBrightness = totalBrightness / sampledCount;
    const glarePct = (glarePixels / sampledCount) * 100;

    let meanLum = 0;
    for (let i = 0; i < grayscale.length; i++) {
      meanLum += grayscale[i];
    }
    meanLum /= grayscale.length;

    let variance = 0;
    for (let i = 0; i < grayscale.length; i++) {
      variance += Math.pow(grayscale[i] - meanLum, 2);
    }
    const blurScore = Math.round(variance / grayscale.length);

    const warnings: string[] = [];
    if (blurScore < 120) {
      warnings.push('Image may be blurry. Hold steady for clean OCR.');
    }
    if (avgBrightness < 45) {
      warnings.push('Low light detected. Enable flashlight or improve lighting.');
    }
    if (glarePct > 15) {
      warnings.push('Paper glare detected. Tilt slightly away from overhead lights.');
    }

    return {
      blurScore,
      brightness: Math.round(avgBrightness),
      glarePct: Math.round(glarePct),
      warnings,
      isAcceptable: warnings.length === 0,
    };
  };

  const captureFrame = async () => {
    if (!videoRef.current || isProcessing) return;
    setIsProcessing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');

      const maxDim = 1920;
      let targetW = video.videoWidth || 1280;
      let targetH = video.videoHeight || 720;

      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, targetW, targetH);
      const quality = evaluateQuality(ctx, targetW, targetH);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.82);
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const pageId = `page_${Date.now()}_${capturedPages.length + 1}`;

      const newPage: CapturedPage = {
        id: pageId,
        blob,
        dataUrl,
        sizeKb: Math.round(blob.size / 1024),
        quality,
      };

      setCapturedPages((prev) => [...prev, newPage]);
    } catch (err) {
      console.error('Frame capture error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const removePage = (id: string) => {
    setCapturedPages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleFinish = async () => {
    if (capturedPages.length === 0) return;

    const files = capturedPages.map(
      (p, idx) =>
        new File([p.blob], `mtc_capture_page_${idx + 1}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
    );

    if (!online) {
      for (const file of files) {
        await enqueueOfflineUpload(file, file.name, {
          pageCount: files.length,
          notes: 'Captured via Mobile Camera Offline Mode',
        });
      }
    }

    onCaptureComplete(files);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-zinc-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-scanner-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0A0C10] border border-white/[0.1] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh] text-[#F4F4F5]"
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-[#111318] border-b border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#181B22] border border-white/[0.08] flex items-center justify-center text-[#34D399] shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="camera-scanner-title" className="text-sm font-semibold text-[#F4F4F5]">
                  Mill Certificate Scanner
                </h3>
                {online ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-[#34D399] bg-[#059669]/15 border border-[#059669]/30 px-2 py-0.5 rounded-md">
                    <Wifi className="w-3 h-3" />
                    <span>Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                    <WifiOff className="w-3 h-3" />
                    <span>Offline Queue</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A1A1AA] truncate">
                EN 10204 3.1 optical acquisition · auto quality check
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#181B22] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewfinder */}
        <div className="relative flex-1 bg-black min-h-[320px] sm:min-h-[380px] flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-md space-y-3">
              <div className="w-11 h-11 mx-auto rounded-lg bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-xs text-[#F4F4F5] leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera Permission</span>
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Document Framing Guide */}
              <div className="absolute inset-6 sm:inset-10 border border-emerald-400/40 rounded-lg pointer-events-none flex flex-col justify-between p-3">
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-t-2 border-l-2 border-[#34D399]" />
                  <div className="w-5 h-5 border-t-2 border-r-2 border-[#34D399]" />
                </div>

                <div className="text-center font-mono text-xs text-[#F4F4F5] bg-[#0A0C10]/80 border border-white/[0.12] px-3 py-1 rounded-md mx-auto">
                  Align Mill Test Certificate Inside Frame
                </div>

                <div className="flex justify-between">
                  <div className="w-5 h-5 border-b-2 border-l-2 border-[#34D399]" />
                  <div className="w-5 h-5 border-b-2 border-r-2 border-[#34D399]" />
                </div>
              </div>

              {/* Viewfinder Controls */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      torchOn
                        ? 'bg-[#D97706] text-white border-[#D97706]'
                        : 'bg-[#111318]/90 text-[#F4F4F5] border-white/[0.12] hover:bg-[#181B22]'
                    }`}
                    title="Toggle Flashlight"
                  >
                    <Flashlight className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={flipCamera}
                  className="p-2.5 rounded-lg bg-[#111318]/90 text-[#F4F4F5] border border-white/[0.12] hover:bg-[#181B22] transition-colors cursor-pointer"
                  title="Switch Front/Rear Camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Captured Pages Thumbnail Strip */}
        {capturedPages.length > 0 && (
          <div className="px-4 py-3 bg-[#111318] border-t border-white/[0.08] flex items-center gap-2.5 overflow-x-auto">
            <span className="text-xs font-mono text-[#A1A1AA] whitespace-nowrap">
              Staged ({capturedPages.length}):
            </span>
            {capturedPages.map((page, index) => (
              <div
                key={page.id}
                className="relative group shrink-0 w-16 h-20 rounded-lg overflow-hidden border border-white/[0.12] bg-[#0A0C10]"
              >
                <img
                  src={page.dataUrl}
                  alt={`Captured page ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 inset-x-0 bg-[#0A0C10]/85 text-xs font-mono text-center text-[#F4F4F5] py-0.5">
                  P{index + 1}
                </span>

                {page.quality.warnings.length > 0 && (
                  <div
                    className="absolute top-1 left-1 w-4 h-4 rounded bg-[#D97706] flex items-center justify-center text-white"
                    title={page.quality.warnings.join(' ')}
                  >
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removePage(page.id)}
                  className="absolute top-1 right-1 p-1 rounded bg-[#DC2626] text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Remove page"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Shutter & Action Footer */}
        <div className="px-5 py-3.5 bg-[#111318] border-t border-white/[0.08] flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-[#A1A1AA]">
            {capturedPages.length === 0
              ? 'Ready for Page 1'
              : `${capturedPages.length} page${capturedPages.length > 1 ? 's' : ''} staged`}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={captureFrame}
              disabled={isProcessing || !!cameraError}
              className="h-10 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs inline-flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              title="Capture Document Page"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Page</span>
            </button>

            <button
              type="button"
              onClick={handleFinish}
              disabled={capturedPages.length === 0}
              className="h-10 px-4 rounded-lg bg-[#181B22] hover:bg-[#27272A] text-[#F4F4F5] border border-white/[0.12] font-medium text-xs inline-flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4 text-[#34D399]" />
              <span>{online ? 'Send to Workbench' : 'Save Offline'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
