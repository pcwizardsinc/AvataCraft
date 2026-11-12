/**
 * orbis-reframe EditToolbar + TimelineWidget
 * Faithful port of Schabo/orbis-reframe/src/ui/EditToolbar.cpp & TimelineWidgetPaint.cpp:
 * - Top EditToolbar: Centered [ ->|  ✂  |<-  ↺    ✥  🗑  ✕ ] | Right [ Notice   🔍-  ↔  🔍+ ]
 * - Timeline Ruler: '00:00   '00:30   '01:00   '01:30   '02:00 with Ember #f5a04a playhead
 * - Track Rows (180px left header):
 *    - Overlay tracks (#5e4a80 clips, layer number + eye hide box)
 *    - Main "▾ Video" track (40px high, #3b5873 slate-blue clips, #f5a04a selection border, ◇ icon, keyframe diamonds)
 *    - Indented "Camera mic" track (28px high, "M" mute box, #2f6f6b teal clips with #cfd6dd waveform + 🔗 link icon)
 *    - Additional Audio tracks (#2f6f6b teal clips with waveforms, M/S boxes)
 */

import React, { useRef, useState, useMemo } from 'react';
import {
  ArrowRightToLine,
  Scissors,
  ArrowLeftToLine,
  RotateCcw,
  Move3d,
  Trash2,
  X,
  ZoomOut,
  MoveHorizontal,
  ZoomIn,
  ChevronDown,
  ChevronRight,
  Link2,
  Eye,
  EyeOff,
  Plus,
  Compass,
  Circle,
  Square
} from 'lucide-react';
import {
  TimelineClip,
  Track,
  Keyframe360,
  CameraControlMode
} from '../../types/editor';
import { OrbisThemeColors, getWaveformPeaks } from '../../services/osvStitcher';

