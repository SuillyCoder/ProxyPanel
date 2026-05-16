from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.parser import extract_text_from_url
from services.chunker import chunk_text
from services.embedder import generate_embeddings
from supabase import create_client
import os

router = APIRouter()

supabase = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_PROJECT_URL"),
    os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)

class ParseRequest(BaseModel):
    manuscript_id: int
    file_url: str
    file_name: str

@router.post("/api/parse")
async def parse_manuscript(req: ParseRequest):
    try:
        # 1. Extract text from file
        print(f"Extracting text from {req.file_name}...")
        text = await extract_text_from_url(req.file_url, req.file_name)
        
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from file.")
        
        # 2. Chunk the text
        print("Chunking text...")
        chunks = chunk_text(text)
        print(f"Created {len(chunks)} chunks")
        
        # 3. Generate embeddings
        print("Generating embeddings...")
        embeddings = generate_embeddings(chunks)
        
        # 4. Store chunks + embeddings in Supabase
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
        raise HTTPException(status_code=500, detail=str(e))