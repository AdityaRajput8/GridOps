from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class InventoryEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    store_id: str
    store_name: str
    city: str
    sku_id: str
    sku_name: str
    category: str
    current_stock: int
    reorder_threshold: int
    avg_daily_sales: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)