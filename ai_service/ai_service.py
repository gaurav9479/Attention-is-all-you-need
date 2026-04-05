import json
import os
import re
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
if not API_KEY:
    raise RuntimeError("API key not set in .env")

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=API_KEY,
)

MODEL = "openai/gpt-4o-mini"
MAX_RETRIES = 3

app = FastAPI(title="CodeMap AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    filename: str
    code: str


class AnalyzeResponse(BaseModel):
    purpose: str
    risk_score: int
    warnings: List[str]
    functions: List[str]
    classes: List[str]


class FileImports(BaseModel):
    name: str
    imports: List[str]


class WarningsRequest(BaseModel):
    files: List[FileImports]


class WarningsResponse(BaseModel):
    warnings: List[str]

import rag_service

class ChatRequest(BaseModel):
    query: str
    context_prefix: str
    code: str = ""
    filename: str = ""
    mode: str = "json"
    repo_name: str = ""

class ChatResponse(BaseModel):
    purpose: str = ""
    inputs_outputs: str = ""
    side_effects: List[str] = []
    complexity: str = ""
    risk: str = "LOW"
    reply: str = ""


# ---------- Helpers ----------

def _extract_structures(code: str, filename: str):
    """Regex-based extraction for functions and classes."""
    ext = os.path.splitext(filename)[1].lower()
    funcs = []
    classes = []
    
    if ext == ".py":
        funcs = re.findall(r"def\s+([a-zA-Z_][a-zA-Z0-9_]*)", code)
        classes = re.findall(r"class\s+([a-zA-Z_][a-zA-Z0-9_]*)", code)
    elif ext in [".js", ".jsx", ".ts", ".tsx"]:
        # Funcs: function name() OR const name = () =>
        f1 = re.findall(r"function\s+([a-zA-Z0-9_]+)", code)
        f2 = re.findall(r"(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>", code)
        funcs = list(set(f1 + f2))
        classes = re.findall(r"class\s+([a-zA-Z0-9_]+)", code)
        
    return funcs, classes


def _extract_json(text: str) -> dict:
    """Strip markdown fences if present and parse JSON."""
    text = text.strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
    if fenced:
        text = fenced.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find a JSON object if parsing failed
        json_match = re.search(r"\{[\s\S]*\}", text)
        if json_match:
            return json.loads(json_match.group(0))
        raise


def _chat(messages: list, retries: int = MAX_RETRIES) -> dict:
    """Call OpenAI with JSON response_format, retrying on parse failure."""
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2,
            )
            raw = response.choices[0].message.content
            return _extract_json(raw)
        except (json.JSONDecodeError, ValueError) as e:
            last_err = e
            if attempt < retries:
                messages = messages + [
                    {"role": "assistant", "content": raw},
                    {
                        "role": "user",
                        "content": "Your previous response was not valid JSON. "
                        "Please respond with valid JSON only, no markdown.",
                    },
                ]
    raise ValueError(f"Failed to get valid JSON after {retries} attempts: {last_err}")


def _chat_text(messages: list) -> str:
    """Call OpenAI and return raw string text for conversational interactions."""
    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.7,
    )
    return response.choices[0].message.content

