# JokenCam

A browser **Rock Paper Scissors game you play with your bare hands**. Hold your move in front of the camera — **Rock** ✊, **Paper** ✋, or **Scissors** ✌️ — and the gesture detected when the countdown hits zero is locked in against a CPU opponent.

## How it works

The browser owns the webcam; **Python + OpenCV + MediaPipe** is the perception brain. Each frame goes browser → Python over a WebSocket, comes back as a gesture label, and the canvas runs the countdown, reveal, and scoreboard at 60 fps.

| Step | What happens |
| --- | --- |
| 1 | Browser grabs the webcam with `getUserMedia`, draws each frame to a hidden canvas |
| 2 | The frame is JPEG-encoded and pushed to Python over a **WebSocket** |
| 3 | Python decodes it (`cv2.imdecode`) and runs **MediaPipe HandLandmarker** |
| 4 | Per hand it checks which fingers are extended (tip.y < pip.y) and returns `{ gesture }` |
| 5 | The client shows the live gesture during countdown, locks it at zero, picks a random CPU move, and resolves the round |

The server is a thin, stateless perception function — the client owns all game logic.

## Gesture detection

| Gesture | Rule |
| --- | --- |
| **Rock** ✊ | All four fingers curled (0 fingers extended) |
| **Scissors** ✌️ | Index + middle extended, ring + pinky curled |
| **Paper** ✋ | Three or more fingers extended |

Only the first detected hand is used. Extended = fingertip landmark is above the PIP joint in image-space (tip.y < pip.y).

## Gameplay

**Best of 5 rounds** — first to win **3 rounds** wins the match.

| Round phase | What happens |
| --- | --- |
| **Countdown (3 s)** | Hold your gesture. The camera panel shows what is being detected in real time. The player box pulses green when a valid gesture is recognised. |
| **SHOOT!** | The gesture at zero is locked in. The CPU picks randomly. |
| **Reveal (2 s)** | Both gestures are shown. The winner of the round is announced. Win dots fill in on the score bar. |

If no valid gesture is detected at zero the CPU wins that round.

### Keyboard fallback

For machines without a camera, keys override the gesture during the countdown:

| Key | Gesture |
| --- | --- |
| `1` | Rock ✊ |
| `2` | Paper ✋ |
| `3` | Scissors ✌️ |
| `R` | Return to menu (any phase) |

## Run it

```bash
./start.sh
```

This creates a `.venv`, installs the requirements, downloads the MediaPipe `hand_landmarker.task` model on first run, starts the server, then prints the URL. Open **http://localhost:8000**, allow the camera, and press **PLAY vs CPU**.

```bash
./stop.sh    # stop the server
./test.sh    # start the server and push one frame through the full pipeline
```

### Test output

```
http page ok
websocket pipeline ok -> {'gesture': 'none'}
ALL TESTS PASSED
```

## Privacy

- The webcam never leaves your machine: frames go browser → local Python over `ws://localhost`.
- Because the browser owns the camera, the Python side never opens a camera device — no OS camera prompt for the server.

## Stack

| Piece | Choice |
| --- | --- |
| Gesture classification | MediaPipe `HandLandmarker` (float16), finger-extension rules |
| Frame decode | OpenCV (`opencv-python`) |
| Transport | `websockets` |
| Static server | Python stdlib `http.server` (with `no-store` headers) |
| Game | plain HTML canvas + vanilla JS, dark theme |
| Python | 3.9 |
