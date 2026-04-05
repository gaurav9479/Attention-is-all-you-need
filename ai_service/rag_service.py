import os
try:
    import chromadb
    # Initialize ChromaDB Cloud Client using user credentials
    client = chromadb.CloudClient(
        api_key='ck-CoUvTGjqDVv6vyKpg5ggmTYU5CxH4qspnvx2yydn6QnK',
        tenant='e61cf002-f6fa-4413-b443-401db52da019',
        database='hack18'
    )
except ImportError:
    print("Warning: chromadb module not found. RAG functionality will be disabled.")
    client = None
except Exception as e:
    print(f"Warning: Failed to log into ChromaDB Cloud. RAG may be degraded: {e}")
    client = None

import threading

SUPPORTED_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".py"}
_currently_indexing = set()

def _chunk_text(text: str, chunk_size=50, overlap=10):
    lines = text.split("\n")
    chunks = []
    for i in range(0, len(lines), chunk_size - overlap):
        chunk = "\n".join(lines[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks

def build_index(repo_name: str):
    """Walks the repository and inserts chunks into a ChromaDB collection in the background."""
    if not client or not repo_name or repo_name in _currently_indexing:
        return
        
    _currently_indexing.add(repo_name)
    
    def _run():
        try:
            col_name = f"codebase-{repo_name}".replace("/", "-").replace("_", "-").lower()
            collection = client.get_or_create_collection(name=col_name)
            
            if collection.count() > 0:
                return

            repo_path = os.path.join(os.path.dirname(__file__), "..", "backend", "repos", repo_name)
            if not os.path.exists(repo_path):
                repo_path = os.environ.get("REPOS_BASE_DIR", os.path.join("..", "backend", "repos", repo_name))
                if not os.path.exists(repo_path):
                    return

            docs, ids, metadatas = [], [], []
            for root, dirs, files in os.walk(repo_path):
                dirs[:] = [d for d in dirs if not d.startswith('.') and d != "node_modules"]
                for file in files:
                    ext = os.path.splitext(file)[1].lower()
                    if ext in SUPPORTED_EXTENSIONS:
                        filepath = os.path.join(root, file)
                        rel_path = os.path.relpath(filepath, repo_path)
                        try:
                            with open(filepath, "r", encoding="utf-8") as f:
                                chunks = _chunk_text(f.read())
                                for idx, chunk in enumerate(chunks):
                                    docs.append(chunk)
                                    ids.append(f"{rel_path}_{idx}")
                                    metadatas.append({"filepath": rel_path})
                        except: continue

            batch_size = 100
            for i in range(0, len(docs), batch_size):
                collection.add(
                    documents=docs[i:i+batch_size],
                    metadatas=metadatas[i:i+batch_size],
                    ids=ids[i:i+batch_size]
                )
        finally:
            _currently_indexing.remove(repo_name)

    thread = threading.Thread(target=_run)
    thread.daemon = True
    thread.start()

def search(repo_name: str, query: str, top_k: int = 3) -> str:
    """Queries ChromaDB and formats top chunks into a context string."""
    if not client or not repo_name:
        return ""

    col_name = f"codebase-{repo_name}".replace("/", "-").replace("_", "-").lower()
    try:
        collection = client.get_collection(name=col_name)
    except Exception:
        # Collection hasn't been built yet, trigger background index and return empty
        build_index(repo_name)
        return "\n\n(Note: Global repository indexing is currently in progress. Global context will appear in future responses.)\n"

    if collection.count() == 0:
        if repo_name in _currently_indexing:
             return "\n\n(Note: Global repository indexing is currently in progress. Global context will appear shortly.)\n"
        return ""

    try:
        results = collection.query(
            query_texts=[query],
            n_results=top_k
        )
        
        context_str = ""
        for i, text in enumerate(results['documents'][0]):
            meta = results['metadatas'][0][i]
            context_str += f"\n\n--- RAG File Snippet: {meta['filepath']} ---\n{text}\n"
            
        return context_str
    except Exception as e:
        print(f"RAG Query Failed: {e}")
        return ""
