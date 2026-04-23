from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://arturboev@localhost:5432/ai_task_manager"
    TEST_DATABASE_URL: str = "postgresql://arturboev@localhost:5432/ai_task_manager_test"
    JWT_ACCESS_SECRET: str = "dev-access"
    JWT_REFRESH_SECRET: str = "dev-refresh"
    JWT_ACCESS_TTL_MIN: int = 7 * 24 * 60
    JWT_REFRESH_TTL_DAYS: int = 180
    PORT: int = 5000
    APP_ENV: str = "development"
    MISTRAL_API_KEY: str = ""
    MISTRAL_MODEL: str = "mistral-small-latest"
    PUTER_API_KEY: str = ""
    PUTER_MODEL: str = "gpt-4o-mini"
    AI_DAILY_LIMIT: int = 8
    AI_DAILY_LIMIT_PREMIUM: int = 0  # 0 = unlimited
    PREMIUM_CODE: str = "PREMIUM2025"
    ADMIN_PHONE: str = "+10000000000"
    ADMIN_PASSWORD: str = "admin123"
    SMS_PROVIDER: str = "console"

    @property
    def database_url(self) -> str:
        if os.getenv("PYTEST_RUNNING") == "1" or self.APP_ENV == "test":
            return self.TEST_DATABASE_URL
        return self.DATABASE_URL


settings = Settings()
