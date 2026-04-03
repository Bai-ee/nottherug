import subprocess
import sys

URL = "https://www.youtube.com/watch?v=p_gK4wSp0Uk&t=12s"

def download(url):
    subprocess.run([
        "yt-dlp",
        "-o", "%(title)s.%(ext)s",
        url
    ], check=True)

if __name__ == "__main__":
    download(sys.argv[1] if len(sys.argv) > 1 else URL)
