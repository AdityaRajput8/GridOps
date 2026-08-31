import time
import json
import requests
import logging
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from qdrant_client import QdrantClient
from app.core.config import settings

logger = logging.getLogger(__name__)

# 1. Initialize Qdrant Client
qdrant = QdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY,
    timeout=10.0
)

def get_query_embedding(text: str) -> list:
    """Uses our bulletproof REST API to embed the user's chat question with retry logic."""
    logger.info(f"Generating embedding for query: {text}")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={settings.GEMINI_API_KEY}"
    
    if isinstance(text, dict):
        text = text.get("query", str(text))
        
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {"parts": [{"text": str(text)}]}, 
        "outputDimensionality": 768
    }
    
    for attempt in range(5):
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        if response.status_code == 200:
            logger.info("Successfully generated embedding.")
            return response.json()['embedding']['values'][:768]
        elif response.status_code == 503:
            logger.warning(f"Embedding API overloaded (503). Retrying in 2 seconds...")
            time.sleep(2)
        else:
            error_msg = f"Gemini API Error {response.status_code}: {response.text}"
            logger.error(error_msg)
            raise Exception(error_msg)
            
    raise Exception("Embedding API failed after 5 retries due to server overload.")

# 2. Define the Tool for the AI to use
@tool
def search_inventory(query: str) -> str:
    """
    Searches the vector database for real-time inventory snapshots. 
    Use this tool whenever a user asks about stock levels, store inventory, or stockout risks.
    """
    logger.info(f"--- AGENT TRIGGERED search_inventory TOOL WITH QUERY: {query} ---")
    try:
        query_vector = get_query_embedding(query)
        
        logger.info("Searching Qdrant Database...")
        # FIX: Updated to the modern Qdrant query API
        search_response = qdrant.query_points(
            collection_name=settings.COLLECTION_NAME,
            query=query_vector,
            limit=5 
        )
        
        if not search_response.points:
            logger.info("Qdrant returned no results.")
            return "No relevant inventory data found."
            
        formatted_results = []
        for hit in search_response.points:
            payload = hit.payload
            formatted_results.append(
                f"- Store: {payload.get('store_name')} | Item: {payload.get('sku_name')} | "
                f"Current Stock: {payload.get('current_stock')} | Stockout Risk: {payload.get('predicted_hours')} hours"
            )
        
        final_context = "\n".join(formatted_results)
        logger.info(f"Successfully retrieved {len(search_response.points)} records from Qdrant.")
        return final_context
        
    except Exception as e:
        logger.error(f"!!! TOOL CRASHED: {str(e)} !!!")
        return f"Error searching database: {str(e)}"

# 3. Initialize the LLM - NATIVE GOOGLE SDK
llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash", 
    api_key=settings.GEMINI_API_KEY,
    temperature=0.2,
    max_retries=3  
)

# 4. Create the Agentic Workflow
system_prompt = """You are the GridOps AI Copilot, an elite Supply Chain Operations Manager. 
Your role is to analyze real-time Qdrant inventory data and communicate actionable risks directly to the human command team.

RULES FOR YOUR RESPONSES:
1. Speak naturally and professionally like a human ops expert. Do NOT act like a robotic AI.
2. NEVER use robotic filler phrases like "Based on the provided data..." or "Here is the information..." Jump straight into the intelligence.
3. If data for a specific store is missing, smoothly pivot to relevant nearby stores or related SKUs without apologizing profusely.
4. Use formatting (bolding, short bullet points) to highlight critical SKUs, stockout times, and action items so they are easy to read on a dashboard.
5. Keep your analysis crisp, urgent, and focused strictly on supply chain logistics and replenishment."""

inventory_agent = create_react_agent(
    model=llm,
    tools=[search_inventory]
)