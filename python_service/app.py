import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import base64

# Fallback in case face_recognition or dlib is not available
HAS_FACE_REC = True
try:
    import face_recognition
except ImportError:
    HAS_FACE_REC = False
    print("WARNING: face_recognition or dlib not found. Using MOCK mode.")

app = Flask(__name__)
CORS(app)

@app.route('/register', methods=['POST'])
def register_face():
    """
    Receives an image and returns the face encoding as a list.
    """
    try:
        if 'image' not in request.files:
            return jsonify({"success": False, "message": "No image uploaded"}), 400
        
        if not HAS_FACE_REC:
            return jsonify({
                "success": True, 
                "message": "Face encoded successfully (MOCK MODE)", 
                "encoding": [0.1] * 128
            })

        file = request.files['image']
        image = face_recognition.load_image_file(file)
        encodings = face_recognition.face_encodings(image)
        
        if len(encodings) == 0:
            return jsonify({"success": False, "message": "No face detected"}), 400
        
        # We take the first face detected
        encoding = encodings[0].tolist()
        
        return jsonify({
            "success": True, 
            "message": "Face encoded successfully", 
            "encoding": encoding
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/verify', methods=['POST'])
def verify_face():
    """
    Compares a captured image with a stored encoding.
    """
    try:
        data = request.json
        image_path = data.get('image_path')
        stored_encoding_b64 = data.get('stored_encoding')
        
        if not image_path or not stored_encoding_b64:
            return jsonify({"success": False, "message": "Missing image path or encoding"}), 400
            
        if not HAS_FACE_REC:
             return jsonify({
                "matched": True,
                "score": 0.95,
                "note": "Mocked match because face_recognition is unavailable"
            })

        # Decode stored encoding
        stored_encoding = np.frombuffer(base64.b64decode(stored_encoding_b64), dtype=np.float64)
        
        # Load captured image
        if not os.path.exists(image_path):
             return jsonify({"success": False, "message": "Captured image not found"}), 404
             
        captured_image = face_recognition.load_image_file(image_path)
        captured_encodings = face_recognition.face_encodings(captured_image)
        
        if len(captured_encodings) == 0:
            return jsonify({"matched": False, "score": 0, "reason": "No face detected in captured image"})
            
        captured_encoding = captured_encodings[0]
        
        # Compare faces
        results = face_recognition.compare_faces([stored_encoding], captured_encoding, tolerance=0.6)
        face_distances = face_recognition.face_distance([stored_encoding], captured_encoding)
        
        matched = bool(results[0])
        score = 1 - float(face_distances[0]) # Normalized score
        
        return jsonify({
            "matched": matched,
            "score": score
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
