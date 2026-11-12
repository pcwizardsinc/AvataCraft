/**
 * orbis-reframe Core Data Model & Types
 * Faithful to Schabo/orbis-reframe (Qt6/Vulkan Linux editor)
 * Extended with DJI OSV 360 support, DroneHUDEditor, Aerosphere, GPStitch & DJIStudioCraft
 */

export type VideoFormat = 'osv' | 'insv' | 'mp4' | 'mov' | 'webm';

export type TrackType = 'video' | 'audio' | 'overlay';

export type OverlayKind = 'pip' | 'title' | 'hud' | 'gauge';

export type OrbisThemeId = 'ember' | 'neutral-dark' | 'light';

export type LeftSidebarTab = 'media' | 'overlays' | 'transitions';

export type RightSidebarTab = 'video' | 'audio' | 'pip' | 'overlay' | 'transition' | 'privacy';

export type ProjectionMode = 'perspective' | 'tiny-planet' | 'fisheye' | 'inverted';

export type ReframeFitMode = 'contain-bars' | 'fill-crop' | 'reframe-360';

export type CameraControlMode = 'free-look' | 'keyframes';

export interface FreeLookSample {
  time: number;
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  projection: ProjectionMode;
}

export type SplitScreenMode = 'off' | 'side-by-side' | 'rear-pip' | 'over-under';

export type StabilizationMode = 'off' | 'lean-follow' | 'horizon-lock' | 'direction-lock' | 'custom';

export type KeyframeEasing = 'ease-in-out' | 'linear' | 'ease-in' | 'ease-out';

export type DJILutProfile =
  | 'normal'
  | 'openosv-rec709'
  | 'openosv-pq-hdr'
  | 'd-cinelike'
  | 'd-log-m'
  | 'rocksteady'
  | 'cyberpunk'
  | 'warm';

export type DewarpProfile = 'avata-ultrawide' | 'wide' | 'standard' | 'none';

export type HUDPreset = 'dji-o3' | 'betaflight' | 'cyber-cyan' | 'stealth-white';

export type TransitionType = 'none' | 'crossfade' | 'dip-to-black' | 'flash-white';

export type CameraTrickId =
  | 'barrel-roll'
  | 'tiny-planet-drop'
  | 'whip-pan-180'
  | 'fpv-dive-zoom'
  | 'orbit-360'
  | 'acro-s-turn';

export type ActiveDialog =
  | null
  | 'import-video'
  | 'import-audio'
  | 'import-telemetry'
  | 'camera-tricks'
  | 'lens-calibration'
  | 'project-library'
  | 'project-settings'
  | 'export'
  | 'shortcuts'
  | 'manual'
  | 'about';

export interface OSVFileMetadata {
  id: string;
  folder: string; // e.g. "FinishedVideos" or "Avata360_OSV"
  fileName: string;
  format: VideoFormat;
  fileSize: string;
  duration: number; // seconds
  width: number;
  height: number;
  resolution: string; // e.g. "3840×2160" or "5760×2880"
  fps: number;
  is360: boolean;
  lensConfiguration: 'dual-fisheye' | 'equirectangular' | 'flat-rectilinear';
  lensGuards: 'none' | 'standard' | 'premium';
  stitched: boolean;
  seamMode: 'depth-aware' | 'fixed' | 'optical-flow';
  seamColourBlend: boolean;
  seamFlow: boolean;
  perClipAlignment?: boolean;
  removeSkyBanding?: boolean;
  removeSunGhost?: boolean;
  hasGyro: boolean;
  hasGPS: boolean;
  audioChannels: number;
  windReduction: boolean;
  sceneTheme?: 'flying-low' | 'alpine' | 'urban' | 'coastal' | 'cockpit-pip';
  videoUrl?: string;
  thumbnailDataUrl?: string;
}

export interface AudioAssetMetadata {
  id: string;
  folder: string;
  fileName: string;
  duration: number;
  category: 'Motor SFX' | 'Atmosphere' | 'Soundtrack' | 'Imported Audio';
  synthPreset?: 'motors' | 'wind' | 'synth-drive';
  audioUrl?: string;
}

export interface VideoOverlaySettings {
  enabled: boolean;
  mode: 'pip-corner' | 'side-by-side' | 'full-broll';
  x: number; // 0-100%
  y: number; // 0-100%
  scale: number; // 10-100%
  opacity: number; // 0-1
  border: boolean;
  cornerRadius?: number;
}

export interface PrivacyBlurPatch {
  enabled: boolean;
  mode: 'nadir-tripod' | 'center-plate';
  showRegions: boolean;
  scanned: boolean;
  radius: number;
  strength: number;
}

