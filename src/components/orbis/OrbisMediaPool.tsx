/**
 * orbis-reframe Left Sources Sidebar (TabSidebar::Side::Left)
 * Matches Schabo/orbis-reframe:
 * - Top icon strip: [<] collapse | [Film] Media | [Shapes] Overlays | [Blend] Transitions
 * - Media tab: "Media" header + FolderPlus & FilePlus2 buttons, collapsible folder tree ("FinishedVideos 1"),
 *   16:9 thumbnails, resolution/fps subtext, warm #3d2c1c selection row, orange check-circle badge when on timeline
 * - Overlays tab: Landscape preview tiles for Titles, DJI Avata 360 watermark, and FPV Telemetry Gauges / HUDs
 * - Transitions tab: Visual Crossfade, Dip to black, and Flash white tiles with crossing level curves
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Film,
  Shapes,
  Blend,
  FolderPlus,
  FilePlus2,
  CheckCircle2,
  Music,
  Play
} from 'lucide-react';
import {
  OSVFileMetadata,
  AudioAssetMetadata,
  LeftSidebarTab,
  TransitionType,
  ActiveDialog
} from '../../types/editor';
import { OrbisThemeColors, generateSceneThumbnail } from '../../services/osvStitcher';

export interface OverlayPresetTile {
  id: string;
  label: string;
  kind: 'title' | 'hud' | 'gauge';
  previewText?: string;
  subText?: string;
  hudPreset?: 'dji-o3' | 'betaflight';
  gaugeKind?: 'speed-dial' | 'heading-tape' | 'g-circle' | 'altitude-bar';
}

const OVERLAY_TILES: OverlayPresetTile[] = [
  {
    id: 'title-centred',
    label: 'Centred title',
    kind: 'title',
    previewText: 'Flying Low'
  },
  {
    id: 'title-avata-badge',
    label: 'DJI AVATA 360 badge',
    kind: 'title',
    previewText: 'DJI AVATA 360'
  },
  {
    id: 'title-lower-third',
    label: 'Lower third',
    kind: 'title',
    previewText: 'RIDGE PASS',
    subText: '5.7K · 60 FPS'
  },
  {
    id: 'hud-dji-o3',
    label: 'DJI O3 Flight HUD',
    kind: 'hud',
    hudPreset: 'dji-o3',
    previewText: 'OSD · HORIZON'
  },
  {
    id: 'hud-betaflight',
    label: 'Betaflight Acro OSD',
    kind: 'hud',
    hudPreset: 'betaflight',
    previewText: 'ACRO · 22.8V'
  },
  {
    id: 'gauge-speed',
    label: 'Speed dial (GPS)',
    kind: 'gauge',
    gaugeKind: 'speed-dial',
    previewText: '72 km/h'
  },
  {
    id: 'gauge-heading',
    label: 'Heading tape',
    kind: 'gauge',
    gaugeKind: 'heading-tape',
    previewText: 'N · 045° · NE'
  },
  {
    id: 'gauge-gforce',
    label: 'Lean & G circle',
    kind: 'gauge',
    gaugeKind: 'g-circle',
    previewText: '1.8 G · 24°'
  }
];

interface OrbisMediaPoolProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab: LeftSidebarTab;
  onChangeTab: (tab: LeftSidebarTab) => void;
  theme: OrbisThemeColors;
  videoFiles: OSVFileMetadata[];
  audioFiles: AudioAssetMetadata[];
  usedMediaIds: Set<string>;
  selectedMediaId: string;
  onSelectMedia: (file: OSVFileMetadata) => void;
  onAddVideoToTimeline: (file: OSVFileMetadata, asPiP?: boolean) => void;
  onAddAudioToTimeline: (audio: AudioAssetMetadata) => void;
  onAddOverlayPreset: (preset: OverlayPresetTile) => void;
  onApplyTransitionAtPlayhead: (type: TransitionType) => void;
  onQuickImportFiles: () => void;
  onOpenDialog: (dialog: ActiveDialog) => void;
}

export const OrbisMediaPool: React.FC<OrbisMediaPoolProps> = ({
  isOpen,
  onToggleOpen,
  activeTab,
  onChangeTab,
  theme,
  videoFiles,
  audioFiles,
  usedMediaIds,
  selectedMediaId,
  onSelectMedia,
  onAddVideoToTimeline,
  onAddAudioToTimeline,
  onAddOverlayPreset,
  onApplyTransitionAtPlayhead,
  onQuickImportFiles,
  onOpenDialog
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    video?: OSVFileMetadata;
    audio?: AudioAssetMetadata;
  } | null>(null);

  // Ensure thumbnails exist cleanly
  const thumbMap = useMemo(() => {
    const m: Record<string, string> = {};
    videoFiles.forEach((vf) => {
      m[vf.id] = vf.thumbnailDataUrl || generateSceneThumbnail(vf.sceneTheme || 'flying-low');
    });
    return m;
  }, [videoFiles]);

  // Group videos by folder ("FinishedVideos", "Avata360_RAW", etc.)
  const groupedVideos = useMemo(() => {
    const groups: Record<string, OSVFileMetadata[]> = {};
    videoFiles.forEach((vf) => {
      const folder = vf.folder || 'FinishedVideos';
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(vf);
    });
    return groups;
  }, [videoFiles]);

  const formatMmSs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Collapsed slim strip (exact TabSidebar.cpp behavior)
  if (!isOpen) {
    return (
      <div
        style={{ backgroundColor: theme.panel, borderColor: theme.border }}
        className="w-9 h-full border-r flex flex-col items-center py-1.5 gap-1 shrink-0 select-none"
      >
        <button
          onClick={onToggleOpen}
          title="Open the sidebar (Ctrl+B)"
          style={{ color: theme.icon }}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {(
          [
            ['media', Film, 'Media'],
            ['overlays', Shapes, 'Overlays'],
            ['transitions', Blend, 'Transitions']
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
      onClick={() => setContextMenu(null)}
      className="w-[258px] h-full border-r flex flex-col shrink-0 select-none overflow-hidden relative"
    >
      {/* Top Icon Strip: [<] [Media] [Overlays] [Transitions] */}
      <div
        style={{ borderColor: theme.border }}
        className="h-9 px-1.5 border-b flex items-center gap-1 shrink-0"
      >
        <button
          onClick={onToggleOpen}
          title="Close the sidebar (Ctrl+B)"
          style={{ color: theme.icon }}
          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {(
          [
            ['media', Film, 'Media'],
            ['overlays', Shapes, 'Overlays'],
            ['transitions', Blend, 'Transitions']
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

      {/* TAB 1: MEDIA POOL */}
      {activeTab === 'media' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Subheader: "Media" + [FolderPlus] [FilePlus2] */}
          <div className="px-3 py-2 flex items-center justify-between shrink-0">
            <span className="font-semibold text-[13px]" style={{ color: theme.text }}>
              Media
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onOpenDialog('import-video')}
                title="Import folder or OSV / Audio dialog…"
                style={{ color: theme.icon }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onQuickImportFiles}
                title="Import files… (.osv, .insv, .mp4, .mov, .mp3, .wav)  ( Ctrl+I )"
                style={{ color: theme.icon }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Folder Tree List */}
          <div className="flex-1 overflow-y-auto pb-3">
            {Object.entries(groupedVideos).map(([folderName, items]) => {
              const isCollapsed = Boolean(collapsedFolders[folderName]);
              return (
                <div key={folderName} className="mb-1">
                  {/* Folder Row: ⌄ FinishedVideos        1 */}
                  <button
                    onClick={() =>
                      setCollapsedFolders((prev) => ({
                        ...prev,
                        [folderName]: !prev[folderName]
                      }))
                    }
                    className="w-full px-2.5 py-1 flex items-center justify-between text-[12px] hover:bg-white/5"
                    style={{ color: theme.textDim }}
                  >
                    <span className="flex items-center gap-1 truncate">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span style={{ color: theme.text }}>{folderName}</span>
                    </span>
                    <span className="text-[11px] font-mono">{items.length}</span>
                  </button>

                  {/* Media Items inside Folder */}
                  {!isCollapsed &&
                    items.map((item) => {
                      const isSelected = item.id === selectedMediaId;
                      const isUsed = usedMediaIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/orbis-media-id', item.id);
                          }}
                          onClick={() => onSelectMedia(item)}
                          onDoubleClick={() => onAddVideoToTimeline(item, false)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            onSelectMedia(item);
                            setContextMenu({ x: e.clientX, y: e.clientY, video: item });
                          }}
                          title="Double-click to add to timeline, or right-click for Picture-in-Picture options"
                          style={
                            isSelected
                              ? { backgroundColor: theme.accentSoft }
                              : undefined
                          }
                          className="group px-2.5 py-1.5 flex items-center gap-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                        >
                          {/* 16:9 Thumbnail */}
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectMedia(item);
                              onAddVideoToTimeline(item, false);
                            }}
                            title="Click thumbnail to place on timeline"
                            className="relative w-14 h-8 rounded-[2px] overflow-hidden shrink-0 bg-black border border-black/40"
                          >
                            {thumbMap[item.id] && (
                              <img
                                src={thumbMap[item.id]}
                                alt={item.fileName}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Play className="w-3.5 h-3.5 text-white fill-white" />
                            </div>
                          </div>

                          {/* Metadata Lines */}
                          <div className="min-w-0 flex-1 leading-tight">
                            <div
                              style={{ color: theme.text }}
                              className="text-[12.5px] font-normal truncate"
                            >
                              {item.fileName}
                            </div>
                            <div
                              style={{ color: theme.textDim }}
                              className="text-[11px] truncate mt-0.5"
                            >
                              {item.is360 ? `360° ${item.format.toUpperCase()}` : 'Video'} ·{' '}
                              {formatMmSs(item.duration)}
                            </div>
                            <div
                              style={{ color: theme.textDim }}
                              className="text-[11px] truncate"
                            >
                              {item.resolution} · {item.fps} fps
                            </div>
                          </div>

                          {/* Orange Checkmark Badge if on Timeline */}
                          <div className="shrink-0 self-start pt-0.5">
                            {isUsed && (
                              <CheckCircle2
                                className="w-3.5 h-3.5"
                                style={{ color: theme.accent }}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}

            {/* Audio Stems Folder */}
            {audioFiles.length > 0 && (
              <div className="mt-1">
                <button
                  onClick={() =>
                    setCollapsedFolders((prev) => ({
                      ...prev,
                      AudioStems: !prev.AudioStems
                    }))
                  }
                  className="w-full px-2.5 py-1 flex items-center justify-between text-[12px] hover:bg-white/5"
                  style={{ color: theme.textDim }}
                >
                  <span className="flex items-center gap-1 truncate">
                    {collapsedFolders.AudioStems ? (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span style={{ color: theme.text }}>AudioStems</span>
                  </span>
                  <span className="text-[11px] font-mono">{audioFiles.length}</span>
                </button>

                {!collapsedFolders.AudioStems &&
                  audioFiles.map((aud) => {
                    const isUsed = usedMediaIds.has(aud.id);
                    return (
                      <div
                        key={aud.id}
                        onDoubleClick={() => onAddAudioToTimeline(aud)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, audio: aud });
                        }}
                        title="Double-click to add audio stem to an audio track"
                        className="px-2.5 py-1.5 flex items-center gap-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div
                          style={{ backgroundColor: theme.button, borderColor: theme.border }}
                          className="w-14 h-8 rounded-[2px] border flex items-center justify-center shrink-0"
                        >
                          <Music className="w-3.5 h-3.5" style={{ color: theme.clipAudio }} />
                        </div>
                        <div className="min-w-0 flex-1 leading-tight">
                          <div className="text-[12.5px] truncate" style={{ color: theme.text }}>
                            {aud.fileName}
                          </div>
                          <div className="text-[11px] truncate" style={{ color: theme.textDim }}>
                            Audio · {formatMmSs(aud.duration)}
                          </div>
                        </div>
                        {isUsed && (
                          <CheckCircle2
                            className="w-3.5 h-3.5 shrink-0"
                            style={{ color: theme.accent }}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: OVERLAYS (Titles, Watermarks & FPV Telemetry Gauges — TitlesPanel.cpp) */}
      {activeTab === 'overlays' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 pt-2.5 pb-1.5">
            <div className="font-semibold text-[13px]" style={{ color: theme.text }}>
              Overlays
            </div>
            <p className="text-[11.5px] mt-1 leading-snug" style={{ color: theme.textDim }}>
              Click or double-click a title or telemetry gauge to place it on an overlay track at the playhead.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 grid grid-cols-2 gap-2.5 content-start">
            {OVERLAY_TILES.map((tile) => (
              <button
                key={tile.id}
                onClick={() => onAddOverlayPreset(tile)}
                className="group text-left space-y-1 focus:outline-none"
              >
                {/* Sky-to-ground landscape tile matching TitlesPanel.cpp::tileBackground */}
                <div
                  style={{
                    background:
                      'linear-gradient(180deg, #5a7ea6 0%, #9ab4c8 55%, #4a4e44 56%, #2a2c28 100%)',
                    borderColor: theme.border
                  }}
                  className="w-full aspect-[16/9] rounded-[4px] border group-hover:border-[#f5a04a] flex flex-col items-center justify-center p-1.5 overflow-hidden transition-colors shadow-xs"
                >
                  <span className="text-[11px] font-semibold text-white drop-shadow text-center leading-tight">
                    {tile.previewText}
                  </span>
                  {tile.subText && (
                    <span className="text-[9px] font-mono text-white/85">{tile.subText}</span>
                  )}
                </div>
                <div
                  className="text-[11.5px] truncate group-hover:text-[#f5a04a] transition-colors"
                  style={{ color: theme.text }}
                >
                  {tile.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: TRANSITIONS (TransitionsPanel.cpp) */}
      {activeTab === 'transitions' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 pt-2.5 pb-2">
            <div className="font-semibold text-[13px]" style={{ color: theme.text }}>
              Transitions
            </div>
            <p className="text-[11.5px] mt-1 leading-snug" style={{ color: theme.textDim }}>
              Click a transition to put it on the clip at the playhead. Its length is in the Transition tab on the right.
            </p>
          </div>

          <div className="px-3 grid grid-cols-2 gap-2.5">
            {/* Crossfade Tile */}
            <button
              onClick={() => onApplyTransitionAtPlayhead('crossfade')}
              className="group text-left space-y-1"
            >
              <div
                style={{
                  background: 'linear-gradient(90deg, #3a5f8a 20%, #a0703a 80%)',
                  borderColor: theme.border
                }}
                className="w-full aspect-[16/9] rounded-[4px] border group-hover:border-[#f5a04a] relative overflow-hidden"
              >
                <svg viewBox="0 0 128 72" className="w-full h-full">
                  <line x1="20" y1="18" x2="108" y2="54" stroke="rgba(255,255,255,0.82)" strokeWidth="2" />
                  <line x1="20" y1="54" x2="108" y2="18" stroke="rgba(255,255,255,0.82)" strokeWidth="2" />
                </svg>
              </div>
              <div className="text-[11.5px] group-hover:text-[#f5a04a]">Crossfade</div>
            </button>

            {/* Dip to Black Tile */}
            <button
              onClick={() => onApplyTransitionAtPlayhead('dip-to-black')}
              className="group text-left space-y-1"
            >
              <div
                style={{
                  background: 'linear-gradient(90deg, #3a5f8a 10%, #000000 50%, #a0703a 90%)',
                  borderColor: theme.border
                }}
                className="w-full aspect-[16/9] rounded-[4px] border group-hover:border-[#f5a04a] relative overflow-hidden"
              >
                <svg viewBox="0 0 128 72" className="w-full h-full">
                  <polyline
                    points="20,18 64,56 108,18"
                    fill="none"
                    stroke="rgba(255,255,255,0.82)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="text-[11.5px] group-hover:text-[#f5a04a]">Dip to black</div>
            </button>

            {/* Flash White Tile */}
            <button
              onClick={() => onApplyTransitionAtPlayhead('flash-white')}
              className="group text-left space-y-1"
            >
              <div
                style={{
                  background: 'linear-gradient(90deg, #3a5f8a 10%, #ffffff 50%, #a0703a 90%)',
                  borderColor: theme.border
                }}
                className="w-full aspect-[16/9] rounded-[4px] border group-hover:border-[#f5a04a] relative overflow-hidden"
              >
                <svg viewBox="0 0 128 72" className="w-full h-full">
                  <polyline
                    points="20,54 64,16 108,54"
                    fill="none"
                    stroke="rgba(24,25,27,0.8)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <div className="text-[11.5px] group-hover:text-[#f5a04a]">Flash white</div>
            </button>
          </div>
        </div>
      )}

      {/* Right-click context menu on Media Items */}
      {contextMenu && (
        <div
          style={{
            left: Math.min(contextMenu.x, 120),
            top: Math.min(contextMenu.y - 28, 360),
            backgroundColor: theme.panel,
            borderColor: theme.border,
            color: theme.text
          }}
          className="fixed z-50 w-52 border rounded-[4px] shadow-2xl py-1 text-[12px]"
        >
          {contextMenu.video && (
            <>
              <button
                onClick={() => {
                  onAddVideoToTimeline(contextMenu.video!, false);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#3d2c1c] hover:text-[#f5a04a]"
              >
                Add to Video track
              </button>
              <button
                onClick={() => {
                  onAddVideoToTimeline(contextMenu.video!, true);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-[#3d2c1c] hover:text-[#f5a04a]"
              >
                Add as Picture in Picture
              </button>
            </>
          )}
          {contextMenu.audio && (
            <button
              onClick={() => {
                onAddAudioToTimeline(contextMenu.audio!);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-[#3d2c1c] hover:text-[#f5a04a]"
            >
              Add to Audio track
            </button>
          )}
        </div>
      )}
    </div>
  );
};
