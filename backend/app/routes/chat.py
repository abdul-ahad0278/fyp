from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import gemini_service, supabase_service

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str
    user_id: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    emotion: str
    symptoms: list[str]
    severity: str
    conditions: list[str]
    precautions: list[str]
    recommendations: list[str]
    needs_emergency: bool


@router.post("/send", response_model=ChatResponse)
async def send_message(req: ChatRequest):
    """Process a user message: analyze symptoms, detect emotion, generate response."""

    try:
        # Get or create conversation
        conversation_id = req.conversation_id
        if not conversation_id:
            conversation = await supabase_service.create_conversation(req.user_id)
            conversation_id = conversation["id"]

        # Fetch conversation history for context
        history = await supabase_service.get_conversation_messages(conversation_id, limit=10)

        # Save user message
        await supabase_service.save_message(
            conversation_id=conversation_id,
            role="user",
            content=req.message
        )

        # Analyze with Gemini (symptoms + emotion + severity in one call)
        analysis = await gemini_service.analyze_message(req.message, history)

        # Save bot response with extracted data
        await supabase_service.save_message(
            conversation_id=conversation_id,
            role="assistant",
            content=analysis["response"],
            emotion=analysis["emotion"],
            symptoms=analysis["symptoms"],
            severity=analysis["severity"],
            conditions=analysis["conditions"],
            recommendations=analysis["recommendations"],
            precautions=analysis["precautions"]
        )

        # Save health record if symptoms were detected
        if analysis["symptoms"]:
            await supabase_service.save_health_record(
                user_id=req.user_id,
                symptoms=analysis["symptoms"],
                conditions=analysis["conditions"],
                severity=analysis["severity"],
                emotion=analysis["emotion"]
            )

        # Update conversation activity
        await supabase_service.update_conversation_activity(conversation_id)

        return ChatResponse(
            conversation_id=conversation_id,
            response=analysis["response"],
            emotion=analysis["emotion"],
            symptoms=analysis["symptoms"],
            severity=analysis["severity"],
            conditions=analysis["conditions"],
            precautions=analysis["precautions"],
            recommendations=analysis["recommendations"],
            needs_emergency=analysis["needs_emergency"]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{conversation_id}")
async def get_chat_history(conversation_id: str):
    """Get all messages in a conversation."""
    messages = await supabase_service.get_conversation_messages(conversation_id, limit=100)
    return {"messages": messages}


@router.get("/conversations/{user_id}")
async def get_conversations(user_id: str):
    """Get all conversations for a user."""
    conversations = await supabase_service.get_user_conversations(user_id)
    return {"conversations": conversations}


@router.post("/new-conversation")
async def new_conversation(user_id: str):
    """Start a new conversation (end the current active one)."""
    active = await supabase_service.get_active_conversation(user_id)
    if active:
        await supabase_service.end_conversation(active["id"])

    conversation = await supabase_service.create_conversation(user_id)
    return {"conversation": conversation}
