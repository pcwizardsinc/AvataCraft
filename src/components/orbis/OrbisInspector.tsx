/**
 * orbis-reframe Right SettingsSidebar
 * Exact replica of Schabo/orbis-reframe/src/ui/SettingsSidebar.cpp & SettingsPanel.cpp:
 * - Top 6 Icon Tabs: [Video] [Audio] [Picture in picture] [Overlay] [Transition] [Privacy] + [>] Close
 * - Video Tab Sections:
 *    > Stitching           This clip
 *    ⌄ Stabilization       This clip
 *    ⌄ Reframe             Keys at the playhead
 *    ⌄ Split screen        This clip
 *    ⌄ Colour              This clip   (LUT, Strength, Exposure EV, Contrast, Saturation, Temperature + Reset | Copy grade | Paste grade)
 *    > Media information   This clip
 * - Seamlessly integrates OSV 360 camera tricks, CSRT subject tracking, Aerosphere gyro, GPStitch & DroneHUDEditor gauges.
 */

import React, { useState } from 'react';
import {
  Video,
  Volume2,
  PictureInPicture2,
  Shapes,
  Blend,
  EyeOff,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Crosshair,
  Wand2,
  Compass,
  Circle,
  Square,
  Download,
  RotateCcw
} from 'lucide-react';
import {
  RightSidebarTab,
  ProjectionMode,
  KeyframeEasing,
  HUDConfig,
  StabilizerConfig,
  TrackerState,
  DJILutProfile,
  VideoFilters,
  TimelineClip,
  OSVFileMetadata,
  CameraTrickId,
  TransitionType,
  SplitScreenMode,
  StabilizationMode,
  ReframeFitMode,
  CameraControlMode
} from '../../types/editor';
import { DEFAULT_VIDEO_FILTERS, OrbisThemeColors } from '../../services/osvStitcher';

interface AccordionSectionProps {
  title: string;
  scope?: string;
  expanded: boolean;
  onToggle: () => void;
  theme: OrbisThemeColors;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  scope,
  expanded,
  onToggle,
  theme,
  children
}) => (
  <div style={{ borderColor: theme.border }} className="border-b">
    <button
      onClick={onToggle}
      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors"
    >
      <span className="flex items-center gap-1.5 font-semibold text-[12.5px]" style={{ color: theme.text }}>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 opacity-80" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 opacity-80" />
        )}
        <span>{title}</span>
      </span>
      {scope && (
        <span className="text-[11px] font-normal" style={{ color: theme.textDim }}>
          {scope}
        </span>
      )}
    </button>
    {expanded && <div className="px-3.5 pt-1 pb-3.5 space-y-2.5 text-[12px]">{children}</div>}
  </div>
);

interface EmberSliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue: string;
  theme: OrbisThemeColors;
  onChange: (val: number) => void;
  onDoubleClickReset?: () => void;
}

const EmberSliderRow: React.FC<EmberSliderRowProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  theme,
  onChange,
  onDoubleClickReset
}) => {
  const pct = Math.max(0, Math.min(100, ((value - min) / Math.max(0.0001, max - min)) * 100));
  return (
    <div className="grid grid-cols-[84px_1fr_52px] items-center gap-2.5">
      <span className="text-[12px] truncate" style={{ color: theme.textDim }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={onDoubleClickReset}
        style={{
          background: `linear-gradient(to right, ${theme.accent} 0%, ${theme.accent} ${pct}%, ${theme.border} ${pct}%, ${theme.border} 100%)`
        }}
        className="orbis-slider w-full"
      />
      <span
        className="text-[11.5px] font-mono tabular-nums text-right"
        style={{ color: theme.textDim }}
      >
        {displayValue}
      </span>
    </div>
  );
};

interface OrbisInspectorProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab: RightSidebarTab;
  onChangeTab: (tab: RightSidebarTab) => void;
  theme: OrbisThemeColors;
  activeVideoClip: TimelineClip | null;
  selectedClip: TimelineClip | null;
  activeMediaFile: OSVFileMetadata | null;
  onUpdateClip: (clip: TimelineClip) => void;
  onUpdateMediaFile: (file: OSVFileMetadata) => void;
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  distortion: number;
  projection: ProjectionMode;
  onCameraChange: (y: number, p: number, r: number, f: number, dist?: number) => void;
  onProjectionChange: (m: ProjectionMode) => void;
  currentEasing: KeyframeEasing;
  onChangeEasing: (easing: KeyframeEasing) => void;
  cameraControlMode: CameraControlMode;
  onCameraControlModeChange: (mode: CameraControlMode) => void;
  isRecordingFreeLook: boolean;
  recordingSeconds: number;
  hasRecordedFreeLookVideo: boolean;
  onToggleRecordFreeLook: () => void;
  onDownloadRecordedFreeLook: () => void;
  onBakeFreeLookToKeyframes: () => void;
  onClearFreeLookPass: () => void;
  onSetKeyframe: () => void;
  onApplyCameraTrick: (trick: CameraTrickId, duration: number) => void;
  tracker: TrackerState;
  onTrackerChange: (tracker: TrackerState) => void;
  onRunSubjectTracker: () => void;
  stabilizer: StabilizerConfig;
  onStabilizerChange: (stab: StabilizerConfig) => void;
  hudConfig: HUDConfig;
  onHUDConfigChange: (config: HUDConfig) => void;
  gpxOffset: number;
  onGpxOffsetChange: (offset: number) => void;
  filters: VideoFilters;
  onFiltersChange: (filters: VideoFilters) => void;
}

