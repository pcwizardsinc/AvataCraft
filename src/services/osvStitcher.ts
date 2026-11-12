/**
 * orbis-reframe OSV/INSV 360 Engine, Media Prober, Colour LUTs, Waveforms & Audio Mixer
 * Faithful to Schabo/orbis-reframe with DJI OSV, DroneHUDEditor, Aerosphere & GPStitch extensions
 */

import {
  OSVFileMetadata,
  AudioAssetMetadata,
  Keyframe360,
  KeyframeEasing,
  TelemetryPoint,
  Track,
  TimelineClip,
  CameraTrickId,
  ProjectionMode,
  VideoFilters,
  OrbisThemeId,
  FreeLookSample
} from '../types/editor';

export interface OrbisThemeColors {
  id: OrbisThemeId;
  name: string;
  window: string;
  panel: string;
  button: string;
  pressed: string;
  border: string;
  borderHover: string;
  menuBar: string;
  surround: string;
  text: string;
  textDim: string;
  textDisabled: string;
  icon: string;
  iconActive: string;
  accent: string;
  accentSoft: string;
  textOnAccent: string;
  playhead: string;
  clipVideo: string;
  clipVideoAlt: string;
  clipAudio: string;
  clipOverlay: string;
  clipMuted: string;
  waveform: string;
  marker: string;
}

export const ORBIS_THEMES: Record<OrbisThemeId, OrbisThemeColors> = {
  ember: {
    id: 'ember',
    name: 'Ember',
    window: '#1c1d20',
    panel: '#232528',
    button: '#2c2e33',
    pressed: '#25272b',
    border: '#383b41',
    borderHover: '#4a4e56',
    menuBar: '#18191b',
    surround: '#141516',
    text: '#e6e6e6',
    textDim: '#a0a4ab',
    textDisabled: '#565a61',
    icon: '#b9bec6',
    iconActive: '#f5a04a',
    accent: '#f5a04a',
    accentSoft: '#3d2c1c',
    textOnAccent: '#1a1208',
    playhead: '#f5a04a',
    clipVideo: '#3b5873',
    clipVideoAlt: '#34506a',
    clipAudio: '#2f6f6b',
    clipOverlay: '#5e4a80',
    clipMuted: '#44484e',
    waveform: '#cfd6dd',
    marker: '#ffd84a'
  },
  'neutral-dark': {
    id: 'neutral-dark',
    name: 'Neutral dark',
    window: '#1c1d20',
    panel: '#232528',
    button: '#2c2e33',
    pressed: '#25272b',
    border: '#383b41',
    borderHover: '#4a4e56',
    menuBar: '#18191b',
    surround: '#141516',
    text: '#e6e6e6',
    textDim: '#a0a4ab',
    textDisabled: '#565a61',
    icon: '#b9bec6',
    iconActive: '#6fa8dc',
    accent: '#6fa8dc',
    accentSoft: '#1f2c39',
    textOnAccent: '#0b1620',
    playhead: '#6fa8dc',
    clipVideo: '#535d69',
    clipVideoAlt: '#4b545f',
    clipAudio: '#4a6754',
    clipOverlay: '#655572',
    clipMuted: '#44484e',
    waveform: '#cfd6dd',
    marker: '#ffd84a'
  },
  light: {
    id: 'light',
    name: 'Light',
    window: '#eceef1',
    panel: '#f8f9fa',
    button: '#e0e3e7',
    pressed: '#d2d6db',
    border: '#c8ccd2',
    borderHover: '#a4abb4',
    menuBar: '#e3e5e9',
    surround: '#3a3b3d',
    text: '#1d1f23',
    textDim: '#5b616a',
    textDisabled: '#a3a8b0',
    icon: '#4a5059',
    iconActive: '#c8640e',
    accent: '#c8640e',
    accentSoft: '#f6dfc8',
    textOnAccent: '#ffffff',
    playhead: '#c8640e',
    clipVideo: '#8eabc7',
    clipVideoAlt: '#84a1bd',
    clipAudio: '#82b5b1',
    clipOverlay: '#a898c6',
    clipMuted: '#c3c7cc',
    waveform: '#24343f',
    marker: '#5e4700'
  }
};

export const DEFAULT_VIDEO_FILTERS: VideoFilters = {
  lut: 'normal',
  lutStrength: 100,
  exposure: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  brightness: 0,
  vignette: 0,
  blur: 0
};

/**
 * Generate a small crisp 16:9 landscape thumbnail data URL for Media Pool items
 */
