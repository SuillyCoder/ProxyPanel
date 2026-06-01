# api/index.py
import os
from fastapi import FastAPI
from dotenv import load_dotenv
from routers import parse
from routers import questions

# Load variables from .env file
load_dotenv() 

app = FastAPI()

app.include_router(parse.router)
app.include_router(questions.router)

@app.get("/")
def root():
    return {"status": "ProxyPanel API is running"}

@app.get("/api/python")
def hello_world():
    secret = os.getenv("MY_SECRET_KEY", "default_value")
    return {"message": "Hello from FastAPI", "secret": secret}
