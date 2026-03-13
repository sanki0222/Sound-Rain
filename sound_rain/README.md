# Sound Rain 

This ZIP contains everything needed to run the project locally in a browser.

1) How to run
Because the project uses `p5.sound` and loads audio files, it should be opened via a local web server (not by double-clicking `index.html`).

# Option A (recommended): VS Code Live Server
1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.

# Option B: Python local server
Open a terminal in the project folder and run:

**Windows (Python 3):**
```bash
python -m http.server 8000
macOS / Linux (Python 3):
python3 -m http.server 8000
Then open:
http://localhost:8000

2) Controls
Click anywhere to spawn a falling sound object.

First click also unlocks audio playback (browser requirement).

The reset button clears all notes, trails, city effects, and resets the system state.

3) Folder structure (important)
Keep this structure the same:

Sound_Rain/
├─ index.html
├─ style.css
├─ sketch.js
└─ assets/
   ├─ sounds/
   │  ├─ 1.wav
   │  ├─ 2.wav
   │  ├─ ...
   │  └─ waternoise.wav
   └─ photos/            (just for reference and test/not necessary)
      └─ london.png
assets/sounds/ must be in the same folder level as index.html.

4) Notes on media size/optimisation
Audio files are kept as short .wav samples.


5) Troubleshooting
If you see silence: click once inside the canvas to unlock audio.

If audio still doesn’t load: make sure you are running a local server and the assets/sounds/ paths are correct.

If you see 404 errors in the browser console, check folder names and spelling (case-sensitive on some systems).

6) Author
Qianhui Sun