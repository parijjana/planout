
import cv2
import os
import sys
import numpy as np

def split_icons(image_path, output_dir):
    """
    Splits an image containing multiple icons into individual image files.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not read image {image_path}")
        return

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Thresholding (Assuming icons are darker on light background or vice versa)
    # Using adaptive thresholding for robustness against lighting gradients
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY_INV, 11, 2)

    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    print(f"Found {len(contours)} potential icons.")

    count = 0
    for i, cnt in enumerate(contours):
        x, y, w, h = cv2.boundingRect(cnt)
        
        # Filter out noise (very small contours)
        if w < 20 or h < 20: 
            continue

        # Add a small padding
        padding = 5
        x = max(0, x - padding)
        y = max(0, y - padding)
        w = min(img.shape[1] - x, w + 2 * padding)
        h = min(img.shape[0] - y, h + 2 * padding)

        # Crop
        icon = img[y:y+h, x:x+w]

        # Save
        filename = f"icon_{count}.png"
        filepath = os.path.join(output_dir, filename)
        cv2.imwrite(filepath, icon)
        print(f"Saved {filepath}")
        count += 1

    print(f"Successfully extracted {count} icons to {output_dir}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python split_icons.py <image_path> [output_dir]")
        sys.exit(1)

    input_path = sys.argv[1]
    
    # Default output dir based on filename
    if len(sys.argv) >= 3:
        out_dir = sys.argv[2]
    else:
        base = os.path.splitext(os.path.basename(input_path))[0]
        out_dir = os.path.join(os.path.dirname(input_path), base + "_icons")

    split_icons(input_path, out_dir)
