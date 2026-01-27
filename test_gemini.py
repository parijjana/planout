# ... imports ...
import sys
import os
sys.path.append(os.getcwd() + '/backend')
from app.gemini import generate_plan_suggestions, MODELS
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print(f"Testing Deadline Calculation with Models: {MODELS}")

try:
    # Intentionally vague description to force AI to estimate total effort? 
    # Or just standard request.
    tasks = generate_plan_suggestions("Learn Guitar", "Learn basic chords in 2 weeks")
    
    print(f"\nSuccess! Generated {len(tasks)} tasks:")
    for t in tasks:
        print(f"- {t['title']}")
        print(f"  Freq: {t['frequency']}, Duration: {t['duration_minutes']}m")
        print(f"  Total Effort: {t.get('estimated_hours')}h")
        print(f"  Deadline: {t.get('deadline')} (Calculated or AI)")
except Exception as e:
    print(f"FAILED: {e}")
