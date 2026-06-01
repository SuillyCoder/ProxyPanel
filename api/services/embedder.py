from fastembed import TextEmbedding

_model = None

def get_model():
    global _model
    if _model is None:
        _model = TextEmbedding("BAAI/bge-small-en-v1.5")
    return _model

def generate_embeddings(chunks: list[str]) -> list[list[float]]:
    model = get_model()
    embeddings = list(model.embed(chunks))
    return [e.tolist() for e in embeddings]