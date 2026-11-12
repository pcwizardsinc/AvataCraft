/**
 * orbis-reframe PlayerBar
 * Faithful port of Schabo/orbis-reframe/src/ui/PlayerBar.cpp:
 * - Row 1: Tabular timecode "00:00:00:00 / 00:02:56:01" (click to edit) | Slim Ember progress groove with cut ticks & playhead dot | Playback speed "1×"
 * - Row 2: Centered [ |<  |<|  <  ▶  >  |>|  >| ] transport | Right [ Camera  Volume+EmberSlider  Fullscreen ]
 */

import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  ChevronFirst,
  ChevronLast,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Camera,
  Volume2,
  VolumeX,
  Maximize,
  Compass,
  Circle,
  Square,
  Download
} from 'lucide-react';
import { Keyframe360, CameraControlMode } from '../../types/editor';
import { OrbisThemeColors } from '../../services/osvStitcher';

interface OrbisKeyframeRibbonProps {
  currentTime: number;
  totalDuration: number;
  fps: number;
  isPlaying: boolean;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  previewVolume: number;
  isMuted: boolean;
  onPreviewVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  cutTimes: number[];
  keyframes: Keyframe360[];
  theme: OrbisThemeColors;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onStepFrame: (direction: -1 | 1) => void;
  onJumpCutOrKey: (direction: -1 | 1) => void;
  onScreenshot: () => void;
  onToggleFullscreen: () => void;
  cameraControlMode: CameraControlMode;
  onToggleCameraControlMode: () => void;
  isRecordingFreeLook: boolean;
  recordingSeconds: number;
  hasRecordedFreeLookVideo: boolean;
  onToggleRecordFreeLook: () => void;
  onDownloadRecordedFreeLook: () => void;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4];