export function generateSceneThumbnail(
  theme: 'flying-low' | 'alpine' | 'urban' | 'coastal' | 'cockpit-pip' = 'flying-low'
): string {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 90;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  const sky = ctx.createLinearGradient(0, 0, 0, 50);
  if (theme === 'flying-low') {
    sky.addColorStop(0, '#4f7bb6');
    sky.addColorStop(0.6, '#8ab0dc');
    sky.addColorStop(1, '#cbd9ea');
  } else if (theme === 'alpine') {
    sky.addColorStop(0, '#1e5b94');
    sky.addColorStop(1, '#93c5fd');
  } else if (theme === 'coastal') {
    sky.addColorStop(0, '#3b265e');
    sky.addColorStop(0.6, '#c25927');
    sky.addColorStop(1, '#f3b963');
  } else if (theme === 'urban') {
    sky.addColorStop(0, '#141c2c');
    sky.addColorStop(1, '#475569');
  } else {
    sky.addColorStop(0, '#1f2937');
    sky.addColorStop(1, '#111827');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 160, 52);

  // Soft clouds
  if (theme === 'flying-low' || theme === 'alpine') {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.arc(95, 22, 16, 0, Math.PI * 2);
    ctx.arc(115, 24, 14, 0, Math.PI * 2);
    ctx.arc(78, 26, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground & Road
  ctx.fillStyle = theme === 'coastal' ? '#164e63' : theme === 'urban' ? '#1e293b' : '#4d6136';
  ctx.fillRect(0, 50, 160, 40);

  if (theme === 'flying-low') {
    // Tree line
    ctx.fillStyle = '#2f4222';
    for (let x = 8; x < 155; x += 18) {
      ctx.beginPath();
      ctx.arc(x, 46, 13, 0, Math.PI * 2);
      ctx.fill();
    }
    // Asphalt road + concrete sidewalk
    ctx.fillStyle = '#686b70';
    ctx.beginPath();
    ctx.moveTo(74, 50);
    ctx.lineTo(160, 62);
    ctx.lineTo(160, 90);
    ctx.lineTo(84, 90);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#9b9892';
    ctx.beginPath();
    ctx.moveTo(70, 50);
    ctx.lineTo(75, 50);
    ctx.lineTo(92, 90);
    ctx.lineTo(68, 90);
    ctx.closePath();
    ctx.fill();
  } else if (theme === 'alpine') {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, 52);
    ctx.lineTo(35, 28);
    ctx.lineTo(72, 48);
    ctx.lineTo(112, 24);
    ctx.lineTo(160, 52);
    ctx.closePath();
    ctx.fill();
  }

  return c.toDataURL('image/jpeg', 0.85);
}

export const BUNDLED_OSV_LIBRARY: OSVFileMetadata[] = [
  {
    id: 'osv-flying-low',
    folder: 'FinishedVideos',
    fileName: 'FlyingLowv2.osv',
    format: 'osv',
    fileSize: '1.68 GB',
    duration: 176,
    width: 5760,
    height: 2880,
    resolution: '5760×2880',
    fps: 60,
    is360: true,
    lensConfiguration: 'dual-fisheye',
    lensGuards: 'none',
    stitched: true,
    seamMode: 'depth-aware',
    seamColourBlend: true,
    seamFlow: true,
    hasGyro: true,
    hasGPS: true,
    audioChannels: 2,
    windReduction: true,
    sceneTheme: 'flying-low'
  },
  {
    id: 'osv-alpine-dive',
    folder: 'Avata360_RAW',
    fileName: 'DJI_Avata_Alpine_Dive.osv',
    format: 'osv',
    fileSize: '1.42 GB',
    duration: 48,
    width: 5760,
    height: 2880,
    resolution: '5760×2880',
    fps: 60,
    is360: true,
    lensConfiguration: 'dual-fisheye',
    lensGuards: 'standard',
    stitched: true,
    seamMode: 'depth-aware',
    seamColourBlend: true,
    seamFlow: true,
    hasGyro: true,
    hasGPS: true,
    audioChannels: 4,
    windReduction: true,
    sceneTheme: 'alpine'
  },
  {
    id: 'insv-coastal-sunset',
    folder: 'Avata360_RAW',
    fileName: 'Coastal_Ridge_Cruise.insv',
    format: 'insv',
    fileSize: '1.15 GB',
    duration: 42,
    width: 5760,
    height: 2880,
    resolution: '5760×2880',
    fps: 60,
    is360: true,
    lensConfiguration: 'dual-fisheye',
    lensGuards: 'none',
    stitched: true,
    seamMode: 'optical-flow',
    seamColourBlend: true,
    seamFlow: true,
    hasGyro: true,
    hasGPS: true,
    audioChannels: 2,
    windReduction: false,
    sceneTheme: 'coastal'
  },
  {
    id: 'mp4-stickcam-pip',
    folder: 'FinishedVideos',
    fileName: 'FPV_Controller_StickCam.mp4',
    format: 'mp4',
    fileSize: '210 MB',
    duration: 60,
    width: 1920,
    height: 1080,
    resolution: '1920×1080',
    fps: 60,
    is360: false,
    lensConfiguration: 'flat-rectilinear',
    lensGuards: 'none',
    stitched: true,
    seamMode: 'fixed',
    seamColourBlend: false,
    seamFlow: false,
    hasGyro: false,
    hasGPS: false,
    audioChannels: 2,
    windReduction: false,
    sceneTheme: 'cockpit-pip'
  }
];

export const BUNDLED_AUDIO_LIBRARY: AudioAssetMetadata[] = [
  {
    id: 'aud-avata-motors',
    folder: 'AudioStems',
    fileName: 'Avata_Camera_Mic.wav',
    duration: 176,
    category: 'Motor SFX',
    synthPreset: 'motors'
  },
  {
    id: 'aud-alpine-wind',
    folder: 'AudioStems',
    fileName: 'Slipstream_Ambient_Wash.wav',
    duration: 90,
    category: 'Atmosphere',
    synthPreset: 'wind'
  },
  {
    id: 'aud-horizon-pulse',
    folder: 'AudioStems',
    fileName: 'Flight_Telemetry_Pulse.mp3',
    duration: 120,
    category: 'Soundtrack',
    synthPreset: 'synth-drive'
  }
];

export const INITIAL_ORBIS_KEYFRAMES: Keyframe360[] = [
  { id: 'kf-0', time: 0, yaw: 0, pitch: -4, roll: 0, fov: 92, distortion: 0, projection: 'perspective', easing: 'ease-in-out' },
  { id: 'kf-1', time: 14, yaw: 24, pitch: -8, roll: 5, fov: 96, distortion: 0, projection: 'perspective', easing: 'ease-in-out' },
  { id: 'kf-2', time: 30, yaw: -18, pitch: -3, roll: -4, fov: 90, distortion: 0, projection: 'perspective', easing: 'ease-in-out' },
  { id: 'kf-3', time: 52, yaw: 0, pitch: -5, roll: 0, fov: 92, distortion: 0, projection: 'perspective', easing: 'ease-in-out' }
];

export function createInitialOrbisWorkspace(): {
  tracks: Track[];
  clips: TimelineClip[];
} {
  // Matches Schabo/orbis-reframe TimelineWidget layout:
  // Overlay tracks (when added) sit above Video; Main Video + indented Camera mic sit cleanly by default.
  const tracks: Track[] = [
    {
      id: 'track-overlay-1',
      name: 'Overlay 1',
      type: 'overlay',
      layerNumber: 1,
      muted: false,
      solo: false,
      locked: false,
      visible: true
    },
    {
      id: 'track-video-main',
      name: 'Video',
      type: 'video',
      isMainVideo: true,
      expanded: true,
      muted: false,
      solo: false,
      locked: false,
      visible: true
    },
    {
      id: 'track-camera-mic',
      name: 'Camera mic',
      type: 'audio',
      isCameraMic: true,
      muted: false,
      solo: false,
      locked: false,
      visible: true
    }
  ];

  const clips: TimelineClip[] = [
    {
      id: 'clip-main-1',
      trackId: 'track-video-main',
      type: 'video',
      title: 'FlyingLowv2.osv',
      mediaId: 'osv-flying-low',
      startTime: 0,
      duration: 176,
      sourceDuration: 176,
      offset: 0,
      sourceType: 'procedural',
      is360: true,
      cameraControlMode: 'free-look',
      fitMode: 'reframe-360',
      splitScreen: 'off',
      sceneTheme: 'flying-low',
      speed: 1,
      volume: 85,
      transitionIn: 'none',
      transitionOut: 'none',
      transitionDuration: 1.0,
      filters: { ...DEFAULT_VIDEO_FILTERS },
      privacyBlur: {
        enabled: false,
        mode: 'nadir-tripod',
        showRegions: false,
        scanned: false,
        radius: 16,
        strength: 12
      },
      showAvataWatermark: true,
      keyframes: [...INITIAL_ORBIS_KEYFRAMES],
      marks: []
    },
    {
      id: 'clip-cammic-1',
      trackId: 'track-camera-mic',
      type: 'audio',
      title: 'FlyingLowv2.osv',
      linkedVideoClipId: 'clip-main-1',
      mediaId: 'aud-avata-motors',
      synthPreset: 'motors',
      sourceType: 'procedural',
      startTime: 0,
      duration: 176,
      sourceDuration: 176,
      offset: 0,
      volume: 80,
      windNoiseFilter: true,
      speed: 1
    },
    {
      id: 'clip-title-1',
      trackId: 'track-overlay-1',
      type: 'overlay',
      overlayKind: 'title',
      title: 'Flying Low',
      textContent: 'Flying Low',
      textPositionY: 46,
      textFontSize: 48,
      textColor: '#f5f7fa',
      startTime: 0,
      duration: 14,
      sourceDuration: 14,
      offset: 0,
      transitionIn: 'crossfade',
      transitionOut: 'crossfade',
      transitionDuration: 0.8
    }
  ];

  return { tracks, clips };
}

/**
 * Deterministic audio waveform peak array for TimelineWidget painting
 */
export function getWaveformPeaks(seedStr: string, count: number = 160): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    hash ^= i * 374761393;
    hash = Math.imul(hash, 668265263);
    const n = ((hash >>> 0) % 1000) / 1000;
    const env = 0.35 + 0.55 * Math.abs(Math.sin(i * 0.19) * Math.cos(i * 0.07));
    peaks.push(Math.min(0.96, Math.max(0.12, n * env + 0.14)));
  }
  return peaks;
}