export interface VideoFilters {
  lut: DJILutProfile;
  lutStrength: number; // 0 to 100%
  exposure: number; // -2.0 to +2.0 EV (stored as -200 to 200 or float -2.0..2.0, let's use float -2.0 to +2.0 EV!)
  contrast: number; // -100 to +100%
  saturation: number; // -100 to +100%
  temperature: number; // -100 to +100%
  brightness: number; // -50 to 50
  vignette: number; // 0 to 100
  blur: number; // 0 to 20
}

export interface GaugeSettings {
  kind: 'fpv-full-hud' | 'speed-dial' | 'altitude-bar' | 'heading-tape' | 'lean-dial' | 'g-circle' | 'route-map';
  unitSystem: 'metric' | 'imperial';
  accentColor: string;
  faceOpacity: number;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  type: TrackType;
  overlayKind?: OverlayKind;
  title: string;
  startTime: number;
  duration: number;
  sourceDuration: number;
  offset: number;
  mediaId?: string;
  linkedVideoClipId?: string; // for "Camera mic" audio linked to a video clip
  sourceUrl?: string;
  sourceType?: 'procedural' | 'file';
  is360?: boolean;
  fitMode?: ReframeFitMode;
  splitScreen?: SplitScreenMode;
  sceneTheme?: 'flying-low' | 'alpine' | 'urban' | 'coastal' | 'cockpit-pip';
  synthPreset?: 'motors' | 'wind' | 'synth-drive';
  volume?: number; // 0 to 100
  muted?: boolean;
  windNoiseFilter?: boolean;
  speed?: number; // 0.25 to 4
  transitionIn?: TransitionType;
  transitionOut?: TransitionType;
  transitionDuration?: number;
  filters?: VideoFilters;
  overlay?: VideoOverlaySettings;
  privacyBlur?: PrivacyBlurPatch;
  hudConfig?: HUDConfig;
  gaugeSettings?: GaugeSettings;
  textContent?: string;
  textSubline?: string;
  textPositionY?: number;
  textFontSize?: number;
  textColor?: string;
  showAvataWatermark?: boolean;
  cameraControlMode?: CameraControlMode;
  freeLookSamples?: FreeLookSample[];
  keyframes?: Keyframe360[];
  marks?: number[]; // timeline highlight marks (M)
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  isMainVideo?: boolean;
  isCameraMic?: boolean;
  layerNumber?: number;
  expanded?: boolean;
  muted: boolean;
  solo: boolean;
  locked: boolean;
  visible: boolean;
}

export interface Keyframe360 {
  id: string;
  time: number;
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  distortion?: number; // 0 to 100%
  projection: ProjectionMode;
  easing: KeyframeEasing;
}

export interface HUDWidgets {
  pitchLadder: boolean;
  horizonBar: boolean;
  speedTape: boolean;
  altitudeTape: boolean;
  compassTape: boolean;
  homeArrow: boolean;
  batteryGauge: boolean;
  throttleMeter: boolean;
  gForceGauge: boolean;
  gpsCoordinates: boolean;
  flightMode: boolean;
  crosshair: boolean;
}

export interface HUDConfig {
  preset: HUDPreset;
  unitSystem: 'metric' | 'imperial';
  opacity: number;
  scale: number;
  color: string;
  widgets: HUDWidgets;
}

export interface TelemetryPoint {
  time: number;
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  pitch: number;
  roll: number;
  yaw: number;
  battery: number;
  voltage: number;
  throttle: number;
  gForce: number;
  satellites: number;
  mode: string;
}

export interface StabilizerConfig {
  mode: StabilizationMode;
  enabled: boolean;
  horizonLock: boolean;
  leanFollow: boolean;
  smoothFactor: number; // 0 to 1
  dewarpProfile: DewarpProfile;
}

export interface TrackingTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface TrackerState {
  active: boolean;
  isSelecting: boolean;
  target: TrackingTarget | null;
  autoFollow: boolean;
  smoothing: number;
  showTrajectory: boolean;
  trajectory: Array<{ x: number; y: number; z: number; time: number }>;
}

export interface ProjectSettings {
  projectName: string;
  modified: boolean;
  targetResolution: '3840×2160 (4K UHD)' | '1920×1080 (Full HD)' | '1080×1920 (Vertical)';
  frameRate: 60 | 30 | 24;
  defaultSeamMode: 'depth-aware' | 'fixed' | 'optical-flow';
  audioSampleRate: 48000 | 44100;
}

export interface ExportSettings {
  resolution: '4K' | '1080p' | '720p' | 'vertical_1080p';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
  fps: 60 | 30 | 24;
  format: 'webm' | 'mp4';
  quality: 'ultra' | 'high' | 'medium';
  encoder: 'VA-API (Linux/Intel/AMD)' | 'NVENC (NVIDIA)' | 'WebM VP9 Live Capture';
  cameraSource?: 'free-look-live' | 'free-look-locked' | 'keyframes';
  includeHUD: boolean;
  includeAudio: boolean;
}
