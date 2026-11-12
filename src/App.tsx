/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * orbis-reframe (Avata-Craft Linux Workstation Edition)
 * Faithful fork of Schabo/orbis-reframe (Qt6 Ember UI, .orp projects, OSV/INSV 360 reframing,
 * CSRT subject tracking, multitrack timeline, linked Camera mic waveforms, Colour EV/LUT grading)
 * enhanced with DroneHUDEditor FPV gauges, Aerosphere stabilization, GPStitch & Camera Tricks.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  OSVFileMetadata,
  AudioAssetMetadata,
  Track,
  TimelineClip,
  Keyframe360,
  KeyframeEasing,
  ProjectionMode,
  StabilizerConfig,
  TrackerState,
  HUDConfig,
  VideoFilters,
  CameraTrickId,
  ActiveDialog,
  ProjectSettings,
  TelemetryPoint,
  OrbisThemeId,
  LeftSidebarTab,
  RightSidebarTab,
  TransitionType,
  CameraControlMode,
  FreeLookSample
} from './types/editor';
import {
  ORBIS_THEMES,
  BUNDLED_OSV_LIBRARY,
  BUNDLED_AUDIO_LIBRARY,
  DEFAULT_VIDEO_FILTERS,
  INITIAL_ORBIS_KEYFRAMES,
  createInitialOrbisWorkspace,
  OSV360Renderer,
  probeUploadedVideoFile,
  probeUploadedAudioFile,
  parseTelemetryFile,
  generateCameraTrickKeyframes,
  generateProceduralTelemetry,
  getInterpolatedTelemetry,
  getInterpolatedCamera,
  getFreeLookRecordedCamera,
  bakeFreeLookSamplesToKeyframes,
  computeCSSFilterString,
  generateTrackingKeyframes,
  audioMixer
} from './services/osvStitcher';
import { OrbisHeader } from './components/orbis/OrbisHeader';
import { OrbisMediaPool, OverlayPresetTile } from './components/orbis/OrbisMediaPool';
import { OrbisInspector } from './components/orbis/OrbisInspector';
import { Three360Viewport } from './components/viewport/Three360Viewport';
import { DroneHUDOverlay } from './components/viewport/DroneHUDOverlay';
import { OrbisKeyframeRibbon } from './components/viewport/OrbisKeyframeRibbon';
import { MultiTrackTimeline } from './components/timeline/MultiTrackTimeline';
import { OrbisDialogs } from './components/modals/OrbisDialogs';
import { ExportModal } from './components/modals/ExportModal';

interface WorkspaceSnapshot {
  tracks: Track[];
  clips: TimelineClip[];
}

