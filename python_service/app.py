import os

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

HAS_FACE_REC = True
try:
    import face_recognition
except ImportError:
    HAS_FACE_REC = False
    print("WARNING: face_recognition or dlib not found. Using MOCK mode.")

app = Flask(__name__)
CORS(app)


@app.route("/health", methods=["GET"])
def health():
    try:
        mode = "real" if HAS_FACE_REC else "mock"
        return jsonify({"status": "ok", "mode": mode}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/register-face", methods=["POST"])
def register_face():
    try:
        if not request.is_json:
            return jsonify({"success": False, "message": "JSON body required"}), 400

        data = request.get_json(silent=True) or {}
        image_path = data.get("imagePath")
        if not image_path or not isinstance(image_path, str):
            return jsonify({"success": False, "message": "imagePath is required"}), 400

        if not os.path.isfile(image_path):
            return jsonify({"success": False, "message": "Image file not found"}), 404

        if not HAS_FACE_REC:
            return jsonify({"success": True, "encoding": [0.1] * 128}), 200

        image = face_recognition.load_image_file(image_path)
        encodings = face_recognition.face_encodings(image)
        if len(encodings) == 0:
            return jsonify({"success": False, "message": "No face detected"}), 400

        encoding = encodings[0].tolist()
        return jsonify({"success": True, "encoding": encoding}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/verify-face", methods=["POST"])
def verify_face():
    try:
        if not request.is_json:
            return jsonify({"success": False, "message": "JSON body required"}), 400

        data = request.get_json(silent=True) or {}
        image_path = data.get("imagePath")
        stored_list = data.get("storedEncoding")

        if not image_path or not isinstance(image_path, str):
            return jsonify({"success": False, "message": "imagePath is required"}), 400
        if stored_list is None:
            return jsonify({"success": False, "message": "storedEncoding is required"}), 400
        if not isinstance(stored_list, list) or len(stored_list) != 128:
            return (
                jsonify(
                    {"success": False, "message": "storedEncoding must be array of 128 floats"}
                ),
                400,
            )

        if not os.path.isfile(image_path):
            return jsonify({"success": False, "message": "Image file not found"}), 404

        if not HAS_FACE_REC:
            return (
                jsonify(
                    {
                        "matched": True,
                        "match": True,
                        "score": 0.95,
                        "note": "Mock mode - face_recognition unavailable",
                    }
                ),
                200,
            )

        captured_image = face_recognition.load_image_file(image_path)
        captured_encodings = face_recognition.face_encodings(captured_image)
        if len(captured_encodings) == 0:
            return (
                jsonify(
                    {
                        "matched": False,
                        "match": False,
                        "score": 0,
                        "reason": "No face detected",
                    }
                ),
                200,
            )

        captured = captured_encodings[0]
        stored_np = np.array(stored_list, dtype=np.float64)
        results = face_recognition.compare_faces([stored_np], captured, tolerance=0.6)
        distances = face_recognition.face_distance([stored_np], captured)
        matched = bool(results[0])
        score = 1.0 - float(distances[0])
        return jsonify({"matched": matched, "match": matched, "score": score}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    app.run(port=5001, debug=True)
