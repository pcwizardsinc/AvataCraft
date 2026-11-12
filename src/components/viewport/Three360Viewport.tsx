/**
 * orbis-reframe Three.js 360° & Flat Viewport
 * Supports:
 * - Equirectangular 360° spherical reframing (Rectilinear, Tiny Planet, Fisheye, Inverted)
 * - Flat rectilinear playback ("Whole picture, with bars" / "Fill frame")
 * - Real-time WebGL dual-pane Split Screen (Front + Rear 180° side-by-side, Rear PiP mirror, Over/Under)
 * - Horizon Lock & Lean Follow gyroscopic stabilization
 * - Colour LUT + Exposure EV + Contrast + Saturation + Temperature grading
 * - Privacy / Nadir blur regions & Multitrack Picture-in-Picture overlays
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  ProjectionMode,
  StabilizerConfig,
  TrackerState,
  VideoFilters,
  TrackingTarget,
  TimelineClip,
  PrivacyBlurPatch,
  SplitScreenMode,
  ReframeFitMode,
  CameraControlMode
} from '../../types/editor';
import { computeCSSFilterString } from '../../services/osvStitcher';

interface Three360ViewportProps {
  canvasSource: HTMLCanvasElement | HTMLVideoElement | null;
  is360: boolean;
  fitMode: ReframeFitMode;
  splitScreen: SplitScreenMode;
  yaw: number;
  pitch: number;
  roll: number;
  fov: number;
  projection: ProjectionMode;
  stabilizer: StabilizerConfig;
  filters?: VideoFilters;
  privacyBlur?: PrivacyBlurPatch;
  transitionOverlay?: { type: 'black' | 'white'; opacity: number } | null;
  overlayVideoClips?: TimelineClip[];
  showAvataWatermark?: boolean;
  currentTime: number;
  tracker: TrackerState;
  cameraControlMode?: CameraControlMode;
  isRecordingFreeLook?: boolean;
  recordingSeconds?: number;
  onDragStateChange?: (dragging: boolean) => void;
  onCameraChange: (yaw: number, pitch: number, roll: number, fov: number) => void;
  onTargetSelected?: (target: TrackingTarget | null) => void;
}

const _targetVec = new THREE.Vector3();

export const Three360Viewport: React.FC<Three360ViewportProps> = ({
  canvasSource,
  is360,
  fitMode,
  splitScreen,
  yaw,
  pitch,
  roll,
  fov,
  projection,
  stabilizer,
  filters,
  privacyBlur,
  transitionOverlay,
  overlayVideoClips = [],
  showAvataWatermark = false,
  currentTime,
  tracker,
  cameraControlMode = 'free-look',
  isRecordingFreeLook = false,
  recordingSeconds = 0,
  onDragStateChange,
  onCameraChange,
  onTargetSelected
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rearCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | THREE.VideoTexture | null>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);

  // Mutable refs so rAF loop never reads stale state
  const currentCam = useRef({ yaw, pitch, roll, fov });
  const projectionRef = useRef<ProjectionMode>(projection);
  const stabilizerRef = useRef<StabilizerConfig>(stabilizer);
  const splitScreenRef = useRef<SplitScreenMode>(splitScreen);
  const is360Ref = useRef<boolean>(is360);

  const isDraggingRef = useRef(false);
  const [isDraggingUI, setIsDraggingUI] = useState(false);
  const lockedAxisRef = useRef<'x' | 'y' | null>(null);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const dragOriginPosition = useRef({ x: 0, y: 0 });
  const [isSelectingBox, setIsSelectingBox] = useState(false);
  const selectionStartRef = useRef<{ x: number; y: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    currentCam.current = { yaw, pitch, roll, fov };
  }, [yaw, pitch, roll, fov]);

  useEffect(() => {
    projectionRef.current = projection;
  }, [projection]);

  useEffect(() => {
    stabilizerRef.current = stabilizer;
  }, [stabilizer]);

  useEffect(() => {
    splitScreenRef.current = splitScreen;
  }, [splitScreen]);

  useEffect(() => {
    is360Ref.current = is360;
  }, [is360]);

  // Initialize Three.js WebGL sphere once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('data-viewport-canvas', 'true');
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141516);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(92, width / height, 0.1, 1000);
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    const rearCamera = new THREE.PerspectiveCamera(92, width / height, 0.1, 1000);
    rearCamera.position.set(0, 0, 0);
    rearCameraRef.current = rearCamera;

    const geometry = new THREE.SphereGeometry(500, 64, 48);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    materialRef.current = material;

    const sphereMesh = new THREE.Mesh(geometry, material);
    scene.add(sphereMesh);

    const trajGeo = new THREE.BufferGeometry();
    const trajMat = new THREE.LineBasicMaterial({
      color: 0xf5a04a,
      transparent: true,
      opacity: 0.75
    });
    const trajLine = new THREE.Line(trajGeo, trajMat);
    scene.add(trajLine);
    trajectoryLineRef.current = trajLine;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(1, Math.floor(entry.contentRect.width));
        const h = Math.max(1, Math.floor(entry.contentRect.height));
        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.setSize(w, h);
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    });
    resizeObserver.observe(container);

    let animFrameId = 0;
    let drawPending = false;
    const afterDraw = isSoftwareGl
      ? (cb: () => void) => setTimeout(cb, 0)
      : (cb: () => void) => cb();

    const orientCamera = (
      cam: THREE.PerspectiveCamera,
      camYaw: number,
      camPitch: number,
      camRoll: number,
      camFov: number,
      proj: ProjectionMode,
      aspect: number
    ) => {
      let effPitch = camPitch;
      let effRoll = camRoll;
      let effFov = camFov;

      if (proj === 'tiny-planet') {
        cam.position.set(0, 260, 0);
        effPitch = Math.min(-55, camPitch - 45);
        effFov = Math.max(125, camFov);
      } else if (proj === 'inverted') {
        cam.position.set(0, -260, 0);
        effPitch = Math.max(55, camPitch + 45);
        effFov = Math.max(125, camFov);
      } else if (proj === 'fisheye') {
        cam.position.set(0, 0, 0);
        effFov = Math.max(132, camFov);
      } else {
        cam.position.set(0, 0, 0);
      }

      const stab = stabilizerRef.current;
      if (stab.enabled && stab.horizonLock) {
        effRoll = 0;
      } else if (stab.enabled && stab.leanFollow) {
        effRoll = effRoll * (1 - stab.smoothFactor * 0.65);
      }

      cam.aspect = aspect;
      if (Math.abs(cam.fov - effFov) > 0.05) {
        cam.fov = effFov;
      }
      cam.updateProjectionMatrix();

      const phi = THREE.MathUtils.degToRad(90 - effPitch);
      const theta = THREE.MathUtils.degToRad(camYaw);
      _targetVec.set(
        500 * Math.sin(phi) * Math.sin(theta),
        500 * Math.cos(phi),
        -500 * Math.sin(phi) * Math.cos(theta)
      );
      cam.lookAt(_targetVec);
      if (effRoll !== 0) {
        cam.rotateZ(THREE.MathUtils.degToRad(effRoll));
      }
    };

    const renderLoop = () => {
      animFrameId = requestAnimationFrame(renderLoop);
      if (drawPending) return;
      drawPending = true;

      if (rendererRef.current && sceneRef.current && cameraRef.current && rearCameraRef.current) {
        if (textureRef.current instanceof THREE.CanvasTexture) {
          textureRef.current.needsUpdate = true;
        }

        const r = rendererRef.current;
        const sc = sceneRef.current;
        const w = r.domElement.clientWidth || 800;
        const h = r.domElement.clientHeight || 450;
        const { yaw: cYaw, pitch: cPitch, roll: cRoll, fov: cFov } = currentCam.current;
        const proj = projectionRef.current;
        const split = is360Ref.current ? splitScreenRef.current : 'off';

        // If clip is set to Flat mode, lock virtual camera straight ahead
        const useYaw = is360Ref.current ? cYaw : 0;
        const usePitch = is360Ref.current ? cPitch : 0;
        const useRoll = is360Ref.current ? cRoll : 0;
        const useFov = is360Ref.current ? cFov : 75;

        if (split === 'side-by-side') {
          r.setScissorTest(true);
          const halfW = Math.floor(w / 2);

          orientCamera(cameraRef.current, useYaw, usePitch, useRoll, useFov, proj, halfW / h);
          r.setViewport(0, 0, halfW - 1, h);
          r.setScissor(0, 0, halfW - 1, h);
          r.render(sc, cameraRef.current);

          orientCamera(
            rearCameraRef.current,
            useYaw + 180,
            usePitch,
            -useRoll,
            useFov,
            'perspective',
            (w - halfW) / h
          );
          r.setViewport(halfW + 1, 0, w - halfW - 1, h);
          r.setScissor(halfW + 1, 0, w - halfW - 1, h);
          r.render(sc, rearCameraRef.current);

          r.setScissorTest(false);
        } else if (split === 'over-under') {
          r.setScissorTest(true);
          const halfH = Math.floor(h / 2);

          orientCamera(cameraRef.current, useYaw, usePitch, useRoll, useFov, proj, w / halfH);
          r.setViewport(0, halfH + 1, w, h - halfH - 1);
          r.setScissor(0, halfH + 1, w, h - halfH - 1);
          r.render(sc, cameraRef.current);

          orientCamera(
            rearCameraRef.current,
            useYaw + 180,
            usePitch,
            -useRoll,
            useFov,
            'perspective',
            w / halfH
          );
          r.setViewport(0, 0, w, halfH - 1);
          r.setScissor(0, 0, w, halfH - 1);
          r.render(sc, rearCameraRef.current);

          r.setScissorTest(false);
        } else if (split === 'rear-pip') {
          r.setScissorTest(false);
          r.setViewport(0, 0, w, h);
          orientCamera(cameraRef.current, useYaw, usePitch, useRoll, useFov, proj, w / h);
          r.render(sc, cameraRef.current);

          // Rear-view mirror inset at top-center
          const pipW = Math.floor(w * 0.28);
          const pipH = Math.floor(h * 0.24);
          const pipX = Math.floor((w - pipW) / 2);
          const pipY = h - pipH - 14;
          r.setScissorTest(true);
          r.setViewport(pipX, pipY, pipW, pipH);
          r.setScissor(pipX, pipY, pipW, pipH);
          orientCamera(
            rearCameraRef.current,
            useYaw + 180,
            -4,
            0,
            100,
            'perspective',
            pipW / pipH
          );
          r.render(sc, rearCameraRef.current);
          r.setScissorTest(false);
        } else {
          r.setScissorTest(false);
          r.setViewport(0, 0, w, h);
          orientCamera(
            cameraRef.current,
            useYaw,
            usePitch,
            useRoll,
            useFov,
            is360Ref.current ? proj : 'perspective',
            w / h
          );
          r.render(sc, cameraRef.current);
        }
      }

      afterDraw(() => {
        drawPending = false;
      });
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      if (textureRef.current) textureRef.current.dispose();
      geometry.dispose();
      material.dispose();
      trajGeo.dispose();
      trajMat.dispose();
      renderer.dispose();
    };
  }, []);

  // Bind Canvas or Video Texture
  useEffect(() => {
    if (!canvasSource || !materialRef.current) return;

    if (textureRef.current) {
      textureRef.current.dispose();
    }

    let tex: THREE.CanvasTexture | THREE.VideoTexture;
    if (canvasSource instanceof HTMLVideoElement) {
      tex = new THREE.VideoTexture(canvasSource);
    } else {
      tex = new THREE.CanvasTexture(canvasSource);
    }

    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;

    textureRef.current = tex;
    materialRef.current.map = tex;
    materialRef.current.needsUpdate = true;
  }, [canvasSource]);

  // Update 3D Trajectory Line
  useEffect(() => {
    if (!trajectoryLineRef.current) return;
    if (!tracker.showTrajectory || tracker.trajectory.length < 2) {
      trajectoryLineRef.current.visible = false;
      return;
    }
    trajectoryLineRef.current.visible = true;
    const pts = tracker.trajectory.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    trajectoryLineRef.current.geometry.dispose();
    trajectoryLineRef.current.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  }, [tracker.showTrajectory, tracker.trajectory]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tracker.isSelecting) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        selectionStartRef.current = { x, y };
        setIsSelectingBox(true);
        setSelectionBox({ x, y, width: 0, height: 0 });
        return;
      }
      if (!is360) return;
      isDraggingRef.current = true;
      lockedAxisRef.current = null;
      setIsDraggingUI(true);
      onDragStateChange?.(true);
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
      dragOriginPosition.current = { x: e.clientX, y: e.clientY };
    },
    [tracker.isSelecting, is360, onDragStateChange]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isSelectingBox && selectionStartRef.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const curX = e.clientX - rect.left;
        const curY = e.clientY - rect.top;
        setSelectionBox({
          x: Math.min(selectionStartRef.current.x, curX),
          y: Math.min(selectionStartRef.current.y, curY),
          width: Math.abs(curX - selectionStartRef.current.x),
          height: Math.abs(curY - selectionStartRef.current.y)
        });
        return;
      }

      if (!isDraggingRef.current || !is360) return;
      const dx = e.clientX - previousMousePosition.current.x;
      const dy = e.clientY - previousMousePosition.current.y;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };

      // OpenOSV modifier: Ctrl + drag = smooth zoom FOV
      if (e.ctrlKey || e.metaKey) {
        const nextFov = Math.max(30, Math.min(155, currentCam.current.fov + dy * 0.28));
        onCameraChange(
          currentCam.current.yaw,
          currentCam.current.pitch,
          currentCam.current.roll,
          parseFloat(nextFov.toFixed(1))
        );
        return;
      }

      // OpenOSV modifier: Alt + drag = camera roll
      if (e.altKey) {
        let nextRoll = currentCam.current.roll + dx * 0.35;
        if (nextRoll > 180) nextRoll -= 360;
        if (nextRoll < -180) nextRoll += 360;
        onCameraChange(
          currentCam.current.yaw,
          currentCam.current.pitch,
          parseFloat(nextRoll.toFixed(1)),
          currentCam.current.fov
        );
        return;
      }

      // OpenOSV modifier: Shift + drag = lock single axis (Pan OR Tilt)
      let effDx = dx;
      let effDy = dy;
      if (e.shiftKey) {
        if (!lockedAxisRef.current) {
          const totalDx = Math.abs(e.clientX - dragOriginPosition.current.x);
          const totalDy = Math.abs(e.clientY - dragOriginPosition.current.y);
          if (totalDx > 3 || totalDy > 3) {
            lockedAxisRef.current = totalDx >= totalDy ? 'x' : 'y';
          }
        }
        if (lockedAxisRef.current === 'x') effDy = 0;
        else if (lockedAxisRef.current === 'y') effDx = 0;
      } else {
        lockedAxisRef.current = null;
      }

      const sensitivity = 0.25 * (currentCam.current.fov / 100);
      let nextYaw = currentCam.current.yaw - effDx * sensitivity;
      if (nextYaw > 180) nextYaw -= 360;
      if (nextYaw < -180) nextYaw += 360;

      const nextPitch = Math.max(-89, Math.min(89, currentCam.current.pitch + effDy * sensitivity));
      onCameraChange(
        parseFloat(nextYaw.toFixed(1)),
        parseFloat(nextPitch.toFixed(1)),
        currentCam.current.roll,
        currentCam.current.fov
      );
    },
    [isSelectingBox, is360, onCameraChange]
  );

  const handleMouseUp = useCallback(() => {
    if (isSelectingBox && selectionBox) {
      setIsSelectingBox(false);
      if (selectionBox.width > 12 && selectionBox.height > 12) {
        const rect = mountRef.current?.getBoundingClientRect();
        if (rect && onTargetSelected) {
          onTargetSelected({
            x: selectionBox.x / rect.width,
            y: selectionBox.y / rect.height,
            width: selectionBox.width / rect.width,
            height: selectionBox.height / rect.height,
            label: 'Subject'
          });
        }
      }
      setSelectionBox(null);
      selectionStartRef.current = null;
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      lockedAxisRef.current = null;
      setIsDraggingUI(false);
      onDragStateChange?.(false);
    }
  }, [isSelectingBox, selectionBox, onTargetSelected, onDragStateChange]);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (!is360) return;
      const nextFov = Math.max(30, Math.min(155, currentCam.current.fov + e.deltaY * 0.05));
      onCameraChange(
        currentCam.current.yaw,
        currentCam.current.pitch,
        currentCam.current.roll,
        parseFloat(nextFov.toFixed(1))
      );
    },
    [is360, onCameraChange]
  );

  const cssFilter = computeCSSFilterString(filters);

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-[#141516] ${
        tracker.isSelecting ? 'cursor-crosshair' : is360 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Flat Video Native Element when clip is Flat AND has a browser-decodable videoUrl */}
      {!is360 && canvasSource instanceof HTMLVideoElement ? (
        <video
          ref={(el) => {
            if (el && canvasSource.src && el.src !== canvasSource.src) {
              el.src = canvasSource.src;
            }
          }}
          muted
          playsInline
          style={{ filter: cssFilter }}
          className={`w-full h-full ${fitMode === 'fill-crop' ? 'object-cover' : 'object-contain'}`}
        />
      ) : (
        <div
          ref={mountRef}
          style={{ filter: cssFilter }}
          className="w-full h-full"
        />
      )}

      {/* Privacy / Nadir Blur Patch */}
      {privacyBlur?.enabled && (
        <div
          style={{
            width: `${privacyBlur.radius * 2}%`,
            height: `${privacyBlur.radius * 2}%`,
            left: '50%',
            top: privacyBlur.mode === 'nadir-tripod' ? '84%' : '52%',
            transform: 'translate(-50%, -50%)',
            backdropFilter: `blur(${privacyBlur.strength}px)`,
            WebkitBackdropFilter: `blur(${privacyBlur.strength}px)`
          }}
          className={`absolute rounded-full pointer-events-none z-10 ${
            privacyBlur.showRegions
              ? 'border-2 border-[#00ff00]/80 bg-black/15'
              : 'bg-black/10'
          }`}
        />
      )}

      {/* Multitrack Picture-in-Picture (PiP) Video Overlays */}
      {overlayVideoClips.map((ovClip) => {
        const ov = ovClip.overlay;
        if (!ov || !ov.enabled) return null;
        const posStyle: React.CSSProperties =
          ov.mode === 'full-broll'
            ? { left: 0, top: 0, width: '100%', height: '100%', opacity: ov.opacity }
            : ov.mode === 'side-by-side'
            ? { right: 0, top: 0, width: '50%', height: '100%', opacity: ov.opacity }
            : {
                left: `${ov.x}%`,
                top: `${ov.y}%`,
                width: `${ov.scale}%`,
                aspectRatio: '16 / 9',
                opacity: ov.opacity
              };

        const stickLeftX = Math.sin(currentTime * 2.1) * 14;
        const stickRightX = Math.cos(currentTime * 2.6) * 16;
        const stickRightY = Math.sin(currentTime * 1.9) * 14;

        return (
          <div
            key={ovClip.id}
            style={{
              ...posStyle,
              filter: computeCSSFilterString(ovClip.filters)
            }}
            className={`absolute z-15 overflow-hidden pointer-events-none bg-[#18191b] shadow-xl ${
              ov.border && ov.mode === 'pip-corner'
                ? 'rounded-[4px] border border-white/25'
                : ''
            }`}
          >
            {ovClip.sourceUrl ? (
              <video
                src={ovClip.sourceUrl}
                muted
                playsInline
                autoPlay
                loop
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#1c1d20] flex flex-col justify-between p-2 text-[9px] font-mono text-[#cfd6dd]">
                <div className="flex items-center justify-between opacity-80">
                  <span className="truncate">{ovClip.title}</span>
                  <span className="text-[#f5a04a]">PiP</span>
                </div>
                <div className="flex items-center justify-around my-auto py-1">
                  <div className="w-10 h-10 rounded-full border border-white/20 bg-black/50 relative flex items-center justify-center">
                    <div
                      style={{ transform: `translate(${stickLeftX}px, -4px)` }}
                      className="w-2.5 h-2.5 rounded-full bg-[#f5a04a]"
                    />
                  </div>
                  <div className="w-10 h-10 rounded-full border border-white/20 bg-black/50 relative flex items-center justify-center">
                    <div
                      style={{ transform: `translate(${stickRightX}px, ${stickRightY}px)` }}
                      className="w-2.5 h-2.5 rounded-full bg-[#cfd6dd]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Authentic "DJI AVATA 360" Clean Bottom Watermark (matching user screenshot) */}
      {showAvataWatermark && (
        <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-2 pointer-events-none z-15 opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">
          <span className="font-black italic tracking-tighter text-white text-[17px] leading-none">
            dji
          </span>
          <span className="font-medium tracking-[0.14em] text-white/95 text-[13px] leading-none">
            AVATA 360
          </span>
        </div>
      )}

      {/* Transition Dip-to-Black / Flash-White Scrim */}
      {transitionOverlay && transitionOverlay.opacity > 0.01 && (
        <div
          style={{
            opacity: transitionOverlay.opacity,
            backgroundColor: transitionOverlay.type === 'white' ? '#ffffff' : '#000000'
          }}
          className="absolute inset-0 pointer-events-none z-20"
        />
      )}

      {/* Subject Selection Box */}
      {isSelectingBox && selectionBox && (
        <div
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.width,
            height: selectionBox.height
          }}
          className="absolute border border-[#f5a04a] bg-[#f5a04a]/15 pointer-events-none z-30"
        />
      )}

      {/* OpenOSV On-Screen Camera Readout during Free-Look Drag or Live Free-Look Recording */}
      {is360 && (isDraggingUI || isRecordingFreeLook) && (
        <div className="absolute top-3 left-3 z-25 px-2.5 py-1 rounded-[4px] bg-[#18191b]/85 border border-[#383b41] text-[11px] font-mono text-[#e6e6e6] pointer-events-none flex items-center gap-2.5 shadow-md">
          {isRecordingFreeLook ? (
            <span className="text-[#f5a04a] font-semibold">
              REC FREE LOOK {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:
              {Math.floor(recordingSeconds % 60).toString().padStart(2, '0')}
            </span>
          ) : (
            <span className="text-[#f5a04a] font-semibold">
              {cameraControlMode === 'free-look' ? 'FREE LOOK' : 'REFRAME'}
            </span>
          )}
          <span className="text-[#a0a4ab]">
            Pan {Math.round(yaw)}° · Tilt {Math.round(pitch)}° · Roll {Math.round(roll)}° · FOV {Math.round(fov)}°
          </span>
        </div>
      )}

      {tracker.active && tracker.target && !isSelectingBox && (
        <div
          style={{
            left: `${tracker.target.x * 100}%`,
            top: `${tracker.target.y * 100}%`,
            width: `${tracker.target.width * 100}%`,
            height: `${tracker.target.height * 100}%`
          }}
          className="absolute border border-[#f5a04a] pointer-events-none z-25"
        />
      )}
    </div>
  );
};