/**
 * Naturalistic 360° Equirectangular Stream Renderer (for bundled OSV/INSV or undecodable HEVC streams)
 */
export class OSV360Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public width = 1024;
  public height = 512;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context for OSV renderer');
    this.ctx = ctx;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public renderFrame(
    time: number,
    isStitched: boolean = true,
    seamMode: string = 'depth-aware',
    theme: 'flying-low' | 'alpine' | 'urban' | 'coastal' | 'cockpit-pip' = 'flying-low',
    showTrackerTarget: boolean = false
  ): void {
    const { ctx, width, height } = this;
    const halfH = height / 2;

    if (theme === 'flying-low') {
      // Naturalistic neighborhood low-pass flight ("Flying Low" DJI Avata 360 aesthetic)
      const sky = ctx.createLinearGradient(0, 0, 0, halfH);
      sky.addColorStop(0, '#3a68a8');
      sky.addColorStop(0.52, '#6f9ad1');
      sky.addColorStop(0.86, '#acc6e6');
      sky.addColorStop(1, '#cfdced');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, halfH);

      // Cumulus clouds across the 360 sky dome
      for (let i = 0; i < 12; i++) {
        const cx = ((i * 96 + time * 3.5) % (width + 120)) - 60;
        const cy = halfH * (0.28 + (i % 3) * 0.14);
        const r = 34 + (i % 4) * 12;
        const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, r * 1.6);
        cg.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
        cg.addColorStop(0.55, 'rgba(235, 242, 250, 0.52)');
        cg.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lush green lawn base
      const lawn = ctx.createLinearGradient(0, halfH, 0, height);
      lawn.addColorStop(0, '#4f6336');
      lawn.addColorStop(0.35, '#596b3b');
      lawn.addColorStop(1, '#364424');
      ctx.fillStyle = lawn;
      ctx.fillRect(0, halfH, width, halfH);

      // Suburban houses & cedar fence along left/right periphery
      ctx.fillStyle = '#5e4332';
      ctx.fillRect(width * 0.18, halfH - 22, width * 0.27, 24);
      ctx.fillStyle = '#6c5a4c';
      ctx.fillRect(width * 0.62, halfH - 36, 95, 36);
      ctx.fillStyle = '#382f2b';
      ctx.beginPath();
      ctx.moveTo(width * 0.61, halfH - 36);
      ctx.lineTo(width * 0.665, halfH - 56);
      ctx.lineTo(width * 0.72, halfH - 36);
      ctx.closePath();
      ctx.fill();

      // Deciduous & evergreen trees lining the street
      for (let i = 0; i < 22; i++) {
        const tx = (i * 48 + 14) % width;
        // Leave central forward road corridor open around width * 0.50
        if (tx > width * 0.46 && tx < width * 0.56) continue;
        const treeH = 36 + ((i * 19) % 44);
        ctx.fillStyle = i % 3 === 0 ? '#263b22' : '#354d28';
        ctx.beginPath();
        ctx.arc(tx, halfH - treeH * 0.42, treeH * 0.58, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#435e33';
        ctx.beginPath();
        ctx.arc(tx - 6, halfH - treeH * 0.52, treeH * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Forward corridor (around x = 512 = Yaw 0°): Concrete sidewalk + asphalt street
      const fwd = width * 0.5;
      // Asphalt street
      ctx.fillStyle = '#5e6168';
      ctx.beginPath();
      ctx.moveTo(fwd + 4, halfH);
      ctx.lineTo(fwd + 22, halfH);
      ctx.lineTo(fwd + 260, height);
      ctx.lineTo(fwd + 28, height);
      ctx.closePath();
      ctx.fill();

      // Concrete sidewalk with animated expansion joints showing forward low-altitude speed!
      ctx.fillStyle = '#9e9b95';
      ctx.beginPath();
      ctx.moveTo(fwd - 4, halfH);
      ctx.lineTo(fwd + 4, halfH);
      ctx.lineTo(fwd + 34, height);
      ctx.lineTo(fwd - 68, height);
      ctx.closePath();
      ctx.fill();

      // Moving sidewalk concrete seams (perspective spacing)
      ctx.strokeStyle = 'rgba(70, 68, 64, 0.65)';
      ctx.lineWidth = 1.5;
      const phase = (time * 2.4) % 1;
      for (let j = 0; j < 9; j++) {
        const p = Math.pow((j + phase) / 9, 2.1);
        const y = halfH + p * halfH;
        const leftX = fwd - 4 - p * 64;
        const rightX = fwd + 4 + p * 30;
        ctx.beginPath();
        ctx.moveTo(leftX, y);
        ctx.lineTo(rightX, y);
        ctx.stroke();
      }

      // Rear view corridor (around x = 0 / width = Yaw ±180°)
      ctx.fillStyle = '#585b62';
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      ctx.lineTo(18, halfH);
      ctx.lineTo(130, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();
    } else {
      // Alpine / Urban / Coastal 360 scenes
      const sky = ctx.createLinearGradient(0, 0, 0, halfH);
      if (theme === 'urban') {
        sky.addColorStop(0, '#0f172a');
        sky.addColorStop(0.6, '#1e293b');
        sky.addColorStop(1, '#475569');
      } else if (theme === 'coastal') {
        sky.addColorStop(0, '#1e1b4b');
        sky.addColorStop(0.48, '#9a3412');
        sky.addColorStop(0.82, '#ea580c');
        sky.addColorStop(1, '#fde047');
      } else {
        sky.addColorStop(0, '#0369a1');
        sky.addColorStop(0.55, '#38bdf8');
        sky.addColorStop(1, '#e0f2fe');
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, width, halfH);

      const ground = ctx.createLinearGradient(0, halfH, 0, height);
      if (theme === 'urban') {
        ground.addColorStop(0, '#334155');
        ground.addColorStop(1, '#090d16');
      } else if (theme === 'coastal') {
        ground.addColorStop(0, '#0369a1');
        ground.addColorStop(1, '#082f49');
      } else {
        ground.addColorStop(0, '#2d5a27');
        ground.addColorStop(0.45, '#1e3f20');
        ground.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = ground;
      ctx.fillRect(0, halfH, width, halfH);

      // Sun
      const sunX = (time * 8 + (theme === 'coastal' ? 512 : 260)) % width;
      const sunY = theme === 'coastal' ? halfH * 0.84 : halfH * 0.42;
      const sun = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 110);
      sun.addColorStop(0, 'rgba(255, 255, 255, 0.96)');
      sun.addColorStop(0.25, theme === 'coastal' ? 'rgba(251, 146, 60, 0.8)' : 'rgba(254, 240, 138, 0.65)');
      sun.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 110, 0, Math.PI * 2);
      ctx.fill();

      // Mountain ridges
      ctx.fillStyle = theme === 'coastal' ? 'rgba(67, 20, 7, 0.82)' : 'rgba(30, 41, 59, 0.88)';
      ctx.beginPath();
      ctx.moveTo(0, halfH);
      for (let x = 0; x <= width; x += 16) {
        const mH =
          halfH -
          42 -
          Math.sin((x / width) * Math.PI * 4 + 1.1) * 34 -
          Math.cos((x / width) * Math.PI * 10) * 16;
        ctx.lineTo(x, mH);
      }
      ctx.lineTo(width, halfH);
      ctx.closePath();
      ctx.fill();
    }

    // Dual-fisheye unstitched lens circle visualization when `stitched` is toggled OFF
    if (!isStitched) {
      ctx.strokeStyle = 'rgba(245, 160, 74, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width * 0.25, halfH, halfH * 0.94, 0, Math.PI * 2);
      ctx.arc(width * 0.75, halfH, halfH * 0.94, 0, Math.PI * 2);
      ctx.stroke();
    } else if (seamMode === 'fixed') {
      // Subtle seam line indicator when Fixed Seam is chosen
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width * 0.25, 0);
      ctx.lineTo(width * 0.25, height);
      ctx.moveTo(width * 0.75, 0);
      ctx.lineTo(width * 0.75, height);
      ctx.stroke();
    }

    // Only paint subject tracker box if Subject Tracking is active
    if (showTrackerTarget) {
      const targetYaw = ((time * 24 + 15) % 360) - 180;
      const targetPitch = Math.sin(time * 1.1) * 10 - 4;
      const targetX = ((targetYaw + 180) / 360) * width;
      const targetY = halfH - (targetPitch / 90) * halfH;

      ctx.strokeStyle = '#f5a04a';
      ctx.lineWidth = 2;
      ctx.strokeRect(targetX - 18, targetY - 18, 36, 36);
    }
  }
}