interface MultiTrackTimelineProps {
  tracks: Track[];
  clips: TimelineClip[];
  currentTime: number;
  totalDuration: number;
  selectedClipId: string | null;
  cameraControlMode: CameraControlMode;
  onToggleCameraControlMode: () => void;
  isRecordingFreeLook: boolean;
  onToggleRecordFreeLook: () => void;
  reframeArmed: boolean;
  onToggleReframeArmed: () => void;
  hasKeyframesOnActiveClip: boolean;
  noticeText: string;
  showCurveGraph: boolean;
  theme: OrbisThemeColors;
  onTimeChange: (time: number) => void;
  onClipSelect: (clipId: string | null) => void;
  onClipUpdate: (clip: TimelineClip) => void;
  onSplitAtPlayhead: () => void;
  onTrimInToPlayhead: () => void;
  onTrimOutToPlayhead: () => void;
  onRestoreClipTrim: () => void;
  onDeleteKeyAtPlayhead: () => void;
  onClearAllKeysOnClip: () => void;
  onDeleteClip: (clipId: string) => void;
  onAddOverlayTrack: () => void;
  onAddAudioTrack: () => void;
  onDeleteTrack: (trackId: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackVisibility: (trackId: string) => void;
  onToggleMainVideoExpand: () => void;
  onDropMediaId: (mediaId: string, trackId: string, dropTime: number) => void;
}

const HEADER_W = 180;

const ClipWaveformSVG: React.FC<{ clipId: string; color: string }> = React.memo(
  ({ clipId, color }) => {
    const peaks = useMemo(() => getWaveformPeaks(clipId, 140), [clipId]);
    const points = useMemo(() => {
      const top: string[] = [];
      const bot: string[] = [];
      peaks.forEach((p, idx) => {
        const x = (idx / (peaks.length - 1)) * 1000;
        const amp = p * 11;
        top.push(`${x.toFixed(1)},${(14 - amp).toFixed(1)}`);
        bot.unshift(`${x.toFixed(1)},${(14 + amp).toFixed(1)}`);
      });
      return [...top, ...bot].join(' ');
    }, [peaks]);

    return (
      <svg
        viewBox="0 0 1000 28"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
      >
        <polygon points={points} fill={color} />
      </svg>
    );
  }
);

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  tracks,
  clips,
  currentTime,
  totalDuration,
  selectedClipId,
  cameraControlMode,
  onToggleCameraControlMode,
  isRecordingFreeLook,
  onToggleRecordFreeLook,
  reframeArmed,
  onToggleReframeArmed,
  hasKeyframesOnActiveClip,
  noticeText,
  showCurveGraph,
  theme,
  onTimeChange,
  onClipSelect,
  onClipUpdate,
  onSplitAtPlayhead,
  onTrimInToPlayhead,
  onTrimOutToPlayhead,
  onRestoreClipTrim,
  onDeleteKeyAtPlayhead,
  onClearAllKeysOnClip,
  onDeleteClip,
  onAddOverlayTrack,
  onAddAudioTrack,
  onDeleteTrack,
  onToggleTrackMute,
  onToggleTrackVisibility,
  onToggleMainVideoExpand,
  onDropMediaId
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pxPerSec, setPxPerSec] = useState<number>(7.2); // Fits ~3 minutes cleanly across desktop width like screenshot!

  const [dragState, setDragState] = useState<{
    clipId: string;
    mode: 'move' | 'trim-start' | 'trim-end';
    startX: number;
    origStart: number;
    origDur: number;
    origOffset: number;
  } | null>(null);

  // Check if Main Video track is folded (hides indented Camera mic row)
  const mainVideoTrack = tracks.find((t) => t.isMainVideo);
  const isMainExpanded = mainVideoTrack?.expanded !== false;

  const visibleTracks = useMemo(
    () => tracks.filter((t) => !(t.isCameraMic && !isMainExpanded)),
    [tracks, isMainExpanded]
  );

  const canvasWidth = Math.max(820, totalDuration * pxPerSec + 80);

  // Compute ruler interval ('00:00, '00:30, '01:00 ...)
  const rulerStepSec = useMemo(() => {
    if (pxPerSec >= 40) return 5;
    if (pxPerSec >= 18) return 10;
    if (pxPerSec >= 10) return 15;
    if (pxPerSec >= 5) return 30;
    return 60;
  }, [pxPerSec]);

  const rulerMarks = useMemo(() => {
    const arr: number[] = [];
    for (let t = 0; t <= totalDuration; t += rulerStepSec) {
      arr.push(t);
    }
    return arr;
  }, [totalDuration, rulerStepSec]);

  const formatRulerLabel = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `'${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleZoomToFit = () => {
    const containerW = (scrollRef.current?.clientWidth || 1100) - HEADER_W - 24;
    if (totalDuration > 0 && containerW > 120) {
      setPxPerSec(Math.max(2, Math.min(80, containerW / totalDuration)));
    }
  };

  const scrubFromClientX = (clientX: number) => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    const xInTracks = clientX - rect.left + scroller.scrollLeft - HEADER_W;
    const sec = Math.max(0, Math.min(totalDuration, xInTracks / pxPerSec));
    onTimeChange(sec);
  };

  const startClipDrag = (
    e: React.MouseEvent,
    clip: TimelineClip,
    mode: 'move' | 'trim-start' | 'trim-end'
  ) => {
    e.stopPropagation();
    onClipSelect(clip.id);
    const startX = e.clientX;
    const origStart = clip.startTime;
    const origDur = clip.duration;
    const origOffset = clip.offset;

    setDragState({ clipId: clip.id, mode, startX, origStart, origDur, origOffset });

    const onMove = (ev: MouseEvent) => {
      const dt = (ev.clientX - startX) / pxPerSec;
      if (mode === 'move') {
        const nextStart = Math.max(0, parseFloat((origStart + dt).toFixed(2)));
        const shift = nextStart - origStart;
        onClipUpdate({
          ...clip,
          startTime: nextStart,
          keyframes: clip.keyframes?.map((k) => ({
            ...k,
            time: parseFloat((k.time + shift).toFixed(2))
          }))
        });
      } else if (mode === 'trim-start') {
        const clampedDt = Math.max(-origOffset, Math.min(origDur - 0.5, dt));
        const nextStart = Math.max(0, parseFloat((origStart + clampedDt).toFixed(2)));
        const actualDelta = nextStart - origStart;
        onClipUpdate({
          ...clip,
          startTime: nextStart,
          duration: Math.max(0.5, parseFloat((origDur - actualDelta).toFixed(2))),
          offset: Math.max(0, parseFloat((origOffset + actualDelta).toFixed(2)))
        });
      } else if (mode === 'trim-end') {
        const nextDur = Math.max(0.5, parseFloat((origDur + dt).toFixed(2)));
        onClipUpdate({
          ...clip,
          duration: nextDur
        });
      }
    };

    const onUp = () => {
      setDragState(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Active video clip keyframes for optional Curve Graph
  const curveKeyframes: Keyframe360[] = useMemo(() => {
    const sel = clips.find((c) => c.id === selectedClipId && c.keyframes?.length);
    if (sel?.keyframes) return sel.keyframes;
    const main = clips.find((c) => c.type === 'video' && c.keyframes?.length);
    return main?.keyframes || [];
  }, [clips, selectedClipId]);

  const toolBtnClass =
    'w-7 h-6 rounded-[3px] flex items-center justify-center hover:bg-white/10 disabled:opacity-35 disabled:pointer-events-none transition-colors';

  return (
    <div
      style={{
        backgroundColor: theme.window,
        borderColor: theme.border,
        color: theme.text
      }}
      className="flex flex-col border-t select-none shrink-0"
    >
      {/* ========================================================= */}
      {/* EDIT TOOLBAR (Exact EditToolbar.cpp layout)               */}
      {/* ========================================================= */}
      <div
        style={{ backgroundColor: theme.window, borderColor: theme.border }}
        className="h-8 px-2 border-b grid grid-cols-3 items-center"
      >
        {/* Left: Subtle Add Overlay / Audio Track buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onAddOverlayTrack}
            title="Add overlay / PiP / HUD track"
            style={{ color: theme.textDim }}
            className="px-2 py-0.5 rounded-[3px] hover:bg-white/5 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Overlay track</span>
          </button>
          <button
            onClick={onAddAudioTrack}
            title="Add audio track"
            style={{ color: theme.textDim }}
            className="px-2 py-0.5 rounded-[3px] hover:bg-white/5 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Audio track</span>
          </button>
        </div>

        {/* Center: [ ->|  ✂  |<-  ↺    ✥  🗑  ✕ ] */}
        <div className="flex items-center justify-center gap-0.5">
          <button
            onClick={onTrimInToPlayhead}
            title="Trim start ( [ ): cut away before the playhead"
            style={{ color: theme.icon }}
            className={toolBtnClass}
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onSplitAtPlayhead}
            title="Split clip at playhead ( S )"
            style={{ color: theme.icon }}
            className={toolBtnClass}
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTrimOutToPlayhead}
            title="Trim end ( ] ): cut away after the playhead"
            style={{ color: theme.icon }}
            className={toolBtnClass}
          >
            <ArrowLeftToLine className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRestoreClipTrim}
            title="Restore ( R ): give the clip back its full length"
            style={{ color: theme.icon }}
            className={toolBtnClass}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-3.5" />

          <button
            onClick={onToggleCameraControlMode}
            title="Free look viewpoint lock ( F ): move 360° view while playing; stopping locks that perspective until you drag again"
            style={
              cameraControlMode === 'free-look'
                ? { backgroundColor: theme.accentSoft, color: theme.accent }
                : { color: theme.icon }
            }
            className={toolBtnClass}
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onToggleRecordFreeLook}
            title={
              isRecordingFreeLook
                ? 'Stop recording Free-Look video ( Shift+R )'
                : 'Record Free-Look video ( Shift+R ): record live 360° Free-Look viewer perspective to flat video'
            }
            style={
              isRecordingFreeLook
                ? { backgroundColor: theme.accent, color: theme.textOnAccent }
                : { color: theme.icon }
            }
            className={toolBtnClass}
          >
            {isRecordingFreeLook ? (
              <Square className="w-3 h-3 fill-current" />
            ) : (
              <Circle className="w-3 h-3 text-[#f5a04a] fill-[#f5a04a]" />
            )}
          </button>

          <button
            onClick={onToggleReframeArmed}
            title="Arm reframe authoring ( A ): while on, every drag or zoom in the viewport sets a keyframe at the playhead"
            style={
              reframeArmed
                ? { backgroundColor: theme.accentSoft, color: theme.accent }
                : { color: theme.icon }
            }
            className={toolBtnClass}
          >
            <Move3d className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (hasKeyframesOnActiveClip) {
                onDeleteKeyAtPlayhead();
              } else if (selectedClipId) {
                onDeleteClip(selectedClipId);
              }
            }}
            disabled={!hasKeyframesOnActiveClip && !selectedClipId}
            title="Delete keyframe at playhead ( Shift+K ) or delete selected clip ( Del )"
            style={{ color: theme.icon }}
            className={toolBtnClass}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClearAllKeysOnClip}
            disabled={!hasKeyframesOnActiveClip}
            title="Delete all reframe keyframes on this clip ( Ctrl+Shift+K )"
            style={{ color: theme.icon }}
            className={toolBtnClass}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Notice Label + [ ZoomOut  ZoomFit  ZoomIn ] */}
        <div className="flex items-center justify-end gap-1">
          {noticeText && (
            <span
              title={noticeText}
              style={{ color: theme.textDim }}
              className="text-[11.5px] truncate max-w-[220px] mr-2"
            >
              {noticeText}
            </span>
          )}

          <button
            onClick={() => setPxPerSec((z) => Math.max(2, z / 1.25))}
            title="Zoom out ( Ctrl+- )"
            style={{ color: theme.icon }}
            className={toolBtnClass}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleZoomToFit}
            title="Zoom to fit whole edit ( Ctrl+0 )"
            style={{ color: theme.icon }}
            className={toolBtnClass}
          >
            <MoveHorizontal className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setPxPerSec((z) => Math.min(90, z * 1.25))}
            title="Zoom in ( Ctrl++ )"
            style={{ color: theme.icon }}
            className={toolBtnClass}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SCROLLABLE TIMELINE RULER + TRACK ROWS                    */}
      {/* ========================================================= */}
      <div
        ref={scrollRef}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setPxPerSec((z) =>
              e.deltaY < 0 ? Math.min(90, z * 1.2) : Math.max(2, z / 1.2)
            );
          }
        }}
        className="overflow-x-auto overflow-y-auto max-h-56 relative"
      >
        <div style={{ width: `${HEADER_W + canvasWidth}px` }} className="relative">
          {/* Playhead Vertical Line spanning Ruler + All Tracks */}
          <div
            style={{
              left: `${HEADER_W + currentTime * pxPerSec}px`,
              backgroundColor: theme.playhead
            }}
            className="absolute top-0 bottom-0 w-[1.5px] z-30 pointer-events-none"
          >
            <div
              style={{ backgroundColor: theme.playhead }}
              className="w-2 h-2 -translate-x-[3.2px] rounded-b-[2px]"
            />
          </div>

          {/* 1. RULER ROW (16px high: '00:00  '00:30  '01:00 ...) */}
          <div className="flex h-4 items-end">
            <div
              style={{ width: `${HEADER_W}px`, backgroundColor: theme.window }}
              className="sticky left-0 z-20 h-full shrink-0"
            />
            <div
              onMouseDown={(e) => {
                scrubFromClientX(e.clientX);
                const onMove = (ev: MouseEvent) => scrubFromClientX(ev.clientX);
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              className="relative flex-1 h-full cursor-pointer"
            >
              {rulerMarks.map((sec) => (
                <div
                  key={sec}
                  style={{ left: `${sec * pxPerSec}px`, color: theme.textDim }}
                  className="absolute bottom-0 text-[10.5px] font-mono tabular-nums leading-none pl-0.5 pointer-events-none"
                >
                  {formatRulerLabel(sec)}
                </div>
              ))}
            </div>
          </div>

          {/* 2. TRACK ROWS */}
          <div className="flex flex-col gap-[2px] pb-2">
            {visibleTracks.map((track) => {
              const rowH = track.isMainVideo ? 38 : 28;
              const trackClips = clips.filter((c) => c.trackId === track.id);

              return (
                <div
                  key={track.id}
                  style={{ height: `${rowH}px` }}
                  className="flex items-stretch relative"
                >
                  {/* Sticky Left Track Header (180px wide) */}
                  <div
                    style={{
                      width: `${HEADER_W}px`,
                      backgroundColor: theme.window,
                      color: track.isCameraMic ? theme.textDim : theme.text
                    }}
                    className={`sticky left-0 z-20 shrink-0 flex items-center justify-between pr-2 ${
                      track.isCameraMic ? 'pl-8' : 'pl-2'
                    } text-[12px]`}
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      {track.isMainVideo && (
                        <button
                          onClick={onToggleMainVideoExpand}
                          className="p-0.5 hover:text-white"
                          style={{ color: theme.textDim }}
                        >
                          {isMainExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                      )}
                      <span className="truncate">{track.name}</span>
                    </div>

                    {/* Right Header Controls: Layer badge / Hide / Mute / Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      {track.type === 'overlay' && (
                        <button
                          onClick={() => onToggleTrackVisibility(track.id)}
                          title={track.visible ? 'Hide overlay track' : 'Show overlay track'}
                          style={{ color: track.visible ? theme.textDim : theme.accent }}
                          className="w-4 h-4 flex items-center justify-center rounded hover:bg-white/10"
                        >
                          {track.visible ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                        </button>
                      )}

                      {track.type === 'audio' && (
                        <button
                          onClick={() => onToggleTrackMute(track.id)}
                          title={track.muted ? 'Unmute track' : 'Mute track'}
                          style={
                            track.muted
                              ? { backgroundColor: theme.accent, color: theme.textOnAccent }
                              : { color: theme.textDim }
                          }
                          className="w-4 h-3.5 rounded-[2px] text-[10px] font-semibold flex items-center justify-center hover:bg-white/10"
                        >
                          M
                        </button>
                      )}

                      {!track.isMainVideo && !track.isCameraMic && (
                        <button
                          onClick={() => onDeleteTrack(track.id)}
                          title="Remove track"
                          style={{ color: theme.textDisabled }}
                          className="w-4 h-4 flex items-center justify-center rounded hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Track Clip Lane */}
                  <div
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        onClipSelect(null);
                        scrubFromClientX(e.clientX);
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const mediaId = e.dataTransfer.getData('application/orbis-media-id');
                      if (!mediaId) return;
                      const scroller = scrollRef.current;
                      if (!scroller) return;
                      const rect = scroller.getBoundingClientRect();
                      const dropX = e.clientX - rect.left + scroller.scrollLeft - HEADER_W;
                      const dropSec = Math.max(0, dropX / pxPerSec);
                      onDropMediaId(mediaId, track.id, dropSec);
                    }}
                    className="relative flex-1 h-full"
                  >
                    {trackClips.map((clip) => {
                      const leftPx = clip.startTime * pxPerSec;
                      const widthPx = Math.max(18, clip.duration * pxPerSec);
                      const isSelected = clip.id === selectedClipId;
                      const isMuted = track.muted || clip.muted || !track.visible;

                      const bg = isMuted
                        ? theme.clipMuted
                        : clip.type === 'video'
                        ? theme.clipVideo
                        : clip.type === 'audio'
                        ? theme.clipAudio
                        : theme.clipOverlay;

                      return (
                        <div
                          key={clip.id}
                          onMouseDown={(e) => startClipDrag(e, clip, 'move')}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClipSelect(clip.id);
                          }}
                          style={{
                            left: `${leftPx}px`,
                            width: `${widthPx}px`,
                            backgroundColor: bg,
                            borderColor: isSelected ? theme.accent : 'rgba(0,0,0,0.38)',
                            borderWidth: isSelected ? '1.5px' : '1px'
                          }}
                          className={`group absolute inset-y-0 rounded-[3px] overflow-hidden flex items-center px-2 ${
                            dragState?.clipId === clip.id ? 'cursor-grabbing' : 'cursor-pointer'
                          }`}
                        >
                          {/* Audio Waveform Background for Audio & Camera mic clips */}
                          {clip.type === 'audio' && (
                            <ClipWaveformSVG clipId={clip.id} color={theme.waveform} />
                          )}

                          {/* Transition In Ramp Box */}
                          {clip.transitionIn && clip.transitionIn !== 'none' && (
                            <div
                              style={{
                                width: `${Math.min(
                                  widthPx * 0.4,
                                  Math.max(14, (clip.transitionDuration || 1) * pxPerSec)
                                )}px`
                              }}
                              className="absolute top-0 left-0 h-3 bg-white/20 border-r border-b border-white/30 rounded-br-[2px] pointer-events-none"
                            />
                          )}

                          {/* Transition Out Ramp Box */}
                          {clip.transitionOut && clip.transitionOut !== 'none' && (
                            <div
                              style={{
                                width: `${Math.min(
                                  widthPx * 0.4,
                                  Math.max(14, (clip.transitionDuration || 1) * pxPerSec)
                                )}px`
                              }}
                              className="absolute top-0 right-0 h-3 bg-white/20 border-l border-b border-white/30 rounded-bl-[2px] pointer-events-none"
                            />
                          )}

                          {/* Clip Icon + Label ("◇ FlyingLowv2.osv" or Free Look Compass) */}
                          <div className="relative z-10 flex items-center gap-1.5 min-w-0 text-[12px] text-[#e6e6e6] drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)] pointer-events-none">
                            {clip.type === 'video' && (
                              clip.cameraControlMode === 'free-look' ? (
                                <Compass className="w-3 h-3 text-[#f5a04a] shrink-0" />
                              ) : (
                                <span className="w-2 h-2 rotate-45 border border-[#cfd6dd] shrink-0 inline-block" />
                              )
                            )}
                            {clip.linkedVideoClipId && (
                              <Link2 className="w-3 h-3 opacity-85 shrink-0" />
                            )}
                            <span className="truncate">{clip.title}</span>
                            {clip.type === 'video' && clip.freeLookSamples && clip.freeLookSamples.length > 0 && (
                              <span className="text-[10px] font-mono px-1 rounded bg-black/35 text-[#f5a04a] shrink-0">
                                Free-look pass
                              </span>
                            )}
                            {clip.speed && clip.speed !== 1 && (
                              <span className="text-[10px] font-mono px-1 rounded bg-black/35">
                                {clip.speed}×
                              </span>
                            )}
                          </div>

                          {/* Reframe Keyframe Diamonds along Video Clip */}
                          {clip.keyframes?.map((kf) => {
                            if (kf.time < clip.startTime || kf.time > clip.startTime + clip.duration) {
                              return null;
                            }
                            const kfX = (kf.time - clip.startTime) * pxPerSec;
                            const nearPlayhead = Math.abs(kf.time - currentTime) < 0.2;
                            return (
                              <div
                                key={kf.id}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  onTimeChange(kf.time);
                                }}
                                title={`Keyframe ${kf.time.toFixed(1)}s (Yaw ${Math.round(kf.yaw)}°, Pitch ${Math.round(kf.pitch)}°, FOV ${Math.round(kf.fov)}°)`}
                                style={{
                                  left: `${kfX}px`,
                                  backgroundColor: nearPlayhead ? theme.accent : theme.marker
                                }}
                                className="absolute bottom-1 -translate-x-1/2 w-2 h-2 rotate-45 border border-black/60 z-20 cursor-pointer hover:scale-125 transition-transform"
                              />
                            );
                          })}

                          {/* Highlight Marks (M) */}
                          {clip.marks?.map((mk, idx) => {
                            if (mk < clip.startTime || mk > clip.startTime + clip.duration) return null;
                            const mkX = (mk - clip.startTime) * pxPerSec;
                            return (
                              <div
                                key={idx}
                                style={{ left: `${mkX}px`, backgroundColor: theme.marker }}
                                className="absolute inset-y-0 w-[2px] z-20 pointer-events-none"
                              />
                            );
                          })}

                          {/* Left & Right Trim Handles */}
                          <div
                            onMouseDown={(e) => startClipDrag(e, clip, 'trim-start')}
                            className="absolute inset-y-0 left-0 w-2 cursor-ew-resize hover:bg-white/25 z-20"
                          />
                          <div
                            onMouseDown={(e) => startClipDrag(e, clip, 'trim-end')}
                            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize hover:bg-white/25 z-20"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. OPTIONAL KEYFRAME CURVE GRAPH (View -> Keyframe curve graph) */}
          {showCurveGraph && (
            <div
              style={{ borderColor: theme.border }}
              className="flex h-20 border-t items-stretch"
            >
              <div
                style={{ width: `${HEADER_W}px`, backgroundColor: theme.window, color: theme.textDim }}
                className="sticky left-0 z-20 shrink-0 px-2 py-1.5 text-[11px] flex flex-col justify-between"
              >
                <span className="font-medium" style={{ color: theme.text }}>Reframe curves</span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span style={{ color: '#f5a04a' }}>● Yaw</span>
                  <span style={{ color: '#6fa8dc' }}>● Pitch</span>
                  <span style={{ color: '#5cc96b' }}>● FOV</span>
                </div>
              </div>
              <div className="relative flex-1 h-full">
                <svg
                  width={canvasWidth}
                  height={80}
                  className="block pointer-events-none"
                >
                  <line x1={0} y1={40} x2={canvasWidth} y2={40} stroke={theme.border} strokeDasharray="3 3" />
                  {curveKeyframes.length >= 2 && (
                    <>
                      <polyline
                        fill="none"
                        stroke="#f5a04a"
                        strokeWidth="1.5"
                        points={[...curveKeyframes]
                          .sort((a, b) => a.time - b.time)
                          .map((k) => `${k.time * pxPerSec},${40 - (k.yaw / 180) * 34}`)
                          .join(' ')}
                      />
                      <polyline
                        fill="none"
                        stroke="#6fa8dc"
                        strokeWidth="1.5"
                        points={[...curveKeyframes]
                          .sort((a, b) => a.time - b.time)
                          .map((k) => `${k.time * pxPerSec},${40 - (k.pitch / 90) * 34}`)
                          .join(' ')}
                      />
                      <polyline
                        fill="none"
                        stroke="#5cc96b"
                        strokeWidth="1.5"
                        points={[...curveKeyframes]
                          .sort((a, b) => a.time - b.time)
                          .map((k) => `${k.time * pxPerSec},${74 - ((k.fov - 30) / 125) * 64}`)
                          .join(' ')}
                      />
                    </>
                  )}
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
