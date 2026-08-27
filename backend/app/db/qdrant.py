#Hybrid search setup logic
import logging
from qdrant_client import QdrantClient
from qdrant_client.models import VectorParams, Distance, SparseVectorParams, SparseIndexParams, Modifier
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize the cloud client
client = QdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY,
    timeout=10.0
)

def init_qdrant():
    """Creates the Qdrant collection with Hybrid Search config if it doesn't exist."""
    try:
        # Check if collection already exists
        collections_response = client.get_collections()
        exists = any(col.name == settings.COLLECTION_NAME for col in collections_response.collections)

        if not exists:
            logger.info(f"Creating collection '{settings.COLLECTION_NAME}' for hybrid search...")
            
            client.create_collection(
                collection_name=settings.COLLECTION_NAME,
                # Dense Vector Config (for Google text-embedding-004 which has 768 dimensions)
                vectors_config=VectorParams(
                    size=768, 
                    distance=Distance.COSINE
                ),
                # Sparse Vector Config (for BM25 exact keyword matching)
                sparse_vectors_config={
                    "text-sparse": SparseVectorParams(
                        index=SparseIndexParams(
                            on_disk=False,
                        ),
                        modifier=Modifier.IDF
                    )
                }
            )
            logger.info("Collection created successfully.")
        else:
            logger.info(f"Collection '{settings.COLLECTION_NAME}' already exists.")
            
    except Exception as e:
        logger.error(f"Failed to connect to Qdrant: {e}")