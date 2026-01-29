import sys
import json
import logging
from nudenet import NudeDetector

# Disable NudeNet logging to keep JSON output clean
logging.getLogger('nudenet').setLevel(logging.ERROR)

def moderate_image(image_path):
    try:
        detector = NudeDetector()
        detections = detector.detect(image_path)
        
        # Explicit classes observed in NudeNet v3 logs
        blocked_classes = [
            "FEMALE_GENITALIA_EXPOSED",
            "MALE_GENITALIA_EXPOSED",
            "BUTTOCKS_EXPOSED",
            "FEMALE_BREAST_EXPOSED",
            "ANUS_EXPOSED",
            "MALE_BREAST_EXPOSED",
            # Fallback for older versions just in case
            "EXPOSED_GENITALIA",
            "EXPOSED_BUTTOCKS",
            "EXPOSED_BREAST_F",
            "EXPOSED_ANUS",
        ]
        
        is_safe = True
        blocked_items = []
        
        for detection in detections:
            label = detection['class']
            score = detection['score']
            # Log all detections to stderr for debugging
            print(f"DEBUG: Detected {label} with score {score}", file=sys.stderr)
            
            # Use a threshold of 0.4 for stricter enforcement
            if score > 0.4:
                if label in blocked_classes:
                    is_safe = False
                    blocked_items.append(label)
        
        print(json.dumps({
            "status": "safe" if is_safe else "blocked",
            "reason": blocked_items if not is_safe else [],
            "error": None
        }))
        
    except Exception as e:
        print(json.dumps({
            "status": "error",
            "reason": [],
            "error": str(e)
        }))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "error": "No image path provided"}))
        sys.exit(1)
        
    image_path = sys.argv[1]
    moderate_image(image_path)
