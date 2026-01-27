import os
import json
import google.generativeai as genai
from typing import List, Dict
from dotenv import load_dotenv

# Load env from .env file explicitly if needed, though uvicorn usually handles it if python-dotenv is installed?
# Better safe to load it.
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if API_KEY:
    genai.configure(api_key=API_KEY)

# Models to try in order of preference (Free/Fast -> Paid/Powerful)
MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"] # fallback to older names just in case, but prioritize verified ones

def is_configured() -> bool:
    return bool(API_KEY)

def _generate_with_retry(prompt: str) -> str:
    for model_name in MODELS:
        try:
            # print(f"Trying Gemini Model: {model_name}") # Optional logging
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            if response.text:
                return response.text
        except Exception as e:
            print(f"Model {model_name} failed: {e}")
            continue
    raise Exception("All Gemini models failed.")

def generate_plan_suggestions(plan_title: str, plan_description: str, plan_deadline=None) -> List[dict]:
    if not API_KEY:
        raise Exception("Gemini API Key not configured")
    
    context = ""
    if plan_deadline:
        context = f"The plan must be completed by {plan_deadline}. Ensure tasks fit within this timeframe."

    prompt = f"""
    You are an expert project planner. Create a list of 3-5 concrete recurring or single tasks to achieve this goal:
    Title: {plan_title}
    Description: {plan_description}
    {context}

    Return ONLY a raw JSON array of objects. No markdown formatting. Each object must have:
    - title (string)
    - description (string, short)
    - estimated_total_hours (float, TOTAL effort to complete this aspect of the project)
    - duration_minutes (int, length of each work session, e.g., 30, 60)
    - frequency (string, one of: "Once", "Daily", "Weekly", "Monthly")
    - deadline (string, YYYY-MM-DD format, optional. If omitted, I will calculate it based on total hours.)

    Example JSON:
    [
        {{ "title": "Read Docs", "description": "Read documentation", "estimated_total_hours": 20.0, "duration_minutes": 60, "frequency": "Daily" }}
    ]
    """

    try:
        text = _generate_with_retry(prompt)
        text = text.replace("```json", "").replace("```", "").strip()
        tasks = json.loads(text)
        
        # Post-processing: Calculate deadlines if missing
        from datetime import datetime, timedelta
        now = datetime.now()
        
        for task in tasks:
            # Map estimated_total_hours to estimated_hours for frontend compatibility if needed
            task['estimated_hours'] = task.get('estimated_total_hours', task.get('estimated_hours', 5))
            
            if not task.get('deadline'):
                try:
                    total_hours = float(task['estimated_hours'])
                    session_min = int(task.get('duration_minutes', 60))
                    freq = task.get('frequency', 'Daily')
                    
                    if session_min <= 0: session_min = 60
                    session_hours = session_min / 60.0
                    
                    sessions_needed = total_hours / session_hours
                    
                    # Multipliers (Days)
                    multiplier = 1
                    if freq == 'Weekly': multiplier = 7
                    elif freq == 'Monthly': multiplier = 30
                    elif freq == 'Once': multiplier = 1 # Once implies 1 session usually, but if total > session, maybe spread out? Assume 1 day for 'Once' or just deadline = now + days needed to work it consecutively? 
                    # If 'Once' and 20 hours work, and 1 hour session -> 20 sessions. 
                    # If 'Once', it usually means "Do it one time". But if it takes 20 hours, it's a big task. 
                    # Let's treat 'Once' as 'Daily' intensity for completion? 
                    # Or just: 
                    
                    total_days = sessions_needed * multiplier
                    
                    # Cap generic deadlines reasonably (e.g. not 10 years away)
                    # if total_days > 365 * 2: total_days = 365
                    
                    calc_deadline = now + timedelta(days=int(total_days))
                    task['deadline'] = calc_deadline.strftime("%Y-%m-%d")
                except Exception as e:
                    print(f"Error calculating deadline for task {task.get('title')}: {e}")

        return tasks
    except Exception as e:
        print(f"Gemini Error (All models): {e}")
        return []

def generate_chunk_details(chunk_title: str) -> dict:
    if not API_KEY:
        raise Exception("Gemini API Key not configured")

    prompt = f"""
    Suggest optimal execution details for a task titled: "{chunk_title}".
    Return ONLY a raw JSON object. No markdown.
    Fields:
    - description (string, actionable advice)
    - duration_minutes (int)
    - frequency (string: "Once", "Daily", "Weekly", "Monthly")
    """

    try:
        text = _generate_with_retry(prompt)
        text = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"Gemini Details Error (All models): {e}")
        return {
            "description": "Could not generate details.",
            "duration_minutes": 30,
            "frequency": "Once"
        }
