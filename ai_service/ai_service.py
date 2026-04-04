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

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set in .env")

client = OpenAI(
    api_key=OPENAI_API_KEY,
)

MODEL = "gpt-4o-mini"
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_service:app", host="0.0.0.0", port=8000, reload=True)
