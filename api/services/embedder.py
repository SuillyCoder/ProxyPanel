import httpx
import os

async def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    api_url = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
    headers = {"Authorization": f"Bearer {os.getenv('HF_TOKEN', '')}"}
    
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(api_url, json={"inputs": chunks})
        return response.json()