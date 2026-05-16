import fitz #PyMuPDF library
from docx import Document
import httpx

async def extract_text_from_url(file_url: str, file_name: str) -> str:
    async with httpx.AsyncClient() as client:
        response = await client.get(file_url)
        file_bytes = response.content

    #Checking for the different file extensions
    if file_name.endswith(".pdf"):
        return extractFromPDF(file_bytes)
    elif file_name.endswith(".pdf"):
        return extractFromDOCX(file_bytes)
    else:
       raise ValueError("Unsupported File Type")
    
def extractFromPDF(file_bytes: bytes) -> str:
    text = "" #Set empty text
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:  #Open the document and extract each of the pages collectively as 'doc'
        for page in doc: #for each page
            text += page.get_text() #Add to the strip of text
    return text.strip #Return said strip of text

def extractFromDOCX(file_bytes: bytes) -> str:
    import io   
    doc = Document(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs if para.text]).strip()