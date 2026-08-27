import json
import uuid
import logging
import certifi
import requests
from confluent_kafka import Consumer, KafkaError
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from app.core.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 1. Initialize Qdrant Client
qdrant = QdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY,
    timeout=10.0
)

# 2. Initialize Kafka Consumer with macOS SSL bypass
conf = {
    'bootstrap.servers': settings.KAFKA_BROKER,
    'security.protocol': 'SASL_SSL',
    'sasl.mechanism': 'SCRAM-SHA-256',
    'sasl.username': settings.KAFKA_USERNAME,
    'sasl.password': settings.KAFKA_PASSWORD,
    'ssl.ca.location': certifi.where(),
    'enable.ssl.certificate.verification': False,
    'group.id': 'gridops-qdrant-worker',
    'auto.offset.reset': 'earliest'
}
consumer = Consumer(conf)
consumer.subscribe([settings.KAFKA_TOPIC])

def get_gemini_embedding(text: str) -> list:
    """Bypasses buggy SDKs and gets the embedding via direct REST API using the stable model."""
    # TRULY updated to the active model name: gemini-embedding-001
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={settings.GEMINI_API_KEY}"
    
    payload = {
        "model": "models/gemini-embedding-001",
        "content": {
            "parts": [{"text": text}]
        },
        "outputDimensionality": 768 # Force the API to return 768 dimensions to match Qdrant
    }
    
    response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
    
    if response.status_code != 200:
        logger.error(f"Gemini API Error: {response.text}")
        raise Exception("Failed to fetch embedding")
        
    # Extra failsafe: mathematically truncate to 768 in case the API ignores the parameter
    return response.json()['embedding']['values'][:768]

def process_event(msg_value: str):
    """Parses event, calculates stockout risk, embeds, and upserts to Qdrant."""
    data = json.loads(msg_value)
    
    # Calculate stockout risk
    sales = data.get("avg_daily_sales", 1)
    sales = sales if sales > 0 else 1 
    stock = data.get("current_stock", 0)
    
    predicted_hours = round((stock / sales) * 24, 1)
    
    # Create the natural language representation for the vector database
    text_content = (
        f"Store {data['store_name']} ({data['city']}) has {stock} units of {data['sku_name']} "
        f"({data['category']}) remaining. The reorder threshold is {data['reorder_threshold']}. "
        f"At the current sales rate, stockout is expected in {predicted_hours} hours."
    )
    
    # Generate Embedding using our custom REST function
    embedding = get_gemini_embedding(text_content)
    
    # Prepare metadata payload
    payload = {
        "store_id": data["store_id"],
        "store_name": data["store_name"],
        "city": data["city"],
        "sku_name": data["sku_name"],
        "category": data["category"],
        "current_stock": stock,
        "predicted_hours": predicted_hours,
        "text_content": text_content
    }
    
    # Upsert into Qdrant
    qdrant.upsert(
        collection_name=settings.COLLECTION_NAME,
        points=[PointStruct(id=str(uuid.uuid4()), vector=embedding, payload=payload)]
    )
    logger.info(f"Embedded & Saved -> {data['store_name']} | Risk: {predicted_hours}h")

def run_worker():
    logger.info("Listening for inventory events on Kafka...")
    try:
        while True:
            msg = consumer.poll(1.0)
            
            if msg is None:
                continue
            if msg.error():
                if msg.error().code() == KafkaError._PARTITION_EOF:
                    continue
                else:
                    logger.error(f"Consumer error: {msg.error()}")
                    break
                    
            process_event(msg.value().decode('utf-8'))
            
    except KeyboardInterrupt:
        logger.info("Worker manually stopped.")
    finally:
        consumer.close()

if __name__ == "__main__":
    run_worker()