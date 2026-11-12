#!/usr/bin/env python3
"""
Generate synthetic authentic DJI Avata 360 DangTree.OSV and DangTree.LRF footage.
Creates:
  - DangTree.OSV: High-res dual-fisheye 3840x1920 (2x 1920x1920 lens circles), 60fps, stereo AAC, DJI metadata
  - DangTree.LRF: Proxy dual-fisheye 1280x640 (2x 640x640 lens circles), 30fps, stereo AAC, matching audio/timecode
"""

import os
import subprocess
import shutil

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
FOOTAGE_DIR = os.path.join(PUBLIC_DIR, "footage")
NATIVE_TEST_DIR = os.path.join(ROOT_DIR, "native", "test_data")
NATIVE_FOOTAGE_DIR = os.path.join(ROOT_DIR, "native", "footage")

for d in [FOOTAGE_DIR, NATIVE_TEST_DIR, NATIVE_FOOTAGE_DIR]:
    os.makedirs(d, exist_ok=True)

DURATION = 10  # 10 seconds of high-fidelity footage
FPS_HI = 60
FPS_LO = 30

osv_path = os.path.join(FOOTAGE_DIR, "DangTree.OSV")
lrf_path = os.path.join(FOOTAGE_DIR, "DangTree.LRF")

print(f"Generating DangTree.OSV ({DURATION}s, 3840x1920 @ {FPS_HI}fps)...")

# Filter complex for equirectangular 360 flight past the iconic DangTree:
# 1. Sky blue gradient top half, grass lawn bottom half
# 2. Moving forward street corridor
# 3. Iconic "DangTree" trunk + leafy crown positioned directly in view
# 4. Flight HUD & landmark annotation
# 5. Converted via v360 into dual fisheye (dfisheye) side-by-side!
# 6. Audio generated via aevalsrc: 4-rotor drone motor whine (138Hz, 276Hz, 414Hz) + wind whoosh
filter_equirect = (
    f"color=c=#467eb8:s=3840x1920:d={DURATION}:r={FPS_HI}[bg];"
    f"[bg]drawbox=x=0:y=960:w=3840:h=960:color=#476133:t=fill[lawn];"
    f"[lawn]drawbox=x=1860:y=960:w=120:h=960:color=#787a7e:t=fill[road];"
    f"[road]drawbox=x=1820:y=960:w=40:h=960:color=#a8a59e:t=fill[sidewalk];"
    f"[sidewalk]drawbox=x=2120:y=760:w=90:h=480:color=#4a3525:t=fill[trunk];"
    f"[trunk]drawbox=x=1980:y=540:w=380:h=280:color=#2b471c:t=fill[canopy1];"
    f"[canopy1]drawbox=x=2020:y=460:w=300:h=200:color=#3a5d26:t=fill[canopy2];"
    f"[canopy2]drawtext=text='DangTree Landmark':fontsize=42:fontcolor=#ffffff:x=2030:y=420[tag1];"
    f"[tag1]drawtext=text='DJI AVATA 360 - D-LOG M 10-BIT':fontsize=36:fontcolor=#f5a04a:x=80:y=80[hud1];"
    f"[hud1]drawtext=text='TAKE 01 - DANGTREE PASS':fontsize=32:fontcolor=#ffffff:x=80:y=130[hud2];"
    f"[hud2]drawtext=text='ALT 4.2m | SPD 48 km/h | BATT 88%%':fontsize=30:fontcolor=#cfd6dd:x=80:y=175[hud3];"
    f"[hud3]v360=input=e:output=dfisheye:w=3840:h=1920:interp=linear[vdf]"
)

audio_filter = (
    f"aevalsrc="
    f"'0.22*sin(2*PI*(138+8*sin(2*PI*0.4*t))*t) + "
    f"0.14*sin(2*PI*(276+16*sin(2*PI*0.4*t))*t) + "
    f"0.08*sin(2*PI*(414+24*sin(2*PI*0.4*t))*t) + "
    f"0.05*(2*random(0)-1)':d={DURATION}:s=48000[aout]"
)

cmd_osv = [
    "ffmpeg", "-y",
    "-filter_complex", filter_equirect,
    "-map", "[vdf]",
    "-filter_complex", audio_filter,
    "-map", "[aout]",
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "192k",
    "-metadata", "title=DangTree.OSV",
    "-metadata", "artist=DJI Avata 360",
    "-metadata", "album=AvataCraft Test Footage",
    "-metadata", "comment=DJI OSV dual-fisheye 360 master take",
    "-movflags", "+faststart",
    "-f", "mp4",
    osv_path
]

print("Running ffmpeg for OSV...")
res = subprocess.run(cmd_osv, capture_output=True, text=True)
if res.returncode != 0:
    print("Error generating OSV:\n", res.stderr)
    raise SystemExit(res.returncode)

print(f"Successfully generated {osv_path} ({os.path.getsize(osv_path)} bytes)")

print(f"Generating DangTree.LRF proxy ({DURATION}s, 1280x640 @ {FPS_LO}fps)...")
cmd_lrf = [
    "ffmpeg", "-y",
    "-i", osv_path,
    "-vf", "scale=1280:640,fps=30",
    "-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-pix_fmt", "yuv420p",
    "-c:a", "copy",
    "-metadata", "title=DangTree.LRF",
    "-metadata", "comment=DJI Avata LRF proxy stream",
    "-movflags", "+faststart",
    "-f", "mp4",
    lrf_path
]

res_lrf = subprocess.run(cmd_lrf, capture_output=True, text=True)
if res_lrf.returncode != 0:
    print("Error generating LRF:\n", res_lrf.stderr)
    raise SystemExit(res_lrf.returncode)

print(f"Successfully generated {lrf_path} ({os.path.getsize(lrf_path)} bytes)")

# Mirror to public root, native/test_data and native/footage
shutil.copy2(osv_path, os.path.join(PUBLIC_DIR, "DangTree.OSV"))
shutil.copy2(lrf_path, os.path.join(PUBLIC_DIR, "DangTree.LRF"))
shutil.copy2(osv_path, os.path.join(NATIVE_TEST_DIR, "DangTree.OSV"))
shutil.copy2(lrf_path, os.path.join(NATIVE_TEST_DIR, "DangTree.LRF"))
shutil.copy2(osv_path, os.path.join(NATIVE_FOOTAGE_DIR, "DangTree.OSV"))
shutil.copy2(lrf_path, os.path.join(NATIVE_FOOTAGE_DIR, "DangTree.LRF"))

print("All copies deployed successfully.")