export const OrbisInspector: React.FC<OrbisInspectorProps> = ({
  isOpen,
  onToggleOpen,
  activeTab,
  onChangeTab,
  theme,
  activeVideoClip,
  selectedClip,
  activeMediaFile,
  onUpdateClip,
  onUpdateMediaFile,
  yaw,
  pitch,
  roll,
  fov,
  distortion,
  projection,
  onCameraChange,
  onProjectionChange,
  currentEasing,
  onChangeEasing,
  cameraControlMode,
  onCameraControlModeChange,
  isRecordingFreeLook,
  recordingSeconds,
  hasRecordedFreeLookVideo,
  onToggleRecordFreeLook,
  onDownloadRecordedFreeLook,
  onBakeFreeLookToKeyframes,
  onClearFreeLookPass,
  onSetKeyframe,
  onApplyCameraTrick,
  tracker,
  onTrackerChange,
  onRunSubjectTracker,
  stabilizer,
  onStabilizerChange,
  hudConfig,
  onHUDConfigChange,
  gpxOffset,
  onGpxOffsetChange,
  filters,
  onFiltersChange
}) => {
  // Accordion expanded states matching SettingsSidebar.cpp defaults:
  // Stitching & MediaInfo closed until opened; Stabilization, Reframe, Split screen, Colour open!
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    stitching: false,
    stabilization: true,
    reframe: true,
    splitScreen: true,
    colour: true,
    mediaInfo: false
  });

  const [copiedGrade, setCopiedGrade] = useState<VideoFilters | null>(null);
  const [selectedTrick, setSelectedTrick] = useState<CameraTrickId>('barrel-roll');

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const targetVideoClip =
    selectedClip?.type === 'video' ? selectedClip : activeVideoClip;

  const isClip360 = targetVideoClip ? targetVideoClip.is360 !== false : true;
  const activeFilters = targetVideoClip?.filters || filters;

  const updateFilters = (next: VideoFilters) => {
    onFiltersChange(next);
    if (targetVideoClip) {
      onUpdateClip({ ...targetVideoClip, filters: next });
    }
  };

  const selectClass =
    'w-full px-2.5 py-1 rounded-[4px] border text-[12px] focus:outline-none transition-colors';

  // Collapsed slim strip (TabSidebar::Side::Right)
  if (!isOpen) {
    return (
      <div
        style={{ backgroundColor: theme.panel, borderColor: theme.border }}
        className="w-9 h-full border-l flex flex-col items-center py-1.5 gap-1 shrink-0 select-none"
      >
        <button
          onClick={onToggleOpen}
          title="Open the sidebar (Ctrl+Shift+B)"
          style={{ color: theme.icon }}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {(
          [
            ['video', Video, 'Video'],
            ['audio', Volume2, 'Audio'],
            ['pip', PictureInPicture2, 'Picture in picture'],
            ['overlay', Shapes, 'Overlay'],
            ['transition', Blend, 'Transition'],
            ['privacy', EyeOff, 'Privacy']
          ] as const
        ).map(([id, Icon, tip]) => (
          <button
            key={id}
            onClick={() => {
              onChangeTab(id);
              onToggleOpen();
            }}
            title={tip}
            style={
              activeTab === id
                ? { backgroundColor: theme.accentSoft, color: theme.iconActive }
                : { color: theme.icon }
            }
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5"
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: theme.panel,
        borderColor: theme.border,
        color: theme.text
      }}
      className="w-[338px] h-full border-l flex flex-col shrink-0 select-none overflow-hidden"
    >
      {/* Top 6 Icon Tabs + [>] Collapse Button (exact SettingsSidebar.cpp order) */}
      <div
        style={{ borderColor: theme.border }}
        className="h-9 px-1.5 border-b flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-1">
          {(
            [
              ['video', Video, 'Video'],
              ['audio', Volume2, 'Audio'],
              ['pip', PictureInPicture2, 'Picture in picture'],
              ['overlay', Shapes, 'Overlay'],
              ['transition', Blend, 'Transition'],
              ['privacy', EyeOff, 'Privacy']
            ] as const
          ).map(([id, Icon, tip]) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onChangeTab(id)}
                title={tip}
                style={
                  active
                    ? {
                        backgroundColor: theme.accentSoft,
                        color: theme.iconActive,
                        borderColor: `${theme.accent}55`
                      }
                    : { color: theme.icon, borderColor: 'transparent' }
                }
                className="w-7 h-7 rounded-[4px] border flex items-center justify-center hover:bg-white/5 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        <button
          onClick={onToggleOpen}
          title="Close the sidebar (Ctrl+Shift+B)"
          style={{ color: theme.icon }}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="flex-1 overflow-y-auto">
        {/* ========================================================= */}
        {/* TAB 1: VIDEO (Stitching, Stabilization, Reframe, Split screen, Colour, Media info) */}
        {/* ========================================================= */}
        {activeTab === 'video' && (
          <div>
            {/* 1. STITCHING */}
            <AccordionSection
              title="Stitching"
              scope="This clip"
              expanded={openSections.stitching}
              onToggle={() => toggleSection('stitching')}
              theme={theme}
            >
              {activeMediaFile ? (
                <>
                  <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                    <span style={{ color: theme.textDim }}>Source mode</span>
                    <select
                      value={isClip360 ? '360' : 'flat'}
                      onChange={(e) => {
                        const next360 = e.target.value === '360';
                        if (targetVideoClip) {
                          onUpdateClip({
                            ...targetVideoClip,
                            is360: next360,
                            fitMode: next360 ? 'reframe-360' : 'contain-bars'
                          });
                        }
                        onUpdateMediaFile({ ...activeMediaFile, is360: next360 });
                      }}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    >
                      <option value="360">360° OSV / Equirectangular</option>
                      <option value="flat">Flat video</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                    <span style={{ color: theme.textDim }}>Lens guards</span>
                    <select
                      value={activeMediaFile.lensGuards}
                      onChange={(e) =>
                        onUpdateMediaFile({
                          ...activeMediaFile,
                          lensGuards: e.target.value as OSVFileMetadata['lensGuards']
                        })
                      }
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    >
                      <option value="none">None</option>
                      <option value="standard">Standard lens guards</option>
                      <option value="premium">Premium lens guards</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                    <span style={{ color: theme.textDim }}>Stitcher</span>
                    <select
                      value={activeMediaFile.seamMode}
                      onChange={(e) =>
                        onUpdateMediaFile({
                          ...activeMediaFile,
                          seamMode: e.target.value as OSVFileMetadata['seamMode']
                        })
                      }
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    >
                      <option value="depth-aware">Depth-aware seam</option>
                      <option value="fixed">Fixed seam</option>
                      <option value="optical-flow">New stitcher (optical flow)</option>
                    </select>
                  </div>

                  <div className="pl-[94px] space-y-1.5 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeMediaFile.stitched}
                        onChange={(e) =>
                          onUpdateMediaFile({ ...activeMediaFile, stitched: e.target.checked })
                        }
                        className="accent-[#f5a04a]"
                      />
                      <span>Stitch dual-fisheye lenses</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeMediaFile.seamColourBlend}
                        onChange={(e) =>
                          onUpdateMediaFile({
                            ...activeMediaFile,
                            seamColourBlend: e.target.checked
                          })
                        }
                        className="accent-[#f5a04a]"
                      />
                      <span>Seam colour blend</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeMediaFile.seamFlow}
                        onChange={(e) =>
                          onUpdateMediaFile({ ...activeMediaFile, seamFlow: e.target.checked })
                        }
                        className="accent-[#f5a04a]"
                      />
                      <span>Seam flow</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeMediaFile.perClipAlignment ?? true}
                        onChange={(e) =>
                          onUpdateMediaFile({
                            ...activeMediaFile,
                            perClipAlignment: e.target.checked
                          })
                        }
                        className="accent-[#f5a04a]"
                      />
                      <span>OpenOSV per-clip lens alignment</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeMediaFile.removeSkyBanding ?? true}
                        onChange={(e) =>
                          onUpdateMediaFile({
                            ...activeMediaFile,
                            removeSkyBanding: e.target.checked
                          })
                        }
                        className="accent-[#f5a04a]"
                      />
                      <span>OpenOSV sky-banding removal</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeMediaFile.removeSunGhost ?? false}
                        onChange={(e) =>
                          onUpdateMediaFile({
                            ...activeMediaFile,
                            removeSunGhost: e.target.checked
                          })
                        }
                        className="accent-[#f5a04a]"
                      />
                      <span>Subtract sun-ghost lens flare</span>
                    </label>
                  </div>
                </>
              ) : (
                <p style={{ color: theme.textDim }}>No clip selected.</p>
              )}
            </AccordionSection>

            {/* 2. STABILIZATION */}
            <AccordionSection
              title="Stabilization"
              scope="This clip"
              expanded={openSections.stabilization}
              onToggle={() => toggleSection('stabilization')}
              theme={theme}
            >
              {!isClip360 ? (
                <p style={{ color: theme.textDim }}>
                  A flat video has no motion data to stabilize with.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                    <span style={{ color: theme.textDim }}>Mode</span>
                    <select
                      value={stabilizer.mode}
                      onChange={(e) => {
                        const mode = e.target.value as StabilizationMode;
                        onStabilizerChange({
                          ...stabilizer,
                          mode,
                          enabled: mode !== 'off',
                          horizonLock: mode === 'horizon-lock' || mode === 'direction-lock',
                          leanFollow: mode === 'lean-follow'
                        });
                      }}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    >
                      <option value="off">Off</option>
                      <option value="lean-follow">Lean follow</option>
                      <option value="horizon-lock">Horizon lock</option>
                      <option value="direction-lock">Direction lock</option>
                      <option value="custom">Custom (Avata Gyro)</option>
                    </select>
                  </div>

                  {stabilizer.mode !== 'off' && (
                    <EmberSliderRow
                      label="Strength"
                      value={Math.round(stabilizer.smoothFactor * 100)}
                      min={0}
                      max={100}
                      displayValue={`${Math.round(stabilizer.smoothFactor * 100)}%`}
                      theme={theme}
                      onChange={(v) =>
                        onStabilizerChange({ ...stabilizer, smoothFactor: v / 100 })
                      }
                      onDoubleClickReset={() =>
                        onStabilizerChange({ ...stabilizer, smoothFactor: 0.5 })
                      }
                    />
                  )}
                </>
              )}
            </AccordionSection>

            {/* 3. REFRAME */}
            <AccordionSection
              title="Reframe"
              scope={
                !isClip360
                  ? 'This clip'
                  : cameraControlMode === 'free-look'
                  ? 'Free look · Viewpoint lock'
                  : 'Keys at the playhead'
              }
              expanded={openSections.reframe}
              onToggle={() => toggleSection('reframe')}
              theme={theme}
            >
              {!isClip360 ? (
                <>
                  <p style={{ color: theme.textDim }}>
                    A flat video is shown as it is, not reframed.
                  </p>
                  <div className="grid grid-cols-[84px_1fr] items-center gap-2.5 pt-1">
                    <span style={{ color: theme.textDim }}>Fit</span>
                    <select
                      value={targetVideoClip?.fitMode || 'contain-bars'}
                      onChange={(e) => {
                        const val = e.target.value as ReframeFitMode;
                        if (val === 'reframe-360' && targetVideoClip) {
                          onUpdateClip({ ...targetVideoClip, is360: true, fitMode: 'reframe-360' });
                        } else if (targetVideoClip) {
                          onUpdateClip({ ...targetVideoClip, fitMode: val });
                        }
                      }}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    >
                      <option value="contain-bars">Whole picture, with bars</option>
                      <option value="fill-crop">Fill frame (crop)</option>
                      <option value="reframe-360">Reframe as 360° sphere</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* OpenOSV Camera Control Mode Selector */}
                  <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                    <span style={{ color: theme.textDim }}>Control</span>
                    <select
                      value={cameraControlMode}
                      onChange={(e) => onCameraControlModeChange(e.target.value as CameraControlMode)}
                      style={{
                        backgroundColor: theme.button,
                        borderColor:
                          cameraControlMode === 'free-look' ? `${theme.accent}80` : theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    >
                      <option value="free-look">Free look (Viewpoint lock — OpenOSV)</option>
                      <option value="keyframes">Keyframes (Smooth timeline)</option>
                    </select>
                  </div>

                  {cameraControlMode === 'free-look' && (
                    <div
                      style={{
                        backgroundColor: theme.window,
                        borderColor: theme.border,
                        color: theme.textDim
                      }}
                      className="p-2.5 rounded-[4px] border space-y-2 text-[11.5px]"
                    >
                      <div className="flex items-start gap-2">
                        <Compass className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: theme.accent }} />
                        <span>
                          Drag in the viewer while playing to steer; stopping locks that fixed perspective until you move again.
                        </span>
                      </div>
                      <div className="text-[10.5px] font-mono opacity-85">
                        Drag: Pan/Tilt · Shift: Axis lock · Ctrl/Wheel: Zoom · Alt: Roll
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <button
                          onClick={onToggleRecordFreeLook}
                          style={
                            isRecordingFreeLook
                              ? {
                                  backgroundColor: theme.accent,
                                  borderColor: theme.accent,
                                  color: theme.textOnAccent
                                }
                              : {
                                  backgroundColor: theme.accentSoft,
                                  borderColor: `${theme.accent}70`,
                                  color: theme.accent
                                }
                          }
                          className="flex-1 py-1 px-2 rounded-[4px] border font-medium flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
                        >
                          {isRecordingFreeLook ? (
                            <>
                              <Square className="w-3 h-3 fill-current" />
                              <span>
                                Stop & finish ({Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
                                {Math.floor(recordingSeconds % 60).toString().padStart(2, '0')})
                              </span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3 h-3 fill-current" />
                              <span>Record free-look video</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => onCameraChange(0, -4, 0, 92, 0)}
                          title="Reset locked viewpoint forward"
                          style={{
                            backgroundColor: theme.button,
                            borderColor: theme.border,
                            color: theme.text
                          }}
                          className="py-1 px-2 rounded-[4px] border hover:border-[#f5a04a] flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>0°</span>
                        </button>
                      </div>

                      {hasRecordedFreeLookVideo && !isRecordingFreeLook && (
                        <button
                          onClick={onDownloadRecordedFreeLook}
                          style={{
                            backgroundColor: theme.accent,
                            color: theme.textOnAccent
                          }}
                          className="w-full py-1 px-2 rounded-[4px] font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Save recorded Free-Look video (.webm)</span>
                        </button>
                      )}

                      {Boolean(targetVideoClip?.freeLookSamples?.length) && !isRecordingFreeLook && (
                        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                          <button
                            onClick={onBakeFreeLookToKeyframes}
                            style={{
                              backgroundColor: theme.button,
                              borderColor: theme.border,
                              color: theme.text
                            }}
                            className="py-1 px-2 rounded-[4px] border hover:border-[#f5a04a] text-[11px]"
                          >
                            Convert pass → Keyframes
                          </button>
                          <button
                            onClick={onClearFreeLookPass}
                            style={{
                              backgroundColor: theme.button,
                              borderColor: theme.border,
                              color: theme.textDim
                            }}
                            className="py-1 px-2 rounded-[4px] border hover:text-white text-[11px]"
                          >
                            Clear recorded pass
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                    <span style={{ color: theme.textDim }}>View</span>
                    <select
                      value={projection}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'flat-fit' && targetVideoClip) {
                          onUpdateClip({
                            ...targetVideoClip,
                            is360: false,
                            fitMode: 'contain-bars'
                          });
                        } else {
                          onProjectionChange(v as ProjectionMode);
                        }
                      }}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    >
                      <option value="perspective">Natural (Rectilinear)</option>
                      <option value="tiny-planet">Tiny planet</option>
                      <option value="fisheye">Fisheye (Avata 155°)</option>
                      <option value="inverted">Inverted planet</option>
                      <option value="flat-fit">Flat (Whole picture, with bars)</option>
                    </select>
                  </div>

                  <EmberSliderRow
                    label="Yaw"
                    value={Math.round(yaw)}
                    min={-180}
                    max={180}
                    displayValue={`${Math.round(yaw)}°`}
                    theme={theme}
                    onChange={(v) => onCameraChange(v, pitch, roll, fov, distortion)}
                    onDoubleClickReset={() => onCameraChange(0, pitch, roll, fov, distortion)}
                  />
                  <EmberSliderRow
                    label="Pitch"
                    value={Math.round(pitch)}
                    min={-89}
                    max={89}
                    displayValue={`${Math.round(pitch)}°`}
                    theme={theme}
                    onChange={(v) => onCameraChange(yaw, v, roll, fov, distortion)}
                    onDoubleClickReset={() => onCameraChange(yaw, 0, roll, fov, distortion)}
                  />
                  <EmberSliderRow
                    label="Roll"
                    value={Math.round(roll)}
                    min={-180}
                    max={180}
                    displayValue={`${Math.round(roll)}°`}
                    theme={theme}
                    onChange={(v) => onCameraChange(yaw, pitch, v, fov, distortion)}
                    onDoubleClickReset={() => onCameraChange(yaw, pitch, 0, fov, distortion)}
                  />
                  <EmberSliderRow
                    label="Field of view"
                    value={Math.round(fov)}
                    min={30}
                    max={155}
                    displayValue={`${Math.round(fov)}°`}
                    theme={theme}
                    onChange={(v) => onCameraChange(yaw, pitch, roll, v, distortion)}
                    onDoubleClickReset={() => onCameraChange(yaw, pitch, roll, 92, distortion)}
                  />
                  <EmberSliderRow
                    label="Distortion"
                    value={Math.round(distortion)}
                    min={0}
                    max={100}
                    displayValue={`${Math.round(distortion)}%`}
                    theme={theme}
                    onChange={(v) => {
                      onCameraChange(yaw, pitch, roll, fov, v);
                      if (v > 65 && projection === 'perspective') {
                        onProjectionChange('tiny-planet');
                      } else if (v <= 65 && projection === 'tiny-planet') {
                        onProjectionChange('perspective');
                      }
                    }}
                    onDoubleClickReset={() => onCameraChange(yaw, pitch, roll, fov, 0)}
                  />

                  <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                    <span style={{ color: theme.textDim }}>Easing</span>
                    <select
                      value={currentEasing}
                      onChange={(e) => onChangeEasing(e.target.value as KeyframeEasing)}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    >
                      <option value="ease-in-out">Smooth (ease in & out)</option>
                      <option value="linear">Even pace (linear)</option>
                      <option value="ease-out">Fast then slow</option>
                      <option value="ease-in">Slow then fast</option>
                    </select>
                  </div>

                  {/* Keyframe & Subject Tracking Buttons (matching ReframePanel.cpp) */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={onSetKeyframe}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className="py-1.5 px-2.5 rounded-[4px] border hover:border-[#f5a04a] text-[12px] font-medium transition-colors"
                    >
                      Set keyframe ◆
                    </button>
                    <button
                      onClick={() => {
                        if (tracker.target) {
                          onRunSubjectTracker();
                        } else {
                          onTrackerChange({ ...tracker, isSelecting: !tracker.isSelecting });
                        }
                      }}
                      style={
                        tracker.isSelecting
                          ? {
                              backgroundColor: theme.accentSoft,
                              borderColor: theme.accent,
                              color: theme.accent
                            }
                          : {
                              backgroundColor: theme.button,
                              borderColor: theme.border,
                              color: theme.text
                            }
                      }
                      className="py-1.5 px-2.5 rounded-[4px] border hover:border-[#f5a04a] text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>
                        {tracker.isSelecting
                          ? 'Drag box…'
                          : tracker.target
                          ? 'Bake track'
                          : 'Track subject…'}
                      </span>
                    </button>
                  </div>

                  {/* Camera Tricks & Movements Row */}
                  <div className="grid grid-cols-[1fr_auto] items-center gap-1.5 pt-1">
                    <select
                      value={selectedTrick}
                      onChange={(e) => setSelectedTrick(e.target.value as CameraTrickId)}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    >
                      <option value="barrel-roll">Trick: 360° Barrel Roll</option>
                      <option value="tiny-planet-drop">Trick: Tiny Planet Drop-In</option>
                      <option value="whip-pan-180">Trick: 180° Whip-Pan</option>
                      <option value="fpv-dive-zoom">Trick: Dive Hyper-Zoom</option>
                      <option value="orbit-360">Trick: 360° Smooth Orbit</option>
                      <option value="acro-s-turn">Trick: Banked Acro S-Turn</option>
                    </select>
                    <button
                      onClick={() => onApplyCameraTrick(selectedTrick, 3.0)}
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.accent
                      }}
                      className="px-2.5 py-1 rounded-[4px] border hover:border-[#f5a04a] text-[12px] font-medium flex items-center gap-1"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </>
              )}
            </AccordionSection>

            {/* 4. SPLIT SCREEN */}
            <AccordionSection
              title="Split screen"
              scope="This clip"
              expanded={openSections.splitScreen}
              onToggle={() => toggleSection('splitScreen')}
              theme={theme}
            >
              {!isClip360 ? (
                <p style={{ color: theme.textDim }}>A flat video isn't split into panes.</p>
              ) : (
                <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                  <span style={{ color: theme.textDim }}>Panes</span>
                  <select
                    value={targetVideoClip?.splitScreen || 'off'}
                    onChange={(e) => {
                      if (targetVideoClip) {
                        onUpdateClip({
                          ...targetVideoClip,
                          splitScreen: e.target.value as SplitScreenMode
                        });
                      }
                    }}
                    style={{
                      backgroundColor: theme.button,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                    className={selectClass}
                  >
                    <option value="off">Single view</option>
                    <option value="side-by-side">Two panes (Front + Rear 180°)</option>
                    <option value="rear-pip">Rear-view mirror inset</option>
                    <option value="over-under">Stacked (Front / Rear)</option>
                  </select>
                </div>
              )}
            </AccordionSection>

            {/* 5. COLOUR (Exact match to ColourPanel.cpp & Screenshot!) */}
            <AccordionSection
              title="Colour"
              scope="This clip"
              expanded={openSections.colour}
              onToggle={() => toggleSection('colour')}
              theme={theme}
            >
              <p style={{ color: theme.textDim }}>
                Applies to this clip in playback and export.
              </p>

              <div className="grid grid-cols-[84px_1fr] items-center gap-2.5 pt-0.5">
                <span style={{ color: theme.textDim }}>LUT</span>
                <select
                  value={activeFilters.lut}
                  onChange={(e) =>
                    updateFilters({ ...activeFilters, lut: e.target.value as DJILutProfile })
                  }
                  style={{
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.text
                  }}
                  className={selectClass}
                >
                  <option value="normal">None</option>
                  <option value="openosv-rec709">OpenOSV D-Log M → Rec.709</option>
                  <option value="openosv-pq-hdr">OpenOSV D-Log M → Rec.2100 PQ/HLG</option>
                  <option value="d-log-m">DJI D-Log M → Rec.709</option>
                  <option value="d-cinelike">DJI D-Cinelike</option>
                  <option value="rocksteady">RockSteady Vivid</option>
                  <option value="cyberpunk">HLG / Cyber Teal-Amber</option>
                  <option value="warm">Golden Sunset</option>
                </select>
              </div>

              <EmberSliderRow
                label="Strength"
                value={activeFilters.lutStrength ?? 100}
                min={0}
                max={100}
                displayValue={`${activeFilters.lutStrength ?? 100}%`}
                theme={theme}
                onChange={(v) => updateFilters({ ...activeFilters, lutStrength: v })}
                onDoubleClickReset={() => updateFilters({ ...activeFilters, lutStrength: 100 })}
              />

              <EmberSliderRow
                label="Exposure"
                value={activeFilters.exposure}
                min={-2}
                max={2}
                step={0.1}
                displayValue={`${activeFilters.exposure >= 0 ? activeFilters.exposure.toFixed(1) : activeFilters.exposure.toFixed(1)} EV`}
                theme={theme}
                onChange={(v) => updateFilters({ ...activeFilters, exposure: v })}
                onDoubleClickReset={() => updateFilters({ ...activeFilters, exposure: 0 })}
              />

              <EmberSliderRow
                label="Contrast"
                value={activeFilters.contrast}
                min={-100}
                max={100}
                displayValue={`${activeFilters.contrast}%`}
                theme={theme}
                onChange={(v) => updateFilters({ ...activeFilters, contrast: v })}
                onDoubleClickReset={() => updateFilters({ ...activeFilters, contrast: 0 })}
              />

              <EmberSliderRow
                label="Saturation"
                value={activeFilters.saturation}
                min={-100}
                max={100}
                displayValue={`${activeFilters.saturation}%`}
                theme={theme}
                onChange={(v) => updateFilters({ ...activeFilters, saturation: v })}
                onDoubleClickReset={() => updateFilters({ ...activeFilters, saturation: 0 })}
              />

              <EmberSliderRow
                label="Temperature"
                value={activeFilters.temperature}
                min={-100}
                max={100}
                displayValue={`${activeFilters.temperature}%`}
                theme={theme}
                onChange={(v) => updateFilters({ ...activeFilters, temperature: v })}
                onDoubleClickReset={() => updateFilters({ ...activeFilters, temperature: 0 })}
              />

              {/* Exact 3-button row: [ Reset ] [ Copy grade ] [ Paste grade ] */}
              <div className="grid grid-cols-3 gap-1.5 pt-1.5">
                <button
                  onClick={() => updateFilters({ ...DEFAULT_VIDEO_FILTERS })}
                  style={{
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.textDim
                  }}
                  className="py-1 px-2 rounded-[4px] border hover:text-white hover:border-[#4a4e56] text-[11.5px] transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setCopiedGrade({ ...activeFilters })}
                  style={{
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.text
                  }}
                  className="py-1 px-2 rounded-[4px] border hover:border-[#4a4e56] text-[11.5px] transition-colors"
                >
                  Copy grade
                </button>
                <button
                  disabled={!copiedGrade}
                  onClick={() => copiedGrade && updateFilters({ ...copiedGrade })}
                  style={{
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: copiedGrade ? theme.text : theme.textDisabled
                  }}
                  className="py-1 px-2 rounded-[4px] border hover:border-[#4a4e56] text-[11.5px] disabled:opacity-50 transition-colors"
                >
                  Paste grade
                </button>
              </div>
            </AccordionSection>

            {/* 6. MEDIA INFORMATION */}
            <AccordionSection
              title="Media information"
              scope="This clip"
              expanded={openSections.mediaInfo}
              onToggle={() => toggleSection('mediaInfo')}
              theme={theme}
            >
              {activeMediaFile ? (
                <div className="space-y-1.5 text-[11.5px]">
                  {[
                    ['File', activeMediaFile.fileName],
                    ['Container', activeMediaFile.format.toUpperCase()],
                    ['Resolution', activeMediaFile.resolution],
                    ['Frame rate', `${activeMediaFile.fps} fps`],
                    ['Size', activeMediaFile.fileSize],
                    ['Projection', isClip360 ? activeMediaFile.lensConfiguration : 'Flat rectilinear'],
                    ['Motion / GPS', activeMediaFile.hasGyro ? '6-axis Gyro + GPS' : 'None']
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[90px_1fr] gap-2">
                      <span style={{ color: theme.textDim }}>{k}</span>
                      <span className="truncate font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: theme.textDim }}>No media selected.</p>
              )}
            </AccordionSection>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: AUDIO (AudioPanel.cpp) */}
        {/* ========================================================= */}
        {activeTab === 'audio' && (
          <AccordionSection
            title="Audio & Speed"
            scope={selectedClip ? selectedClip.title : 'This clip'}
            expanded={true}
            onToggle={() => {}}
            theme={theme}
          >
            {selectedClip || targetVideoClip ? (
              (() => {
                const clip = selectedClip || targetVideoClip!;
                return (
                  <div className="space-y-3">
                    <EmberSliderRow
                      label="Gain / Level"
                      value={clip.volume ?? 80}
                      min={0}
                      max={100}
                      displayValue={`${clip.volume ?? 80}%`}
                      theme={theme}
                      onChange={(v) => onUpdateClip({ ...clip, volume: v })}
                      onDoubleClickReset={() => onUpdateClip({ ...clip, volume: 80 })}
                    />

                    <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                      <span style={{ color: theme.textDim }}>Clip speed</span>
                      <select
                        value={clip.speed || 1}
                        onChange={(e) =>
                          onUpdateClip({ ...clip, speed: Number(e.target.value) })
                        }
                        style={{
                          backgroundColor: theme.button,
                          borderColor: theme.border,
                          color: theme.text
                        }}
                        className={selectClass}
                      >
                        <option value={0.25}>0.25× (Slow motion)</option>
                        <option value={0.5}>0.5× (Half speed)</option>
                        <option value={1}>1.0× (Normal)</option>
                        <option value={2}>2.0× (Fast)</option>
                        <option value={4}>4.0× (Hyperlapse)</option>
                      </select>
                    </div>

                    <div className="pl-[84px] space-y-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(clip.muted)}
                          onChange={(e) => onUpdateClip({ ...clip, muted: e.target.checked })}
                          className="accent-[#f5a04a]"
                        />
                        <span>Mute this clip</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={clip.windNoiseFilter ?? true}
                          onChange={(e) =>
                            onUpdateClip({ ...clip, windNoiseFilter: e.target.checked })
                          }
                          className="accent-[#f5a04a]"
                        />
                        <span>Wind & prop-wash reduction</span>
                      </label>
                    </div>
                  </div>
                );
              })()
            ) : (
              <p style={{ color: theme.textDim }}>Select a video or audio clip on the timeline.</p>
            )}
          </AccordionSection>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PICTURE IN PICTURE (OverlayPanel.cpp) */}
        {/* ========================================================= */}
        {activeTab === 'pip' && (
          <AccordionSection
            title="Picture in picture"
            scope="Selected PiP clip"
            expanded={true}
            onToggle={() => {}}
            theme={theme}
          >
            {selectedClip && (selectedClip.overlay?.enabled || selectedClip.overlayKind === 'pip') ? (
              <div className="space-y-3">
                <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                  <span style={{ color: theme.textDim }}>Layout</span>
                  <select
                    value={selectedClip.overlay?.mode || 'pip-corner'}
                    onChange={(e) =>
                      onUpdateClip({
                        ...selectedClip,
                        overlay: {
                          ...(selectedClip.overlay || {
                            enabled: true,
                            x: 72,
                            y: 12,
                            scale: 26,
                            opacity: 0.95,
                            border: true
                          }),
                          mode: e.target.value as 'pip-corner' | 'side-by-side' | 'full-broll'
                        }
                      })
                    }
                    style={{
                      backgroundColor: theme.button,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                    className={selectClass}
                  >
                    <option value="pip-corner">Corner inset</option>
                    <option value="side-by-side">Split 50 / 50</option>
                    <option value="full-broll">Full B-roll cutaway</option>
                  </select>
                </div>

                <EmberSliderRow
                  label="Horizontal"
                  value={selectedClip.overlay?.x ?? 72}
                  min={0}
                  max={85}
                  displayValue={`${selectedClip.overlay?.x ?? 72}%`}
                  theme={theme}
                  onChange={(v) =>
                    onUpdateClip({
                      ...selectedClip,
                      overlay: { ...selectedClip.overlay!, x: v }
                    })
                  }
                />
                <EmberSliderRow
                  label="Vertical"
                  value={selectedClip.overlay?.y ?? 12}
                  min={0}
                  max={85}
                  displayValue={`${selectedClip.overlay?.y ?? 12}%`}
                  theme={theme}
                  onChange={(v) =>
                    onUpdateClip({
                      ...selectedClip,
                      overlay: { ...selectedClip.overlay!, y: v }
                    })
                  }
                />
                <EmberSliderRow
                  label="Size"
                  value={selectedClip.overlay?.scale ?? 26}
                  min={15}
                  max={70}
                  displayValue={`${selectedClip.overlay?.scale ?? 26}%`}
                  theme={theme}
                  onChange={(v) =>
                    onUpdateClip({
                      ...selectedClip,
                      overlay: { ...selectedClip.overlay!, scale: v }
                    })
                  }
                />
                <EmberSliderRow
                  label="Opacity"
                  value={Math.round((selectedClip.overlay?.opacity ?? 1) * 100)}
                  min={10}
                  max={100}
                  displayValue={`${Math.round((selectedClip.overlay?.opacity ?? 1) * 100)}%`}
                  theme={theme}
                  onChange={(v) =>
                    onUpdateClip({
                      ...selectedClip,
                      overlay: { ...selectedClip.overlay!, opacity: v / 100 }
                    })
                  }
                />
              </div>
            ) : (
              <p style={{ color: theme.textDim }}>
                Select a Picture-in-Picture clip on an overlay track, or use Media → Add picture in picture… to place one.
              </p>
            )}
          </AccordionSection>
        )}

        {/* ========================================================= */}
        {/* TAB 4: OVERLAY (TitleText + TitleLook + GaugePanel / DroneHUDEditor) */}
        {/* ========================================================= */}
        {activeTab === 'overlay' && (
          <div>
            {/* Title Editor if selected clip is a title */}
            <AccordionSection
              title="Title & Watermark"
              scope="Selected title"
              expanded={true}
              onToggle={() => {}}
              theme={theme}
            >
              {selectedClip && selectedClip.overlayKind === 'title' ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                    <span style={{ color: theme.textDim }}>Text</span>
                    <input
                      type="text"
                      value={selectedClip.textContent ?? selectedClip.title}
                      onChange={(e) =>
                        onUpdateClip({
                          ...selectedClip,
                          title: e.target.value,
                          textContent: e.target.value
                        })
                      }
                      style={{
                        backgroundColor: theme.button,
                        borderColor: theme.border,
                        color: theme.text
                      }}
                      className={selectClass}
                    />
                  </div>
                  <EmberSliderRow
                    label="Vertical Y"
                    value={selectedClip.textPositionY ?? 46}
                    min={8}
                    max={92}
                    displayValue={`${selectedClip.textPositionY ?? 46}%`}
                    theme={theme}
                    onChange={(v) =>
                      onUpdateClip({ ...selectedClip, textPositionY: v })
                    }
                  />
                  <EmberSliderRow
                    label="Font size"
                    value={selectedClip.textFontSize ?? 44}
                    min={18}
                    max={84}
                    displayValue={`${selectedClip.textFontSize ?? 44}px`}
                    theme={theme}
                    onChange={(v) =>
                      onUpdateClip({ ...selectedClip, textFontSize: v })
                    }
                  />
                </div>
              ) : (
                <p style={{ color: theme.textDim }}>
                  Select a title clip on an Overlay track (such as "Flying Low") to edit its text and position.
                </p>
              )}

              {targetVideoClip && (
                <label className="flex items-center gap-2 pt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(targetVideoClip.showAvataWatermark)}
                    onChange={(e) =>
                      onUpdateClip({
                        ...targetVideoClip,
                        showAvataWatermark: e.target.checked
                      })
                    }
                    className="accent-[#f5a04a]"
                  />
                  <span>Show "DJI AVATA 360" bottom badge</span>
                </label>
              )}
            </AccordionSection>

            {/* Telemetry Gauge & FPV HUD Editor (GaugePanel.cpp + DroneHUDEditor) */}
            <AccordionSection
              title="Telemetry Gauges & FPV HUD"
              scope="Selected gauge"
              expanded={true}
              onToggle={() => {}}
              theme={theme}
            >
              <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                <span style={{ color: theme.textDim }}>HUD style</span>
                <select
                  value={hudConfig.preset}
                  onChange={(e) =>
                    onHUDConfigChange({
                      ...hudConfig,
                      preset: e.target.value as HUDConfig['preset']
                    })
                  }
                  style={{
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.text
                  }}
                  className={selectClass}
                >
                  <option value="dji-o3">DJI O3 Amber</option>
                  <option value="betaflight">Betaflight Green</option>
                  <option value="cyber-cyan">Cyber Cyan</option>
                  <option value="stealth-white">Stealth White</option>
                </select>
              </div>

              <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                <span style={{ color: theme.textDim }}>Units</span>
                <select
                  value={hudConfig.unitSystem}
                  onChange={(e) =>
                    onHUDConfigChange({
                      ...hudConfig,
                      unitSystem: e.target.value as 'metric' | 'imperial'
                    })
                  }
                  style={{
                    backgroundColor: theme.button,
                    borderColor: theme.border,
                    color: theme.text
                  }}
                  className={selectClass}
                >
                  <option value="metric">Metric (km/h, m)</option>
                  <option value="imperial">Imperial (mph, ft)</option>
                </select>
              </div>

              <EmberSliderRow
                label="GPX sync"
                value={gpxOffset}
                min={-10}
                max={10}
                step={0.1}
                displayValue={`${gpxOffset.toFixed(1)} s`}
                theme={theme}
                onChange={onGpxOffsetChange}
                onDoubleClickReset={() => onGpxOffsetChange(0)}
              />

              <EmberSliderRow
                label="Opacity"
                value={Math.round(hudConfig.opacity * 100)}
                min={10}
                max={100}
                displayValue={`${Math.round(hudConfig.opacity * 100)}%`}
                theme={theme}
                onChange={(v) => onHUDConfigChange({ ...hudConfig, opacity: v / 100 })}
              />

              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11.5px]">
                {Object.entries(hudConfig.widgets).map(([key, on]) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer truncate">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        onHUDConfigChange({
                          ...hudConfig,
                          widgets: { ...hudConfig.widgets, [key]: e.target.checked }
                        })
                      }
                      className="accent-[#f5a04a]"
                    />
                    <span className="capitalize truncate">{key.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                ))}
              </div>
            </AccordionSection>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: TRANSITION (TransitionPanel.cpp) */}
        {/* ========================================================= */}
        {activeTab === 'transition' && (
          <AccordionSection
            title="Transition"
            scope="Selected transition"
            expanded={true}
            onToggle={() => {}}
            theme={theme}
          >
            {selectedClip || targetVideoClip ? (
              (() => {
                const clip = selectedClip || targetVideoClip!;
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                      <span style={{ color: theme.textDim }}>In</span>
                      <select
                        value={clip.transitionIn || 'none'}
                        onChange={(e) =>
                          onUpdateClip({
                            ...clip,
                            transitionIn: e.target.value as TransitionType
                          })
                        }
                        style={{
                          backgroundColor: theme.button,
                          borderColor: theme.border,
                          color: theme.text
                        }}
                        className={selectClass}
                      >
                        <option value="none">None</option>
                        <option value="crossfade">Crossfade</option>
                        <option value="dip-to-black">Dip from black</option>
                        <option value="flash-white">Flash white</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-[84px_1fr] items-center gap-2.5">
                      <span style={{ color: theme.textDim }}>Out</span>
                      <select
                        value={clip.transitionOut || 'none'}
                        onChange={(e) =>
                          onUpdateClip({
                            ...clip,
                            transitionOut: e.target.value as TransitionType
                          })
                        }
                        style={{
                          backgroundColor: theme.button,
                          borderColor: theme.border,
                          color: theme.text
                        }}
                        className={selectClass}
                      >
                        <option value="none">None</option>
                        <option value="crossfade">Crossfade</option>
                        <option value="dip-to-black">Dip to black</option>
                        <option value="flash-white">Flash white</option>
                      </select>
                    </div>

                    <EmberSliderRow
                      label="Duration"
                      value={clip.transitionDuration ?? 1.0}
                      min={0.2}
                      max={3.0}
                      step={0.1}
                      displayValue={`${(clip.transitionDuration ?? 1.0).toFixed(1)} s`}
                      theme={theme}
                      onChange={(v) => onUpdateClip({ ...clip, transitionDuration: v })}
                    />
                  </div>
                );
              })()
            ) : (
              <p style={{ color: theme.textDim }}>Select a clip to configure its transitions.</p>
            )}
          </AccordionSection>
        )}

        {/* ========================================================= */}
        {/* TAB 6: PRIVACY (PrivacyPanel.cpp) */}
        {/* ========================================================= */}
        {activeTab === 'privacy' && (
          <AccordionSection
            title="Privacy"
            scope="This clip"
            expanded={true}
            onToggle={() => {}}
            theme={theme}
          >
            <p style={{ color: theme.textDim }}>
              Blurs the number plates or nadir tripod a scan of the clip finds, in playback and export.
            </p>

            {targetVideoClip ? (
              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(targetVideoClip.privacyBlur?.enabled)}
                    onChange={(e) =>
                      onUpdateClip({
                        ...targetVideoClip,
                        privacyBlur: {
                          enabled: e.target.checked,
                          mode: targetVideoClip.privacyBlur?.mode || 'nadir-tripod',
                          showRegions: targetVideoClip.privacyBlur?.showRegions ?? false,
                          scanned: targetVideoClip.privacyBlur?.scanned ?? true,
                          radius: targetVideoClip.privacyBlur?.radius ?? 18,
                          strength: targetVideoClip.privacyBlur?.strength ?? 12
                        }
                      })
                    }
                    className="accent-[#f5a04a]"
                  />
                  <span>Blur number plates / nadir</span>
                </label>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() =>
                      onUpdateClip({
                        ...targetVideoClip,
                        privacyBlur: {
                          enabled: true,
                          mode: 'center-plate',
                          showRegions: true,
                          scanned: true,
                          radius: targetVideoClip.privacyBlur?.radius ?? 16,
                          strength: targetVideoClip.privacyBlur?.strength ?? 12
                        }
                      })
                    }
                    style={{
                      backgroundColor: theme.button,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                    className="py-1.5 px-2.5 rounded-[4px] border hover:border-[#f5a04a] text-[12px]"
                  >
                    Scan clip
                  </button>
                  <button
                    onClick={() =>
                      onUpdateClip({
                        ...targetVideoClip,
                        privacyBlur: {
                          enabled: true,
                          mode: 'nadir-tripod',
                          showRegions: targetVideoClip.privacyBlur?.showRegions ?? false,
                          scanned: true,
                          radius: targetVideoClip.privacyBlur?.radius ?? 20,
                          strength: targetVideoClip.privacyBlur?.strength ?? 14
                        }
                      })
                    }
                    style={{
                      backgroundColor: theme.button,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                    className="py-1.5 px-2.5 rounded-[4px] border hover:border-[#f5a04a] text-[12px]"
                  >
                    Blur nadir…
                  </button>
                </div>

                {targetVideoClip.privacyBlur?.enabled && (
                  <>
                    <EmberSliderRow
                      label="Radius"
                      value={targetVideoClip.privacyBlur.radius}
                      min={8}
                      max={40}
                      displayValue={`${targetVideoClip.privacyBlur.radius}%`}
                      theme={theme}
                      onChange={(v) =>
                        onUpdateClip({
                          ...targetVideoClip,
                          privacyBlur: { ...targetVideoClip.privacyBlur!, radius: v }
                        })
                      }
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(targetVideoClip.privacyBlur.showRegions)}
                        onChange={(e) =>
                          onUpdateClip({
                            ...targetVideoClip,
                            privacyBlur: {
                              ...targetVideoClip.privacyBlur!,
                              showRegions: e.target.checked
                            }
                          })
                        }
                        className="accent-[#f5a04a]"
                      />
                      <span>Show detected region outline</span>
                    </label>
                  </>
                )}
              </div>
            ) : (
              <p style={{ color: theme.textDim }}>No clip under the playhead.</p>
            )}
          </AccordionSection>
        )}
      </div>
    </div>
  );
};
