/**
 * orbis-reframe ExportOptionsDialog
 * Matches Schabo/orbis-reframe File -> Export flat video… (Ctrl+E)
 * Supports:
 * - Saving a previously recorded OpenOSV Free-Look session (.webm)
 * - Exporting with Free-Look Viewpoint Lock (either locked/recorded pass OR live interactive mouse steering!)
 * - Exporting interpolated timeline keyframes
 * - Capturing composited WebGL 360° + Colour LUT/EV + FPV HUD + Titles + Mixed Audio
 */

import React, { useState, useRef } from 'react';
import { Download, X, CheckCircle2, Upload, Compass, Square } from 'lucide-react';
import { ExportSettings, OSVFileMetadata, CameraControlMode } from '../../types/editor';
import { OrbisThemeColors } from '../../services/osvStitcher';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: OrbisThemeColors;
  activeFile: OSVFileMetadata | null;
  totalDuration: number;
  cameraControlMode: CameraControlMode;
  onCameraControlModeChange: (mode: CameraControlMode) => void;
  lastRecordedFreeLookUrl: string | null;
  onDownloadLastFreeLookRecording: () => void;
  captureCompositeStream?: (
    fps: number,
    includeHUD: boolean,
    includeAudio: boolean
  ) => { stream: MediaStream; stopCompositor: () => void } | null;
  onStartPlaybackForCapture?: () => void;
  onStopPlaybackAfterCapture?: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  theme,
  activeFile,
  totalDuration,
  cameraControlMode,
  onCameraControlModeChange,
  lastRecordedFreeLookUrl,
  onDownloadLastFreeLookRecording,
  captureCompositeStream,
  onStartPlaybackForCapture,
  onStopPlaybackAfterCapture
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    resolution: '4K',
    aspectRatio: '16:9',
    fps: 60,
    format: 'webm',
    quality: 'ultra',
    encoder: 'VA-API (Linux/Intel/AMD)',
    cameraSource: cameraControlMode === 'free-look' ? 'free-look-live' : 'keyframes',
    includeHUD: true,
    includeAudio: true
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopCompositorRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);

  if (!isOpen) return null;

  const stopActiveCapture = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      stopCompositorRef.current?.();
      stopCompositorRef.current = null;
      onStopPlaybackAfterCapture?.();
    }
    setIsExporting(false);
    setIsComplete(true);
    setProgress(100);
  };

  const startExport = () => {
    // Sync camera control mode to chosen framing source
    if (settings.cameraSource === 'keyframes') {
      onCameraControlModeChange('keyframes');
    } else {
      onCameraControlModeChange('free-look');
    }

    setIsExporting(true);
    setProgress(0);
    setLiveSeconds(0);
    setIsComplete(false);
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
      setRecordedBlobUrl(null);
    }

    const chunks: BlobPart[] = [];
    let mediaRecorder: MediaRecorder | null = null;

    const comp = captureCompositeStream?.(
      settings.fps,
      settings.includeHUD,
      settings.includeAudio
    );

    const fallbackCanvas = document.querySelector(
      'canvas[data-viewport-canvas="true"]'
    ) as HTMLCanvasElement | null;

    const stream =
      comp?.stream ||
      (fallbackCanvas && typeof fallbackCanvas.captureStream === 'function'
        ? fallbackCanvas.captureStream(settings.fps)
        : null);

    if (comp) {
      stopCompositorRef.current = comp.stopCompositor;
    }

    if (stream && typeof MediaRecorder !== 'undefined') {
      try {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 14_000_000 })
          : new MediaRecorder(stream);
        recorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = () => {
          stopCompositorRef.current?.();
          stopCompositorRef.current = null;
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: 'video/webm' });
            setRecordedBlobUrl(URL.createObjectURL(blob));
          }
          onStopPlaybackAfterCapture?.();
        };

        onStartPlaybackForCapture?.();
        mediaRecorder.start(100);
      } catch {
        mediaRecorder = null;
      }
    }

    if (settings.cameraSource === 'free-look-live') {
      // Live interactive Free-Look capture: keep recording while user pans/tilts/locks viewpoint live!
      const startedAt = performance.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = (performance.now() - startedAt) / 1000;
        setLiveSeconds(elapsed);
        const pct = Math.min(99, Math.round((elapsed / Math.max(5, totalDuration)) * 100));
        setProgress(pct);
        if (elapsed >= totalDuration) {
          stopActiveCapture();
        }
      }, 200);
    } else {
      timerRef.current = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            stopActiveCapture();
            return 100;
          }
          return p + 4;
        });
      }, 90);
    }
  };

  const handleDownload = () => {
    const base = activeFile?.fileName.replace(/\.[^/.]+$/, '') || 'Export';
    const a = document.createElement('a');
    if (recordedBlobUrl) {
      a.href = recordedBlobUrl;
      a.download = `${base}_${
        settings.cameraSource === 'keyframes' ? 'reframed' : 'freelook'
      }_${settings.resolution}_${settings.fps}fps.webm`;
    } else {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exporter: 'orbis-reframe',
              source: activeFile?.fileName,
              settings,
              durationSeconds: totalDuration
            },
            null,
            2
          )
        ],
        { type: 'application/json' }
      );
      a.href = URL.createObjectURL(blob);
      a.download = `${base}_export.json`;
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onClose();
  };

  const handleClose = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else {
      stopCompositorRef.current?.();
      stopCompositorRef.current = null;
    }
    setIsExporting(false);
    setIsComplete(false);
    setProgress(0);
    onClose();
  };

  const selectStyle = {
    backgroundColor: theme.button,
    borderColor: theme.border,
    color: theme.text
  };

  // Non-blocking floating HUD bar when steering Free Look live during export!
  if (isExporting && settings.cameraSource === 'free-look-live') {
    return (
      <div
        style={{
          backgroundColor: theme.panel,
          borderColor: theme.accent,
          color: theme.text
        }}
        className="fixed top-10 right-4 z-50 border rounded-[6px] shadow-2xl px-4 py-3 w-88 space-y-2 text-[12px] select-none"
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold flex items-center gap-1.5" style={{ color: theme.accent }}>
            <Compass className="w-4 h-4" />
            Recording Free-Look export ({Math.floor(liveSeconds / 60).toString().padStart(2, '0')}:
            {Math.floor(liveSeconds % 60).toString().padStart(2, '0')})
          </span>
          <button onClick={handleClose} style={{ color: theme.icon }} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p style={{ color: theme.textDim }} className="text-[11.5px] leading-snug">
          Drag in the 360° viewer below to steer the camera live. Releasing locks that fixed viewpoint until you move again.
        </p>
        <button
          onClick={stopActiveCapture}
          style={{ backgroundColor: theme.accent, color: theme.textOnAccent }}
          className="w-full py-1.5 rounded-[4px] font-semibold flex items-center justify-center gap-1.5"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Finish & prepare download</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.panel,
          borderColor: theme.border,
          color: theme.text
        }}
        className="border rounded-[6px] max-w-md w-full overflow-hidden shadow-2xl text-[12.5px]"
      >
        <div
          style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
          className="px-4 py-2.5 border-b flex items-center justify-between"
        >
          <span className="font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" style={{ color: theme.accent }} />
            Export flat video
          </span>
          <button
            onClick={handleClose}
            disabled={isExporting}
            style={{ color: theme.icon }}
            className="p-0.5 hover:text-white disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {!isExporting && !isComplete && (
            <>
              {lastRecordedFreeLookUrl && (
                <div
                  style={{
                    backgroundColor: theme.accentSoft,
                    borderColor: `${theme.accent}80`
                  }}
                  className="p-2.5 rounded-[4px] border flex items-center justify-between gap-3"
                >
                  <div className="text-[11.5px]">
                    <div className="font-semibold" style={{ color: theme.accent }}>
                      Free-Look recording ready
                    </div>
                    <div style={{ color: theme.textDim }}>
                      Captured from your live 360° viewer session
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onDownloadLastFreeLookRecording();
                      onClose();
                    }}
                    style={{ backgroundColor: theme.accent, color: theme.textOnAccent }}
                    className="px-3 py-1 rounded-[4px] font-semibold flex items-center gap-1 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save .webm</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <span style={{ color: theme.textDim }}>Camera mode</span>
                <select
                  value={settings.cameraSource || 'free-look-live'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      cameraSource: e.target.value as ExportSettings['cameraSource']
                    })
                  }
                  style={selectStyle}
                  className="px-2.5 py-1 rounded-[4px] border"
                >
                  <option value="free-look-live">
                    Free look — Steer live in viewer while recording
                  </option>
                  <option value="free-look-locked">
                    Free look — Current locked viewpoint / recorded pass
                  </option>
                  <option value="keyframes">Timeline keyframes (Interpolated)</option>
                </select>
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <span style={{ color: theme.textDim }}>Resolution</span>
                <select
                  value={settings.resolution}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      resolution: e.target.value as ExportSettings['resolution']
                    })
                  }
                  style={selectStyle}
                  className="px-2.5 py-1 rounded-[4px] border"
                >
                  <option value="4K">3840×2160 (4K UHD)</option>
                  <option value="1080p">1920×1080 (1080p)</option>
                  <option value="vertical_1080p">1080×1920 (9:16 Vertical)</option>
                  <option value="720p">1280×720 (720p)</option>
                </select>
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <span style={{ color: theme.textDim }}>Frame rate</span>
                <select
                  value={settings.fps}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fps: Number(e.target.value) as 60 | 30 | 24
                    })
                  }
                  style={selectStyle}
                  className="px-2.5 py-1 rounded-[4px] border"
                >
                  <option value={60}>60 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={24}>24 fps</option>
                </select>
              </div>

              <div className="grid grid-cols-[110px_1fr] items-center gap-3">
                <span style={{ color: theme.textDim }}>Hardware encoder</span>
                <select
                  value={settings.encoder}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      encoder: e.target.value as ExportSettings['encoder']
                    })
                  }
                  style={selectStyle}
                  className="px-2.5 py-1 rounded-[4px] border"
                >
                  <option value="VA-API (Linux/Intel/AMD)">VA-API (Fedora Linux Intel/AMD)</option>
                  <option value="NVENC (NVIDIA)">NVENC (NVIDIA)</option>
                  <option value="WebM VP9 Live Capture">WebM VP9 Software</option>
                </select>
              </div>

              <div className="pl-[122px] space-y-1.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeHUD}
                    onChange={(e) => setSettings({ ...settings, includeHUD: e.target.checked })}
                    className="accent-[#f5a04a]"
                  />
                  <span>Burn in overlays, titles & telemetry gauges</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeAudio}
                    onChange={(e) => setSettings({ ...settings, includeAudio: e.target.checked })}
                    className="accent-[#f5a04a]"
                  />
                  <span>Include mixed audio tracks</span>
                </label>
              </div>
            </>
          )}

          {isExporting && (
            <div className="py-6 space-y-2.5 text-center">
              <div className="font-medium">Rendering flat video… {progress}%</div>
              <div
                style={{ backgroundColor: theme.window, borderColor: theme.border }}
                className="w-full h-2 rounded-full border overflow-hidden"
              >
                <div
                  style={{ width: `${progress}%`, backgroundColor: theme.accent }}
                  className="h-full transition-all duration-100"
                />
              </div>
              <div className="text-[11px]" style={{ color: theme.textDim }}>
                {settings.encoder} · {settings.fps} fps
              </div>
            </div>
          )}

          {isComplete && (
            <div className="py-5 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="w-8 h-8" style={{ color: theme.accent }} />
              <div className="font-semibold">Export finished</div>
              <div className="text-[11.5px]" style={{ color: theme.textDim }}>
                Flattened video ready to save ({settings.resolution} · {settings.fps} fps).
              </div>
            </div>
          )}
        </div>

        <div
          style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
          className="px-4 py-2.5 border-t flex items-center justify-end gap-2"
        >
          {!isExporting && !isComplete && (
            <>
              <button
                onClick={handleClose}
                style={{ backgroundColor: theme.button, borderColor: theme.border }}
                className="px-3.5 py-1 rounded-[4px] border"
              >
                Cancel
              </button>
              <button
                onClick={startExport}
                style={{ backgroundColor: theme.accent, color: theme.textOnAccent }}
                className="px-4 py-1 rounded-[4px] font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {settings.cameraSource === 'free-look-live'
                    ? 'Start live Free-Look export'
                    : 'Export…'}
                </span>
              </button>
            </>
          )}

          {isComplete && (
            <button
              onClick={handleDownload}
              style={{ backgroundColor: theme.accent, color: theme.textOnAccent }}
              className="w-full py-1.5 rounded-[4px] font-semibold flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save flat video (.webm)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
