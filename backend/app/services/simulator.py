import random
import logging
from typing import List
from app.schemas.inventory import InventoryEvent
from app.services.kafka_producer import publish_inventory_event, producer

logger = logging.getLogger(__name__)

STORES = [
    {"store_id": "str_mum_01", "store_name": "Zepto Andheri West", "city": "Mumbai"},
    {"store_id": "str_mum_02", "store_name": "Blinkit Bandra", "city": "Mumbai"},
    {"store_id": "str_mum_03", "store_name": "Zepto Powai", "city": "Mumbai"},
    {"store_id": "str_mum_04", "store_name": "Instamart Colaba", "city": "Mumbai"},
    {"store_id": "str_blr_01", "store_name": "Zepto Koramangala", "city": "Bengaluru"},
    {"store_id": "str_blr_02", "store_name": "Blinkit HSR Layout", "city": "Bengaluru"},
    {"store_id": "str_blr_03", "store_name": "Instamart Indiranagar", "city": "Bengaluru"},
    {"store_id": "str_del_01", "store_name": "Zepto Vasant Kunj", "city": "Delhi"},
    {"store_id": "str_del_02", "store_name": "Blinkit Dwarka", "city": "Delhi"},
    {"store_id": "str_del_03", "store_name": "Instamart Saket", "city": "Delhi"},
]

# A sample of SKUs (expanded internally to 50 in real production)
SKUS = [
    {"sku_id": "sku_milk_500", "sku_name": "Amul Taaza Milk 500ml", "category": "Dairy", "threshold": 20, "avg_sales": 45},
    {"sku_id": "sku_bread_01", "sku_name": "Britannia White Bread", "category": "Bakery", "threshold": 15, "avg_sales": 30},
    {"sku_id": "sku_egg_06", "sku_name": "Farm Fresh Eggs 6pcs", "category": "Dairy", "threshold": 10, "avg_sales": 25},
    {"sku_id": "sku_chips_01", "sku_name": "Lay's Classic Salted", "category": "Snacks", "threshold": 30, "avg_sales": 50},
    {"sku_id": "sku_cola_500", "sku_name": "Coca Cola 500ml", "category": "Beverages", "threshold": 25, "avg_sales": 40},
]

def generate_random_event() -> InventoryEvent:
    """Generates a single random inventory event."""
    store = random.choice(STORES)
    sku = random.choice(SKUS)
    
    # Simulate realistic current stock (sometimes critical, sometimes healthy)
    current_stock = random.randint(0, sku["threshold"] * 3)
    
    return InventoryEvent(
        store_id=store["store_id"],
        store_name=store["store_name"],
        city=store["city"],
        sku_id=sku["sku_id"],
        sku_name=sku["sku_name"],
        category=sku["category"],
        current_stock=current_stock,
        reorder_threshold=sku["threshold"],
        avg_daily_sales=sku["avg_sales"]
    )
def generate_batch_events(batch_size: int = 5) -> List[InventoryEvent]:
    """Generates a batch of events and pushes them to Kafka."""
    events = [generate_random_event() for _ in range(batch_size)]
    
    for event in events:
        logger.info(f"Simulating & Pushing Event: {event.store_name} | {event.sku_name} | Stock: {event.current_stock}")
        
        # Convert Pydantic model to a standard dictionary (mode='json' handles datetime conversion automatically)
        event_dict = event.model_dump(mode='json')
        
        # Push to Aiven Kafka
        publish_inventory_event(event_dict)
    
    # Ensure all messages in this batch are sent over the network
    producer.flush()
    
    return events