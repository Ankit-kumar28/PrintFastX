from fastapi import FastAPI, File, UploadFile, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove
from PIL import Image
import io
import cv2
import numpy as np
import mediapipe as mp

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mp_face_detection = mp.solutions.face_detection

def auto_crop_center_face(image: Image.Image, target_ratio=35/45) -> Image.Image:
    # Convert PIL to cv2 (RGBA)
    img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGBA2BGRA)
    img_rgb = cv2.cvtColor(img_cv, cv2.COLOR_BGRA2RGB)
    
    h, w, _ = img_cv.shape

    with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5) as face_detection:
        results = face_detection.process(img_rgb)
        
        if not results.detections:
            return image # No face found, return original transparent image

        # Get first face
        detection = results.detections[0]
        bboxC = detection.location_data.relative_bounding_box
        
        # Face bounding box in pixels
        fx = int(bboxC.xmin * w)
        fy = int(bboxC.ymin * h)
        fw = int(bboxC.width * w)
        fh = int(bboxC.height * h)
        
        # Calculate center of face
        cx = fx + fw // 2
        cy = fy + fh // 2

        # Passport logic: Face should take up ~60% of height. 
        target_h = int(fh / 0.6)
        target_w = int(target_h * target_ratio)
        
        # Crop bounds
        # Standard passport: face center is around 40-45% from top.
        top = cy - int(target_h * 0.45)
        bottom = top + target_h
        left = cx - target_w // 2
        right = left + target_w

        # Ensure bounds are handled with padding if out of bounds
        canvas = np.zeros((target_h, target_w, 4), dtype=np.uint8)
        
        # Find intersection
        src_top = max(0, top)
        src_bottom = min(h, bottom)
        src_left = max(0, left)
        src_right = min(w, right)
        
        dst_top = max(0, -top)
        dst_bottom = dst_top + (src_bottom - src_top)
        dst_left = max(0, -left)
        dst_right = dst_left + (src_right - src_left)
        
        canvas[dst_top:dst_bottom, dst_left:dst_right] = img_cv[src_top:src_bottom, src_left:src_right]
        
        # Convert back to PIL
        return Image.fromarray(cv2.cvtColor(canvas, cv2.COLOR_BGRA2RGBA))

@app.post("/remove-bg")
async def remove_background(file: UploadFile = File(...), autocrop: bool = True):
    try:
        contents = await file.read()
        input_image = Image.open(io.BytesIO(contents)).convert("RGBA")
        
        # 1. Remove background
        no_bg_image = remove(input_image)
        
        # 2. Auto Center and Crop using MediaPipe
        if autocrop:
            final_image = auto_crop_center_face(no_bg_image)
        else:
            final_image = no_bg_image
        
        img_byte_arr = io.BytesIO()
        final_image.save(img_byte_arr, format='PNG')
        
        return Response(content=img_byte_arr.getvalue(), media_type="image/png")
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

