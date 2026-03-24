#!/usr/bin/env python3
"""
optimize_video.py — Transcode a hero background video for web delivery.

Targets:
  • 1920x1080 H.264 MP4   (broad compatibility, faststart for progressive load)
  • 1920x1080 WebM VP9    (smaller file, modern browsers)

Both are video-only (no audio) and tuned for object-fit:cover hero use.

Usage:
  python3 optimize_video.py [INPUT] [OUTPUT_DIR]

  INPUT      — path to source video (default: logos/Not_The_Rug_2023_clipped.mp4)
  OUTPUT_DIR — where to write optimized files (default: logos/)
"""

import subprocess
import sys
import os
import json
from pathlib import Path


# ── defaults ────────────────────────────────────────────────────────────────
DEFAULT_INPUT = "logos/Not_The_Rug_2023_clipped.mp4"
DEFAULT_OUTPUT_DIR = "logos"

TARGET_WIDTH = 1920
TARGET_HEIGHT = 1080

# H.264 settings  (CRF 26 = visually near-lossless for background video)
H264_CRF = 26
H264_PRESET = "slow"          # slow = better compression, acceptable encode time

# VP9 settings  (CRF 33 = good quality/size balance for background video)
VP9_CRF = 33
VP9_BITRATE = "0"              # "0" enables constant-quality mode with -crf


# ── helpers ──────────────────────────────────────────────────────────────────
def probe(path: str) -> dict:
    """Return the first video stream info dict from ffprobe."""
    result = subprocess.run(
        ["ffprobe", "-v", "quiet", "-print_format", "json",
         "-show_streams", path],
        capture_output=True, text=True, check=True,
    )
    streams = json.loads(result.stdout)["streams"]
    video = next(s for s in streams if s["codec_type"] == "video")
    return video


def human_size(path: str) -> str:
    mb = os.path.getsize(path) / 1_048_576
    return f"{mb:.1f} MB"


def encode_h264(src: str, dst: str) -> None:
    """Encode to 1080p H.264 MP4 with faststart."""
    print(f"\n[MP4 H.264]  →  {dst}")
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", src,
            # scale: fit inside 1920x1080, keep aspect ratio, even dimensions
            "-vf", f"scale='min({TARGET_WIDTH},iw)':'min({TARGET_HEIGHT},ih)'"
                   ":force_original_aspect_ratio=decrease"
                   ",scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:v", "libx264",
            "-crf", str(H264_CRF),
            "-preset", H264_PRESET,
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-an",          # strip audio (muted hero video — saves space)
            dst,
        ],
        check=True,
    )


def encode_vp9(src: str, dst: str) -> None:
    """Encode to 1080p VP9 WebM (two-pass for best size)."""
    print(f"\n[WebM VP9]   →  {dst}")
    log_prefix = dst.replace(".webm", "")

    # pass 1
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", src,
            "-vf", f"scale='min({TARGET_WIDTH},iw)':'min({TARGET_HEIGHT},ih)'"
                   ":force_original_aspect_ratio=decrease"
                   ",scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:v", "libvpx-vp9",
            "-b:v", VP9_BITRATE,
            "-crf", str(VP9_CRF),
            "-pass", "1",
            "-passlogfile", log_prefix,
            "-an",
            "-f", "null", os.devnull,
        ],
        check=True,
    )

    # pass 2
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", src,
            "-vf", f"scale='min({TARGET_WIDTH},iw)':'min({TARGET_HEIGHT},ih)'"
                   ":force_original_aspect_ratio=decrease"
                   ",scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-c:v", "libvpx-vp9",
            "-b:v", VP9_BITRATE,
            "-crf", str(VP9_CRF),
            "-pass", "2",
            "-passlogfile", log_prefix,
            "-an",
            "-row-mt", "1",     # multi-threaded encoding
            dst,
        ],
        check=True,
    )

    # clean up pass-log files
    for f in Path(".").glob(f"{Path(log_prefix).name}-*.log*"):
        f.unlink(missing_ok=True)


# ── main ─────────────────────────────────────────────────────────────────────
def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT
    out_dir = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUTPUT_DIR

    if not os.path.isfile(src):
        print(f"Error: input file not found: {src}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(out_dir, exist_ok=True)

    stem = Path(src).stem
    mp4_out = os.path.join(out_dir, f"{stem}_web.mp4")
    webm_out = os.path.join(out_dir, f"{stem}_web.webm")

    # probe source
    info = probe(src)
    src_w, src_h = info["width"], info["height"]
    src_size = human_size(src)
    print(f"Source : {src}")
    print(f"         {src_w}x{src_h}  {src_size}")
    print(f"Target : {TARGET_WIDTH}x{TARGET_HEIGHT} max (aspect preserved)")

    encode_h264(src, mp4_out)
    encode_vp9(src, webm_out)

    # report
    print("\n── Results ──────────────────────────────────────────")
    print(f"  Source            {src_size:>10}  ({src_w}x{src_h})")
    print(f"  {mp4_out:<20}{human_size(mp4_out):>10}")
    print(f"  {webm_out:<20}{human_size(webm_out):>10}")
    print()
    print("To use both in index.html, add the WebM source first:")
    print(f'  <source src="{webm_out}" type="video/webm">')
    print(f'  <source src="{mp4_out}"  type="video/mp4">')


if __name__ == "__main__":
    main()
