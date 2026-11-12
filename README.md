# orbis-reframe — Avata-Craft Linux Workstation Edition

**Avata-Craft (`orbis-reframe` Edition)** is an open-source 360° `.osv` / `.insv` video reframing, live Free-Look viewpoint-lock recorder, and multitrack FPV editor built on the **`Schabo/orbis-reframe`** desktop interface and engineered for turnkey execution on **Fedora Linux 45 Workstation**.

## Integrated Capabilities

- **Authentic `Schabo/orbis-reframe` Desktop UI**: Qt6 Ember palette (`#1c1d20` / `#232528` / `#f5a04a`), 5-menu bar (`File | Edit | Media | View | Help`), collapsible `Media / Overlays / Transitions` left sidebar, two-row `PlayerBar`, 6-tab right `SettingsSidebar` (`Stitching`, `Stabilization`, `Reframe`, `Split screen`, `Colour`, `Media information`), `EditToolbar`, and multitrack `Video` + linked `Camera mic` waveform timeline.
- **OpenOSV Free Look (Viewpoint Lock) & Live Video Recording (`Kemerd/OpenOSV`)**:
  - Toggle **Free look** (`F`) in the `PlayerBar`, `EditToolbar`, `View` menu, or `Video → Reframe → Control`.
  - Pan and tilt the 360° sphere freely while the video is playing (`Drag` = Pan/Tilt, `Shift + Drag` = Single-axis lock, `Ctrl + Drag` / `Wheel` = Smooth Zoom FOV, `Alt + Drag` = Roll).
  - **Viewpoint Lock**: Releasing or stopping the mouse immediately locks that fixed perspective for the rest of playback until you move the mouse again.
  - **Record Free-Look Video (`Shift+R`)**: Click **Rec free look** (or choose **Free look — Steer live in viewer while recording** inside `File → Export flat video…`) to record a flattened `.webm` video (with Colour LUTs, FPV HUD, titles, and mixed audio) directly from your live Free-Look movements.
  - Includes OpenOSV per-clip lens alignment, sky-banding removal, sun-ghost subtraction, and `D-Log M → Rec.709` / `D-Log M → Rec.2100 PQ/HLG` LUT profiles.
- **FPV HUD, Gyro Stabilization & Telemetry (`DroneHUDEditor`, `aerosphere`, `GPStitch`, `DJIStudioCraft`)**:
  - DJI O3 & Betaflight OSD overlays, GPS speed/heading/G-force gauges, GPX/SRT flight log sync, AeroSphere horizon lock & lean follow, CSRT subject tracking, and one-click FPV camera tricks.

## Running Turnkey on Fedora Linux 45 Workstation

1. Extract the downloaded archive (`orbis-reframe-avata-linux.tar.gz` or `.zip`):
   ```bash
   mkdir -p ~/orbis-reframe-avata && tar -xzf orbis-reframe-avata-linux.tar.gz -C ~/orbis-reframe-avata
   cd ~/orbis-reframe-avata
   chmod +x run-linux.sh
   ./run-linux.sh
   ```
2. Open `http://localhost:3000` in Firefox or Chromium/Chrome (Wayland/X11 with WebGL2 & VA-API enabled).

### Optional: Building Upstream `Kemerd/OpenOSV` CLI (`osvtool`) & Resolve OFX Plugin on Fedora Linux

Upstream `Kemerd/OpenOSV` ships prebuilt binaries only for Windows 10/11 and macOS (its `osvgui` ImGui wrapper uses Win32/macOS file dialogs, and Adobe Premiere/VEGAS are not on Linux). However, its C++20 `osvtool` CLI and OpenFX bundle (`OpenOSV.ofx.bundle` for **DaVinci Resolve on Linux**) can be compiled on Fedora with CMake 3.28+ and `vcpkg`:

```bash
sudo dnf install -y git cmake ninja-build gcc-c++ pkgconf-pkg-config nasm yasm ocl-icd-devel
git clone https://github.com/Kemerd/OpenOSV.git
cd OpenOSV
# Bootstrap vcpkg and build osvtool + OpenFX plugin (skipping Win/Mac osvgui & Premiere SDK):
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release \
  -DOSV_BUILD_GUI=OFF -DOSV_BUILD_PREMIERE=OFF -DOSV_ENABLE_CUDA=OFF -DOSV_BUILD_TOOLS=ON -DOSV_BUILD_OFX=ON
cmake --build build
```
