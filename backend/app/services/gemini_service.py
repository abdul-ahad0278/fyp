import json
import google.generativeai as genai
from app.config import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)

# gemini-2.5-flash-lite has the most generous free-tier rate limits (higher RPM/RPD
# than gemini-2.5-flash) while still supporting multimodal + JSON mode.
MODEL_NAME = "gemini-2.5-flash-lite"

BASE_PROMPT = """You are a professional, empathetic healthcare assistant chatbot.

## Strict Scope — HEALTH ONLY
You MUST only respond to health, medical, wellness, mental-health, nutrition, fitness,
medication, first-aid, or symptom-related questions. Simple greetings ("hi", "salam",
"thanks") are allowed. Anything else (coding help, maths homework, news, politics,
celebrity gossip, general knowledge, recipes unrelated to health, translations, jokes,
sports scores, product reviews, etc.) MUST be politely refused.

When the user asks something OUT-OF-SCOPE, set "is_health_related": false and in
"response" politely explain you can only help with health questions and give 2-3
example things they can ask (e.g. "Describe a symptom", "Ask about a medicine",
"Get first-aid advice"). Leave symptoms, conditions, precautions, recommendations empty.

## For HEALTH messages, perform:

### 1. EMOTION DETECTION
Detect emotion: happy, sad, anxious, fearful, neutral, frustrated, confused, hopeful.
Adjust tone accordingly.

### 2. SYMPTOM EXTRACTION & ANALYSIS
- Extract ALL symptoms mentioned.
- Suggest 2-4 most likely conditions.
- Give practical home-care + when-to-see-a-doctor recommendations.
- List precautions.
- Personalize using the USER HEALTH PROFILE block (age, gender, chronic conditions,
  allergies, medications). For example: flag an NSAID recommendation if the user has
  ulcers, consider paediatric vs. geriatric dosing, be extra cautious if pregnant, etc.

### 3. SEVERITY ASSESSMENT
"low" | "medium" | "high" | "emergency" — emergency means chest pain, stroke signs,
severe bleeding, difficulty breathing, anaphylaxis, suicidal ideation, etc.

### 4. PERSONALIZATION
Use conversation history + user profile to spot patterns and avoid re-asking info
you already have.

## Rules
- ALWAYS include the AI-not-a-doctor disclaimer in "response".
- Support English AND Urdu / Roman Urdu.
- Be warm, concise, actionable. Avoid walls of text.

## Response Format (MUST be valid JSON, no code fences)
{
  "is_health_related": true,
  "emotion": "detected emotion",
  "symptoms": ["symptom1"],
  "severity": "low|medium|high|emergency",
  "conditions": ["possible condition"],
  "precautions": ["precaution"],
  "recommendations": ["recommendation"],
  "response": "your conversational reply",
  "needs_emergency": false
}
"""


def _format_profile(profile: dict | None) -> str:
    if not profile:
        return "USER HEALTH PROFILE: (not available)"
    lines = ["USER HEALTH PROFILE:"]
    if profile.get("age"):
        lines.append(f"- Age: {profile['age']}")
    if profile.get("gender"):
        lines.append(f"- Gender: {profile['gender']}")
    if profile.get("blood_group"):
        lines.append(f"- Blood group: {profile['blood_group']}")
    if profile.get("height_cm"):
        lines.append(f"- Height: {profile['height_cm']} cm")
    if profile.get("weight_kg"):
        lines.append(f"- Weight: {profile['weight_kg']} kg")
    if profile.get("allergies"):
        lines.append(f"- Allergies: {', '.join(profile['allergies'])}")
    if profile.get("chronic_conditions"):
        lines.append(f"- Chronic conditions: {', '.join(profile['chronic_conditions'])}")
    if profile.get("current_medications"):
        lines.append(f"- Current medications: {', '.join(profile['current_medications'])}")
    if profile.get("previous_symptoms"):
        lines.append(f"- Previous symptoms / history: {profile['previous_symptoms']}")
    if profile.get("family_history"):
        lines.append(f"- Family history: {profile['family_history']}")
    if profile.get("lifestyle"):
        lines.append(f"- Lifestyle: {profile['lifestyle']}")
    return "\n".join(lines)


def _build_model(profile: dict | None) -> genai.GenerativeModel:
    system = BASE_PROMPT + "\n\n" + _format_profile(profile)
    return genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.6,
        ),
        system_instruction=system,
    )


_FALLBACK = {
    "is_health_related": True,
    "emotion": "neutral",
    "symptoms": [],
    "severity": "low",
    "conditions": [],
    "precautions": [],
    "recommendations": [],
    "response": "I'm having trouble processing your request right now. Please try again in a moment.",
    "needs_emergency": False,
}


_VALID_SEVERITY = {"low", "medium", "high", "emergency"}


def _normalize_severity(value) -> str:
    v = (value or "").strip().lower()
    return v if v in _VALID_SEVERITY else "low"


def _coerce(result: dict) -> dict:
    return {
        "is_health_related": bool(result.get("is_health_related", True)),
        "emotion": result.get("emotion", "neutral") or "neutral",
        "symptoms": result.get("symptoms", []) or [],
        "severity": _normalize_severity(result.get("severity")),
        "conditions": result.get("conditions", []) or [],
        "precautions": result.get("precautions", []) or [],
        "recommendations": result.get("recommendations", []) or [],
        "response": result.get("response")
            or "I'm sorry, I couldn't process that. Could you please rephrase?",
        "needs_emergency": bool(result.get("needs_emergency", False)),
    }