# ---------- Endpoints ----------

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """Analyze a single file and return a structured summary with risk assessment."""
    
    # 1. Regex Extraction for structure
    reg_funcs, reg_classes = _extract_structures(req.code, req.filename)
    
    system_prompt = (
        "You are an expert code reviewer. "
        "Analyze the provided source code and return ONLY a JSON object with these exact keys:\n"
        '  "purpose": string — 2-3 sentence description of what this file does,\n'
        '  "risk_score": integer 0-100 — security/quality risk (0=safe, 100=critical),\n'
        '  "warnings": array of strings — concise security/logic warnings.'
    )
    user_prompt = f"Filename: {req.filename}\n\n```\n{req.code[:8000]}\n```"

    try:
        data = _chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
        return AnalyzeResponse(
            purpose=str(data.get("purpose", "")),
            risk_score=int(data.get("risk_score", 0)),
            warnings=data.get("warnings", []),
            functions=reg_funcs,
            classes=reg_classes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/warnings", response_model=WarningsResponse)
def warnings(req: WarningsRequest):
    """Scan a list of files with their imports and return dependency/security warnings."""
    files_text = "\n".join(
        f"- {f.name}: imports {', '.join(f.imports) if f.imports else '(none)'}"
        for f in req.files
    )

    system_prompt = (
        "You are a dependency security and architecture analyst. "
        "Given a list of files and their imports, identify the most important warnings. "
        "Return ONLY a JSON object with a single key:\n"
        '  "warnings": array of exactly 3 strings, each a concise warning about '
        "dependency risks, circular imports, outdated packages, or architectural concerns."
    )
    user_prompt = f"Files and their imports:\n{files_text}"

    try:
        data = _chat(
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
        )
        raw_warnings = data.get("warnings", [])
        if not isinstance(raw_warnings, list):
            raw_warnings = [str(raw_warnings)]
        return WarningsResponse(warnings=[str(w) for w in raw_warnings[:3]])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


_node_cache = {}

@app.post("/chat", response_model=ChatResponse)
def handle_chat_query(req: ChatRequest):
    """Answers specific codebase queries regarding functions/files with structured JSON logic or conversational text."""
    cache_key = f"{req.filename}:{req.query}:{req.mode}"
    if cache_key in _node_cache:
        return _node_cache[cache_key]

    clipped_code = req.code[:6000] if req.code else ""
    code_ctx = f"\n\nSource Code Context ({req.filename}):\n```\n{clipped_code}\n```" if clipped_code else ""

    if req.mode == "conversational":
        rag_context = ""
        if req.repo_name:
            rag_context = rag_service.search(req.repo_name, req.query)

        system_prompt = (
            "You are CodeMap AI, an expert engineering assistant with deep global awareness of the repository logic. "
            "Help the user understand architecture, answer "
            "questions intelligently, and provide helpful code examples using the provided context. Be conversational."
        )
        user_prompt = f"Context: {req.context_prefix}\n"
        if rag_context:
            user_prompt += f"\n<Global Codebase Evidence (RAG Retrieval)>\n{rag_context}\n</Global Codebase Evidence>\n"
        user_prompt += f"\nUser Query: {req.query}{code_ctx}"
        
        try:
            reply = _chat_text(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ]
            )
            response = ChatResponse(reply=reply)
            _node_cache[cache_key] = response
            return response
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        system_prompt = (
            "You are an expert internal code analyzer running in 'Normal Mode'. "
            "Your responses MUST be strictly JSON. No markdown, no filler text. "
            "Respond exactly with this JSON schema:\n"
            "{\n"
            '  "purpose": "2-3 sentences summarizing function/class purpose",\n'
            '  "inputs_outputs": "inputs and outputs clearly defined",\n'
            '  "side_effects": ["list", "of", "side effects"],\n'
            '  "complexity": "brief reasoning on time/space complexity or logic density",\n'
            '  "risk": "LOW" or "MED" or "HIGH"\n'
            "}\n"
            "Optimize your token usage. Avoid unnecessary explanations."
        )
        user_prompt = f"Context: {req.context_prefix}\nUser Query: {req.query}{code_ctx}"

        try:
            data = _chat(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ]
            )
            response = ChatResponse(
                purpose=str(data.get("purpose", "N/A")),
                inputs_outputs=str(data.get("inputs_outputs", "N/A")),
                side_effects=list(data.get("side_effects", [])),
                complexity=str(data.get("complexity", "N/A")),
                risk=str(data.get("risk", "LOW")).upper()
            )
            _node_cache[cache_key] = response
            return response
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_service:app", host="0.0.0.0", port=8000, reload=True)
