from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data/app.db"
    jwt_secret: str = "change-me-to-a-random-secret"
    jwt_expiry_days: int = 7
    jwt_algorithm: str = "HS256"

    google_client_id: str = ""
    google_client_secret: str = ""
    oauth_callback_url: str = "http://localhost"

    cors_origins: str = "http://localhost,http://localhost:5173"

    nominatim_user_agent: str = "ActiviteitenTracker/2.0"
    nominatim_rate_limit: float = 1.0  # seconds between requests

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