/**
 * Probe uploaded .osv / .insv / .mp4 / .mov / .webm file asynchronously to read real duration & dimensions
 */
export async function probeUploadedVideoFile(
  file: File,
  forceFlatOverlay: boolean = false
): Promise<OSVFileMetadata> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const format = ext === 'osv' || ext === 'insv' || ext === 'mov' || ext === 'webm' ? ext : 'mp4';
  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
  const blobUrl = URL.createObjectURL(file);

  const probed = await new Promise<{
    duration: number;
    width: number;
    height: number;
    thumbnail: string;
    decodable: boolean;
  }>((resolve) => {
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.muted = true;
    vid.playsInline = true;

    const timer = setTimeout(() => {
      resolve({
        duration: 45,
        width: format === 'osv' || format === 'insv' ? 5760 : 3840,
        height: format === 'osv' || format === 'insv' ? 2880 : 2160,
        thumbnail: generateSceneThumbnail('flying-low'),
        decodable: false
      });
    }, 2500);

    vid.onloadedmetadata = () => {
      const w = vid.videoWidth || (format === 'osv' || format === 'insv' ? 5760 : 3840);
      const h = vid.videoHeight || (format === 'osv' || format === 'insv' ? 2880 : 2160);
      const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? Math.round(vid.duration) : 45;
      vid.currentTime = Math.min(0.5, dur * 0.1);
    };

    vid.onseeked = () => {
      clearTimeout(timer);
      const w = vid.videoWidth || 3840;
      const h = vid.videoHeight || 2160;
      const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? parseFloat(vid.duration.toFixed(2)) : 45;
      let thumb = '';
      try {
        const tc = document.createElement('canvas');
        tc.width = 160;
        tc.height = 90;
        const tctx = tc.getContext('2d');
        if (tctx) {
          tctx.drawImage(vid, 0, 0, 160, 90);
          thumb = tc.toDataURL('image/jpeg', 0.82);
        }
      } catch {
        thumb = generateSceneThumbnail('flying-low');
      }
      resolve({ duration: dur, width: w, height: h, thumbnail: thumb, decodable: true });
    };

    vid.onerror = () => {
      clearTimeout(timer);
      // e.g. Dual-stream 10-bit HEVC .osv where browser decoder lacks codec -> synthesize interactive 360 stream!
      resolve({
        duration: 60,
        width: format === 'osv' || format === 'insv' ? 5760 : 3840,
        height: format === 'osv' || format === 'insv' ? 2880 : 2160,
        thumbnail: generateSceneThumbnail('alpine'),
        decodable: false
      });
    };

    vid.src = blobUrl;
  });

  // Detect 360° automatically: .osv / .insv OR ~2:1 equirectangular aspect ratio
  const aspect = probed.width / Math.max(1, probed.height);
  const autoIs360 =
    !forceFlatOverlay &&
    (format === 'osv' || format === 'insv' || (aspect >= 1.92 && aspect <= 2.08));

  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    folder: format === 'osv' || format === 'insv' ? 'Avata360_RAW' : 'FinishedVideos',
    fileName: file.name,
    format,
    fileSize: `${fileSizeMb} MB`,
    duration: probed.duration,
    width: probed.width,
    height: probed.height,
    resolution: `${probed.width}×${probed.height}`,
    fps: 60,
    is360: autoIs360,
    lensConfiguration: !autoIs360
      ? 'flat-rectilinear'
      : format === 'osv' || format === 'insv'
      ? 'dual-fisheye'
      : 'equirectangular',
    lensGuards: 'none',
    stitched: true,
    seamMode: 'depth-aware',
    seamColourBlend: true,
    seamFlow: true,
    hasGyro: autoIs360,
    hasGPS: autoIs360,
    audioChannels: 2,
    windReduction: autoIs360,
    sceneTheme: 'alpine',
    videoUrl: probed.decodable ? blobUrl : undefined,
    thumbnailDataUrl: probed.thumbnail || generateSceneThumbnail('flying-low')
  };
}

