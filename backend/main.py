from fastapi import FastAPI
from contextlib import asynccontextmanager
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.simulator import generate_batch_events

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize background scheduler
scheduler = BackgroundScheduler()

def scheduled_inventory_job():
    """Background job that runs every 30 seconds."""
    logger.info("Running scheduled inventory generation...")
    generate_batch_events(batch_size=3)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting up GridOps backend...")
    
    # Start the simulator background job
    scheduler.add_job(scheduled_inventory_job, 'interval', seconds=30)
    scheduler.start()
    
    yield
    
    # Shutdown actions
    logger.info("Shutting down GridOps backend...")
    scheduler.shutdown()

app = FastAPI(title="GridOps API", lifespan=lifespan)

@app.get("/")
async def health_check():
    return {"status": "online", "message": "GridOps backend is running"}

@app.post("/simulate")
async def trigger_simulation(batch_size: int = 10):
    """Manually trigger a batch of inventory events."""
    events = generate_batch_events(batch_size)
    return {
        "status": "success",
        "events_generated": len(events),
        "data": events
    }