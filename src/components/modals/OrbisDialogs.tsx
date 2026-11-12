/**
 * orbis-reframe Workstation Dialogs
 * Styled in the native Qt6 Ember palette (#232528 panel, #1c1d20 window, #383b41 border, #f5a04a accent).
 * Covers:
 * - Import Video / OSV 360 / Picture-in-Picture
 * - Import Audio
 * - Import GPX / DJI SRT Telemetry
 * - Camera Tricks Studio
 * - Lens Calibration Dialog (LensCalibrationDialog.cpp)
 * - Project Library (.orp projects)
 * - Project Settings (ProjectSettingsDialog.cpp)
 * - User Manual, Keyboard Shortcuts & About orbis-reframe
 */

import React, { useState } from 'react';
import {
  X,
  Upload,
  Plus,
  Wand2,
  MapPin,
  Layers,
  Camera,
  Download
} from 'lucide-react';
import {
  ActiveDialog,
  OSVFileMetadata,
  AudioAssetMetadata,
  CameraTrickId,
  ProjectSettings
} from '../../types/editor';
import { OrbisThemeColors } from '../../services/osvStitcher';

interface OrbisDialogsProps {
  activeDialog: ActiveDialog;
  onClose: () => void;
  theme: OrbisThemeColors;
  currentTime: number;
  videoFiles: OSVFileMetadata[];
  audioFiles: AudioAssetMetadata[];
  gpxOffset: number;
  telemetryCount: number;
  projectSettings: ProjectSettings;
  onImportVideoFiles: (files: FileList, asPiP: boolean) => void;
  onAddExistingVideoToTrack: (file: OSVFileMetadata, asPiP: boolean) => void;
  onImportAudioFiles: (files: FileList) => void;
  onAddExistingAudioToTrack: (audio: AudioAssetMetadata) => void;
  onImportTelemetryFile: (file: File) => void;
  onGpxOffsetChange: (offset: number) => void;
  onApplyCameraTrick: (trickId: CameraTrickId, duration: number) => void;
  onUpdateProjectSettings: (settings: ProjectSettings) => void;
  onLoadPresetProject: (preset: 'flying-low' | 'alpine-acro' | 'empty') => void;
  onDownloadProjectArchive?: () => void;
}

const CAMERA_TRICKS: Array<{
  id: CameraTrickId;
  name: string;
  desc: string;
}> = [
  {
    id: 'barrel-roll',
    name: '360° FPV Barrel Roll',
    desc: 'Writes a smooth 360° roll-axis maneuver with a wide-FOV entry punch.'
  },
  {
    id: 'tiny-planet-drop',
    name: 'Tiny Planet Sky Drop-In',
    desc: 'Starts in stereographic Tiny Planet projection overhead and dives into natural rectilinear flight.'
  },
  {
    id: 'whip-pan-180',
    name: '180° Look-Back Whip-Pan',
    desc: 'Snaps 180° behind the drone to check the chase view, then whips forward.'
  },
  {
    id: 'fpv-dive-zoom',
    name: 'Alpine Dive Hyper-Zoom',
    desc: 'Opens at 136° ultra-wide and pitches downward into a 60° telephoto rush.'
  },
  {
    id: 'orbit-360',
    name: '360° Smooth Horizon Orbit',
    desc: 'Pans yaw continuously across all 360° while holding pitch level.'
  },
  {
    id: 'acro-s-turn',
    name: 'Banked Acro S-Turn',
    desc: 'Carves a coordinated ±42° roll and yaw S-turn through the 360 sphere.'
  }
];

