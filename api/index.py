# api/index.py
import os
from fastapi import FastAPI
from dotenv import load_dotenv
from routers import parse

# Load variables from .env file
load_dotenv() 

app = FastAPI()

app.include_router(parse.router)

@app.get("/api/python")
def hello_world():
    secret = os.getenv("MY_SECRET_KEY", "default_value")
    return {"message": "Hello from FastAPI", "secret": secret}