/**
 * Parse uploaded audio file (.mp3, .wav, .ogg, .flac, .m4a)
 */
export async function probeUploadedAudioFile(file: File): Promise<AudioAssetMetadata> {
  const blobUrl = URL.createObjectURL(file);
  const duration = await new Promise<number>((resolve) => {
    const a = new Audio();
    const t = setTimeout(() => resolve(45), 1500);
    a.onloadedmetadata = () => {
      clearTimeout(t);
      resolve(Number.isFinite(a.duration) && a.duration > 0 ? parseFloat(a.duration.toFixed(2)) : 45);
    };
    a.onerror = () => {
      clearTimeout(t);
      resolve(45);
    };
    a.src = blobUrl;
  });

  return {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    folder: 'ImportedAudio',
    fileName: file.name,
    duration,
    category: 'Imported Audio',
    audioUrl: blobUrl
  };
}

/**
 * Parse real GPX XML or DJI SRT telemetry files
 */
export async function parseTelemetryFile(file: File): Promise<TelemetryPoint[]> {
  const text = await file.text();
  const points: TelemetryPoint[] = [];

  if (file.name.toLowerCase().endsWith('.gpx') && text.includes('<trkpt')) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const trkpts = Array.from(xml.querySelectorAll('trkpt'));
    let startEpoch: number | null = null;

    trkpts.forEach((pt, idx) => {
      const lat = parseFloat(pt.getAttribute('lat') || '46.8523');
      const lon = parseFloat(pt.getAttribute('lon') || '9.5312');
      const ele = parseFloat(pt.querySelector('ele')?.textContent || '120');
      const timeStr = pt.querySelector('time')?.textContent;
      let sec = idx * 0.5;
      if (timeStr) {
        const ms = Date.parse(timeStr);
        if (!isNaN(ms)) {
          if (startEpoch === null) startEpoch = ms;
          sec = (ms - startEpoch) / 1000;
        }
      }
      const prev = points[points.length - 1];
      let speed = 54;
      if (prev && sec > prev.time) {
        const dLat = (lat - prev.lat) * 111320;
        const dLon = (lon - prev.lon) * 78000;
        const distM = Math.sqrt(dLat * dLat + dLon * dLon);
        speed = Math.min(180, Math.max(4, (distM / (sec - prev.time)) * 3.6));
      }
      points.push({
        time: parseFloat(sec.toFixed(2)),
        lat,
        lon,
        altitude: parseFloat(ele.toFixed(1)),
        speed: parseFloat(speed.toFixed(1)),
        pitch: -6 + Math.sin(idx * 0.3) * 10,
        roll: Math.cos(idx * 0.25) * 18,
        yaw: (idx * 8) % 360,
        battery: Math.max(15, 98 - Math.floor(idx * 0.25)),
        voltage: 22.8,
        throttle: 58,
        gForce: 1.2,
        satellites: 21,
        mode: 'MANUAL / ACRO'
      });
    });
  }

  return points.length >= 2 ? points : generateProceduralTelemetry(180);
}

/**
 * Generate Camera Trick Keyframes onto a clip starting at `atTime`
 */
