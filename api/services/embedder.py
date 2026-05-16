from sentence_transformers import SentenceTransformer

# Load model once at module level — don't reload on every request
model = SentenceTransformer("all-MiniLM-L6-v2")

def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    """Generate 384-dim embeddings for each chunk."""
    embeddings = model.encode(chunks, show_progress_bar=False)
    return embeddings.tolist()