import json
import logging
import certifi
from confluent_kafka import Producer
from app.core.config import settings


logger = logging.getLogger(__name__)

# Configure the producer with SASL/SSL authentication (Required by Aiven)
conf = {
    'bootstrap.servers': settings.KAFKA_BROKER,
    'security.protocol': 'SASL_SSL',
    'sasl.mechanism': 'SCRAM-SHA-256',
    'sasl.username': settings.KAFKA_USERNAME,
    'sasl.password': settings.KAFKA_PASSWORD,
    'ssl.ca.location': certifi.where(),
    'enable.ssl.certificate.verification': False, # <-- The silver bullet for macOS Anaconda
    'client.id': 'gridops-fastapi-producer'
}

# Initialize the producer
try:
    producer = Producer(conf)
    logger.info("Successfully initialized Kafka Producer.")
except Exception as e:
    logger.error(f"Failed to initialize Kafka Producer: {e}")

def delivery_report(err, msg):
    """Callback function triggered when a message is successfully delivered or fails."""
    if err is not None:
        logger.error(f"Message delivery failed: {err}")
    # We comment out the success log to prevent terminal spam when generating thousands of events
    # else:
    #     logger.debug(f"Message delivered to {msg.topic()} [{msg.partition()}]")

def publish_inventory_event(event_dict: dict):
    """Publishes a JSON inventory event to the cloud Kafka topic."""
    try:
        # Produce the message
        producer.produce(
            topic=settings.KAFKA_TOPIC,
            key=event_dict["store_id"], # Grouping by store_id ensures events process in order
            value=json.dumps(event_dict),
            callback=delivery_report
        )
        # Poll triggers the delivery report callbacks
        producer.poll(0)
    except Exception as e:
        logger.error(f"Exception while producing to Kafka: {e}")