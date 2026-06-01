from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.question_generator import generate_questions
from services.embedder import generate_embeddings
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter()

supabase = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_PROJECT_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")
)

class GenerateRequest(BaseModel):
    session_id: int
    manuscript_id: int
    difficulty: str
    num_questions: int

@router.post("/api/generate-questions")
async def generate_session_questions(req: GenerateRequest):
    try:
        # 1. Fetch relevant chunks via similarity search
        # For now, fetch the top chunks ordered by index
        result = supabase.table("document_chunks")\
            .select("chunk_text")\
            .eq("manuscript_id", req.manuscript_id)\
            .order("chunk_index")\
            .limit(20)\
            .execute()

        chunks = [row["chunk_text"] for row in result.data]

        if not chunks:
            raise HTTPException(status_code=404, detail="No chunks found for manuscript.")

        # 2. Generate questions via Groq
        questions = generate_questions(chunks, req.num_questions, req.difficulty)

        # 3. Save questions to Supabase
        rows = [
            {
                "session_id": req.session_id,
                "question_text": q,
                "order_index": i
            }
            for i, q in enumerate(questions)
        ]
        supabase.table("questions").insert(rows).execute()

        return {
            "success": True,
            "questions": questions,
            "session_id": req.session_id
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))