export default function App() {
  const initialWorkspace = useMemo(() => createInitialOrbisWorkspace(), []);

  // Theme (Ember default, Neutral dark, Light — exact match to Schabo/orbis-reframe Theme.cpp)
  const [themeId, setThemeId] = useState<OrbisThemeId>('ember');
  const theme = ORBIS_THEMES[themeId];

  // Project Settings ("orbis-reframe — Experiment.orp *")
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    projectName: 'Experiment.orp',
    modified: true,
    targetResolution: '3840×2160 (4K UHD)',
    frameRate: 60,
    defaultSeamMode: 'depth-aware',
    audioSampleRate: 48000
  });

  // Media Pool
  const [videoFiles, setVideoFiles] = useState<OSVFileMetadata[]>(BUNDLED_OSV_LIBRARY);
  const [audioFiles, setAudioFiles] = useState<AudioAssetMetadata[]>(BUNDLED_AUDIO_LIBRARY);
  const [selectedMediaId, setSelectedMediaId] = useState<string>(BUNDLED_OSV_LIBRARY[0].id);

  // Timeline Tracks & Clips + Undo/Redo
  const [tracks, setTracks] = useState<Track[]>(initialWorkspace.tracks);
  const [clips, setClips] = useState<TimelineClip[]>(initialWorkspace.clips);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip-main-1');
  const [historyPast, setHistoryPast] = useState<WorkspaceSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<WorkspaceSnapshot[]>([]);

  // Transport & Preview Audio
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [previewVolume, setPreviewVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [reframeArmed, setReframeArmed] = useState<boolean>(false);

  // Virtual 360 Camera + OpenOSV Free-Look Viewpoint Lock & Live Recorder
  const [cameraControlMode, setCameraControlMode] = useState<CameraControlMode>('free-look');
  const [yaw, setYaw] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(-4);
  const [roll, setRoll] = useState<number>(0);
  const [fov, setFov] = useState<number>(92);
  const [distortion, setDistortion] = useState<number>(0);
  const [projection, setProjection] = useState<ProjectionMode>('perspective');
  const [currentEasing, setCurrentEasing] = useState<KeyframeEasing>('ease-in-out');
  const [fallbackKeyframes, setFallbackKeyframes] = useState<Keyframe360[]>(INITIAL_ORBIS_KEYFRAMES);

  // Live Free-Look Recording State
  const [isRecordingFreeLook, setIsRecordingFreeLook] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [lastRecordedFreeLookUrl, setLastRecordedFreeLookUrl] = useState<string | null>(null);
  const isUserDraggingViewerRef = useRef<boolean>(false);
  const freeLookOverridePassRef = useRef<boolean>(false);
  const freeLookSamplesRef = useRef<FreeLookSample[]>([]);
  const freeLookRecorderRef = useRef<MediaRecorder | null>(null);
  const freeLookStopCompRef = useRef<(() => void) | null>(null);
  const freeLookTimerRef = useRef<number | null>(null);
  const currentTimeRef = useRef<number>(0);
  const latestCamRef = useRef<{ yaw: number; pitch: number; roll: number; fov: number; projection: ProjectionMode }>({
    yaw: 0,
    pitch: -4,
    roll: 0,
    fov: 92,
    projection: 'perspective'
  });

  // Stabilization (StabilizationPanel.cpp + Aerosphere)
  const [stabilizer, setStabilizer] = useState<StabilizerConfig>({
    mode: 'lean-follow',
    enabled: true,
    horizonLock: false,
    leanFollow: true,
    smoothFactor: 0.5,
    dewarpProfile: 'avata-ultrawide'
  });

  // Subject Tracker (SubjectTrackController.cpp)
  const [tracker, setTracker] = useState<TrackerState>({
    active: false,
    isSelecting: false,
    target: null,
    autoFollow: false,
    smoothing: 0.8,
    showTrajectory: false,
    trajectory: []
  });

  // Flight Telemetry & HUD Config (GaugePanel.cpp + DroneHUDEditor + GPStitch)
  const [telemetryPoints, setTelemetryPoints] = useState<TelemetryPoint[]>(() =>
    generateProceduralTelemetry(200)
  );
  const [gpxOffset, setGpxOffset] = useState<number>(0);
  const [hudConfig, setHudConfig] = useState<HUDConfig>({
    preset: 'dji-o3',
    unitSystem: 'metric',
    opacity: 0.88,
    scale: 1,
    color: '#f5a04a',
    widgets: {
      pitchLadder: true,
      horizonBar: true,
      speedTape: true,
      altitudeTape: true,
      compassTape: true,
      homeArrow: true,
      batteryGauge: true,
      throttleMeter: true,
      gForceGauge: true,
      gpsCoordinates: true,
      flightMode: true,
      crosshair: true
    }
  });

  // Fallback Filters
  const [globalFilters, setGlobalFilters] = useState<VideoFilters>({ ...DEFAULT_VIDEO_FILTERS });

  // Sidebars, View & Inline EditToolbar Notice
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(true);
  const [leftTab, setLeftTab] = useState<LeftSidebarTab>('media');
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(true);
  const [rightTab, setRightTab] = useState<RightSidebarTab>('video');
  const [previewAspect, setPreviewAspect] = useState<'auto' | '16:9' | '9:16' | '1:1' | '21:9'>('auto');
  const [showCurveGraph, setShowCurveGraph] = useState<boolean>(false);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [noticeText, setNoticeText] = useState<string>('');

  // Viewport Sizing
  const viewportFrameRef = useRef<HTMLDivElement>(null);
  const centerStageRef = useRef<HTMLDivElement>(null);
  const [monitorSize, setMonitorSize] = useState<{ width: number; height: number }>({
    width: 800,
    height: 450
  });

  // Hidden File Inputs
  const importFilesInputRef = useRef<HTMLInputElement>(null);
  const importPiPInputRef = useRef<HTMLInputElement>(null);
  const importAudioInputRef = useRef<HTMLInputElement>(null);
  const openProjectInputRef = useRef<HTMLInputElement>(null);

  // 360 Procedural Stream + Real Video Decoder Element
  const osvRendererRef = useRef<OSV360Renderer | null>(null);
  const [proceduralCanvas, setProceduralCanvas] = useState<HTMLCanvasElement | null>(null);
  const userVideoElRef = useRef<HTMLVideoElement | null>(null);
  const [activeVideoElement, setActiveVideoElement] = useState<HTMLVideoElement | null>(null);

  const showNotice = useCallback((msg: string) => {
    setNoticeText(msg);
  }, []);

  useEffect(() => {
    if (!noticeText) return;
    const t = setTimeout(() => setNoticeText(''), 5000);
    return () => clearTimeout(t);
  }, [noticeText]);

  // Initialize OSV360Renderer once
  useEffect(() => {
    const renderer = new OSV360Renderer();
    renderer.renderFrame(0, true, 'depth-aware', 'flying-low', false);
    osvRendererRef.current = renderer;
    setProceduralCanvas(renderer.getCanvas());
  }, []);

  // Resize observer on viewport frame
  useEffect(() => {
    const el = viewportFrameRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMonitorSize({
          width: Math.max(280, Math.round(entry.contentRect.width)),
          height: Math.max(160, Math.round(entry.contentRect.height))
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [previewAspect, leftSidebarOpen, rightSidebarOpen]);

  // Undo / Redo Snapshot Helpers
  const pushUndo = useCallback(() => {
    setHistoryPast((prev) => [...prev.slice(-29), { tracks, clips }]);
    setHistoryFuture([]);
    setProjectSettings((s) => ({ ...s, modified: true }));
  }, [tracks, clips]);

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const prev = historyPast[historyPast.length - 1];
    setHistoryFuture((f) => [{ tracks, clips }, ...f]);
    setHistoryPast((p) => p.slice(0, -1));
    setTracks(prev.tracks);
    setClips(prev.clips);
    showNotice('Undid edit');
  }, [historyPast, tracks, clips, showNotice]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryPast((p) => [...p, { tracks, clips }]);
    setHistoryFuture((f) => f.slice(1));
    setTracks(next.tracks);
    setClips(next.clips);
    showNotice('Redid edit');
  }, [historyFuture, tracks, clips, showNotice]);

  // Total timeline duration = end of last clip (or 30s when empty)
  const totalDuration = useMemo(() => {
    const maxEnd = clips.reduce((acc, c) => Math.max(acc, c.startTime + c.duration), 0);
    return maxEnd > 0 ? maxEnd : 30;
  }, [clips]);

  // Set of media IDs currently placed on timeline (drives orange checkmark badge in Media Pool)
  const usedMediaIds = useMemo(() => {
    const s = new Set<string>();
    clips.forEach((c) => {
      if (c.mediaId) s.add(c.mediaId);
    });
    return s;
  }, [clips]);

  // Cut timestamps for PlayerBar progress ticks
  const cutTimes = useMemo(() => {
    const cuts = new Set<number>();
    clips
      .filter((c) => c.type === 'video')
      .forEach((c) => {
        if (c.startTime > 0) cuts.add(c.startTime);
        cuts.add(c.startTime + c.duration);
      });
    return Array.from(cuts).sort((a, b) => a - b);
  }, [clips]);

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedClipId) || null,
    [clips, selectedClipId]
  );

  // Active main video clip under playhead
  const activeVideoClip = useMemo(() => {
    const mainClips = clips.filter(
      (c) =>
        c.type === 'video' &&
        currentTime >= c.startTime &&
        currentTime <= c.startTime + c.duration
    );
    return mainClips[0] || clips.find((c) => c.type === 'video') || null;
  }, [clips, currentTime]);

  const activeMediaFile = useMemo(() => {
    if (activeVideoClip?.mediaId) {
      const m = videoFiles.find((v) => v.id === activeVideoClip.mediaId);
      if (m) return m;
    }
    return videoFiles.find((v) => v.id === selectedMediaId) || videoFiles[0] || null;
  }, [activeVideoClip, videoFiles, selectedMediaId]);

  // Active Overlay clips under playhead (Titles, PiP videos, HUDs, GPS Gauges)
  const activeOverlayClips = useMemo(() => {
    return clips.filter((c) => {
      if (c.type !== 'overlay') return false;
      const tr = tracks.find((t) => t.id === c.trackId);
      if (!tr || !tr.visible) return false;
      return currentTime >= c.startTime && currentTime <= c.startTime + c.duration;
    });
  }, [clips, tracks, currentTime]);

  const activePiPClips = useMemo(
    () => activeOverlayClips.filter((c) => c.overlayKind === 'pip' && c.overlay?.enabled),
    [activeOverlayClips]
  );

  const activeTitleClips = useMemo(
    () => activeOverlayClips.filter((c) => c.overlayKind === 'title'),
    [activeOverlayClips]
  );

  const activeHudClip = useMemo(
    () => activeOverlayClips.find((c) => c.overlayKind === 'hud'),
    [activeOverlayClips]
  );

  const activeGaugeClips = useMemo(
    () => activeOverlayClips.filter((c) => c.overlayKind === 'gauge'),
    [activeOverlayClips]
  );

  const activeKeyframes = useMemo(() => {
    if (activeVideoClip?.keyframes && activeVideoClip.keyframes.length > 0) {
      return activeVideoClip.keyframes;
    }
    return fallbackKeyframes;
  }, [activeVideoClip, fallbackKeyframes]);

  // Transition overlay calculation (Crossfade / Dip-to-black / Flash-white)
  const activeTransitionOverlay = useMemo((): {
    type: 'black' | 'white';
    opacity: number;
  } | null => {
    if (!activeVideoClip) return null;
    const dur = activeVideoClip.transitionDuration || 1.0;
    const into = currentTime - activeVideoClip.startTime;
    const rem = activeVideoClip.startTime + activeVideoClip.duration - currentTime;

    if (activeVideoClip.transitionIn && activeVideoClip.transitionIn !== 'none' && into >= 0 && into <= dur) {
      const a = 1 - into / dur;
      return {
        type: activeVideoClip.transitionIn === 'flash-white' ? 'white' : 'black',
        opacity: Math.max(0, Math.min(1, a * (activeVideoClip.transitionIn === 'crossfade' ? 0.6 : 0.95)))
      };
    }
    if (activeVideoClip.transitionOut && activeVideoClip.transitionOut !== 'none' && rem >= 0 && rem <= dur) {
      const a = 1 - rem / dur;
      return {
        type: activeVideoClip.transitionOut === 'flash-white' ? 'white' : 'black',
        opacity: Math.max(0, Math.min(1, a * (activeVideoClip.transitionOut === 'crossfade' ? 0.6 : 0.95)))
      };
    }
    return null;
  }, [activeVideoClip, currentTime]);

  // Bind HTML5 <video> when active clip has a decodable blob URL
  useEffect(() => {
    const url = activeVideoClip?.sourceUrl;
    if (!url) {
      if (userVideoElRef.current) userVideoElRef.current.pause();
      setActiveVideoElement(null);
      return;
    }
    let vid = userVideoElRef.current;
    if (!vid) {
      vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.playsInline = true;
      vid.muted = true;
      vid.loop = true;
      userVideoElRef.current = vid;
    }
    if (vid.src !== url) {
      vid.src = url;
      vid.load();
    }
    setActiveVideoElement(vid);
  }, [activeVideoClip?.sourceUrl]);

  useEffect(() => {
    const vid = activeVideoElement;
    if (!vid || !activeVideoClip) return;
    const spd = (activeVideoClip.speed || 1) * playbackRate;
    vid.playbackRate = Math.max(0.25, Math.min(4, spd));
    const mediaTime =
      (currentTime - activeVideoClip.startTime) * (activeVideoClip.speed || 1) +
      activeVideoClip.offset;
    if (Math.abs(vid.currentTime - mediaTime) > 0.35) {
      try {
        vid.currentTime = Math.max(0, mediaTime);
      } catch {
        // ignore before metadata
      }
    }
    if (isPlaying && vid.paused) {
      vid.play().catch(() => {});
    } else if (!isPlaying && !vid.paused) {
      vid.pause();
    }
  }, [activeVideoElement, activeVideoClip, currentTime, isPlaying, playbackRate]);

  // Render procedural 360 equirectangular stream when using bundled OSV or fallback
  useEffect(() => {
    if (activeVideoElement) return;
    const renderer = osvRendererRef.current;
    if (!renderer) return;

    const isStitched = activeMediaFile ? activeMediaFile.stitched : true;
    const seamMode = activeMediaFile ? activeMediaFile.seamMode : 'depth-aware';
    const sceneTheme = activeVideoClip?.sceneTheme || activeMediaFile?.sceneTheme || 'flying-low';
    const clipSpeed = activeVideoClip?.speed || 1;
    const localSec = activeVideoClip
      ? (currentTime - activeVideoClip.startTime) * clipSpeed + activeVideoClip.offset
      : currentTime;

    renderer.renderFrame(
      Math.max(0, localSec),
      isStitched,
      seamMode,
      sceneTheme,
      tracker.active || tracker.isSelecting
    );
  }, [
    currentTime,
    activeVideoClip,
    activeMediaFile,
    activeVideoElement,
    tracker.active,
    tracker.isSelecting
  ]);

  // Current flight telemetry
  const currentTelemetry = useMemo(
    () => getInterpolatedTelemetry(telemetryPoints, Math.max(0, currentTime + gpxOffset)),
    [telemetryPoints, currentTime, gpxOffset]
  );

  // Sync Multitrack Audio Engine
  useEffect(() => {
    audioMixer.syncTimeline(
      isPlaying,
      isMuted,
      previewVolume,
      currentTime,
      currentTelemetry.throttle,
      tracks,
      clips
    );
  }, [isPlaying, isMuted, previewVolume, currentTime, currentTelemetry.throttle, tracks, clips]);

  // Keep mutable refs synchronized for real-time Free-Look recording & composite capture
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    latestCamRef.current = { yaw, pitch, roll, fov, projection };
  }, [yaw, pitch, roll, fov, projection]);

  // Sync cameraControlMode when activeVideoClip changes
  useEffect(() => {
    if (activeVideoClip?.cameraControlMode && activeVideoClip.cameraControlMode !== cameraControlMode) {
      setCameraControlMode(activeVideoClip.cameraControlMode);
      freeLookOverridePassRef.current = false;
    }
  }, [activeVideoClip?.id]);

  const handleSetCameraControlMode = useCallback(
    (mode: CameraControlMode) => {
      setCameraControlMode(mode);
      freeLookOverridePassRef.current = false;
      if (activeVideoClip) {
        setClips((prev) =>
          prev.map((c) => (c.id === activeVideoClip.id ? { ...c, cameraControlMode: mode } : c))
        );
      }
      showNotice(
        mode === 'free-look'
          ? 'Free look enabled: drag in viewer while playing; stopping locks viewpoint'
          : 'Keyframe mode enabled: interpolating timeline keyframes'
      );
    },
    [activeVideoClip, showNotice]
  );

  const handleToggleCameraControlMode = useCallback(() => {
    handleSetCameraControlMode(cameraControlMode === 'free-look' ? 'keyframes' : 'free-look');
  }, [cameraControlMode, handleSetCameraControlMode]);

  // Build Composited MediaStream (WebGL 360° + Colour LUT/EV + FPV HUD + Titles + Mixed Audio)
  const activeFiltersRef = useRef<VideoFilters>(globalFilters);
  const activeTitleClipsRef = useRef<TimelineClip[]>([]);
  const showWatermarkRef = useRef<boolean>(false);

  useEffect(() => {
    activeFiltersRef.current = activeVideoClip?.filters || globalFilters;
    activeTitleClipsRef.current = activeTitleClips;
    showWatermarkRef.current = Boolean(activeVideoClip?.showAvataWatermark);
  }, [activeVideoClip, globalFilters, activeTitleClips]);

  const captureCompositeStream = useCallback(
    (
      fps: number = 60,
      includeHUD: boolean = true,
      includeAudio: boolean = true
    ): { stream: MediaStream; stopCompositor: () => void } | null => {
      const webglCanvas = document.querySelector(
        'canvas[data-viewport-canvas="true"]'
      ) as HTMLCanvasElement | null;
      if (!webglCanvas || typeof document === 'undefined') return null;

      const compCanvas = document.createElement('canvas');
      compCanvas.width = Math.max(1280, webglCanvas.width || 1920);
      compCanvas.height = Math.max(720, webglCanvas.height || 1080);
      const ctx = compCanvas.getContext('2d');
      if (!ctx || typeof compCanvas.captureStream !== 'function') return null;

      let rafId = 0;
      const drawFrame = () => {
        const w = compCanvas.width;
        const h = compCanvas.height;
        ctx.save();
        ctx.fillStyle = '#141516';
        ctx.fillRect(0, 0, w, h);

        // 1. Draw reframed 360° WebGL sphere with active Colour LUT / EV grade
        const cssF = computeCSSFilterString(activeFiltersRef.current);
        ctx.filter = cssF && cssF !== 'none' ? cssF : 'none';
        try {
          ctx.drawImage(webglCanvas, 0, 0, w, h);
        } catch {
          // ignore transient resize
        }
        ctx.filter = 'none';

        if (includeHUD) {
          // 2. Composite FPV Telemetry HUD canvas if present
          const hudCanvas = document.querySelector(
            'canvas[data-hud-canvas="true"]'
          ) as HTMLCanvasElement | null;
          if (hudCanvas) {
            try {
              ctx.drawImage(hudCanvas, 0, 0, w, h);
            } catch {
              // ignore
            }
          }

          // 3. Composite active Title clips
          activeTitleClipsRef.current.forEach((tc) => {
            const posY = ((tc.textPositionY ?? 46) / 100) * h;
            const fontSize = Math.round(((tc.textFontSize ?? 48) / 540) * h);
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.65)';
            ctx.shadowBlur = 12;
            ctx.fillStyle = tc.textColor || '#f5f7fa';
            ctx.font = `300 ${Math.max(18, fontSize)}px Inter, system-ui, sans-serif`;
            ctx.fillText(tc.textContent || tc.title, w / 2, posY);
            if (tc.textSubline) {
              ctx.font = `500 ${Math.max(12, Math.round(fontSize * 0.28))}px Inter, system-ui, sans-serif`;
              ctx.fillStyle = 'rgba(255,255,255,0.85)';
              ctx.fillText(tc.textSubline.toUpperCase(), w / 2, posY + fontSize * 0.72);
            }
            ctx.restore();
          });

          // 4. Composite DJI AVATA 360 bottom mark when enabled on clip
          if (showWatermarkRef.current) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.shadowColor = 'rgba(0,0,0,0.65)';
            ctx.shadowBlur = 4;
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.font = `700 ${Math.round(h * 0.024)}px Inter, system-ui, sans-serif`;
            ctx.fillText('dji  AVATA 360', w / 2, h - Math.round(h * 0.028));
            ctx.restore();
          }
        }

        ctx.restore();
        rafId = requestAnimationFrame(drawFrame);
      };

      drawFrame();

      const stream = compCanvas.captureStream(fps);
      if (includeAudio) {
        const audioStream = audioMixer.getCaptureStream();
        if (audioStream) {
          audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
        }
      }

      return {
        stream,
        stopCompositor: () => {
          cancelAnimationFrame(rafId);
        }
      };
    },
    []
  );

  // Stop Live Free-Look Recording
  const stopFreeLookRecording = useCallback(() => {
    if (freeLookTimerRef.current) {
      window.clearInterval(freeLookTimerRef.current);
      freeLookTimerRef.current = null;
    }

    // Stamp final locked viewpoint at stop timestamp
    const cam = latestCamRef.current;
    freeLookSamplesRef.current.push({
      time: parseFloat(currentTimeRef.current.toFixed(2)),
      ...cam
    });
    const recordedSamples = [...freeLookSamplesRef.current];

    if (activeVideoClip && recordedSamples.length > 0) {
      setClips((prev) =>
        prev.map((c) =>
          c.id === activeVideoClip.id
            ? { ...c, cameraControlMode: 'free-look', freeLookSamples: recordedSamples }
            : c
        )
      );
    }

    if (freeLookRecorderRef.current && freeLookRecorderRef.current.state !== 'inactive') {
      freeLookRecorderRef.current.stop();
    } else {
      freeLookStopCompRef.current?.();
      freeLookStopCompRef.current = null;
    }

    setIsRecordingFreeLook(false);
    setIsPlaying(false);
    freeLookOverridePassRef.current = false;
    showNotice('Finished Free-Look recording — click "Save .webm" or File → Export flat video');
  }, [activeVideoClip, showNotice]);

  // Start / Toggle Live Free-Look Recording (Shift+R)
  const handleToggleRecordFreeLook = useCallback(() => {
    if (isRecordingFreeLook) {
      stopFreeLookRecording();
      return;
    }

    // Switch to Free-Look mode automatically & begin recording live viewer perspective
    handleSetCameraControlMode('free-look');
    freeLookOverridePassRef.current = true;
    const startSec = currentTime >= totalDuration - 0.5 ? 0 : currentTime;
    if (startSec === 0 && currentTime !== 0) {
      setCurrentTime(0);
    }

    const cam = latestCamRef.current;
    freeLookSamplesRef.current = [
      {
        time: parseFloat(startSec.toFixed(2)),
        ...cam
      }
    ];

    if (lastRecordedFreeLookUrl) {
      URL.revokeObjectURL(lastRecordedFreeLookUrl);
      setLastRecordedFreeLookUrl(null);
    }

    const comp = captureCompositeStream(projectSettings.frameRate, true, true);
    if (comp && typeof MediaRecorder !== 'undefined') {
      freeLookStopCompRef.current = comp.stopCompositor;
      const chunks: BlobPart[] = [];
      try {
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
          ? 'video/webm;codecs=vp9,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : '';
        const recorder = mimeType
          ? new MediaRecorder(comp.stream, { mimeType, videoBitsPerSecond: 14_000_000 })
          : new MediaRecorder(comp.stream);
        freeLookRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          freeLookStopCompRef.current?.();
          freeLookStopCompRef.current = null;
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: 'video/webm' });
            setLastRecordedFreeLookUrl(URL.createObjectURL(blob));
          }
        };
        recorder.start(100);
      } catch {
        freeLookRecorderRef.current = null;
      }
    }

    setRecordingSeconds(0);
    setIsRecordingFreeLook(true);
    setIsPlaying(true);

    const startedAt = performance.now();
    freeLookTimerRef.current = window.setInterval(() => {
      setRecordingSeconds((performance.now() - startedAt) / 1000);
    }, 200);

    showNotice('Recording Free Look — drag in 360° viewer to aim; release to lock perspective');
  }, [
    isRecordingFreeLook,
    stopFreeLookRecording,
    handleSetCameraControlMode,
    currentTime,
    totalDuration,
    lastRecordedFreeLookUrl,
    captureCompositeStream,
    projectSettings.frameRate,
    showNotice
  ]);

  const handleDownloadRecordedFreeLook = useCallback(() => {
    if (!lastRecordedFreeLookUrl) return;
    const base = activeMediaFile?.fileName.replace(/\.[^/.]+$/, '') || 'FreeLook_Capture';
    const a = document.createElement('a');
    a.href = lastRecordedFreeLookUrl;
    a.download = `${base}_freelook_${projectSettings.frameRate}fps.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotice(`Saved ${base}_freelook_${projectSettings.frameRate}fps.webm`);
  }, [lastRecordedFreeLookUrl, activeMediaFile, projectSettings.frameRate, showNotice]);

  const handleBakeFreeLookToKeyframes = useCallback(() => {
    if (!activeVideoClip?.freeLookSamples?.length) return;
    pushUndo();
    const baked = bakeFreeLookSamplesToKeyframes(activeVideoClip.freeLookSamples);
    setClips((prev) =>
      prev.map((c) =>
        c.id === activeVideoClip.id
          ? { ...c, keyframes: baked, cameraControlMode: 'keyframes' }
          : c
      )
    );
    setCameraControlMode('keyframes');
    showNotice(`Converted Free-Look pass into ${baked.length} keyframes`);
  }, [activeVideoClip, pushUndo, showNotice]);

  const handleClearFreeLookPass = useCallback(() => {
    if (!activeVideoClip) return;
    pushUndo();
    setClips((prev) =>
      prev.map((c) => (c.id === activeVideoClip.id ? { ...c, freeLookSamples: [] } : c))
    );
    freeLookOverridePassRef.current = false;
    showNotice('Cleared recorded Free-Look pass');
  }, [activeVideoClip, pushUndo, showNotice]);

  // Download Turnkey Fedora Linux Project Archive (.tar.gz)
  const handleDownloadProjectArchive = useCallback(() => {
    const a = document.createElement('a');
    a.href = '/orbis-reframe-avata-linux.tar.gz';
    a.download = 'orbis-reframe-avata-linux.tar.gz';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showNotice('Downloading orbis-reframe-avata-linux.tar.gz for Fedora Linux');
  }, [showNotice]);

  useEffect(() => () => audioMixer.stopAll(), []);

  const syncCameraToTime = useCallback(
    (sec: number) => {
      if (cameraControlMode === 'free-look') {
        // In Free-Look mode:
        // - If user is dragging OR recording live OR manually steered over a recorded pass,
        //   keep the exact locked viewpoint they stopped moving on!
        if (
          isUserDraggingViewerRef.current ||
          isRecordingFreeLook ||
          freeLookOverridePassRef.current ||
          !activeVideoClip?.freeLookSamples?.length
        ) {
          return;
        }
        // Otherwise replay their recorded Free-Look pass (including exact viewpoint-lock holds!)
        const fl = getFreeLookRecordedCamera(
          activeVideoClip.freeLookSamples,
          sec,
          latestCamRef.current
        );
        setYaw(parseFloat(fl.yaw.toFixed(1)));
        setPitch(parseFloat(fl.pitch.toFixed(1)));
        setRoll(parseFloat(fl.roll.toFixed(1)));
        setFov(parseFloat(fl.fov.toFixed(1)));
        setProjection(fl.projection);
        return;
      }

      const interp = getInterpolatedCamera(activeKeyframes, sec);
      setYaw(parseFloat(interp.yaw.toFixed(1)));
      setPitch(parseFloat(interp.pitch.toFixed(1)));
      setRoll(parseFloat(interp.roll.toFixed(1)));
      setFov(parseFloat(interp.fov.toFixed(1)));
      setDistortion(Math.round(interp.distortion));
      setProjection(interp.projection);
    },
    [cameraControlMode, isRecordingFreeLook, activeVideoClip, activeKeyframes]
  );

  // Playback rAF loop
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.1, ((now - last) / 1000) * playbackRate);
      last = now;
      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= totalDuration) {
          if (isRecordingFreeLook) {
            setTimeout(() => stopFreeLookRecording(), 0);
          }
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, playbackRate, totalDuration, isRecordingFreeLook, stopFreeLookRecording]);

  useEffect(() => {
    if (isPlaying) {
      syncCameraToTime(currentTime);
    }
  }, [currentTime, isPlaying, syncCameraToTime]);

  const handleSeek = useCallback(
    (sec: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, sec));
      setCurrentTime(clamped);
      freeLookOverridePassRef.current = false;
      syncCameraToTime(clamped);
    },
    [totalDuration, syncCameraToTime]
  );

  const handleStepFrame = useCallback(
    (dir: -1 | 1) => {
      setIsPlaying(false);
      handleSeek(currentTime + dir * (1 / projectSettings.frameRate));
    },
    [currentTime, projectSettings.frameRate, handleSeek]
  );

  const handleJumpCutOrKey = useCallback(
    (dir: -1 | 1) => {
      const pts = new Set<number>([0, totalDuration, ...cutTimes]);
      activeKeyframes.forEach((k) => pts.add(k.time));
      const sorted = Array.from(pts).sort((a, b) => a - b);
      if (dir < 0) {
        const prev = [...sorted].reverse().find((t) => t < currentTime - 0.08);
        if (prev !== undefined) handleSeek(prev);
      } else {
        const next = sorted.find((t) => t > currentTime + 0.08);
        if (next !== undefined) handleSeek(next);
      }
    },
    [totalDuration, cutTimes, activeKeyframes, currentTime, handleSeek]
  );

  // Set / Update Reframe Keyframe
  const stampKeyframeValues = useCallback(
    (ky: number, kp: number, kr: number, kf: number, kdist: number = distortion) => {
      const newKf: Keyframe360 = {
        id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        time: parseFloat(currentTime.toFixed(2)),
        yaw: ky,
        pitch: kp,
        roll: kr,
        fov: kf,
        distortion: kdist,
        projection,
        easing: currentEasing
      };

      if (activeVideoClip) {
        const kept = (activeVideoClip.keyframes || []).filter(
          (k) => Math.abs(k.time - currentTime) > 0.15
        );
        const merged = [...kept, newKf].sort((a, b) => a.time - b.time);
        setClips((prev) =>
          prev.map((c) =>
            c.id === activeVideoClip.id
              ? { ...c, cameraControlMode: 'keyframes', keyframes: merged }
              : c
          )
        );
      } else {
        setFallbackKeyframes((prev) =>
          [...prev.filter((k) => Math.abs(k.time - currentTime) > 0.15), newKf].sort(
            (a, b) => a.time - b.time
          )
        );
      }
      setCameraControlMode('keyframes');
    },
    [currentTime, distortion, projection, currentEasing, activeVideoClip]
  );

  const handleSetKeyframe = useCallback(() => {
    pushUndo();
    stampKeyframeValues(yaw, pitch, roll, fov, distortion);
    showNotice(`Set keyframe at ${currentTime.toFixed(2)} s (switched to Keyframes mode)`);
  }, [pushUndo, stampKeyframeValues, yaw, pitch, roll, fov, distortion, currentTime, showNotice]);

  const handleDeleteKeyAtPlayhead = useCallback(() => {
    pushUndo();
    if (activeVideoClip) {
      setClips((prev) =>
        prev.map((c) =>
          c.id === activeVideoClip.id
            ? {
                ...c,
                keyframes: (c.keyframes || []).filter((k) => Math.abs(k.time - currentTime) > 0.2)
              }
            : c
        )
      );
    }
    showNotice('Deleted keyframe at playhead');
  }, [pushUndo, activeVideoClip, currentTime, showNotice]);

  const handleClearAllKeysOnClip = useCallback(() => {
    if (!activeVideoClip) return;
    pushUndo();
    setClips((prev) =>
      prev.map((c) => (c.id === activeVideoClip.id ? { ...c, keyframes: [] } : c))
    );
    showNotice('Cleared reframe keyframes on clip');
  }, [activeVideoClip, pushUndo, showNotice]);

  // Apply Camera Trick
  const handleApplyCameraTrick = useCallback(
    (trickId: CameraTrickId, duration: number = 3.0) => {
      pushUndo();
      const trickKfs = generateCameraTrickKeyframes(trickId, currentTime, duration, {
        yaw,
        pitch,
        roll,
        fov,
        projection
      });
      const endT = currentTime + duration;
      if (activeVideoClip) {
        const kept = (activeVideoClip.keyframes || []).filter(
          (k) => k.time < currentTime - 0.05 || k.time > endT + 0.05
        );
        const merged = [...kept, ...trickKfs].sort((a, b) => a.time - b.time);
        setClips((prev) =>
          prev.map((c) =>
            c.id === activeVideoClip.id
              ? {
                  ...c,
                  is360: true,
                  cameraControlMode: 'keyframes',
                  fitMode: 'reframe-360',
                  keyframes: merged
                }
              : c
          )
        );
      }
      setCameraControlMode('keyframes');
      if (trickKfs[0]) {
        setYaw(trickKfs[0].yaw);
        setPitch(trickKfs[0].pitch);
        setRoll(trickKfs[0].roll);
        setFov(trickKfs[0].fov);
        setProjection(trickKfs[0].projection);
      }
      showNotice(`Added ${trickId} (${duration.toFixed(1)} s)`);
    },
    [pushUndo, currentTime, yaw, pitch, roll, fov, projection, activeVideoClip, showNotice]
  );

  // Track Creation
  const handleAddOverlayTrack = useCallback((): string => {
    pushUndo();
    const count = tracks.filter((t) => t.type === 'overlay').length + 1;
    const newTrack: Track = {
      id: `track-overlay-${Date.now()}`,
      name: `Overlay ${count}`,
      type: 'overlay',
      layerNumber: count,
      muted: false,
      solo: false,
      locked: false,
      visible: true
    };
    setTracks((prev) => [newTrack, ...prev]);
    showNotice(`Added ${newTrack.name}`);
    return newTrack.id;
  }, [tracks, pushUndo, showNotice]);

  const handleAddAudioTrack = useCallback((): string => {
    pushUndo();
    const count = tracks.filter((t) => t.type === 'audio' && !t.isCameraMic).length + 1;
    const newTrack: Track = {
      id: `track-audio-${Date.now()}`,
      name: `Audio ${count}`,
      type: 'audio',
      muted: false,
      solo: false,
      locked: false,
      visible: true
    };
    setTracks((prev) => [...prev, newTrack]);
    showNotice(`Added ${newTrack.name}`);
    return newTrack.id;
  }, [tracks, pushUndo, showNotice]);

  // EditToolbar Operations: Split, Trim In, Trim Out, Restore, Duplicate, Delete, Marks
  const targetEditableClip = selectedClip || activeVideoClip;

  const handleSplitAtPlayhead = useCallback(() => {
    const clip =
      (targetEditableClip &&
      currentTime > targetEditableClip.startTime + 0.2 &&
      currentTime < targetEditableClip.startTime + targetEditableClip.duration - 0.2
        ? targetEditableClip
        : null) ||
      clips.find(
        (c) => currentTime > c.startTime + 0.2 && currentTime < c.startTime + c.duration - 0.2
      );

    if (!clip) {
      showNotice('Move playhead inside a clip to split');
      return;
    }

    pushUndo();
    const leftDur = parseFloat((currentTime - clip.startTime).toFixed(2));
    const rightDur = parseFloat((clip.duration - leftDur).toFixed(2));
    const rightStart = parseFloat(currentTime.toFixed(2));
    const rightOffset = parseFloat((clip.offset + leftDur * (clip.speed || 1)).toFixed(2));
    const rightVideoId = `clip-${Date.now()}`;

    setClips((prev) =>
      prev.flatMap((c) => {
        if (c.id === clip.id) {
          return [
            {
              ...c,
              duration: leftDur,
              keyframes: c.keyframes?.filter((k) => k.time <= rightStart + 0.05)
            },
            {
              ...c,
              id: rightVideoId,
              startTime: rightStart,
              duration: rightDur,
              offset: rightOffset,
              keyframes: c.keyframes?.filter((k) => k.time >= rightStart - 0.05)
            }
          ];
        }
        // Also split linked Camera mic clip automatically if splitting main Video clip!
        if (clip.type === 'video' && c.linkedVideoClipId === clip.id) {
          return [
            { ...c, duration: leftDur },
            {
              ...c,
              id: `clip-mic-${Date.now()}`,
              linkedVideoClipId: rightVideoId,
              startTime: rightStart,
              duration: rightDur,
              offset: rightOffset
            }
          ];
        }
        return [c];
      })
    );
    setSelectedClipId(rightVideoId);
    showNotice(`Split ${clip.title} at ${currentTime.toFixed(2)} s`);
  }, [targetEditableClip, clips, currentTime, pushUndo, showNotice]);

  const handleTrimInToPlayhead = useCallback(() => {
    if (!targetEditableClip) return;
    if (
      currentTime <= targetEditableClip.startTime ||
      currentTime >= targetEditableClip.startTime + targetEditableClip.duration - 0.3
    ) {
      return;
    }
    pushUndo();
    const cut = currentTime - targetEditableClip.startTime;
    const nextStart = parseFloat(currentTime.toFixed(2));
    const nextDur = parseFloat((targetEditableClip.duration - cut).toFixed(2));
    const nextOffset = parseFloat((targetEditableClip.offset + cut).toFixed(2));

    setClips((prev) =>
      prev.map((c) => {
        if (c.id === targetEditableClip.id || c.linkedVideoClipId === targetEditableClip.id) {
          return { ...c, startTime: nextStart, duration: nextDur, offset: nextOffset };
        }
        return c;
      })
    );
    showNotice('Trimmed clip start to playhead');
  }, [targetEditableClip, currentTime, pushUndo, showNotice]);

  const handleTrimOutToPlayhead = useCallback(() => {
    if (!targetEditableClip) return;
    if (
      currentTime <= targetEditableClip.startTime + 0.3 ||
      currentTime >= targetEditableClip.startTime + targetEditableClip.duration
    ) {
      return;
    }
    pushUndo();
    const nextDur = parseFloat((currentTime - targetEditableClip.startTime).toFixed(2));
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === targetEditableClip.id || c.linkedVideoClipId === targetEditableClip.id) {
          return { ...c, duration: nextDur };
        }
        return c;
      })
    );
    showNotice('Trimmed clip end to playhead');
  }, [targetEditableClip, currentTime, pushUndo, showNotice]);

  const handleRestoreClipTrim = useCallback(() => {
    if (!targetEditableClip) return;
    pushUndo();
    const fullDur = targetEditableClip.sourceDuration || 60;
    setClips((prev) =>
      prev.map((c) => {
        if (c.id === targetEditableClip.id || c.linkedVideoClipId === targetEditableClip.id) {
          return { ...c, offset: 0, duration: fullDur };
        }
        return c;
      })
    );
    showNotice('Restored full clip length');
  }, [targetEditableClip, pushUndo, showNotice]);

  const handleDuplicateSelected = useCallback(() => {
    if (!selectedClip) return;
    pushUndo();
    const shift = selectedClip.duration;
    const dupId = `clip-dup-${Date.now()}`;
    const dup: TimelineClip = {
      ...selectedClip,
      id: dupId,
      startTime: parseFloat((selectedClip.startTime + shift).toFixed(2)),
      keyframes: selectedClip.keyframes?.map((k) => ({
        ...k,
        id: `kf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        time: parseFloat((k.time + shift).toFixed(2))
      }))
    };
    setClips((prev) => [...prev, dup]);
    setSelectedClipId(dupId);
    showNotice(`Duplicated ${selectedClip.title}`);
  }, [selectedClip, pushUndo, showNotice]);

  const handleDeleteClip = useCallback(
    (clipId: string) => {
      pushUndo();
      setClips((prev) =>
        prev.filter((c) => c.id !== clipId && c.linkedVideoClipId !== clipId)
      );
      if (selectedClipId === clipId) setSelectedClipId(null);
      showNotice('Deleted clip');
    },
    [selectedClipId, pushUndo, showNotice]
  );

  const handleAddMark = useCallback(() => {
    if (!activeVideoClip) return;
    pushUndo();
    const t = parseFloat(currentTime.toFixed(2));
    setClips((prev) =>
      prev.map((c) =>
        c.id === activeVideoClip.id
          ? { ...c, marks: [...(c.marks || []), t] }
          : c
      )
    );
    showNotice(`Added mark at ${t.toFixed(2)} s`);
  }, [activeVideoClip, currentTime, pushUndo, showNotice]);

  const handleDeleteMark = useCallback(() => {
    if (!activeVideoClip) return;
    pushUndo();
    setClips((prev) =>
      prev.map((c) =>
        c.id === activeVideoClip.id
          ? {
              ...c,
              marks: (c.marks || []).filter((m) => Math.abs(m - currentTime) > 0.5)
            }
          : c
      )
    );
    showNotice('Deleted mark near playhead');
  }, [activeVideoClip, currentTime, pushUndo, showNotice]);

  // Add Video / OSV or PiP to Timeline
  const handleAddVideoToTimeline = useCallback(
    (file: OSVFileMetadata, asPiP: boolean = false, atStartSec?: number) => {
      pushUndo();

      if (asPiP) {
        const ovTracks = tracks.filter((t) => t.type === 'overlay');
        const trackId = ovTracks[0]?.id || handleAddOverlayTrack();
        const startT = atStartSec !== undefined ? atStartSec : parseFloat(currentTime.toFixed(2));
        const pipClip: TimelineClip = {
          id: `clip-pip-${Date.now()}`,
          trackId,
          type: 'overlay',
          overlayKind: 'pip',
          title: file.fileName,
          mediaId: file.id,
          sourceUrl: file.videoUrl,
          sourceType: file.videoUrl ? 'file' : 'procedural',
          is360: false,
          sceneTheme: file.sceneTheme || 'cockpit-pip',
          startTime: startT,
          duration: Math.min(file.duration, 30),
          sourceDuration: file.duration,
          offset: 0,
          volume: 0,
          speed: 1,
          filters: { ...DEFAULT_VIDEO_FILTERS },
          overlay: {
            enabled: true,
            mode: 'pip-corner',
            x: 70,
            y: 10,
            scale: 26,
            opacity: 0.95,
            border: true
          }
        };
        setClips((prev) => [...prev, pipClip]);
        setSelectedClipId(pipClip.id);
        setRightTab('pip');
        showNotice(`Added Picture-in-Picture: ${file.fileName}`);
        return;
      }

      const mainTrack = tracks.find((t) => t.isMainVideo) || tracks.find((t) => t.type === 'video');
      const camMicTrack = tracks.find((t) => t.isCameraMic);
      if (!mainTrack) return;

      const mainEnd = clips
        .filter((c) => c.trackId === mainTrack.id)
        .reduce((acc, c) => Math.max(acc, c.startTime + c.duration), 0);

      const startT = atStartSec !== undefined ? parseFloat(atStartSec.toFixed(2)) : mainEnd;
      const vidClipId = `clip-vid-${Date.now()}`;

      const vidClip: TimelineClip = {
        id: vidClipId,
        trackId: mainTrack.id,
        type: 'video',
        title: file.fileName,
        mediaId: file.id,
        sourceUrl: file.videoUrl,
        sourceType: file.videoUrl ? 'file' : 'procedural',
        is360: file.is360,
        cameraControlMode: file.is360 ? 'free-look' : undefined,
        fitMode: file.is360 ? 'reframe-360' : 'contain-bars',
        splitScreen: 'off',
        sceneTheme: file.sceneTheme || 'alpine',
        startTime: startT,
        duration: file.duration,
        sourceDuration: file.duration,
        offset: 0,
        speed: 1,
        volume: 85,
        filters: { ...DEFAULT_VIDEO_FILTERS },
        privacyBlur: {
          enabled: false,
          mode: 'nadir-tripod',
          showRegions: false,
          scanned: false,
          radius: 16,
          strength: 12
        },
        keyframes: file.is360
          ? [
              {
                id: `kf-init-${Date.now()}`,
                time: startT,
                yaw: 0,
                pitch: -4,
                roll: 0,
                fov: 92,
                distortion: 0,
                projection: 'perspective',
                easing: 'ease-in-out'
              }
            ]
          : []
      };

      const newClips: TimelineClip[] = [vidClip];
      if (camMicTrack) {
        newClips.push({
          id: `clip-mic-${Date.now()}`,
          trackId: camMicTrack.id,
          type: 'audio',
          title: file.fileName,
          linkedVideoClipId: vidClipId,
          synthPreset: 'motors',
          sourceType: 'procedural',
          startTime: startT,
          duration: file.duration,
          sourceDuration: file.duration,
          offset: 0,
          volume: 80,
          windNoiseFilter: true,
          speed: 1
        });
      }

      setClips((prev) => [...prev, ...newClips]);
      setSelectedClipId(vidClipId);
      setSelectedMediaId(file.id);
      handleSeek(startT);
      showNotice(`Added ${file.fileName} to timeline`);
    },
    [tracks, clips, currentTime, handleAddOverlayTrack, pushUndo, handleSeek, showNotice]
  );

  // Import local video / OSV files asynchronously with real probe
  const handleImportVideoFiles = useCallback(
    async (fileList: FileList, asPiP: boolean = false) => {
      const files = Array.from(fileList);
      for (const f of files) {
        const ext = f.name.split('.').pop()?.toLowerCase() || '';
        if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
          const aud = await probeUploadedAudioFile(f);
          setAudioFiles((prev) => [aud, ...prev]);
          showNotice(`Imported audio ${aud.fileName}`);
        } else {
          const probed = await probeUploadedVideoFile(f, asPiP);
          setVideoFiles((prev) => [probed, ...prev]);
          handleAddVideoToTimeline(probed, asPiP);
        }
      }
    },
    [handleAddVideoToTimeline, showNotice]
  );

  const handleAddAudioToTimeline = useCallback(
    (audio: AudioAssetMetadata) => {
      pushUndo();
      const nonMicTracks = tracks.filter((t) => t.type === 'audio' && !t.isCameraMic);
      const trackId = nonMicTracks[0]?.id || handleAddAudioTrack();
      const audClip: TimelineClip = {
        id: `clip-aud-${Date.now()}`,
        trackId,
        type: 'audio',
        title: audio.fileName,
        mediaId: audio.id,
        sourceUrl: audio.audioUrl,
        sourceType: audio.audioUrl ? 'file' : 'procedural',
        synthPreset: audio.synthPreset || 'synth-drive',
        startTime: parseFloat(currentTime.toFixed(2)),
        duration: audio.duration,
        sourceDuration: audio.duration,
        offset: 0,
        volume: 75,
        speed: 1
      };
      setClips((prev) => [...prev, audClip]);
      setSelectedClipId(audClip.id);
      setRightTab('audio');
      showNotice(`Added audio: ${audio.fileName}`);
    },
    [tracks, currentTime, handleAddAudioTrack, pushUndo, showNotice]
  );

  const handleImportAudioFiles = useCallback(
    async (fileList: FileList) => {
      for (const f of Array.from(fileList)) {
        const aud = await probeUploadedAudioFile(f);
        setAudioFiles((prev) => [aud, ...prev]);
        handleAddAudioToTimeline(aud);
      }
    },
    [handleAddAudioToTimeline]
  );

  // Add Overlay Preset Tile (Title, Watermark, DJI O3 HUD, Betaflight OSD, or GPS Speed/Heading/G Gauge)
  const handleAddOverlayPreset = useCallback(
    (preset: OverlayPresetTile) => {
      pushUndo();
      const ovTracks = tracks.filter((t) => t.type === 'overlay');
      const trackId = ovTracks[0]?.id || handleAddOverlayTrack();
      const startT = parseFloat(currentTime.toFixed(2));

      if (preset.kind === 'hud') {
        if (preset.hudPreset) {
          setHudConfig((h) => ({ ...h, preset: preset.hudPreset! }));
        }
        const hudClip: TimelineClip = {
          id: `clip-hud-${Date.now()}`,
          trackId,
          type: 'overlay',
          overlayKind: 'hud',
          title: preset.label,
          startTime: startT,
          duration: 30,
          sourceDuration: 30,
          offset: 0
        };
        setClips((prev) => [...prev, hudClip]);
        setSelectedClipId(hudClip.id);
        setRightTab('overlay');
        showNotice(`Placed ${preset.label}`);
        return;
      }

      if (preset.kind === 'gauge') {
        const gClip: TimelineClip = {
          id: `clip-gauge-${Date.now()}`,
          trackId,
          type: 'overlay',
          overlayKind: 'gauge',
          title: preset.label,
          gaugeSettings: {
            kind: preset.gaugeKind || 'speed-dial',
            unitSystem: 'metric',
            accentColor: '#f5a04a',
            faceOpacity: 70
          },
          startTime: startT,
          duration: 24,
          sourceDuration: 24,
          offset: 0
        };
        setClips((prev) => [...prev, gClip]);
        setSelectedClipId(gClip.id);
        setRightTab('overlay');
        showNotice(`Placed ${preset.label}`);
        return;
      }

      // Title preset
      const tClip: TimelineClip = {
        id: `clip-title-${Date.now()}`,
        trackId,
        type: 'overlay',
        overlayKind: 'title',
        title: preset.previewText || 'Title',
        textContent: preset.previewText || 'Flying Low',
        textSubline: preset.subText,
        textPositionY: preset.id === 'title-lower-third' ? 80 : preset.id === 'title-avata-badge' ? 90 : 46,
        textFontSize: preset.id === 'title-avata-badge' ? 18 : 48,
        textColor: '#f5f7fa',
        startTime: startT,
        duration: 10,
        sourceDuration: 10,
        offset: 0,
        transitionIn: 'crossfade',
        transitionOut: 'crossfade',
        transitionDuration: 0.6
      };
      setClips((prev) => [...prev, tClip]);
      setSelectedClipId(tClip.id);
      setRightTab('overlay');
      showNotice(`Placed title "${tClip.title}"`);
    },
    [tracks, currentTime, handleAddOverlayTrack, pushUndo, showNotice]
  );

  // Apply Transition from Left Transitions Tab
  const handleApplyTransitionAtPlayhead = useCallback(
    (type: TransitionType) => {
      const target = selectedClip || activeVideoClip;
      if (!target) return;
      pushUndo();
      setClips((prev) =>
        prev.map((c) =>
          c.id === target.id
            ? { ...c, transitionIn: type, transitionOut: type, transitionDuration: 1.0 }
            : c
        )
      );
      setRightTab('transition');
      showNotice(`Applied ${type} transition to ${target.title}`);
    },
    [selectedClip, activeVideoClip, pushUndo, showNotice]
  );

  // Run CSRT Subject Tracker
  const handleRunSubjectTracker = useCallback(() => {
    pushUndo();
    const start = activeVideoClip ? activeVideoClip.startTime : 0;
    const dur = activeVideoClip ? Math.min(activeVideoClip.duration, 40) : 24;
    const kfs = generateTrackingKeyframes(start, dur, 2.0);
    if (activeVideoClip) {
      setClips((prev) =>
        prev.map((c) => (c.id === activeVideoClip.id ? { ...c, keyframes: kfs } : c))
      );
    }
    setTracker((t) => ({ ...t, active: true }));
    showNotice(`Tracked subject (${kfs.length} keyframes written)`);
  }, [activeVideoClip, pushUndo, showNotice]);

  // Save Screenshot (PlayerBar Camera button / Ctrl+Shift+P)
  const handleSaveScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `orbis-reframe-${currentTime.toFixed(2)}s.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showNotice(`Saved screenshot orbis-reframe-${currentTime.toFixed(2)}s.png`);
    } catch {
      showNotice('Could not capture screenshot');
    }
  }, [currentTime, showNotice]);

  // Save / Open / Preset .orp Projects
  const handleSaveProjectFile = useCallback(() => {
    const payload = {
      format: 'orbis-reframe-project',
      version: 2,
      projectSettings: { ...projectSettings, modified: false },
      tracks,
      clips: clips.map((c) => ({ ...c, sourceUrl: undefined })),
      stabilizer,
      hudConfig,
      gpxOffset
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = projectSettings.projectName.endsWith('.orp')
      ? projectSettings.projectName
      : `${projectSettings.projectName}.orp`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setProjectSettings((s) => ({ ...s, modified: false }));
    showNotice(`Saved ${projectSettings.projectName}`);
  }, [projectSettings, tracks, clips, stabilizer, hudConfig, gpxOffset, showNotice]);

  const handleOpenProjectFromDisk = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (Array.isArray(data.tracks) && Array.isArray(data.clips)) {
          pushUndo();
          setTracks(data.tracks);
          setClips(data.clips);
          if (data.projectSettings) setProjectSettings(data.projectSettings);
          setCurrentTime(0);
          showNotice(`Opened ${f.name}`);
        }
      } catch {
        showNotice('Could not parse project file');
      }
      e.target.value = '';
    },
    [pushUndo, showNotice]
  );

  const handleLoadPresetProject = useCallback(
    (preset: 'flying-low' | 'alpine-acro' | 'empty') => {
      pushUndo();
      setIsPlaying(false);
      setCurrentTime(0);

      if (preset === 'empty') {
        setProjectSettings((s) => ({ ...s, projectName: 'Untitled.orp', modified: false }));
        setTracks([
          { id: 'track-video-main', name: 'Video', type: 'video', isMainVideo: true, expanded: true, muted: false, solo: false, locked: false, visible: true },
          { id: 'track-camera-mic', name: 'Camera mic', type: 'audio', isCameraMic: true, muted: false, solo: false, locked: false, visible: true }
        ]);
        setClips([]);
        setSelectedClipId(null);
        showNotice('Created new empty project');
        return;
      }

      if (preset === 'alpine-acro') {
        setProjectSettings((s) => ({ ...s, projectName: 'Alpine_Avata_HUD.orp', modified: false }));
        setTracks([
          { id: 'track-ov-2', name: 'Overlay 2', type: 'overlay', layerNumber: 2, muted: false, solo: false, locked: false, visible: true },
          { id: 'track-ov-1', name: 'Overlay 1', type: 'overlay', layerNumber: 1, muted: false, solo: false, locked: false, visible: true },
          { id: 'track-video-main', name: 'Video', type: 'video', isMainVideo: true, expanded: true, muted: false, solo: false, locked: false, visible: true },
          { id: 'track-camera-mic', name: 'Camera mic', type: 'audio', isCameraMic: true, muted: false, solo: false, locked: false, visible: true },
          { id: 'track-aud-1', name: 'Audio 1', type: 'audio', muted: false, solo: false, locked: false, visible: true }
        ]);
        setClips([
          {
            id: 'clip-alp-v1',
            trackId: 'track-video-main',
            type: 'video',
            title: 'DJI_Avata_Alpine_Dive.osv',
            mediaId: 'osv-alpine-dive',
            startTime: 0,
            duration: 48,
            sourceDuration: 48,
            offset: 0,
            sourceType: 'procedural',
            is360: true,
            fitMode: 'reframe-360',
            splitScreen: 'off',
            sceneTheme: 'alpine',
            speed: 1,
            volume: 85,
            filters: { ...DEFAULT_VIDEO_FILTERS, lut: 'd-log-m' },
            keyframes: [...INITIAL_ORBIS_KEYFRAMES]
          },
          {
            id: 'clip-alp-mic',
            trackId: 'track-camera-mic',
            type: 'audio',
            title: 'DJI_Avata_Alpine_Dive.osv',
            linkedVideoClipId: 'clip-alp-v1',
            synthPreset: 'motors',
            sourceType: 'procedural',
            startTime: 0,
            duration: 48,
            sourceDuration: 48,
            offset: 0,
            volume: 75,
            windNoiseFilter: true,
            speed: 1
          },
          {
            id: 'clip-alp-hud',
            trackId: 'track-ov-1',
            type: 'overlay',
            overlayKind: 'hud',
            title: 'DJI O3 Flight HUD',
            startTime: 0,
            duration: 48,
            sourceDuration: 48,
            offset: 0
          },
          {
            id: 'clip-alp-pip',
            trackId: 'track-ov-2',
            type: 'overlay',
            overlayKind: 'pip',
            title: 'FPV_Controller_StickCam.mp4',
            mediaId: 'mp4-stickcam-pip',
            startTime: 2,
            duration: 24,
            sourceDuration: 60,
            offset: 0,
            overlay: { enabled: true, mode: 'pip-corner', x: 72, y: 12, scale: 24, opacity: 0.92, border: true }
          },
          {
            id: 'clip-alp-mus',
            trackId: 'track-aud-1',
            type: 'audio',
            title: 'Flight_Telemetry_Pulse.mp3',
            mediaId: 'aud-horizon-pulse',
            synthPreset: 'synth-drive',
            sourceType: 'procedural',
            startTime: 0,
            duration: 48,
            sourceDuration: 120,
            offset: 0,
            volume: 60,
            speed: 1
          }
        ]);
        setSelectedClipId('clip-alp-v1');
        showNotice('Opened Alpine_Avata_HUD.orp');
        return;
      }

      const init = createInitialOrbisWorkspace();
      setProjectSettings((s) => ({ ...s, projectName: 'Experiment.orp', modified: true }));
      setTracks(init.tracks);
      setClips(init.clips);
      setSelectedClipId('clip-main-1');
      showNotice('Opened Experiment.orp');
    },
    [pushUndo, showNotice]
  );

  // Keyboard Shortcuts matching Schabo/orbis-reframe
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStepFrame(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStepFrame(1);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && e.shiftKey) {
        e.preventDefault();
        setRightSidebarOpen((o) => !o);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setLeftSidebarOpen((o) => !o);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        importFilesInputRef.current?.click();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setActiveDialog('export');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProjectFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key === '[') {
        e.preventDefault();
        handleTrimInToPlayhead();
      } else if (e.key === ']') {
        e.preventDefault();
        handleTrimOutToPlayhead();
      } else if (e.key.toLowerCase() === 'r' && e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleToggleRecordFreeLook();
      } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleRestoreClipTrim();
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleToggleCameraControlMode();
      } else if (e.key.toLowerCase() === 'a' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setReframeArmed((a) => !a);
      } else if (e.key.toLowerCase() === 'k' && e.shiftKey) {
        e.preventDefault();
        handleDeleteKeyAtPlayhead();
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleSetKeyframe();
      } else if (e.key.toLowerCase() === 'm' && e.shiftKey) {
        e.preventDefault();
        handleDeleteMark();
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleAddMark();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          handleDeleteClip(selectedClipId);
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    selectedClipId,
    handleStepFrame,
    handleUndo,
    handleRedo,
    handleSaveProjectFile,
    handleDuplicateSelected,
    handleSplitAtPlayhead,
    handleTrimInToPlayhead,
    handleTrimOutToPlayhead,
    handleRestoreClipTrim,
    handleToggleRecordFreeLook,
    handleToggleCameraControlMode,
    handleDeleteKeyAtPlayhead,
    handleSetKeyframe,
    handleAddMark,
    handleDeleteMark,
    handleDeleteClip
  ]);

  const aspectClass =
    previewAspect === '9:16'
      ? 'aspect-[9/16] h-full max-w-full'
      : previewAspect === '1:1'
      ? 'aspect-square h-full max-w-full'
      : previewAspect === '21:9'
      ? 'aspect-[21/9] w-full max-h-full'
      : 'aspect-video w-full max-h-full';

  return (
    <div
      style={{ backgroundColor: theme.window, color: theme.text }}
      className="h-screen w-screen flex flex-col overflow-hidden select-none"
    >
      {/* Hidden File Inputs */}
      <input
        ref={importFilesInputRef}
        type="file"
        accept=".osv,.insv,.mp4,.mov,.webm,.mp3,.wav,.ogg,video/*,audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleImportVideoFiles(e.target.files, false);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={importPiPInputRef}
        type="file"
        accept=".mp4,.mov,.webm,.osv,.insv,video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleImportVideoFiles(e.target.files, true);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={importAudioInputRef}
        type="file"
        accept=".mp3,.wav,.ogg,.flac,.m4a,audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleImportAudioFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={openProjectInputRef}
        type="file"
        accept=".orp,.json"
        className="hidden"
        onChange={handleOpenProjectFromDisk}
      />

      {/* 1. TOP NATIVE MENU BAR (File | Edit | Media | View | Help) */}
      <OrbisHeader
        projectName={projectSettings.projectName}
        modified={projectSettings.modified}
        theme={theme}
        themeId={themeId}
        onChangeTheme={setThemeId}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        hasClips={clips.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNewProject={() => handleLoadPresetProject('empty')}
        onOpenProjectFile={() => openProjectInputRef.current?.click()}
        onSaveProjectFile={handleSaveProjectFile}
        onOpenDialog={setActiveDialog}
        onQuickImportFiles={() => importFilesInputRef.current?.click()}
        onQuickImportAudio={() => importAudioInputRef.current?.click()}
        onQuickImportPiP={() => importPiPInputRef.current?.click()}
        onAddSelectedMediaToTimeline={() => {
          const mf = videoFiles.find((v) => v.id === selectedMediaId) || videoFiles[0];
          if (mf) handleAddVideoToTimeline(mf, false);
        }}
        onAddAudioTrack={handleAddAudioTrack}
        onAddOverlayTrack={handleAddOverlayTrack}
        onSplitAtPlayhead={handleSplitAtPlayhead}
        onTrimInToPlayhead={handleTrimInToPlayhead}
        onTrimOutToPlayhead={handleTrimOutToPlayhead}
        onRestoreClipTrim={handleRestoreClipTrim}
        onDuplicateSelected={handleDuplicateSelected}
        onDeleteSelected={() => selectedClipId && handleDeleteClip(selectedClipId)}
        onAddMark={handleAddMark}
        onDeleteMark={handleDeleteMark}
        onApplyCameraTrick={(tr) => handleApplyCameraTrick(tr, 3.0)}
        onSaveScreenshot={handleSaveScreenshot}
        previewAspect={previewAspect}
        onPreviewAspectChange={setPreviewAspect}
        leftSidebarOpen={leftSidebarOpen}
        onToggleLeftSidebar={() => setLeftSidebarOpen((o) => !o)}
        rightSidebarOpen={rightSidebarOpen}
        onToggleRightSidebar={() => setRightSidebarOpen((o) => !o)}
        showCurveGraph={showCurveGraph}
        onToggleCurveGraph={() => setShowCurveGraph((c) => !c)}
        cameraControlMode={cameraControlMode}
        onToggleCameraControlMode={handleToggleCameraControlMode}
        isRecordingFreeLook={isRecordingFreeLook}
        onToggleRecordFreeLook={handleToggleRecordFreeLook}
        onDownloadProjectArchive={handleDownloadProjectArchive}
      />

      {/* 2. UPPER WORKSPACE: [SourcesSidebar] | [Viewport + PlayerBar] | [SettingsSidebar] */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Left Sources Sidebar */}
        <OrbisMediaPool
          isOpen={leftSidebarOpen}
          onToggleOpen={() => setLeftSidebarOpen((o) => !o)}
          activeTab={leftTab}
          onChangeTab={setLeftTab}
          theme={theme}
          videoFiles={videoFiles}
          audioFiles={audioFiles}
          usedMediaIds={usedMediaIds}
          selectedMediaId={selectedMediaId}
          onSelectMedia={(f) => setSelectedMediaId(f.id)}
          onAddVideoToTimeline={(f, asPiP) => handleAddVideoToTimeline(f, asPiP)}
          onAddAudioToTimeline={handleAddAudioToTimeline}
          onAddOverlayPreset={handleAddOverlayPreset}
          onApplyTransitionAtPlayhead={handleApplyTransitionAtPlayhead}
          onQuickImportFiles={() => importFilesInputRef.current?.click()}
          onOpenDialog={setActiveDialog}
        />

        {/* Center Monitor Surround (#141516) + PlayerBar */}
        <div
          ref={centerStageRef}
          style={{ backgroundColor: theme.surround }}
          className="flex-1 min-w-0 flex flex-col overflow-hidden"
        >
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            <div ref={viewportFrameRef} className={`relative ${aspectClass} overflow-hidden`}>
              {clips.filter((c) => c.type === 'video').length === 0 ? (
                <div
                  style={{ backgroundColor: theme.surround, color: theme.textDim }}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-6"
                >
                  <span className="text-[13px]" style={{ color: theme.text }}>
                    No clip on the timeline
                  </span>
                  <span className="text-[12px]">
                    Double-click a clip in Media on the left, or choose Media → Import files… (Ctrl+I) to open an .osv, .insv, or .mp4 video.
                  </span>
                </div>
              ) : (
                <>
                  <Three360Viewport
                    canvasSource={activeVideoElement || proceduralCanvas}
                    is360={activeVideoClip ? activeVideoClip.is360 !== false : true}
                    fitMode={activeVideoClip?.fitMode || 'reframe-360'}
                    splitScreen={activeVideoClip?.splitScreen || 'off'}
                    yaw={yaw}
                    pitch={pitch}
                    roll={roll}
                    fov={fov}
                    projection={projection}
                    stabilizer={stabilizer}
                    filters={activeVideoClip?.filters || globalFilters}
                    privacyBlur={activeVideoClip?.privacyBlur}
                    transitionOverlay={activeTransitionOverlay}
                    overlayVideoClips={activePiPClips}
                    showAvataWatermark={Boolean(activeVideoClip?.showAvataWatermark)}
                    currentTime={currentTime}
                    tracker={tracker}
                    cameraControlMode={cameraControlMode}
                    isRecordingFreeLook={isRecordingFreeLook}
                    recordingSeconds={recordingSeconds}
                    onDragStateChange={(dragging) => {
                      isUserDraggingViewerRef.current = dragging;
                      if (dragging && cameraControlMode === 'free-look') {
                        freeLookOverridePassRef.current = true;
                      }
                      if (!dragging && isRecordingFreeLook) {
                        // Stamp exact locked viewpoint on mouse release!
                        const cam = latestCamRef.current;
                        freeLookSamplesRef.current.push({
                          time: parseFloat(currentTimeRef.current.toFixed(2)),
                          ...cam
                        });
                      }
                    }}
                    onCameraChange={(ny, np, nr, nf) => {
                      setYaw(ny);
                      setPitch(np);
                      setRoll(nr);
                      setFov(nf);
                      if (cameraControlMode === 'free-look') {
                        freeLookOverridePassRef.current = true;
                        if (isRecordingFreeLook) {
                          const samples = freeLookSamplesRef.current;
                          const nowT = parseFloat(currentTimeRef.current.toFixed(2));
                          const last = samples[samples.length - 1];
                          if (!last || Math.abs(nowT - last.time) >= 0.04) {
                            samples.push({
                              time: nowT,
                              yaw: ny,
                              pitch: np,
                              roll: nr,
                              fov: nf,
                              projection
                            });
                          } else {
                            last.yaw = ny;
                            last.pitch = np;
                            last.roll = nr;
                            last.fov = nf;
                          }
                        }
                      }
                      if (reframeArmed) {
                        stampKeyframeValues(ny, np, nr, nf);
                      }
                    }}
                    onTargetSelected={(target) => {
                      setTracker((prev) => ({
                        ...prev,
                        isSelecting: false,
                        active: Boolean(target),
                        target
                      }));
                      if (target) {
                        showNotice('Subject selected — click "Bake track" in Reframe to follow');
                      }
                    }}
                  />

                  {/* Full FPV Flight Telemetry OSD when a HUD clip is active on an Overlay track */}
                  {activeHudClip && (
                    <DroneHUDOverlay
                      telemetry={currentTelemetry}
                      config={hudConfig}
                      width={monitorSize.width}
                      height={monitorSize.height}
                    />
                  )}

                  {/* Compact Orbis Telemetry Gauges (Speed Dial, Heading Tape, G-Circle) */}
                  {activeGaugeClips.map((gc, idx) => {
                    const kind = gc.gaugeSettings?.kind || 'speed-dial';
                    return (
                      <div
                        key={gc.id}
                        style={{ bottom: `${20 + idx * 66}px`, left: '24px' }}
                        className="absolute z-20 px-3.5 py-2 rounded-md bg-black/55 backdrop-blur-xs border border-white/15 text-white pointer-events-none font-mono"
                      >
                        {kind === 'speed-dial' && (
                          <div>
                            <div className="text-[20px] font-bold leading-none text-[#f5a04a]">
                              {Math.round(currentTelemetry.speed)} <span className="text-[11px] text-white/80">km/h</span>
                            </div>
                            <div className="text-[10px] text-white/65 mt-0.5">
                              ALT {currentTelemetry.altitude.toFixed(0)} m
                            </div>
                          </div>
                        )}
                        {kind === 'heading-tape' && (
                          <div className="text-[13px] font-semibold">
                            HDG {Math.round(currentTelemetry.yaw).toString().padStart(3, '0')}°
                          </div>
                        )}
                        {kind === 'g-circle' && (
                          <div className="text-[13px] font-semibold">
                            {currentTelemetry.gForce.toFixed(1)} G · BANK {Math.round(currentTelemetry.roll)}°
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Clean Cinematic Titles ("Flying Low" — exact match to TitleRender.cpp & user screenshot!) */}
                  {activeTitleClips.map((tc) => (
                    <div
                      key={tc.id}
                      style={{ top: `${tc.textPositionY ?? 46}%` }}
                      className="absolute inset-x-0 -translate-y-1/2 z-20 flex flex-col items-center justify-center pointer-events-none px-6 text-center"
                    >
                      <div
                        style={{
                          fontSize: `${tc.textFontSize ?? 48}px`,
                          color: tc.textColor || '#f5f7fa'
                        }}
                        className="font-light tracking-wide leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)]"
                      >
                        {tc.textContent || tc.title}
                      </div>
                      {tc.textSubline && (
                        <div className="text-[13px] tracking-[0.2em] uppercase text-white/85 mt-1 drop-shadow">
                          {tc.textSubline}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Native Two-Row PlayerBar */}
          <OrbisKeyframeRibbon
            currentTime={currentTime}
            totalDuration={totalDuration}
            fps={projectSettings.frameRate}
            isPlaying={isPlaying}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
            previewVolume={previewVolume}
            isMuted={isMuted}
            onPreviewVolumeChange={(v) => {
              setPreviewVolume(v);
              if (v > 0 && isMuted) setIsMuted(false);
            }}
            onToggleMute={() => setIsMuted((m) => !m)}
            cutTimes={cutTimes}
            keyframes={activeKeyframes}
            theme={theme}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onSeek={handleSeek}
            onStepFrame={handleStepFrame}
            onJumpCutOrKey={handleJumpCutOrKey}
            onScreenshot={handleSaveScreenshot}
            onToggleFullscreen={() => {
              if (!document.fullscreenElement) {
                centerStageRef.current?.requestFullscreen?.().catch(() => {});
              } else {
                document.exitFullscreen?.().catch(() => {});
              }
            }}
            cameraControlMode={cameraControlMode}
            onToggleCameraControlMode={handleToggleCameraControlMode}
            isRecordingFreeLook={isRecordingFreeLook}
            recordingSeconds={recordingSeconds}
            hasRecordedFreeLookVideo={Boolean(lastRecordedFreeLookUrl)}
            onToggleRecordFreeLook={handleToggleRecordFreeLook}
            onDownloadRecordedFreeLook={handleDownloadRecordedFreeLook}
          />
        </div>

        {/* Right Settings Sidebar */}
        <OrbisInspector
          isOpen={rightSidebarOpen}
          onToggleOpen={() => setRightSidebarOpen((o) => !o)}
          activeTab={rightTab}
          onChangeTab={setRightTab}
          theme={theme}
          activeVideoClip={activeVideoClip}
          selectedClip={selectedClip}
          activeMediaFile={activeMediaFile}
          onUpdateClip={(updated) => {
            setClips((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setProjectSettings((s) => ({ ...s, modified: true }));
          }}
          onUpdateMediaFile={(updatedFile) => {
            setVideoFiles((prev) =>
              prev.map((f) => (f.id === updatedFile.id ? updatedFile : f))
            );
            setProjectSettings((s) => ({ ...s, modified: true }));
          }}
          yaw={yaw}
          pitch={pitch}
          roll={roll}
          fov={fov}
          distortion={distortion}
          projection={projection}
          onCameraChange={(ny, np, nr, nf, ndist) => {
            setYaw(ny);
            setPitch(np);
            setRoll(nr);
            setFov(nf);
            if (ndist !== undefined) setDistortion(ndist);
            if (reframeArmed) {
              stampKeyframeValues(ny, np, nr, nf, ndist ?? distortion);
            }
          }}
          onProjectionChange={setProjection}
          currentEasing={currentEasing}
          onChangeEasing={setCurrentEasing}
          cameraControlMode={cameraControlMode}
          onCameraControlModeChange={handleSetCameraControlMode}
          isRecordingFreeLook={isRecordingFreeLook}
          recordingSeconds={recordingSeconds}
          hasRecordedFreeLookVideo={Boolean(lastRecordedFreeLookUrl)}
          onToggleRecordFreeLook={handleToggleRecordFreeLook}
          onDownloadRecordedFreeLook={handleDownloadRecordedFreeLook}
          onBakeFreeLookToKeyframes={handleBakeFreeLookToKeyframes}
          onClearFreeLookPass={handleClearFreeLookPass}
          onSetKeyframe={handleSetKeyframe}
          onApplyCameraTrick={handleApplyCameraTrick}
          tracker={tracker}
          onTrackerChange={setTracker}
          onRunSubjectTracker={handleRunSubjectTracker}
          stabilizer={stabilizer}
          onStabilizerChange={setStabilizer}
          hudConfig={hudConfig}
          onHUDConfigChange={setHudConfig}
          gpxOffset={gpxOffset}
          onGpxOffsetChange={setGpxOffset}
          filters={globalFilters}
          onFiltersChange={setGlobalFilters}
        />
      </div>

      {/* 3. BOTTOM EDIT TOOLBAR + TIMELINE WIDGET */}
      <MultiTrackTimeline
        tracks={tracks}
        clips={clips}
        currentTime={currentTime}
        totalDuration={totalDuration}
        selectedClipId={selectedClipId}
        cameraControlMode={cameraControlMode}
        onToggleCameraControlMode={handleToggleCameraControlMode}
        isRecordingFreeLook={isRecordingFreeLook}
        onToggleRecordFreeLook={handleToggleRecordFreeLook}
        reframeArmed={reframeArmed}
        onToggleReframeArmed={() => setReframeArmed((a) => !a)}
        hasKeyframesOnActiveClip={Boolean(activeVideoClip?.keyframes?.length)}
        noticeText={noticeText}
        showCurveGraph={showCurveGraph}
        theme={theme}
        onTimeChange={handleSeek}
        onClipSelect={(id) => {
          setSelectedClipId(id);
          const cl = clips.find((c) => c.id === id);
          if (cl?.overlayKind === 'pip') setRightTab('pip');
          else if (cl?.overlayKind === 'title' || cl?.overlayKind === 'hud' || cl?.overlayKind === 'gauge') {
            setRightTab('overlay');
          } else if (cl?.type === 'audio' && !cl.linkedVideoClipId) {
            setRightTab('audio');
          } else if (cl?.type === 'video') {
            setRightTab('video');
          }
        }}
        onClipUpdate={(updated) => {
          setClips((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setProjectSettings((s) => ({ ...s, modified: true }));
        }}
        onSplitAtPlayhead={handleSplitAtPlayhead}
        onTrimInToPlayhead={handleTrimInToPlayhead}
        onTrimOutToPlayhead={handleTrimOutToPlayhead}
        onRestoreClipTrim={handleRestoreClipTrim}
        onDeleteKeyAtPlayhead={handleDeleteKeyAtPlayhead}
        onClearAllKeysOnClip={handleClearAllKeysOnClip}
        onDeleteClip={handleDeleteClip}
        onAddOverlayTrack={handleAddOverlayTrack}
        onAddAudioTrack={handleAddAudioTrack}
        onDeleteTrack={(trackId) => {
          pushUndo();
          setTracks((prev) => prev.filter((t) => t.id !== trackId));
          setClips((prev) => prev.filter((c) => c.trackId !== trackId));
        }}
        onToggleTrackMute={(trackId) =>
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
          )
        }
        onToggleTrackVisibility={(trackId) =>
          setTracks((prev) =>
            prev.map((t) => (t.id === trackId ? { ...t, visible: !t.visible } : t))
          )
        }
        onToggleMainVideoExpand={() =>
          setTracks((prev) =>
            prev.map((t) => (t.isMainVideo ? { ...t, expanded: t.expanded === false } : t))
          )
        }
        onDropMediaId={(mediaId, _trackId, dropTime) => {
          const vf = videoFiles.find((v) => v.id === mediaId);
          if (vf) {
            const targetTr = tracks.find((t) => t.id === _trackId);
            handleAddVideoToTimeline(vf, targetTr?.type === 'overlay', dropTime);
          }
        }}
      />

      {/* 4. DIALOGS & EXPORT */}
      <OrbisDialogs
        activeDialog={activeDialog}
        onClose={() => setActiveDialog(null)}
        theme={theme}
        currentTime={currentTime}
        videoFiles={videoFiles}
        audioFiles={audioFiles}
        gpxOffset={gpxOffset}
        telemetryCount={telemetryPoints.length}
        projectSettings={projectSettings}
        onImportVideoFiles={(files, asPiP) => handleImportVideoFiles(files, asPiP)}
        onAddExistingVideoToTrack={(file, asPiP) => handleAddVideoToTimeline(file, asPiP)}
        onImportAudioFiles={handleImportAudioFiles}
        onAddExistingAudioToTrack={handleAddAudioToTimeline}
        onImportTelemetryFile={async (f) => {
          const pts = await parseTelemetryFile(f);
          setTelemetryPoints(pts);
          showNotice(`Loaded ${pts.length} telemetry samples from ${f.name}`);
        }}
        onGpxOffsetChange={setGpxOffset}
        onApplyCameraTrick={handleApplyCameraTrick}
        onUpdateProjectSettings={setProjectSettings}
        onLoadPresetProject={handleLoadPresetProject}
        onDownloadProjectArchive={handleDownloadProjectArchive}
      />

      <ExportModal
        isOpen={activeDialog === 'export'}
        onClose={() => setActiveDialog(null)}
        theme={theme}
        activeFile={activeMediaFile}
        totalDuration={totalDuration}
        cameraControlMode={cameraControlMode}
        onCameraControlModeChange={handleSetCameraControlMode}
        lastRecordedFreeLookUrl={lastRecordedFreeLookUrl}
        onDownloadLastFreeLookRecording={handleDownloadRecordedFreeLook}
        captureCompositeStream={captureCompositeStream}
        onStartPlaybackForCapture={() => setIsPlaying(true)}
        onStopPlaybackAfterCapture={() => setIsPlaying(false)}
      />
    </div>
  );
}
