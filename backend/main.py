import time
import uuid
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel
from apscheduler.schedulers.background import BackgroundScheduler
from upstash_vector import Index
from supabase import create_client, Client

from app.core.config import settings
from app.db.qdrant import init_qdrant
from app.services.simulator import generate_batch_events
from app.services.agent import inventory_agent, system_prompt, get_query_embedding

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize background scheduler, Cache, and Supabase
scheduler = BackgroundScheduler()
cache_index = Index(url=settings.UPSTASH_VECTOR_REST_URL, token=settings.UPSTASH_VECTOR_REST_TOKEN)
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def scheduled_inventory_job():
    """Background job that runs every 30 seconds."""
    logger.info("Running scheduled inventory generation...")
    generate_batch_events(batch_size=3)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up GridOps backend...")
    init_qdrant()
    scheduler.add_job(scheduled_inventory_job, 'interval', seconds=30)
    scheduler.start()
    yield
    logger.info("Shutting down GridOps backend...")
    scheduler.shutdown()

app = FastAPI(title="GridOps API", lifespan=lifespan)

# --- CHAT MODEL & ENDPOINT ---

class ChatRequest(BaseModel):
    message: str

def log_observability(query: str, response: str, cache_hit: bool, latency: int):
    """Silently logs query metrics to Supabase."""
    try:
        supabase.table("query_logs").insert({
            "query": query,
            "response": response,
            "cache_hit": cache_hit,
            "latency_ms": latency
        }).execute()
        logger.info("📊 Observability: Metric logged to Supabase.")
    except Exception as e:
        logger.error(f"Observability Error: {e}")

@app.post("/chat")
def chat_with_agent(request: ChatRequest):
    """Passes user messages into the Semantic Cache, falling back to LangGraph."""
    start_time = time.time()
    logger.info(f"User asked: {request.message}")
    
    # 1. Embed the incoming question
    query_vector = get_query_embedding(request.message)
    
    # 2. Check Semantic Cache
    cache_results = cache_index.query(
        vector=query_vector,
        top_k=1,
        include_metadata=True
    )
    
    # 3. Cache Hit (Cosine Similarity > 0.92)
    if cache_results and cache_results[0].score > 0.92:
        latency = round((time.time() - start_time) * 1000)
        logger.info(f"⚡ CACHE HIT! Similarity: {cache_results[0].score:.3f}. Latency: {latency}ms")
        
        final_answer = cache_results[0].metadata["response"]
        
        # Log to Supabase
        log_observability(request.message, final_answer, True, latency)
        
        return {
            "response": final_answer,
            "cached": True,
            "latency_ms": latency
        }

    # 4. Cache Miss -> Trigger LangGraph Agent
    logger.info("🧠 CACHE MISS. Agent is reasoning and querying Qdrant... (please wait)")
    inputs = {
        "messages": [
            ("system", system_prompt),
            ("user", request.message)
        ]
    }
    result = inventory_agent.invoke(inputs)
    content = result["messages"][-1].content
    
    if isinstance(content, list):
        final_answer = content[0].get("text", str(content))
    else:
        final_answer = content

    # 5. Store the new answer in the Semantic Cache
    cache_index.upsert(
        vectors=[
            (str(uuid.uuid4()), query_vector, {"response": final_answer})
        ]
    )

    latency = round((time.time() - start_time) * 1000)
    logger.info(f"✅ Agent generated response. Saved to cache. Latency: {latency}ms")
    
    # Log to Supabase
    log_observability(request.message, final_answer, False, latency)
    
    return {
        "response": final_answer,
        "cached": False,
        "latency_ms": latency
    }

# -----------------------------

@app.get("/")
def read_root():
    return {"status": "GridOps API is running"}