from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "GridOps API"
    QDRANT_URL: str
    QDRANT_API_KEY: str
    COLLECTION_NAME: str = "inventory_snapshots"
    GEMINI_API_KEY: str
    # Kafka Credentials
    KAFKA_BROKER: str
    KAFKA_USERNAME: str
    KAFKA_PASSWORD: str
    KAFKA_TOPIC: str = "inventory-events"

    # This tells Pydantic to look for the .env file
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

# Create a global instance of the settings
settings = Settings()