export const OrbisKeyframeRibbon: React.FC<OrbisKeyframeRibbonProps> = ({
  currentTime,
  totalDuration,
  fps,
  isPlaying,
  playbackRate,
  onPlaybackRateChange,
  previewVolume,
  isMuted,
  onPreviewVolumeChange,
  onToggleMute,
  cutTimes,
  keyframes,
  theme,
  onTogglePlay,
  onSeek,
  onStepFrame,
  onJumpCutOrKey,
  onScreenshot,
  onToggleFullscreen,
  cameraControlMode,
  onToggleCameraControlMode,
  isRecordingFreeLook,
  recordingSeconds,
  hasRecordedFreeLookVideo,
  onToggleRecordFreeLook,
  onDownloadRecordedFreeLook
}) => {
  const [editingTime, setEditingTime] = useState(false);
  const [timeDraft, setTimeDraft] = useState('');
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const grooveRef = useRef<HTMLDivElement>(null);

  const formatHhMmSsFf = (sec: number) => {
    const safe = Math.max(0, sec);
    const totalSec = Math.floor(safe);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const f = Math.floor((safe - totalSec) * fps);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };

  const commitTimeEdit = () => {
    setEditingTime(false);
    const raw = timeDraft.trim();
    if (!raw) return;
    const parts = raw.split(':').map((p) => Number(p));
    if (parts.some((n) => Number.isNaN(n))) return;
    let targetSec = 0;
    if (parts.length === 1) {
      targetSec = parts[0];
    } else if (parts.length === 2) {
      targetSec = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      targetSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length >= 4) {
      targetSec = parts[0] * 3600 + parts[1] * 60 + parts[2] + parts[3] / fps;
    }
    onSeek(Math.max(0, Math.min(totalDuration, targetSec)));
  };

  const seekFromClientX = (clientX: number) => {
    const el = grooveRef.current;
    if (!el || totalDuration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    onSeek(ratio * totalDuration);
  };

  const pct = totalDuration > 0 ? Math.max(0, Math.min(100, (currentTime / totalDuration) * 100)) : 0;
  const effectiveVol = isMuted ? 0 : previewVolume;

  return (
    <div
      style={{
        backgroundColor: theme.surround,
        borderColor: theme.border,
        color: theme.text
      }}
      className="px-3 pt-1.5 pb-2 border-t flex flex-col gap-1.5 select-none shrink-0"
    >
      {/* ROW 1: Timecode | Progress Groove | Playback Speed */}
      <div className="flex items-center gap-3">
        {editingTime ? (
          <input
            type="text"
            autoFocus
            value={timeDraft}
            onChange={(e) => setTimeDraft(e.target.value)}
            onBlur={commitTimeEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTimeEdit();
              if (e.key === 'Escape') setEditingTime(false);
            }}
            style={{
              backgroundColor: theme.button,
              borderColor: theme.accent,
              color: theme.text
            }}
            className="w-44 px-1.5 py-0.5 text-[11.5px] font-mono tabular-nums border rounded-[3px] focus:outline-none"
          />
        ) : (
          <button
            onClick={() => {
              setTimeDraft(currentTime.toFixed(1));
              setEditingTime(true);
            }}
            title="Playhead / length (HH:MM:SS:FF). Click to type a time and jump there."
            style={{ color: theme.text }}
            className="text-[11.5px] font-mono tabular-nums hover:opacity-80 shrink-0"
          >
            {formatHhMmSsFf(currentTime)} / {formatHhMmSsFf(totalDuration)}
          </button>
        )}

        {/* Slim Progress Groove with Cut Ticks & Round Playhead Handle */}
        <div
          ref={grooveRef}
          onMouseDown={(e) => {
            setScrubbing(true);
            seekFromClientX(e.clientX);
            const onMove = (ev: MouseEvent) => seekFromClientX(ev.clientX);
            const onUp = () => {
              setScrubbing(false);
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
          className="group relative flex-1 h-4 flex items-center cursor-pointer"
        >
          <div
            style={{ backgroundColor: theme.border }}
            className={`w-full ${
              scrubbing ? 'h-1.5' : 'h-1 group-hover:h-1.5'
            } rounded-full relative transition-all`}
          >
            {/* Ember Progress Fill */}
            <div
              style={{ width: `${pct}%`, backgroundColor: theme.accent }}
              className="absolute inset-y-0 left-0 rounded-full"
            />

            {/* Cut Ticks */}
            {cutTimes.map((ct, idx) => {
              if (ct <= 0 || ct >= totalDuration) return null;
              const cp = (ct / totalDuration) * 100;
              return (
                <div
                  key={idx}
                  style={{ left: `${cp}%`, backgroundColor: theme.textDim }}
                  className="absolute -top-0.5 -bottom-0.5 w-[2px] -translate-x-1/2 pointer-events-none"
                />
              );
            })}

            {/* Subtle Keyframe Markers */}
            {keyframes.map((kf) => {
              const kp = (kf.time / Math.max(1, totalDuration)) * 100;
              if (kp < 0 || kp > 100) return null;
              return (
                <div
                  key={kf.id}
                  style={{ left: `${kp}%`, backgroundColor: theme.marker }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rotate-45 pointer-events-none opacity-85"
                />
              );
            })}

            {/* Playhead Dot */}
            <div
              style={{ left: `${pct}%` }}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#cfd6dd] border border-black/60 shadow-xs pointer-events-none"
            />
          </div>
        </div>

        {/* Speed Selector ("1×") */}
        <div className="relative shrink-0">
          <button
            onClick={() => setSpeedMenuOpen((o) => !o)}
            title="Playback speed (J / L)"
            style={{ color: theme.textDim }}
            className="px-1.5 py-0.5 rounded hover:bg-white/5 text-[11.5px] font-mono"
          >
            {playbackRate}×
          </button>
          {speedMenuOpen && (
            <div
              style={{
                backgroundColor: theme.panel,
                borderColor: theme.border,
                color: theme.text
              }}
              className="absolute right-0 bottom-full mb-1 w-20 border rounded-[4px] shadow-xl py-1 z-40 text-[12px]"
            >
              {PLAYBACK_SPEEDS.map((spd) => (
                <button
                  key={spd}
                  onClick={() => {
                    onPlaybackRateChange(spd);
                    setSpeedMenuOpen(false);
                  }}
                  style={
                    playbackRate === spd ? { color: theme.accent, fontWeight: 600 } : undefined
                  }
                  className="w-full px-2.5 py-1 text-left font-mono hover:bg-white/5"
                >
                  {spd}×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ROW 2: Left Free-Look & Live Record | Centered Transport Strip | Right Screenshot / Volume / Fullscreen */}
      <div className="grid grid-cols-3 items-center">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={onToggleCameraControlMode}
            title="Free look viewpoint lock (F): move the 360° view while playing; stopping locks that perspective until you drag again"
            style={
              cameraControlMode === 'free-look'
                ? {
                    backgroundColor: theme.accentSoft,
                    borderColor: `${theme.accent}70`,
                    color: theme.accent
                  }
                : {
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.textDim
                  }
            }
            className="px-2 py-0.5 rounded-[3px] border text-[11px] font-medium flex items-center gap-1.5 hover:border-[#f5a04a] transition-colors shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{cameraControlMode === 'free-look' ? 'Free look' : 'Keyframes'}</span>
          </button>

          <button
            onClick={onToggleRecordFreeLook}
            title={
              isRecordingFreeLook
                ? 'Stop recording Free-Look video (Shift+R)'
                : 'Record Free-Look video (Shift+R): plays clip while recording your live 360° drags and locked viewpoints for export'
            }
            style={
              isRecordingFreeLook
                ? {
                    backgroundColor: theme.accent,
                    borderColor: theme.accent,
                    color: theme.textOnAccent
                  }
                : {
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.text
                  }
            }
            className="px-2 py-0.5 rounded-[3px] border text-[11px] font-medium flex items-center gap-1.5 hover:border-[#f5a04a] transition-colors shrink-0"
          >
            {isRecordingFreeLook ? (
              <>
                <Square className="w-3 h-3 fill-current" />
                <span className="font-mono">
                  Stop {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                  {Math.floor(recordingSeconds % 60).toString().padStart(2, '0')}
                </span>
              </>
            ) : (
              <>
                <Circle className="w-3 h-3 fill-[#f5a04a] text-[#f5a04a]" />
                <span>Rec free look</span>
              </>
            )}
          </button>

          {hasRecordedFreeLookVideo && !isRecordingFreeLook && (
            <button
              onClick={onDownloadRecordedFreeLook}
              title="Download recorded Free-Look flat video (.webm)"
              style={{
                backgroundColor: theme.accentSoft,
                borderColor: theme.accent,
                color: theme.accent
              }}
              className="px-2 py-0.5 rounded-[3px] border text-[11px] font-medium flex items-center gap-1 hover:opacity-90 transition-opacity shrink-0"
            >
              <Download className="w-3 h-3" />
              <span className="hidden xl:inline">Save .webm</span>
            </button>
          )}
        </div>

        {/* Center Transport Icons */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onSeek(0)}
            title="To the start (Home)"
            style={{ color: theme.icon }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            <ChevronFirst className="w-4 h-4" />
          </button>

          <button
            onClick={() => onJumpCutOrKey(-1)}
            title="Previous cut or keyframe (↑)"
            style={{ color: theme.icon }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onStepFrame(-1)}
            title="One frame back (←)"
            style={{ color: theme.icon }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Play / Pause Button in Ember Orange Outline (exact match to screenshot) */}
          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            style={{ color: theme.accent }}
            className="p-1.5 rounded hover:bg-white/5 transition-transform active:scale-95"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 stroke-[2]" />
            ) : (
              <Play className="w-5 h-5 stroke-[2]" />
            )}
          </button>

          <button
            onClick={() => onStepFrame(1)}
            title="One frame forward (→)"
            style={{ color: theme.icon }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onJumpCutOrKey(1)}
            title="Next cut or keyframe (↓)"
            style={{ color: theme.icon }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSeek(totalDuration)}
            title="To the end (End)"
            style={{ color: theme.icon }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            <ChevronLast className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Screenshot, Volume + Ember Slider, Fullscreen */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onScreenshot}
            title="Save screenshot (Ctrl+Shift+P): save frame at playhead as PNG"
            style={{ color: theme.icon }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleMute}
            title="Mute preview audio"
            style={{ color: isMuted ? theme.accent : theme.icon }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            {isMuted || effectiveVol === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={effectiveVol}
            onChange={(e) => onPreviewVolumeChange(Number(e.target.value))}
            title={`Preview volume: ${effectiveVol}%`}
            style={{
              background: `linear-gradient(to right, ${theme.accent} 0%, ${theme.accent} ${effectiveVol}%, ${theme.border} ${effectiveVol}%, ${theme.border} 100%)`
            }}
            className="orbis-slider w-20"
          />

          <button
            onClick={onToggleFullscreen}
            title="Full screen preview (F11)"
            style={{ color: theme.icon }}
            className="p-1 rounded hover:bg-white/5 transition-colors"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
