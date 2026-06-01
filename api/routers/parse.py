from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.parser import extract_text_from_url
from services.chunker import chunk_text
from services.embedder import generate_embeddings
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()  # ← add this at the top of parse.py too

router = APIRouter()

# Move client creation here, after load_dotenv()
supabase = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_PROJECT_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY")
)

class ParseRequest(BaseModel):
    manuscript_id: int
    file_url: str
    file_name: str

@router.post("/api/parse")            # ← this was missing entirely
async def parse_manuscript(req: ParseRequest):
    try:
        print(f"Extracting text from {req.file_name}...")
        text = await extract_text_from_url(req.file_url, req.file_name)

        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from file.")

        print("Chunking text...")
        chunks = chunk_text(text)
        print(f"Created {len(chunks)} chunks")

        print("Generating embeddings...")
        embeddings = await generate_embeddings(chunks)

        print("Storing in Supabase...")
        rows = [
            {
                "manuscript_id": req.manuscript_id,
                "chunk_text": chunk,
                "embedding": embedding,
                "chunk_index": i
            }
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]

        supabase.table("document_chunks").insert(rows).execute()

        return {
            "success": True,
            "chunks_created": len(chunks),
            "manuscript_id": req.manuscript_id
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))