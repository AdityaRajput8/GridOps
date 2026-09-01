import uuid
import random
from datetime import datetime, timedelta
from supabase import create_client
from app.core.config import settings

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

DEMO_QUERIES = [
    ("What is the stock status for milk in Bangalore?", False, 1240),
    ("Which store in Mumbai has highest stockout risk?", False, 1890),
    ("Are we running out of eggs in Blinkit Bandra?", True, 45),
    ("Show me inventory for Zepto Indiranagar", False, 1310),
    ("What is the stock status of eggs across Mumbai?", False, 1420),
    ("Stock level for Coca Cola in Delhi hubs", True, 52),
    ("Is Britannia bread available in Koramangala?", True, 38),
    ("Recommend replenishment order for Instamart Colaba", False, 1980),
    ("Check stockout window for Lay's chips in HSR Layout", False, 1150),
    ("Which dark stores are currently in critical status?", False, 940),
    ("Status of dairy products in South Bangalore", True, 41),
    ("Immediate action items for Zepto Andheri West", False, 1620),
    ("Inventory count for Amul Taaza Milk in Blinkit Dwarka", False, 1080),
    ("Has the evening milk batch been dispatched?", True, 34),
    ("Check stock levels across all Bangalore hubs", False, 1750),
]

def seed_supabase_logs():
    print("Seeding Supabase query_logs table...")
    now = datetime.utcnow()
    
    for i, (query, cache_hit, latency) in enumerate(DEMO_QUERIES):
        created_at = (now - timedelta(minutes=i * 12)).isoformat()
        supabase.table("query_logs").insert({
            "id": str(uuid.uuid4()),
            "query": query,
            "response": f"Telemetry verified. Inventory state processed with latency {latency}ms.",
            "cache_hit": cache_hit,
            "latency_ms": latency,
            "created_at": created_at
        }).execute()

    print(f"Successfully seeded {len(DEMO_QUERIES)} logs into Supabase.")

if __name__ == "__main__":
    seed_supabase_logs()