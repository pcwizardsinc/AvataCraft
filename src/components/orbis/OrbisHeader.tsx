/**
 * orbis-reframe Native Qt6 Menu Bar
 * Exact 5-menu top bar from Schabo/orbis-reframe:
 * File | Edit | Media | View | Help
 * Plus centered window title: "orbis-reframe — Experiment.orp *"
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Save,
  Layers,
  Clapperboard,
  Upload,
  Camera,
  FilePlus2,
  FolderPlus,
  PictureInPicture2,
  ChevronRight,
  Check,
  Wand2,
  MapPin,
  Compass,
  Circle,
  Square,
  Download
} from 'lucide-react';
import {
  ActiveDialog,
  CameraTrickId,
  OrbisThemeId,
  CameraControlMode
} from '../../types/editor';
import { OrbisThemeColors } from '../../services/osvStitcher';

interface OrbisHeaderProps {
  projectName: string;
  modified: boolean;
  theme: OrbisThemeColors;
  themeId: OrbisThemeId;
  onChangeTheme: (id: OrbisThemeId) => void;
  canUndo: boolean;
  canRedo: boolean;
  hasClips: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewProject: () => void;
  onOpenProjectFile: () => void;
  onSaveProjectFile: () => void;
  onOpenDialog: (dialog: ActiveDialog) => void;
  onQuickImportFiles: () => void;
  onQuickImportAudio: () => void;
  onQuickImportPiP: () => void;
  onAddSelectedMediaToTimeline: () => void;
  onAddAudioTrack: () => void;
  onAddOverlayTrack: () => void;
  onSplitAtPlayhead: () => void;
  onTrimInToPlayhead: () => void;
  onTrimOutToPlayhead: () => void;
  onRestoreClipTrim: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onAddMark: () => void;
  onDeleteMark: () => void;
  onApplyCameraTrick: (trick: CameraTrickId) => void;
  onSaveScreenshot: () => void;
  previewAspect: 'auto' | '16:9' | '9:16' | '1:1' | '21:9';
  onPreviewAspectChange: (aspect: 'auto' | '16:9' | '9:16' | '1:1' | '21:9') => void;
  leftSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  rightSidebarOpen: boolean;
  onToggleRightSidebar: () => void;
  showCurveGraph: boolean;
  onToggleCurveGraph: () => void;
  cameraControlMode: CameraControlMode;
  onToggleCameraControlMode: () => void;
  isRecordingFreeLook: boolean;
  onToggleRecordFreeLook: () => void;
  onDownloadProjectArchive: () => void;
}

type TopMenuId = 'file' | 'edit' | 'media' | 'view' | 'help' | null;

export const OrbisHeader: React.FC<OrbisHeaderProps> = ({
  projectName,
  modified,
  theme,
  themeId,
  onChangeTheme,
  canUndo,
  canRedo,
  hasClips,
  onUndo,
  onRedo,
  onNewProject,
  onOpenProjectFile,
  onSaveProjectFile,
  onOpenDialog,
  onQuickImportFiles,
  onQuickImportAudio,
  onQuickImportPiP,
  onAddSelectedMediaToTimeline,
  onAddAudioTrack,
  onAddOverlayTrack,
  onSplitAtPlayhead,
  onTrimInToPlayhead,
  onTrimOutToPlayhead,
  onRestoreClipTrim,
  onDuplicateSelected,
  onDeleteSelected,
  onAddMark,
  onDeleteMark,
  onApplyCameraTrick,
  onSaveScreenshot,
  previewAspect,
  onPreviewAspectChange,
  leftSidebarOpen,
  onToggleLeftSidebar,
  rightSidebarOpen,
  onToggleRightSidebar,
  showCurveGraph,
  onToggleCurveGraph,
  cameraControlMode,
  onToggleCameraControlMode,
  isRecordingFreeLook,
  onToggleRecordFreeLook,
  onDownloadProjectArchive
}) => {
  const [openMenu, setOpenMenu] = useState<TopMenuId>(null);
  const [subMenu, setSubMenu] = useState<'size' | 'theme' | 'tricks' | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setSubMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        setSubMenu(null);
      }
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const trigger = (fn: () => void) => {
    setOpenMenu(null);
    setSubMenu(null);
    fn();
  };

  const menuItemClass =
    'w-full px-3 py-1.5 text-left flex items-center justify-between gap-6 text-[12.5px] transition-colors disabled:opacity-40 disabled:pointer-events-none hover:bg-[#3d2c1c] hover:text-[#f5a04a]';

  return (
    <div
      ref={barRef}
      style={{
        backgroundColor: theme.menuBar,
        borderColor: theme.border,
        color: theme.text
      }}
      className="h-7 px-2 border-b flex items-center justify-between select-none shrink-0 z-50 text-[12.5px] relative"
    >
      {/* Left: Exact 5 Menus from Schabo/orbis-reframe */}
      <div className="flex items-center gap-0.5">
        {/* FILE */}
        <div className="relative">
          <button
            onClick={() => {
              setOpenMenu(openMenu === 'file' ? null : 'file');
              setSubMenu(null);
            }}
            onMouseEnter={() => {
              if (openMenu) {
                setOpenMenu('file');
                setSubMenu(null);
              }
            }}
            style={
              openMenu === 'file'
                ? { backgroundColor: theme.button, color: theme.accent }
                : undefined
            }
            className="px-2.5 py-0.5 rounded-[3px] hover:bg-white/5 transition-colors"
          >
            File
          </button>

          {openMenu === 'file' && (
            <div
              style={{
                backgroundColor: theme.panel,
                borderColor: theme.border,
                color: theme.text
              }}
              className="absolute left-0 top-full mt-0.5 w-64 border rounded-[4px] shadow-2xl py-1 z-50"
            >
              <button onClick={() => trigger(onNewProject)} className={menuItemClass}>
                <span>New project…</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+N</span>
              </button>
              <button onClick={() => trigger(onOpenProjectFile)} className={menuItemClass}>
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-3.5 h-3.5 opacity-80" />
                  Open project…
                </span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+O</span>
              </button>
              <button
                onClick={() => trigger(() => onOpenDialog('project-library'))}
                className={menuItemClass}
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 opacity-80" />
                  Project library…
                </span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button onClick={() => trigger(onSaveProjectFile)} className={menuItemClass}>
                <span className="flex items-center gap-2">
                  <Save className="w-3.5 h-3.5 opacity-80" />
                  Save project
                </span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+S</span>
              </button>
              <button onClick={() => trigger(onSaveProjectFile)} className={menuItemClass}>
                <span className="pl-5">Save project as…</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+Shift+S</span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button
                onClick={() => trigger(() => onOpenDialog('project-settings'))}
                className={menuItemClass}
              >
                <span className="flex items-center gap-2">
                  <Clapperboard className="w-3.5 h-3.5 opacity-80" />
                  Project settings…
                </span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button
                disabled={!hasClips}
                onClick={() => trigger(onToggleRecordFreeLook)}
                className={menuItemClass}
              >
                <span className="flex items-center gap-2">
                  {isRecordingFreeLook ? (
                    <Square className="w-3.5 h-3.5 text-[#f5a04a] fill-current" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-[#f5a04a] fill-current" />
                  )}
                  {isRecordingFreeLook ? 'Stop Free-Look recording' : 'Record Free-Look video'}
                </span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Shift+R</span>
              </button>
              <button
                disabled={!hasClips}
                onClick={() => trigger(() => onOpenDialog('export'))}
                className={menuItemClass}
              >
                <span className="flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5 opacity-80" />
                  Export flat video…
                </span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+E</span>
              </button>
              <button
                disabled={!hasClips}
                onClick={() => trigger(onSaveScreenshot)}
                className={menuItemClass}
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 opacity-80" />
                  Save screenshot
                </span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+Shift+P</span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button
                onClick={() => trigger(onDownloadProjectArchive)}
                className={menuItemClass}
              >
                <span className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 opacity-85" />
                  Download Fedora Linux project (.tar.gz)
                </span>
              </button>
            </div>
          )}
        </div>

        {/* EDIT */}
        <div className="relative">
          <button
            onClick={() => {
              setOpenMenu(openMenu === 'edit' ? null : 'edit');
              setSubMenu(null);
            }}
            onMouseEnter={() => {
              if (openMenu) {
                setOpenMenu('edit');
                setSubMenu(null);
              }
            }}
            style={
              openMenu === 'edit'
                ? { backgroundColor: theme.button, color: theme.accent }
                : undefined
            }
            className="px-2.5 py-0.5 rounded-[3px] hover:bg-white/5 transition-colors"
          >
            Edit
          </button>

          {openMenu === 'edit' && (
            <div
              style={{
                backgroundColor: theme.panel,
                borderColor: theme.border,
                color: theme.text
              }}
              className="absolute left-0 top-full mt-0.5 w-64 border rounded-[4px] shadow-2xl py-1 z-50"
            >
              <button disabled={!canUndo} onClick={() => trigger(onUndo)} className={menuItemClass}>
                <span>Undo</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+Z</span>
              </button>
              <button disabled={!canRedo} onClick={() => trigger(onRedo)} className={menuItemClass}>
                <span>Redo</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+Y</span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button onClick={() => trigger(onSplitAtPlayhead)} className={menuItemClass}>
                <span>Split at playhead</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">S</span>
              </button>
              <button onClick={() => trigger(onTrimInToPlayhead)} className={menuItemClass}>
                <span>Trim start to playhead</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">[</span>
              </button>
              <button onClick={() => trigger(onTrimOutToPlayhead)} className={menuItemClass}>
                <span>Trim end to playhead</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">]</span>
              </button>
              <button onClick={() => trigger(onRestoreClipTrim)} className={menuItemClass}>
                <span>Restore full clip length</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">R</span>
              </button>
              <button onClick={() => trigger(onDuplicateSelected)} className={menuItemClass}>
                <span>Duplicate selected clip</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+D</span>
              </button>
              <button onClick={() => trigger(onDeleteSelected)} className={menuItemClass}>
                <span>Delete selected clip</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Del</span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button onClick={() => trigger(onAddMark)} className={menuItemClass}>
                <span>Add mark</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">M</span>
              </button>
              <button onClick={() => trigger(onDeleteMark)} className={menuItemClass}>
                <span>Delete mark</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Shift+M</span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              {/* Submenu: Camera Tricks & Movements */}
              <div
                className="relative"
                onMouseEnter={() => setSubMenu('tricks')}
              >
                <button
                  onClick={() => trigger(() => onOpenDialog('camera-tricks'))}
                  className={menuItemClass}
                >
                  <span className="flex items-center gap-2">
                    <Wand2 className="w-3.5 h-3.5 opacity-80" />
                    Camera tricks & movements
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
                {subMenu === 'tricks' && (
                  <div
                    style={{
                      backgroundColor: theme.panel,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                    className="absolute left-full top-0 ml-0.5 w-56 border rounded-[4px] shadow-2xl py-1 z-50"
                  >
                    <button
                      onClick={() => trigger(() => onOpenDialog('camera-tricks'))}
                      className={menuItemClass}
                    >
                      <span>Camera tricks studio…</span>
                    </button>
                    <div style={{ borderColor: theme.border }} className="my-1 border-t" />
                    {(
                      [
                        ['barrel-roll', '360° FPV Barrel Roll'],
                        ['tiny-planet-drop', 'Tiny Planet Sky Drop-In'],
                        ['whip-pan-180', '180° Look-Back Whip-Pan'],
                        ['fpv-dive-zoom', 'Alpine Dive Hyper-Zoom'],
                        ['orbit-360', '360° Smooth Orbit'],
                        ['acro-s-turn', 'Banked Acro S-Turn']
                      ] as Array<[CameraTrickId, string]>
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => trigger(() => onApplyCameraTrick(id))}
                        className={menuItemClass}
                      >
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* MEDIA */}
        <div className="relative">
          <button
            onClick={() => {
              setOpenMenu(openMenu === 'media' ? null : 'media');
              setSubMenu(null);
            }}
            onMouseEnter={() => {
              if (openMenu) {
                setOpenMenu('media');
                setSubMenu(null);
              }
            }}
            style={
              openMenu === 'media'
                ? { backgroundColor: theme.button, color: theme.accent }
                : undefined
            }
            className="px-2.5 py-0.5 rounded-[3px] hover:bg-white/5 transition-colors"
          >
            Media
          </button>

          {openMenu === 'media' && (
            <div
              style={{
                backgroundColor: theme.panel,
                borderColor: theme.border,
                color: theme.text
              }}
              className="absolute left-0 top-full mt-0.5 w-68 border rounded-[4px] shadow-2xl py-1 z-50"
            >
              <button onClick={() => trigger(onQuickImportFiles)} className={menuItemClass}>
                <span className="flex items-center gap-2">
                  <FilePlus2 className="w-3.5 h-3.5 opacity-80" />
                  Import files… (.osv / .insv / .mp4)
                </span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+I</span>
              </button>
              <button
                onClick={() => trigger(() => onOpenDialog('import-video'))}
                className={menuItemClass}
              >
                <span className="flex items-center gap-2">
                  <FolderPlus className="w-3.5 h-3.5 opacity-80" />
                  Import media dialog…
                </span>
              </button>
              <button
                onClick={() => trigger(() => onOpenDialog('import-telemetry'))}
                className={menuItemClass}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 opacity-80" />
                  Import GPX / DJI SRT telemetry…
                </span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button
                onClick={() => trigger(onAddSelectedMediaToTimeline)}
                className={menuItemClass}
              >
                <span>Add clip to timeline…</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+Shift+A</span>
              </button>
              <button onClick={() => trigger(onQuickImportAudio)} className={menuItemClass}>
                <span>Add audio file…</span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+Shift+M</span>
              </button>
              <button onClick={() => trigger(onQuickImportPiP)} className={menuItemClass}>
                <span className="flex items-center gap-2">
                  <PictureInPicture2 className="w-3.5 h-3.5 opacity-80" />
                  Add picture in picture…
                </span>
                <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+Shift+V</span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button onClick={() => trigger(onAddAudioTrack)} className={menuItemClass}>
                <span>Add audio track</span>
              </button>
              <button onClick={() => trigger(onAddOverlayTrack)} className={menuItemClass}>
                <span>Add overlay track</span>
              </button>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button
                onClick={() => trigger(() => onOpenDialog('lens-calibration'))}
                className={menuItemClass}
              >
                <span>Calibrate camera lenses…</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW */}
        <div className="relative">
          <button
            onClick={() => {
              setOpenMenu(openMenu === 'view' ? null : 'view');
              setSubMenu(null);
            }}
            onMouseEnter={() => {
              if (openMenu) {
                setOpenMenu('view');
                setSubMenu(null);
              }
            }}
            style={
              openMenu === 'view'
                ? { backgroundColor: theme.button, color: theme.accent }
                : undefined
            }
            className="px-2.5 py-0.5 rounded-[3px] hover:bg-white/5 transition-colors"
          >
            View
          </button>

          {openMenu === 'view' && (
            <div
              style={{
                backgroundColor: theme.panel,
                borderColor: theme.border,
                color: theme.text
              }}
              className="absolute left-0 top-full mt-0.5 w-60 border rounded-[4px] shadow-2xl py-1 z-50"
            >
              {/* Submenu: Preview size */}
              <div className="relative" onMouseEnter={() => setSubMenu('size')}>
                <button className={menuItemClass}>
                  <span>Preview size</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
                {subMenu === 'size' && (
                  <div
                    style={{
                      backgroundColor: theme.panel,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                    className="absolute left-full top-0 ml-0.5 w-52 border rounded-[4px] shadow-2xl py-1 z-50"
                  >
                    {(
                      [
                        ['auto', 'Auto (match source)'],
                        ['16:9', '16:9 Widescreen'],
                        ['9:16', '9:16 Vertical'],
                        ['1:1', '1:1 Square'],
                        ['21:9', '21:9 Ultrawide']
                      ] as const
                    ).map(([val, label]) => (
                      <button
                        key={val}
                        onClick={() => trigger(() => onPreviewAspectChange(val))}
                        className={menuItemClass}
                      >
                        <span>{label}</span>
                        {previewAspect === val && <Check className="w-3.5 h-3.5" style={{ color: theme.accent }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Submenu: Theme */}
              <div className="relative" onMouseEnter={() => setSubMenu('theme')}>
                <button className={menuItemClass}>
                  <span>Theme</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                </button>
                {subMenu === 'theme' && (
                  <div
                    style={{
                      backgroundColor: theme.panel,
                      borderColor: theme.border,
                      color: theme.text
                    }}
                    className="absolute left-full top-0 ml-0.5 w-44 border rounded-[4px] shadow-2xl py-1 z-50"
                  >
                    {(
                      [
                        ['ember', 'Ember'],
                        ['neutral-dark', 'Neutral dark'],
                        ['light', 'Light']
                      ] as Array<[OrbisThemeId, string]>
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => trigger(() => onChangeTheme(id))}
                        className={menuItemClass}
                      >
                        <span>{label}</span>
                        {themeId === id && <Check className="w-3.5 h-3.5" style={{ color: theme.accent }} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ borderColor: theme.border }} className="my-1 border-t" />

              <button onClick={() => trigger(onToggleLeftSidebar)} className={menuItemClass}>
                <span>Sources sidebar</span>
                <span className="flex items-center gap-2">
                  <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+B</span>
                  {leftSidebarOpen && <Check className="w-3.5 h-3.5" style={{ color: theme.accent }} />}
                </span>
              </button>

              <button onClick={() => trigger(onToggleRightSidebar)} className={menuItemClass}>
                <span>Settings sidebar</span>
                <span className="flex items-center gap-2">
                  <span style={{ color: theme.textDim }} className="text-[11px]">Ctrl+Shift+B</span>
                  {rightSidebarOpen && <Check className="w-3.5 h-3.5" style={{ color: theme.accent }} />}
                </span>
              </button>

              <button onClick={() => trigger(onToggleCameraControlMode)} className={menuItemClass}>
                <span className="flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 opacity-80" />
                  Free look (Viewpoint lock)
                </span>
                <span className="flex items-center gap-2">
                  <span style={{ color: theme.textDim }} className="text-[11px]">F</span>
                  {cameraControlMode === 'free-look' && (
                    <Check className="w-3.5 h-3.5" style={{ color: theme.accent }} />
                  )}
                </span>
              </button>

              <button onClick={() => trigger(onToggleCurveGraph)} className={menuItemClass}>
                <span>Keyframe curve graph</span>
                {showCurveGraph && <Check className="w-3.5 h-3.5" style={{ color: theme.accent }} />}
              </button>
            </div>
          )}
        </div>

        {/* HELP */}
        <div className="relative">
          <button
            onClick={() => {
              setOpenMenu(openMenu === 'help' ? null : 'help');
              setSubMenu(null);
            }}
            onMouseEnter={() => {
              if (openMenu) {
                setOpenMenu('help');
                setSubMenu(null);
              }
            }}
            style={
              openMenu === 'help'
                ? { backgroundColor: theme.button, color: theme.accent }
                : undefined
            }
            className="px-2.5 py-0.5 rounded-[3px] hover:bg-white/5 transition-colors"
          >
            Help
          </button>

          {openMenu === 'help' && (
            <div
              style={{
                backgroundColor: theme.panel,
                borderColor: theme.border,
                color: theme.text
              }}
              className="absolute left-0 top-full mt-0.5 w-56 border rounded-[4px] shadow-2xl py-1 z-50"
            >
              <button
                onClick={() => trigger(() => onOpenDialog('manual'))}
                className={menuItemClass}
              >
                <span>User manual</span>
              </button>
              <button
                onClick={() => trigger(() => onOpenDialog('shortcuts'))}
                className={menuItemClass}
              >
                <span>Keyboard shortcuts</span>
              </button>
              <div style={{ borderColor: theme.border }} className="my-1 border-t" />
              <button
                onClick={() => trigger(() => onOpenDialog('about'))}
                className={menuItemClass}
              >
                <span>About orbis-reframe</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Center: Subtle Window Title ("orbis-reframe — Experiment.orp *") */}
      <div
        style={{ color: theme.textDim }}
        className="hidden sm:block absolute left-1/2 -translate-x-1/2 text-[12px] font-medium pointer-events-none truncate max-w-[360px]"
      >
        orbis-reframe — {projectName}
        {modified ? ' *' : ''}
      </div>

      {/* Right spacer */}
      <div className="w-8" />
    </div>
  );
};