export const OrbisDialogs: React.FC<OrbisDialogsProps> = ({
  activeDialog,
  onClose,
  theme,
  currentTime,
  videoFiles,
  audioFiles,
  gpxOffset,
  telemetryCount,
  projectSettings,
  onImportVideoFiles,
  onAddExistingVideoToTrack,
  onImportAudioFiles,
  onAddExistingAudioToTrack,
  onImportTelemetryFile,
  onGpxOffsetChange,
  onApplyCameraTrick,
  onUpdateProjectSettings,
  onLoadPresetProject,
  onDownloadProjectArchive
}) => {
  const [asPiP, setAsPiP] = useState(false);
  const [trickDuration, setTrickDuration] = useState(3.0);
  const [calibFov, setCalibFov] = useState(194);
  const [calibCenterOffset, setCalibCenterOffset] = useState(0.4);

  if (!activeDialog || activeDialog === 'export') return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.panel,
          borderColor: theme.border,
          color: theme.text
        }}
        className="border rounded-[6px] max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl text-[12.5px]"
      >
        {/* DIALOG: IMPORT VIDEO / OSV */}
        {activeDialog === 'import-video' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold">Import media (.osv / .insv / .mp4 / .mov)</span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span style={{ color: theme.textDim }}>Placement mode:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setAsPiP(false)}
                    style={
                      !asPiP
                        ? { backgroundColor: theme.accentSoft, borderColor: theme.accent, color: theme.accent }
                        : { backgroundColor: theme.button, borderColor: theme.border, color: theme.textDim }
                    }
                    className="px-3 py-1 rounded-[4px] border text-[12px]"
                  >
                    Main Video / 360° Sphere
                  </button>
                  <button
                    onClick={() => setAsPiP(true)}
                    style={
                      asPiP
                        ? { backgroundColor: theme.accentSoft, borderColor: theme.accent, color: theme.accent }
                        : { backgroundColor: theme.button, borderColor: theme.border, color: theme.textDim }
                    }
                    className="px-3 py-1 rounded-[4px] border text-[12px]"
                  >
                    Picture in Picture (Overlay)
                  </button>
                </div>
              </div>

              <label
                style={{ backgroundColor: theme.window, borderColor: theme.border }}
                className="flex flex-col items-center justify-center gap-2 border border-dashed hover:border-[#f5a04a] p-6 rounded-[4px] cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5" style={{ color: theme.accent }} />
                <span className="font-medium">Choose local .OSV, .INSV, .MP4, .MOV or .WEBM files…</span>
                <span className="text-[11.5px] text-center" style={{ color: theme.textDim }}>
                  DJI Avata / Osmo 360 (.osv) and Insta360 (.insv) files automatically enable 360° stitching and reframing
                </span>
                <input
                  type="file"
                  accept=".osv,.insv,.mp4,.mov,.webm,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onImportVideoFiles(e.target.files, asPiP);
                      onClose();
                    }
                  }}
                />
              </label>

              <div className="space-y-1.5">
                <div className="text-[11.5px]" style={{ color: theme.textDim }}>
                  Project media pool — click Insert to place at playhead ({currentTime.toFixed(1)} s):
                </div>
                {videoFiles.map((vf) => (
                  <div
                    key={vf.id}
                    style={{ backgroundColor: theme.window, borderColor: theme.border }}
                    className="px-3 py-2 border rounded-[4px] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">{vf.fileName}</div>
                      <div className="text-[11px]" style={{ color: theme.textDim }}>
                        {vf.is360 ? `360° ${vf.format.toUpperCase()}` : 'Flat Video'} · {vf.resolution} · {vf.fps} fps
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onAddExistingVideoToTrack(vf, asPiP);
                        onClose();
                      }}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.accent
                      }}
                      className="px-2.5 py-1 rounded-[4px] border hover:border-[#f5a04a] flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Insert</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* DIALOG: IMPORT AUDIO */}
        {activeDialog === 'import-audio' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold">Add audio file (.mp3 / .wav / .ogg / .flac)</span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <label
                style={{ backgroundColor: theme.window, borderColor: theme.border }}
                className="flex flex-col items-center justify-center gap-2 border border-dashed hover:border-[#f5a04a] p-6 rounded-[4px] cursor-pointer transition-colors"
              >
                <Upload className="w-5 h-5" style={{ color: theme.accent }} />
                <span className="font-medium">Choose local audio files…</span>
                <input
                  type="file"
                  accept=".mp3,.wav,.ogg,.flac,.m4a,audio/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      onImportAudioFiles(e.target.files);
                      onClose();
                    }
                  }}
                />
              </label>

              <div className="space-y-1.5">
                {audioFiles.map((aud) => (
                  <div
                    key={aud.id}
                    style={{ backgroundColor: theme.window, borderColor: theme.border }}
                    className="px-3 py-2 border rounded-[4px] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">{aud.fileName}</div>
                      <div className="text-[11px]" style={{ color: theme.textDim }}>
                        {aud.category} · {aud.duration} s
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onAddExistingAudioToTrack(aud);
                        onClose();
                      }}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.accent
                      }}
                      className="px-2.5 py-1 rounded-[4px] border hover:border-[#f5a04a]"
                    >
                      Add to Audio track
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* DIALOG: IMPORT TELEMETRY */}
        {activeDialog === 'import-telemetry' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold">Import GPX / DJI SRT flight telemetry</span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <label
                style={{ backgroundColor: theme.window, borderColor: theme.border }}
                className="flex flex-col items-center justify-center gap-2 border border-dashed hover:border-[#f5a04a] p-6 rounded-[4px] cursor-pointer transition-colors"
              >
                <MapPin className="w-5 h-5" style={{ color: theme.accent }} />
                <span className="font-medium">Load .GPX or DJI Goggles .SRT log…</span>
                <span className="text-[11px] text-center" style={{ color: theme.textDim }}>
                  Synchronizes GPS speed, altitude, heading, and attitude with telemetry gauges and FPV OSD overlays
                </span>
                <input
                  type="file"
                  accept=".gpx,.srt,.csv,.xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      onImportTelemetryFile(f);
                      onClose();
                    }
                  }}
                />
              </label>

              <div
                style={{ backgroundColor: theme.window, borderColor: theme.border }}
                className="p-3 border rounded-[4px] space-y-2"
              >
                <div className="flex justify-between">
                  <span style={{ color: theme.textDim }}>Timecode sync offset</span>
                  <span className="font-mono">{gpxOffset.toFixed(1)} s ({telemetryCount} pts)</span>
                </div>
                <input
                  type="range"
                  min={-10}
                  max={10}
                  step={0.1}
                  value={gpxOffset}
                  onChange={(e) => onGpxOffsetChange(Number(e.target.value))}
                  className="orbis-slider w-full"
                />
              </div>
            </div>
          </>
        )}

        {/* DIALOG: CAMERA TRICKS STUDIO */}
        {activeDialog === 'camera-tricks' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold flex items-center gap-2">
                <Wand2 className="w-4 h-4" style={{ color: theme.accent }} />
                Camera tricks & 360° reframe movements
              </span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <span style={{ color: theme.textDim }}>
                  Writes reframe keyframes starting at playhead ({currentTime.toFixed(2)} s)
                </span>
                <div className="flex items-center gap-2">
                  <span style={{ color: theme.textDim }}>Length:</span>
                  <input
                    type="range"
                    min={1.5}
                    max={7.0}
                    step={0.5}
                    value={trickDuration}
                    onChange={(e) => setTrickDuration(Number(e.target.value))}
                    className="orbis-slider w-24"
                  />
                  <span className="font-mono w-9 text-right">{trickDuration.toFixed(1)} s</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CAMERA_TRICKS.map((tr) => (
                  <div
                    key={tr.id}
                    style={{ backgroundColor: theme.window, borderColor: theme.border }}
                    className="p-3 border rounded-[4px] flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="font-semibold">{tr.name}</div>
                      <p className="text-[11px] mt-1 leading-snug" style={{ color: theme.textDim }}>
                        {tr.desc}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onApplyCameraTrick(tr.id, trickDuration);
                        onClose();
                      }}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.accent
                      }}
                      className="w-full py-1.5 rounded-[4px] border hover:border-[#f5a04a] font-medium"
                    >
                      Insert at playhead
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* DIALOG: LENS CALIBRATION (LensCalibrationDialog.cpp) */}
        {activeDialog === 'lens-calibration' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold flex items-center gap-2">
                <Camera className="w-4 h-4" style={{ color: theme.accent }} />
                Calibrate camera lenses (Dual-Fisheye OSV / INSV)
              </span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <p style={{ color: theme.textDim }} className="text-[12px]">
                Fine-tunes the Kannala-Brandt equidistant fisheye circle radius and optical centre for custom DJI Avata 360 / Osmo 360 `.osv` lens guards.
              </p>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span style={{ color: theme.textDim }}>Fisheye coverage angle</span>
                  <span className="font-mono">{calibFov}°</span>
                </div>
                <input
                  type="range"
                  min={180}
                  max={210}
                  value={calibFov}
                  onChange={(e) => setCalibFov(Number(e.target.value))}
                  className="orbis-slider w-full"
                />

                <div className="flex justify-between pt-1">
                  <span style={{ color: theme.textDim }}>Inter-lens baseline (cm)</span>
                  <span className="font-mono">{(3.8 + calibCenterOffset).toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={2}
                  step={0.1}
                  value={calibCenterOffset}
                  onChange={(e) => setCalibCenterOffset(Number(e.target.value))}
                  className="orbis-slider w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={onClose}
                  style={{ backgroundColor: theme.button, borderColor: theme.border }}
                  className="px-3.5 py-1.5 rounded-[4px] border"
                >
                  Save profile
                </button>
              </div>
            </div>
          </>
        )}

        {/* DIALOG: PROJECT LIBRARY (.orp projects — ProjectLibraryPage.cpp) */}
        {activeDialog === 'project-library' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: theme.accent }} />
                orbis-reframe Project Library
              </span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5">
              {[
                {
                  id: 'flying-low' as const,
                  name: 'Experiment.orp',
                  desc: 'FlyingLowv2.osv (5.7K 60 fps) + Camera mic + "Flying Low" centred title'
                },
                {
                  id: 'alpine-acro' as const,
                  name: 'Alpine_Avata_HUD.orp',
                  desc: 'DJI_Avata_Alpine_Dive.osv + StickCam PiP + DJI O3 Telemetry HUD + Soundtrack'
                },
                {
                  id: 'empty' as const,
                  name: 'Blank Project.orp',
                  desc: 'Clean empty Video + Camera mic timeline ready for local OSV/MP4 imports'
                }
              ].map((proj) => (
                <div
                  key={proj.id}
                  style={{ backgroundColor: theme.window, borderColor: theme.border }}
                  className="p-3 border rounded-[4px] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold">{proj.name}</div>
                    <div className="text-[11.5px]" style={{ color: theme.textDim }}>
                      {proj.desc}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onLoadPresetProject(proj.id);
                      onClose();
                    }}
                    style={{
                      backgroundColor: theme.button,
                      borderColor: theme.border,
                      color: theme.accent
                    }}
                    className="px-3 py-1 rounded-[4px] border hover:border-[#f5a04a] shrink-0"
                  >
                    Open
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* DIALOG: PROJECT SETTINGS */}
        {activeDialog === 'project-settings' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold">Project settings</span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <span style={{ color: theme.textDim }}>Project file</span>
                <input
                  type="text"
                  value={projectSettings.projectName}
                  onChange={(e) =>
                    onUpdateProjectSettings({ ...projectSettings, projectName: e.target.value })
                  }
                  style={{
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.text
                  }}
                  className="px-2.5 py-1 rounded-[4px] border"
                />
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <span style={{ color: theme.textDim }}>Output size</span>
                <select
                  value={projectSettings.targetResolution}
                  onChange={(e) =>
                    onUpdateProjectSettings({
                      ...projectSettings,
                      targetResolution: e.target.value as ProjectSettings['targetResolution']
                    })
                  }
                  style={{
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.text
                  }}
                  className="px-2.5 py-1 rounded-[4px] border"
                >
                  <option value="3840×2160 (4K UHD)">3840×2160 (4K UHD)</option>
                  <option value="1920×1080 (Full HD)">1920×1080 (Full HD)</option>
                  <option value="1080×1920 (Vertical)">1080×1920 (Vertical 9:16)</option>
                </select>
              </div>

              <div className="grid grid-cols-[120px_1fr] items-center gap-3">
                <span style={{ color: theme.textDim }}>Frame rate</span>
                <select
                  value={projectSettings.frameRate}
                  onChange={(e) =>
                    onUpdateProjectSettings({
                      ...projectSettings,
                      frameRate: Number(e.target.value) as 60 | 30 | 24
                    })
                  }
                  style={{
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.text
                  }}
                  className="px-2.5 py-1 rounded-[4px] border"
                >
                  <option value={60}>60 fps</option>
                  <option value={30}>30 fps</option>
                  <option value={24}>24 fps</option>
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={onClose}
                  style={{
                    backgroundColor: theme.accent,
                    color: theme.textOnAccent
                  }}
                  className="px-4 py-1 rounded-[4px] font-semibold"
                >
                  OK
                </button>
              </div>
            </div>
          </>
        )}

        {/* DIALOG: KEYBOARD SHORTCUTS */}
        {activeDialog === 'shortcuts' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold">Keyboard shortcuts</span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] overflow-y-auto">
              {[
                ['Space', 'Play / Pause'],
                ['F', 'Toggle Free Look (Viewpoint Lock)'],
                ['Shift+R', 'Record / Stop Free-Look video'],
                ['Drag (Viewer)', 'Pan & Tilt (locks on release)'],
                ['Shift + Drag', 'OpenOSV single-axis lock'],
                ['Ctrl + Drag / Wheel', 'OpenOSV smooth zoom (FOV)'],
                ['Alt + Drag', 'OpenOSV camera roll'],
                ['← / →', 'Step one frame back / forward'],
                ['S', 'Split clip at playhead'],
                ['[ / ]', 'Trim start / end to playhead'],
                ['R', 'Restore trimmed clip length'],
                ['A', 'Arm reframe keyframing'],
                ['K / Shift+K', 'Set / Delete reframe keyframe'],
                ['M / Shift+M', 'Add / Delete mark'],
                ['Ctrl+I', 'Import OSV / Video files'],
                ['Ctrl+E', 'Export flat video'],
                ['Ctrl+B', 'Toggle Sources sidebar'],
                ['Ctrl+Z / Ctrl+Y', 'Undo / Redo']
              ].map(([k, desc]) => (
                <div
                  key={k}
                  style={{ backgroundColor: theme.window, borderColor: theme.border }}
                  className="px-2.5 py-1.5 border rounded-[4px] flex items-center justify-between gap-2"
                >
                  <span style={{ color: theme.textDim }}>{desc}</span>
                  <kbd
                    style={{ backgroundColor: theme.button, borderColor: theme.border, color: theme.accent }}
                    className="px-1.5 py-0.5 border rounded font-mono text-[11px]"
                  >
                    {k}
                  </kbd>
                </div>
              ))}
            </div>
          </>
        )}

        {/* DIALOG: USER MANUAL */}
        {activeDialog === 'manual' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold">orbis-reframe User manual</span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 leading-relaxed overflow-y-auto text-[12px]" style={{ color: theme.textDim }}>
              <p>
                <strong style={{ color: theme.text }}>1. Opening OSV / INSV 360° Footage:</strong> Use <span style={{ color: theme.accent }}>Media → Import files… (Ctrl+I)</span> or the <span style={{ color: theme.accent }}>+</span> button in the left Media panel to open `.osv`, `.insv`, or `.mp4` clips. Double-click any clip in Media to append it to the timeline.
              </p>
              <p>
                <strong style={{ color: theme.text }}>2. OpenOSV Free Look (Viewpoint Lock) & Live Recording:</strong> Select <span style={{ color: theme.accent }}>Free look</span> in the PlayerBar, EditToolbar, or <span style={{ color: theme.accent }}>Video → Reframe → Control</span> (shortcut <span style={{ color: theme.accent }}>F</span>). Drag inside the 360° viewer while playing to steer the camera (<span style={{ color: theme.accent }}>Shift+Drag</span> locks horizontal/vertical axis, <span style={{ color: theme.accent }}>Ctrl+Drag</span> zooms, <span style={{ color: theme.accent }}>Alt+Drag</span> rolls). Whatever perspective you stop moving on stays locked for the rest of playback until you drag again. Click <span style={{ color: theme.accent }}>Rec free look (Shift+R)</span> to record a flattened `.webm` video live as you steer.
              </p>
              <p>
                <strong style={{ color: theme.text }}>3. Keyframes & Camera Tricks:</strong> Switch <span style={{ color: theme.accent }}>Control</span> to <span style={{ color: theme.accent }}>Keyframes</span> or enable <span style={{ color: theme.accent }}>Arm reframe (A)</span> to interpolate between diamonds on the timeline, or pick a preset maneuver under <span style={{ color: theme.accent }}>Edit → Camera tricks & movements</span>.
              </p>
              <p>
                <strong style={{ color: theme.text }}>4. Multitrack Overlays, FPV HUD & Audio:</strong> Switch the left sidebar to the <span style={{ color: theme.accent }}>Overlays</span> tab to drop Titles, DJI Avata 360 badges, GPS speed dials, or full DJI O3 / Betaflight OSD gauges onto Overlay tracks above Video.
              </p>
              <p>
                <strong style={{ color: theme.text }}>5. Exporting Flat Video & Fedora Linux Bundle:</strong> Choose <span style={{ color: theme.accent }}>File → Export flat video… (Ctrl+E)</span> to export either a live-steered Free-Look pass or timeline edit, or choose <span style={{ color: theme.accent }}>File → Download Fedora Linux project (.tar.gz)</span> to run locally via `./run-linux.sh`.
              </p>
            </div>
          </>
        )}

        {/* DIALOG: ABOUT */}
        {activeDialog === 'about' && (
          <>
            <div
              style={{ backgroundColor: theme.menuBar, borderColor: theme.border }}
              className="px-4 py-2.5 border-b flex items-center justify-between"
            >
              <span className="font-semibold">About orbis-reframe</span>
              <button onClick={onClose} style={{ color: theme.icon }} className="p-0.5 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-[12px]">
              <div className="font-semibold text-[14px]">orbis-reframe — Avata-Craft Linux Workstation Edition</div>
              <p style={{ color: theme.textDim }}>
                Built on the <span style={{ color: theme.text }}>Schabo/orbis-reframe</span> interface for <span style={{ color: theme.text }}>Fedora Linux 45 Workstation</span>, integrating <span style={{ color: theme.text }}>Kemerd/OpenOSV</span> Free-Look viewpoint lock, per-clip stitching & HDR LUTs, DroneHUDEditor telemetry OSDs, Aerosphere horizon stabilization, GPStitch GPX/SRT sync, and DJIStudioCraft 10-bit profiles.
              </p>
              <div className="flex items-center justify-between pt-2 gap-2">
                {onDownloadProjectArchive && (
                  <button
                    onClick={() => {
                      onDownloadProjectArchive();
                      onClose();
                    }}
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.textOnAccent
                    }}
                    className="px-3.5 py-1 rounded-[4px] font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Fedora Linux project (.tar.gz)</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{ backgroundColor: theme.button, borderColor: theme.border }}
                  className="px-4 py-1 rounded-[4px] border ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