async def analyze_message(
    user_message: str,
    conversation_history: list | None = None,
    profile: dict | None = None,
) -> dict:
    """Send user message + history to Gemini; returns structured JSON response."""
    model = _build_model(profile)

    messages = []
    if conversation_history:
        for msg in conversation_history:
            role = "user" if msg["role"] == "user" else "model"
            messages.append({"role": role, "parts": [msg["content"]]})
    messages.append({"role": "user", "parts": [user_message]})

    try:
        chat = model.start_chat(history=messages[:-1])
        response = chat.send_message(messages[-1]["parts"][0])
        return _coerce(json.loads(response.text))
    except Exception as e:
        print(f"Gemini API error (chat): {e}")
        return _FALLBACK


# ───────────────── MediScan — Vision analysis ─────────────────

VISION_PROMPTS = {
    "symptom": (
        "The user has uploaded a PHOTO of a visible symptom (e.g. skin rash, wound, eye "
        "redness, swelling, nail, tongue, mouth, throat). Describe what you observe "
        "objectively, list 2-4 possible conditions, rate severity, give home-care steps "
        "and when-to-see-a-doctor guidance. Consider the user's age/gender/allergies/"
        "chronic conditions from the HEALTH PROFILE above. "
        "Put observations in 'detected_items'. If the image is not a visible medical "
        "concern, set severity='low' and explain politely."
    ),
    "medicine": (
        "The user has uploaded a PHOTO of a medicine (pill, tablet, blister pack, syrup "
        "bottle, or box). Identify the medicine (generic + common brand names if visible), "
        "typical dosage, common uses, most important warnings/side-effects. CRITICALLY "
        "cross-check the user's HEALTH PROFILE — if the medicine interacts with their "
        "allergies, chronic conditions, or current medications, put a clear warning in "
        "'warnings'. Put the medicine name(s) in 'detected_items'. If unreadable, say so."
    ),
    "prescription": (
        "The user has uploaded a PHOTO of a doctor's prescription (handwritten or "
        "printed). Extract every medicine + dosage + frequency + duration you can read. "
        "Put each medicine name in 'detected_items'. In 'recommendations' output one "
        "line per medicine in the format: 'MedicineName — Dosage — Frequency — Duration'. "
        "Flag anything illegible. Cross-check against the user's allergies and chronic "
        "conditions and put any concerns in 'warnings'."
    ),
}

VISION_OUTPUT_SPEC = """
Respond ONLY with valid JSON in this shape:
{
  "mode": "symptom|medicine|prescription",
  "detected_items": ["..."],
  "analysis": "2-6 sentence plain-English explanation of what you see and mean",
  "severity": "low|medium|high|emergency",
  "recommendations": ["..."],
  "warnings": ["..."],
  "needs_emergency": false,
  "response": "friendly conversational reply to show the user"
}
"""


def _build_vision_model(profile: dict | None, mode: str) -> genai.GenerativeModel:
    mode_prompt = VISION_PROMPTS.get(mode, VISION_PROMPTS["symptom"])
    system = (
        "You are MediScan, a healthcare vision assistant. ALWAYS include the "
        "AI-is-not-a-doctor disclaimer in 'response'. Never diagnose with certainty — "
        "describe what you see and suggest next steps.\n\n"
        + _format_profile(profile)
        + "\n\n" + mode_prompt
        + "\n\n" + VISION_OUTPUT_SPEC
    )
    return genai.GenerativeModel(
        model_name=MODEL_NAME,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.4,
        ),
        system_instruction=system,
    )


_VISION_FALLBACK = {
    "mode": "symptom",
    "detected_items": [],
    "analysis": "I couldn't analyse this image right now.",
    "severity": "low",
    "recommendations": [],
    "warnings": [],
    "needs_emergency": False,
    "response": "Sorry, I had trouble reading that image. Please try a clearer photo in good light.",
}


async def analyze_image(
    image_bytes: bytes,
    mime_type: str,
    mode: str = "symptom",
    user_note: str | None = None,
    profile: dict | None = None,
) -> dict:
    """Multimodal vision analysis. mode ∈ {symptom, medicine, prescription}."""
    if mode not in VISION_PROMPTS:
        mode = "symptom"

    model = _build_vision_model(profile, mode)

    parts = [
        {"mime_type": mime_type, "data": image_bytes},
        user_note or "Please analyse this image.",
    ]

    try:
        response = model.generate_content(parts)
        result = json.loads(response.text)
        return {
            "mode": result.get("mode", mode) if result.get("mode") in VISION_PROMPTS else mode,
            "detected_items": result.get("detected_items", []) or [],
            "analysis": result.get("analysis", "") or "",
            "severity": _normalize_severity(result.get("severity")),
            "recommendations": result.get("recommendations", []) or [],
            "warnings": result.get("warnings", []) or [],
            "needs_emergency": bool(result.get("needs_emergency", False)),
            "response": result.get("response") or result.get("analysis", ""),
        }
    except Exception as e:
        print(f"Gemini API error (vision): {e}")
        return {**_VISION_FALLBACK, "mode": mode}
