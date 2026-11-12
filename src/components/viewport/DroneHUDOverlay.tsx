/**
 * Drone HUD Overlay Component
 * Powered by DroneHUDEditor & GPStitch architectures.
 * Renders vector FPV flight telemetry (Pitch ladder, Artificial Horizon, Speed/Alt tapes,
 * Compass, Battery, Throttle, GPS) onto a transparent 2D canvas.
 */

import React, { useEffect, useRef } from 'react';
import { HUDConfig, TelemetryPoint } from '../../types/editor';

interface DroneHUDOverlayProps {
  telemetry: TelemetryPoint;
  config: HUDConfig;
  width: number;
  height: number;
}

export const DroneHUDOverlay: React.FC<DroneHUDOverlayProps> = ({
  telemetry,
  config,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Apply overall HUD opacity and scaling
    ctx.save();
    ctx.globalAlpha = config.opacity;

    // Center origin coordinates
    const cx = width / 2;
    const cy = height / 2;

    // Palette per preset
    let primaryColor = '#f59e0b'; // Amber (DJI O3)
    let secondaryColor = '#ffffff';
    let dimColor = 'rgba(255, 255, 255, 0.4)';

    if (config.preset === 'betaflight') {
      primaryColor = '#10b981'; // Phosphor green
      secondaryColor = '#6ee7b7';
      dimColor = 'rgba(16, 185, 129, 0.4)';
    } else if (config.preset === 'cyber-cyan') {
      primaryColor = '#06b6d4'; // Cyan
      secondaryColor = '#e0f2fe';
      dimColor = 'rgba(6, 182, 212, 0.4)';
    } else if (config.preset === 'stealth-white') {
      primaryColor = '#f8fafc';
      secondaryColor = '#cbd5e1';
      dimColor = 'rgba(255, 255, 255, 0.3)';
    }

    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.lineWidth = 1.5;

    // 1. Center Crosshair / Boresight Reticle
    if (config.widgets.crosshair) {
      ctx.strokeStyle = primaryColor;
      ctx.beginPath();
      // Center dot
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.stroke();

      // Wing bars
      ctx.moveTo(cx - 24, cy);
      ctx.lineTo(cx - 8, cy);
      ctx.moveTo(cx + 8, cy);
      ctx.lineTo(cx + 24, cy);

      // Top vertical tick
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx, cy - 6);
      ctx.stroke();
    }

    // 2. Artificial Horizon & Pitch Ladder
    if (config.widgets.pitchLadder || config.widgets.horizonBar) {
      ctx.save();
      // Translate to center and rotate by drone Roll angle
      ctx.translate(cx, cy);
      const rollRad = (telemetry.roll * Math.PI) / 180;
      ctx.rotate(-rollRad);

      const pixelsPerDegree = 4.2;
      const pitchOffset = telemetry.pitch * pixelsPerDegree;

      // Horizon line
      if (config.widgets.horizonBar) {
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Left horizon bar
        ctx.moveTo(-180, pitchOffset);
        ctx.lineTo(-60, pitchOffset);
        // Right horizon bar
        ctx.moveTo(60, pitchOffset);
        ctx.lineTo(180, pitchOffset);
        ctx.stroke();
      }

      // Pitch Ladder rungs (-60° to +60° every 10°)
      if (config.widgets.pitchLadder) {
        ctx.lineWidth = 1.5;
        for (let deg = -60; deg <= 60; deg += 10) {
          if (deg === 0) continue;
          const y = pitchOffset - deg * pixelsPerDegree;
          if (Math.abs(y) > cy - 40) continue; // cull outside view

          const rungW = Math.abs(deg) % 20 === 0 ? 44 : 26;
          ctx.strokeStyle = deg > 0 ? primaryColor : dimColor;

          ctx.beginPath();
          // Left tick
          ctx.moveTo(-rungW - 35, y);
          ctx.lineTo(-35, y);
          // Right tick
          ctx.moveTo(35, y);
          ctx.lineTo(rungW + 35, y);
          ctx.stroke();

          // Degree label
          ctx.fillStyle = secondaryColor;
          ctx.font = '10px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(`${Math.abs(deg)}`, -rungW - 40, y + 3);
          ctx.textAlign = 'left';
          ctx.fillText(`${Math.abs(deg)}`, rungW + 40, y + 3);
        }
      }
      ctx.restore();
    }

    // 3. Speed Ladder (Left Tape)
    if (config.widgets.speedTape) {
      const tapeX = 80;
      const tapeH = 180;
      const displaySpeed = config.unitSystem === 'imperial' ? telemetry.speed * 0.621371 : telemetry.speed;
      const unitLabel = config.unitSystem === 'imperial' ? 'MPH' : 'KM/H';

      ctx.fillStyle = 'rgba(9, 13, 22, 0.6)';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.5;
      ctx.fillRect(tapeX - 45, cy - tapeH / 2, 45, tapeH);
      ctx.strokeRect(tapeX - 45, cy - tapeH / 2, 45, tapeH);

      // Speed indicator box
      ctx.fillStyle = primaryColor;
      ctx.fillRect(tapeX - 55, cy - 14, 55, 28);
      ctx.fillStyle = '#090d16';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(displaySpeed)}`, tapeX - 6, cy + 5);

      // Speed Unit
      ctx.fillStyle = secondaryColor;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(unitLabel, tapeX - 22, cy - tapeH / 2 - 8);
    }

    // 4. Altitude Ladder (Right Tape)
    if (config.widgets.altitudeTape) {
      const tapeX = width - 80;
      const tapeH = 180;
      const displayAlt = config.unitSystem === 'imperial' ? telemetry.altitude * 3.28084 : telemetry.altitude;
      const unitLabel = config.unitSystem === 'imperial' ? 'FT' : 'M';

      ctx.fillStyle = 'rgba(9, 13, 22, 0.6)';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1.5;
      ctx.fillRect(tapeX, cy - tapeH / 2, 50, tapeH);
      ctx.strokeRect(tapeX, cy - tapeH / 2, 50, tapeH);

      // Altitude indicator box
      ctx.fillStyle = primaryColor;
      ctx.fillRect(tapeX, cy - 14, 60, 28);
      ctx.fillStyle = '#090d16';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.round(displayAlt)}`, tapeX + 6, cy + 5);

      // Altitude Unit
      ctx.fillStyle = secondaryColor;
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(unitLabel, tapeX + 25, cy - tapeH / 2 - 8);
    }

    // 5. Compass Heading Tape (Top Center)
    if (config.widgets.compassTape) {
      const compassY = 32;
      const compassW = 280;

      ctx.fillStyle = 'rgba(9, 13, 22, 0.6)';
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.fillRect(cx - compassW / 2, compassY - 14, compassW, 28);
      ctx.strokeRect(cx - compassW / 2, compassY - 14, compassW, 28);

      // Heading arrow marker
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.moveTo(cx, compassY + 18);
      ctx.lineTo(cx - 5, compassY + 26);
      ctx.lineTo(cx + 5, compassY + 26);
      ctx.closePath();
      ctx.fill();

      // Heading degrees
      const curHeading = telemetry.yaw;
      ctx.fillStyle = secondaryColor;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(curHeading)}°`, cx, compassY + 38);

      // Sliding cardinal markers
      const pxPerDeg = 2.4;
      const cardinals: { [key: number]: string } = {
        0: 'N', 45: 'NE', 90: 'E', 135: 'SE',
        180: 'S', 225: 'SW', 270: 'W', 315: 'NW', 360: 'N'
      };

      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - compassW / 2, compassY - 14, compassW, 28);
      ctx.clip();

      for (let deg = -180; deg <= 540; deg += 15) {
        const offsetDeg = deg - curHeading;
        const x = cx + offsetDeg * pxPerDeg;
        if (x < cx - compassW / 2 - 20 || x > cx + compassW / 2 + 20) continue;

        const normalizedDeg = ((deg % 360) + 360) % 360;
        const isMajor = normalizedDeg % 45 === 0;
        const isTick = normalizedDeg % 15 === 0;

        ctx.strokeStyle = isMajor ? primaryColor : dimColor;
        ctx.beginPath();
        ctx.moveTo(x, compassY - 12);
        ctx.lineTo(x, compassY - (isMajor ? 0 : 6));
        ctx.stroke();

        if (isMajor && cardinals[normalizedDeg]) {
          ctx.fillStyle = isMajor ? primaryColor : secondaryColor;
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillText(cardinals[normalizedDeg], x, compassY + 8);
        }
      }
      ctx.restore();
    }

    // 6. Flight Mode & GPS Satellites (Top Corners)
    if (config.widgets.flightMode) {
      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`MODE: ${telemetry.mode}`, 32, 28);
    }

    if (config.widgets.gpsCoordinates) {
      ctx.fillStyle = secondaryColor;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`GPS 3D: ${telemetry.satellites} SATS`, width - 32, 28);
      ctx.fillText(`${telemetry.lat.toFixed(4)}°N, ${telemetry.lon.toFixed(4)}°E`, width - 32, 42);
    }

    // 7. Battery Gauge (Bottom Left)
    if (config.widgets.batteryGauge) {
      const bX = 40;
      const bY = height - 42;

      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BATT: ${telemetry.battery}%`, bX, bY);

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = secondaryColor;
      ctx.fillText(`${telemetry.voltage.toFixed(1)}V (6S)`, bX, bY + 14);

      // Battery level bar
      ctx.strokeStyle = primaryColor;
      ctx.strokeRect(bX + 85, bY - 10, 50, 10);
      ctx.fillRect(bX + 136, bY - 7, 3, 4); // positive terminal

      ctx.fillStyle = telemetry.battery < 25 ? '#ef4444' : primaryColor;
      const fillW = Math.max(2, (telemetry.battery / 100) * 46);
      ctx.fillRect(bX + 87, bY - 8, fillW, 6);
    }

    // 8. Throttle Meter & G-Force (Bottom Right)
    if (config.widgets.throttleMeter) {
      const tX = width - 160;
      const tY = height - 42;

      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`THR: ${telemetry.throttle}%`, tX, tY);

      // Throttle vertical bar
      ctx.strokeStyle = primaryColor;
      ctx.strokeRect(tX + 75, tY - 10, 45, 10);
      const thrW = (telemetry.throttle / 100) * 41;
      ctx.fillRect(tX + 77, tY - 8, thrW, 6);
    }

    if (config.widgets.gForceGauge) {
      const gX = width - 160;
      const gY = height - 28;
      ctx.fillStyle = telemetry.gForce > 3.0 ? '#ef4444' : secondaryColor;
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`G-FORCE: ${telemetry.gForce.toFixed(1)}G`, gX, gY + 14);
    }

    // 9. Home Direction Arrow (Bottom Center)
    if (config.widgets.homeArrow) {
      const hX = cx;
      const hY = height - 45;

      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      // Arrow pointing towards home relative to drone yaw
      ctx.save();
      ctx.translate(hX, hY);
      const homeAngle = ((180 - telemetry.yaw) * Math.PI) / 180;
      ctx.rotate(homeAngle);
      ctx.moveTo(0, -12);
      ctx.lineTo(8, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = secondaryColor;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HOME: 280M', hX, hY + 22);
    }

    ctx.restore();
  }, [telemetry, config, width, height]);

  return (
    <canvas
      ref={canvasRef}
      data-hud-canvas="true"
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none z-10 w-full h-full"
    />
  );
};
