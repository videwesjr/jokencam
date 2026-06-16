import asyncio
import functools
import http.server
import json
import logging
import os
import socketserver
import threading

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision
import websockets

logging.basicConfig(level=logging.ERROR)

HERE = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(HERE, "web")
MODEL = os.path.join(HERE, "hand_landmarker.task")
HTTP_PORT = 8000
WS_PORT = 8765

# Single shared detector; serialized with a lock because run_in_executor
# dispatches to threads and HandLandmarker is not thread-safe.
_detector = None
_det_lock = threading.Lock()


def _build_detector():
    global _detector
    base = mp_python.BaseOptions(model_asset_path=MODEL)
    options = vision.HandLandmarkerOptions(
        base_options=base,
        num_hands=2,
        running_mode=vision.RunningMode.IMAGE,
    )
    _detector = vision.HandLandmarker.create_from_options(options)


def classify(lm):
    def extended(tip, pip):
        return lm[tip].y < lm[pip].y

    idx    = extended(8,  6)
    middle = extended(12, 10)
    ring   = extended(16, 14)
    pinky  = extended(20, 18)
    count  = idx + middle + ring + pinky

    if count == 0:
        return {"gesture": "rock"}
    if idx and middle and not ring and not pinky:
        return {"gesture": "scissors"}
    if count >= 3:
        return {"gesture": "paper"}
    return {"gesture": "none"}


def hands_from_frame(data):
    buf = np.frombuffer(data, dtype=np.uint8)
    frame = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if frame is None:
        return {"gesture": "none"}
    try:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        with _det_lock:
            result = _detector.detect(image)
    except Exception as exc:
        logging.error("detection error: %s", exc)
        return {"gesture": "none"}
    if not result.hand_landmarks:
        return {"gesture": "none"}
    return classify(result.hand_landmarks[0])


async def handle(ws):
    loop = asyncio.get_event_loop()
    try:
        async for message in ws:
            if not isinstance(message, (bytes, bytearray)):
                continue
            try:
                payload = await loop.run_in_executor(None, hands_from_frame, bytes(message))
            except Exception as exc:
                logging.error("frame executor error: %s", exc)
                payload = {"gesture": "none"}
            await ws.send(json.dumps(payload))
    except websockets.ConnectionClosed:
        pass


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()


def serve_http():
    handler = functools.partial(NoCacheHandler, directory=WEB_DIR)
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", HTTP_PORT), handler) as httpd:
        httpd.serve_forever()


async def main():
    if not os.path.exists(MODEL):
        raise FileNotFoundError(
            f"Model file not found: {MODEL}\n"
            "Download hand_landmarker.task from "
            "https://developers.google.com/mediapipe/solutions/vision/hand_landmarker"
        )
    _build_detector()
    threading.Thread(target=serve_http, daemon=True).start()
    async with websockets.serve(handle, "", WS_PORT, max_size=2 ** 22):
        print(f"jokencam at http://localhost:{HTTP_PORT}")
        print(f"gesture websocket on ws://localhost:{WS_PORT}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
