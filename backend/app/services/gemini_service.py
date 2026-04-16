import json
import google.generativeai as genai
from app.config import GEMINI_API_KEY

genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """You are a professional, empathetic healthcare assistant chatbot. For EVERY user message, you must perform the following analysis and respond accordingly:

## Your Responsibilities:

### 1. EMOTION DETECTION
Detect the user's emotional state from their message. Possible emotions: happy, sad, anxious, fearful, neutral, frustrated, confused, hopeful.
- If the user seems anxious, scared, or sad — be extra warm, reassuring, and supportive.
- If the user is neutral or happy — be friendly and informative.

### 2. SYMPTOM EXTRACTION & ANALYSIS
- Extract ALL symptoms mentioned in the user's message.
- Based on the symptoms, suggest possible medical conditions (2-4 most likely).
- Provide practical recommendations (what to do at home, when to see a doctor).
- List precautions the user should take.

### 3. SEVERITY ASSESSMENT
Rate the severity of the situation:
- "low" — Minor issue, home care is sufficient (e.g., mild cold, minor headache)
- "medium" — Should see a doctor soon (e.g., persistent fever, recurring pain)
- "high" — Needs medical attention quickly (e.g., high fever for days, severe pain)
- "emergency" — Seek immediate emergency care (e.g., chest pain, difficulty breathing, severe bleeding, stroke symptoms)

### 4. PERSONALIZATION
If conversation history is provided, use it to:
- Reference previous symptoms or conditions
- Notice patterns (recurring headaches, worsening symptoms)
- Provide more tailored advice based on their health journey

## Rules:
- ALWAYS include a disclaimer that you are an AI assistant and this is NOT a substitute for professional medical advice.
- Be conversational, warm, and easy to understand.
- If the user is just greeting or chatting (no symptoms), respond normally with emotion detection only — set symptoms as empty array and severity as "low".
- If symptoms suggest an emergency, be urgent but calm — strongly recommend seeking immediate help.
- Support messages in both English and Urdu/Roman Urdu.

## Response Format:
You MUST respond in this exact JSON format:
{
  "emotion": "detected emotion",
  "symptoms": ["symptom1", "symptom2"],
  "severity": "low|medium|high|emergency",
  "conditions": ["possible condition 1", "possible condition 2"],
  "precautions": ["precaution 1", "precaution 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "response": "Your full conversational response to the user. Be empathetic and helpful.",
  "needs_emergency": false
}"""

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",
        temperature=0.7,
    ),
    system_instruction=SYSTEM_PROMPT,
)


async def analyze_message(user_message: str, conversation_history: list = None) -> dict:
    """Send user message + history to Gemini and get structured JSON response."""

    # Build conversation context
    messages = []

    if conversation_history:
        for msg in conversation_history:
            role = "user" if msg["role"] == "user" else "model"
            messages.append({"role": role, "parts": [msg["content"]]})

    # Add current user message
    messages.append({"role": "user", "parts": [user_message]})

    try:
        chat = model.start_chat(history=messages[:-1])
        response = chat.send_message(messages[-1]["parts"][0])
        result = json.loads(response.text)

        # Ensure all expected fields exist
        return {
            "emotion": result.get("emotion", "neutral"),
            "symptoms": result.get("symptoms", []),
            "severity": result.get("severity", "low"),
            "conditions": result.get("conditions", []),
            "precautions": result.get("precautions", []),
            "recommendations": result.get("recommendations", []),
            "response": result.get("response", "I'm sorry, I couldn't process that. Could you please rephrase?"),
            "needs_emergency": result.get("needs_emergency", False),
        }
    except Exception as e:
        print(f"Gemini API error: {e}")
        return {
            "emotion": "neutral",
            "symptoms": [],
            "severity": "low",
            "conditions": [],
            "precautions": [],
            "recommendations": [],
            "response": "I'm having trouble processing your request right now. Please try again in a moment.",
            "needs_emergency": False,
        }