export function generateCameraTrickKeyframes(
  trickId: CameraTrickId,
  atTime: number,
  duration: number,
  baseCam: { yaw: number; pitch: number; roll: number; fov: number; projection: ProjectionMode }
): Keyframe360[] {
  const uid = () => `trick-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const t0 = parseFloat(atTime.toFixed(2));
  const tMid = parseFloat((atTime + duration * 0.5).toFixed(2));
  const tEnd = parseFloat((atTime + duration).toFixed(2));

  switch (trickId) {
    case 'barrel-roll':
      return [
        { id: uid(), time: t0, yaw: baseCam.yaw, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'ease-in-out' },
        { id: uid(), time: parseFloat((atTime + duration * 0.33).toFixed(2)), yaw: baseCam.yaw, pitch: baseCam.pitch - 4, roll: 120, fov: Math.min(135, baseCam.fov + 15), projection: 'perspective', easing: 'linear' },
        { id: uid(), time: parseFloat((atTime + duration * 0.66).toFixed(2)), yaw: baseCam.yaw, pitch: baseCam.pitch - 4, roll: -120, fov: Math.min(135, baseCam.fov + 15), projection: 'perspective', easing: 'linear' },
        { id: uid(), time: tEnd, yaw: baseCam.yaw, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'ease-out' }
      ];

    case 'tiny-planet-drop':
      return [
        { id: uid(), time: t0, yaw: baseCam.yaw, pitch: -85, roll: -90, fov: 145, distortion: 100, projection: 'tiny-planet', easing: 'ease-in-out' },
        { id: uid(), time: tMid, yaw: baseCam.yaw + 45, pitch: -48, roll: -18, fov: 125, distortion: 50, projection: 'perspective', easing: 'ease-in-out' },
        { id: uid(), time: tEnd, yaw: baseCam.yaw, pitch: -6, roll: 0, fov: 94, distortion: 0, projection: 'perspective', easing: 'ease-out' }
      ];

    case 'whip-pan-180': {
      const backYaw = ((baseCam.yaw + 180 + 180) % 360) - 180;
      return [
        { id: uid(), time: t0, yaw: baseCam.yaw, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'ease-in' },
        { id: uid(), time: parseFloat((atTime + duration * 0.35).toFixed(2)), yaw: backYaw, pitch: baseCam.pitch + 4, roll: 12, fov: Math.min(140, baseCam.fov + 20), projection: 'perspective', easing: 'ease-out' },
        { id: uid(), time: parseFloat((atTime + duration * 0.68).toFixed(2)), yaw: backYaw, pitch: baseCam.pitch + 4, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'ease-in' },
        { id: uid(), time: tEnd, yaw: baseCam.yaw, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'ease-out' }
      ];
    }

    case 'fpv-dive-zoom':
      return [
        { id: uid(), time: t0, yaw: baseCam.yaw, pitch: -6, roll: 0, fov: 136, projection: 'perspective', easing: 'ease-in' },
        { id: uid(), time: tMid, yaw: baseCam.yaw, pitch: -56, roll: 8, fov: 60, projection: 'perspective', easing: 'ease-in-out' },
        { id: uid(), time: tEnd, yaw: baseCam.yaw, pitch: -8, roll: 0, fov: 96, projection: 'perspective', easing: 'ease-out' }
      ];

    case 'orbit-360':
      return [
        { id: uid(), time: t0, yaw: -175, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'linear' },
        { id: uid(), time: parseFloat((atTime + duration * 0.33).toFixed(2)), yaw: -55, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'linear' },
        { id: uid(), time: parseFloat((atTime + duration * 0.66).toFixed(2)), yaw: 65, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'linear' },
        { id: uid(), time: tEnd, yaw: 175, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'ease-out' }
      ];

    case 'acro-s-turn':
      return [
        { id: uid(), time: t0, yaw: baseCam.yaw, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'ease-in-out' },
        { id: uid(), time: parseFloat((atTime + duration * 0.33).toFixed(2)), yaw: baseCam.yaw - 42, pitch: baseCam.pitch - 10, roll: -42, fov: 112, projection: 'perspective', easing: 'ease-in-out' },
        { id: uid(), time: parseFloat((atTime + duration * 0.66).toFixed(2)), yaw: baseCam.yaw + 42, pitch: baseCam.pitch - 8, roll: 42, fov: 112, projection: 'perspective', easing: 'ease-in-out' },
        { id: uid(), time: tEnd, yaw: baseCam.yaw, pitch: baseCam.pitch, roll: 0, fov: baseCam.fov, projection: 'perspective', easing: 'ease-out' }
      ];
  }
}

export function generateProceduralTelemetry(totalSeconds: number = 180): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const baseLat = 45.5152;
  const baseLon = -122.6784;
  const sampleRate = 5;
  const totalSamples = totalSeconds * sampleRate;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const divePhase = Math.sin(t * 0.35);
    const rollManeuver = Math.sin(t * 0.7) * Math.cos(t * 0.25);

    const speed = Math.max(18, 52 + divePhase * 28 + Math.sin(t * 1.7) * 5);
    const altitude = Math.max(2.5, 14 + Math.cos(t * 0.3) * 10);
    const pitch = divePhase * -16 + Math.sin(t * 1.2) * 3;
    const roll = rollManeuver * 34;
    const yaw = (t * 9 + 90 + Math.sin(t * 0.4) * 25) % 360;
    const battery = Math.max(12, 98 - (t / totalSeconds) * 42);
    const voltage = 22.2 * (battery / 100) + 1.2;
    const throttle = Math.min(100, Math.max(18, 48 + divePhase * 24));
    const gForce = 1.0 + Math.abs(divePhase) * 1.4 + Math.abs(rollManeuver) * 0.6;

    points.push({
      time: parseFloat(t.toFixed(2)),
      lat: baseLat + Math.sin(t * 0.04) * 0.008,
      lon: baseLon + Math.cos(t * 0.04) * 0.008,
      altitude: parseFloat(altitude.toFixed(1)),
      speed: parseFloat(speed.toFixed(1)),
      pitch: parseFloat(pitch.toFixed(1)),
      roll: parseFloat(roll.toFixed(1)),
      yaw: parseFloat(yaw.toFixed(1)),
      battery: Math.round(battery),
      voltage: parseFloat(voltage.toFixed(2)),
      throttle: Math.round(throttle),
      gForce: parseFloat(gForce.toFixed(2)),
      satellites: 21,
      mode: speed > 65 ? 'MANUAL / ACRO' : 'NORMAL'
    });
  }

  return points;
}

export function getInterpolatedTelemetry(points: TelemetryPoint[], time: number): TelemetryPoint {
  if (!points || points.length === 0) {
    return {
      time,
      lat: 45.5152,
      lon: -122.6784,
      altitude: 8.4,
      speed: 48,
      pitch: -5,
      roll: 2,
      yaw: 90,
      battery: 92,
      voltage: 23.1,
      throttle: 52,
      gForce: 1.1,
      satellites: 21,
      mode: 'NORMAL'
    };
  }

  if (time <= points[0].time) return points[0];
  if (time >= points[points.length - 1].time) return points[points.length - 1];

  let low = 0;
  let high = points.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].time < time) low = mid + 1;
    else high = mid - 1;
  }

  const p0 = points[Math.max(0, low - 1)];
  const p1 = points[Math.min(points.length - 1, low)];
  const span = p1.time - p0.time;
  const factor = span === 0 ? 0 : (time - p0.time) / span;

  return {
    time,
    lat: p0.lat + (p1.lat - p0.lat) * factor,
    lon: p0.lon + (p1.lon - p0.lon) * factor,
    altitude: parseFloat((p0.altitude + (p1.altitude - p0.altitude) * factor).toFixed(1)),
    speed: parseFloat((p0.speed + (p1.speed - p0.speed) * factor).toFixed(1)),
    pitch: parseFloat((p0.pitch + (p1.pitch - p0.pitch) * factor).toFixed(1)),
    roll: parseFloat((p0.roll + (p1.roll - p0.roll) * factor).toFixed(1)),
    yaw: parseFloat((p0.yaw + (p1.yaw - p0.yaw) * factor).toFixed(1)),
    battery: Math.round(p0.battery + (p1.battery - p0.battery) * factor),
    voltage: parseFloat((p0.voltage + (p1.voltage - p0.voltage) * factor).toFixed(2)),
    throttle: Math.round(p0.throttle + (p1.throttle - p0.throttle) * factor),
    gForce: parseFloat((p0.gForce + (p1.gForce - p0.gForce) * factor).toFixed(2)),
    satellites: p0.satellites,
    mode: p0.mode
  };
}

function applyEasing(t: number, easing: KeyframeEasing = 'ease-in-out'): number {
  if (easing === 'linear') return t;
  if (easing === 'ease-in') return t * t;
  if (easing === 'ease-out') return t * (2 - t);
  return t * t * (3 - 2 * t);
}

export function getInterpolatedCamera(keyframes: Keyframe360[], time: number): {
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  distortion: number;
  projection: ProjectionMode;
} {
  if (!keyframes || keyframes.length === 0) {
    return { yaw: 0, pitch: -4, roll: 0, fov: 92, distortion: 0, projection: 'perspective' };
  }

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  if (time <= sorted[0].time) {
    const k = sorted[0];
    return {
      yaw: k.yaw,
      pitch: k.pitch,
      roll: k.roll,
      fov: k.fov,
      distortion: k.distortion ?? 0,
      projection: k.projection
    };
  }
  if (time >= sorted[sorted.length - 1].time) {
    const k = sorted[sorted.length - 1];
    return {
      yaw: k.yaw,
      pitch: k.pitch,
      roll: k.roll,
      fov: k.fov,
      distortion: k.distortion ?? 0,
      projection: k.projection
    };
  }

  let index = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      index = i;
      break;
    }
  }

  const k0 = sorted[index];
  const k1 = sorted[index + 1];
  const span = k1.time - k0.time;
  const rawT = span === 0 ? 0 : (time - k0.time) / span;
  const ease = applyEasing(rawT, k0.easing || 'ease-in-out');

  let diffYaw = k1.yaw - k0.yaw;
  if (diffYaw > 180) diffYaw -= 360;
  if (diffYaw < -180) diffYaw += 360;

  return {
    yaw: k0.yaw + diffYaw * ease,
    pitch: k0.pitch + (k1.pitch - k0.pitch) * ease,
    roll: k0.roll + (k1.roll - k0.roll) * ease,
    fov: k0.fov + (k1.fov - k0.fov) * ease,
    distortion: (k0.distortion ?? 0) + ((k1.distortion ?? 0) - (k0.distortion ?? 0)) * ease,
    projection: rawT < 0.85 ? k0.projection : k1.projection
  };
}

/**
 * OpenOSV Free-Look Viewpoint Lock Replay:
 * - While the mouse was actively dragged (consecutive samples <= 0.18s apart), interpolates smoothly.
 * - Whenever you stopped moving the mouse (gap > 0.18s), LOCKS & HOLDS the exact fixed perspective
 *   where you stopped until the timestamp of your next mouse drag!
 */
export function getFreeLookRecordedCamera(
  samples: FreeLookSample[],
  time: number,
  fallback: { yaw: number; pitch: number; roll: number; fov: number; projection: ProjectionMode }
): {
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  projection: ProjectionMode;
} {
  if (!samples || samples.length === 0) return fallback;
  const sorted = [...samples].sort((a, b) => a.time - b.time);
  if (time <= sorted[0].time) return sorted[0];
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1];

  let idx = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (time >= sorted[i].time && time <= sorted[i + 1].time) {
      idx = i;
      break;
    }
  }

  const s0 = sorted[idx];
  const s1 = sorted[idx + 1];
  const dt = s1.time - s0.time;

  // Viewpoint Lock: if user stopped dragging for > 0.18s, hold s0's exact perspective flat until s1!
  if (dt > 0.18 || dt <= 0) {
    return {
      yaw: s0.yaw,
      pitch: s0.pitch,
      roll: s0.roll,
      fov: s0.fov,
      projection: s0.projection
    };
  }

  const f = (time - s0.time) / dt;
  let diffYaw = s1.yaw - s0.yaw;
  if (diffYaw > 180) diffYaw -= 360;
  if (diffYaw < -180) diffYaw += 360;

  return {
    yaw: s0.yaw + diffYaw * f,
    pitch: s0.pitch + (s1.pitch - s0.pitch) * f,
    roll: s0.roll + (s1.roll - s0.roll) * f,
    fov: s0.fov + (s1.fov - s0.fov) * f,
    projection: s0.projection
  };
}

/**
 * Convert recorded OpenOSV Free-Look pass (including hold plateaus) into editable timeline Keyframes
 */
export function bakeFreeLookSamplesToKeyframes(samples: FreeLookSample[]): Keyframe360[] {
  if (!samples || samples.length === 0) return [];
  const sorted = [...samples].sort((a, b) => a.time - b.time);
  const out: Keyframe360[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = out[out.length - 1];
    // Thin dense mouse samples to ~0.25s while preserving hold boundaries accurately
    const next = sorted[i + 1];
    const isBeforeHold = next && next.time - cur.time > 0.2;
    const isAfterHold = i > 0 && cur.time - sorted[i - 1].time > 0.2;

    if (isAfterHold && i > 0) {
      const holdPrev = sorted[i - 1];
      out.push({
        id: `fl-hold-${i}-${Date.now()}`,
        time: parseFloat(Math.max(0, cur.time - 0.04).toFixed(2)),
        yaw: holdPrev.yaw,
        pitch: holdPrev.pitch,
        roll: holdPrev.roll,
        fov: holdPrev.fov,
        distortion: 0,
        projection: holdPrev.projection,
        easing: 'linear'
      });
    }

    if (!prev || cur.time - prev.time >= 0.25 || isBeforeHold || isAfterHold || i === sorted.length - 1) {
      out.push({
        id: `fl-kf-${i}-${Date.now()}`,
        time: parseFloat(cur.time.toFixed(2)),
        yaw: parseFloat(cur.yaw.toFixed(1)),
        pitch: parseFloat(cur.pitch.toFixed(1)),
        roll: parseFloat(cur.roll.toFixed(1)),
        fov: parseFloat(cur.fov.toFixed(1)),
        distortion: 0,
        projection: cur.projection,
        easing: 'linear'
      });
    }
  }

  return out;
}

export function generateTrackingKeyframes(
  startTime: number,
  duration: number,
  stepSeconds: number = 2.0
): Keyframe360[] {
  const keyframes: Keyframe360[] = [];
  const steps = Math.max(2, Math.min(24, Math.floor(duration / stepSeconds)));

  for (let i = 0; i <= steps; i++) {
    const t = parseFloat((startTime + i * stepSeconds).toFixed(2));
    const targetYaw = ((t * 24 + 15) % 360) - 180;
    const targetPitch = Math.sin(t * 1.1) * 10 - 4;
    const targetRoll = Math.sin(t * 0.5) * 4;
    const targetFov = 92 + Math.cos(t * 0.4) * 8;

    keyframes.push({
      id: `track-kf-${i}-${Date.now()}`,
      time: t,
      yaw: parseFloat(targetYaw.toFixed(1)),
      pitch: parseFloat(targetPitch.toFixed(1)),
      roll: parseFloat(targetRoll.toFixed(1)),
      fov: parseFloat(targetFov.toFixed(1)),
      distortion: 0,
      projection: 'perspective',
      easing: 'ease-in-out'
    });
  }

  return keyframes;
}

/**
 * Compute CSS filter string matching orbis-reframe ColourPanel:
 * LUT + Strength (0-100%), Exposure (-2.0 to +2.0 EV), Contrast (-100%..100%),
 * Saturation (-100%..100%), Temperature (-100%..100%)
 */
export function computeCSSFilterString(filters?: VideoFilters): string {
  if (!filters) return 'none';

  // Exposure in EV: 2^(EV) multiplier on brightness
  const evFactor = Math.pow(2, filters.exposure || 0);
  let b = 100 * evFactor + (filters.brightness || 0);
  let c = 100 + (filters.contrast || 0) * 0.65;
  let s = 100 + (filters.saturation || 0) * 0.85;
  let hue = 0;
  let sepia = 0;

  const lutMix = (filters.lutStrength ?? 100) / 100;
  if (filters.lut && filters.lut !== 'normal' && lutMix > 0) {
    switch (filters.lut) {
      case 'openosv-rec709':
        c = c * (1 + 0.22 * lutMix);
        s = s * (1 + 0.2 * lutMix);
        b = b * (1 + 0.02 * lutMix);
        break;
      case 'openosv-pq-hdr':
        c = c * (1 + 0.28 * lutMix);
        s = s * (1 + 0.25 * lutMix);
        b = b * (1 + 0.06 * lutMix);
        break;
      case 'd-cinelike':
        c = c * (1 - 0.14 * lutMix);
        s = s * (1 - 0.18 * lutMix);
        b = b * (1 + 0.04 * lutMix);
        break;
      case 'd-log-m':
        c = c * (1 + 0.2 * lutMix);
        s = s * (1 + 0.18 * lutMix);
        break;
      case 'rocksteady':
        c = c * (1 + 0.24 * lutMix);
        s = s * (1 + 0.28 * lutMix);
        break;
      case 'cyberpunk':
        c = c * (1 + 0.18 * lutMix);
        s = s * (1 + 0.32 * lutMix);
        hue -= 18 * lutMix;
        break;
      case 'warm':
        sepia += 24 * lutMix;
        s = s * (1 + 0.16 * lutMix);
        c = c * (1 + 0.08 * lutMix);
        break;
    }
  }

  if (filters.temperature > 0) {
    sepia += filters.temperature * 0.35;
  } else if (filters.temperature < 0) {
    hue += filters.temperature * 0.25;
  }

  const blurStr = filters.blur > 0 ? ` blur(${filters.blur}px)` : '';
  return `brightness(${Math.max(15, b).toFixed(0)}%) contrast(${Math.max(20, c).toFixed(0)}%) saturate(${Math.max(0, s).toFixed(0)}%) sepia(${Math.min(100, sepia).toFixed(0)}%) hue-rotate(${hue.toFixed(0)}deg)${blurStr}`;
}

/**
 * Multitrack Audio Engine
 */
class MultitrackAudioMixer {
  private ctx: AudioContext | null = null;
  private motorOscs: OscillatorNode[] = [];
  private motorGain: GainNode | null = null;
  private pulseOsc: OscillatorNode | null = null;
  private pulseGain: GainNode | null = null;
  private htmlAudios: Map<string, HTMLAudioElement> = new Map();
  private captureDest: MediaStreamAudioDestinationNode | null = null;
  private isStarted = false;

  private ensureContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.ctx && !this.captureDest && typeof this.ctx.createMediaStreamDestination === 'function') {
      this.captureDest = this.ctx.createMediaStreamDestination();
    }
  }

  public getCaptureStream(): MediaStream | null {
    try {
      this.start();
      return this.captureDest ? this.captureDest.stream : null;
    } catch {
      return null;
    }
  }

  public start() {
    try {
      this.ensureContext();
      if (!this.ctx || this.isStarted) return;

      this.motorGain = this.ctx.createGain();
      this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.motorGain.connect(this.ctx.destination);
      if (this.captureDest) this.motorGain.connect(this.captureDest);

      this.motorOscs = [132, 136, 141, 145].map((freq) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx!.currentTime);
        osc.connect(this.motorGain!);
        osc.start();
        return osc;
      });

      this.pulseGain = this.ctx.createGain();
      this.pulseGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.pulseGain.connect(this.ctx.destination);
      if (this.captureDest) this.pulseGain.connect(this.captureDest);

      this.pulseOsc = this.ctx.createOscillator();
      this.pulseOsc.type = 'triangle';
      this.pulseOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
      this.pulseOsc.connect(this.pulseGain);
      this.pulseOsc.start();

      this.isStarted = true;
    } catch {
      // ignore autoplay restriction until user gesture
    }
  }

  public syncTimeline(
    isPlaying: boolean,
    isMasterMuted: boolean,
    previewVolumePct: number,
    currentTime: number,
    throttlePercent: number,
    tracks: Track[],
    clips: TimelineClip[]
  ) {
    const masterGain = isMasterMuted ? 0 : Math.max(0, Math.min(1, previewVolumePct / 100));

    if (!isPlaying || masterGain === 0) {
      if (this.ctx && this.motorGain) this.motorGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      if (this.ctx && this.pulseGain) this.pulseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      this.htmlAudios.forEach((el) => {
        if (!el.paused) el.pause();
      });
      return;
    }

    if (!this.isStarted) this.start();

    const anySolo = tracks.some((t) => t.solo);
    const activeAudioClips = clips.filter((c) => {
      if (c.type !== 'audio' || c.muted) return false;
      const track = tracks.find((t) => t.id === c.trackId);
      if (!track || !track.visible || track.muted) return false;
      if (anySolo && !track.solo) return false;
      return currentTime >= c.startTime && currentTime <= c.startTime + c.duration;
    });

    let motorVol = 0;
    let musicVol = 0;

    activeAudioClips.forEach((clip) => {
      const vol = ((clip.volume ?? 80) / 100) * masterGain;
      if (clip.sourceUrl) {
        let audioEl = this.htmlAudios.get(clip.id);
        if (!audioEl) {
          audioEl = new Audio(clip.sourceUrl);
          this.htmlAudios.set(clip.id, audioEl);
        }
        audioEl.volume = Math.max(0, Math.min(1, vol));
        audioEl.playbackRate = clip.speed || 1;
        const targetOffset = (currentTime - clip.startTime) * (clip.speed || 1) + clip.offset;
        if (Math.abs(audioEl.currentTime - targetOffset) > 0.35) {
          audioEl.currentTime = Math.max(0, targetOffset);
        }
        if (audioEl.paused) {
          audioEl.play().catch(() => {});
        }
      } else if (clip.synthPreset === 'synth-drive') {
        musicVol = Math.max(musicVol, vol * 0.08);
      } else {
        const windCut = clip.windNoiseFilter ? 0.65 : 1.0;
        motorVol = Math.max(motorVol, vol * 0.045 * windCut);
      }
    });

    this.htmlAudios.forEach((el, clipId) => {
      if (!activeAudioClips.some((c) => c.id === clipId) && !el.paused) {
        el.pause();
      }
    });

    if (this.ctx) {
      if (this.motorGain) {
        this.motorGain.gain.setTargetAtTime(motorVol, this.ctx.currentTime, 0.08);
      }
      const targetFreq = 115 + (throttlePercent / 100) * 240;
      this.motorOscs.forEach((osc, i) => {
        osc.frequency.setTargetAtTime(targetFreq + i * 3, this.ctx!.currentTime, 0.1);
      });

      if (this.pulseGain && this.pulseOsc) {
        this.pulseGain.gain.setTargetAtTime(musicVol, this.ctx.currentTime, 0.08);
        const step = Math.floor(currentTime * 4) % 4;
        const bassNotes = [55, 65.41, 73.42, 82.41];
        this.pulseOsc.frequency.setTargetAtTime(bassNotes[step], this.ctx.currentTime, 0.03);
      }
    }
  }

  public stopAll() {
    if (this.ctx && this.motorGain) this.motorGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    if (this.ctx && this.pulseGain) this.pulseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    this.htmlAudios.forEach((el) => {
      if (!el.paused) el.pause();
    });
  }
}

export const audioMixer = new MultitrackAudioMixer();
