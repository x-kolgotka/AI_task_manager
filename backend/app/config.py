from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://arturboev@localhost:5432/ai_task_manager"
    TEST_DATABASE_URL: str = "postgresql://arturboev@localhost:5432/ai_task_manager_test"
    JWT_ACCESS_SECRET: str = "dev-access"
    JWT_REFRESH_SECRET: str = "dev-refresh"
    JWT_ACCESS_TTL_MIN: int = 15
    JWT_REFRESH_TTL_DAYS: int = 30
    PORT: int = 5000
    APP_ENV: str = "development"
    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "mistral-small-latest"
    AI_DAILY_LIMIT: int = 10
    SMS_PROVIDER: str = "console"

    @property
    def database_url(self) -> str:
        if os.getenv("PYTEST_RUNNING") == "1" or self.APP_ENV == "test":
            return self.TEST_DATABASE_URL
        return self.DATABASE_URL


settings = Settings()
