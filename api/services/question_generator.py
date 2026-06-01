from groq import Groq
import os
import json

client = Groq(api_key=os.getenv("NEXT_PUBLIC_GROQ_API_KEY"))

DIFFICULTY_PROMPTS = {
    "easy": "Generate recall-based questions that test basic understanding and definitions.",
    "medium": "Generate application-based questions that test understanding of concepts and their use.",
    "hard": "Generate critical analysis questions that require synthesis, evaluation, and deep understanding."
}

def generate_questions(chunks: list[str], n: int, difficulty: str) -> list[str]:
    context = "\n\n".join(chunks)
    difficulty_instruction = DIFFICULTY_PROMPTS.get(difficulty, DIFFICULTY_PROMPTS["medium"])

    prompt = f"""You are a strict academic panel examiner reviewing a research manuscript.
{difficulty_instruction}

Based on the following manuscript excerpts, generate exactly {n} panel defense questions.
Return ONLY a JSON array of strings, no explanation, no markdown, no preamble.
Example format: ["Question 1?", "Question 2?", "Question 3?"]

Manuscript excerpts:
{context[:6000]}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        max_tokens=1000,
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    questions = json.loads(raw)
    return questions[:n]