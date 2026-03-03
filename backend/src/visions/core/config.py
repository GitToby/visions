from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Application
    app_name: str = "Visions API"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173"]

    # Database (Supabase PostgreSQL connection string)
    database_host: str = "ep-noisy-lake-a4y55m57-pooler.us-east-1.aws.neon.tech"
    database_port: int = 5432
    database_name: str = "visions"
    database_user: str = "neondb_owner"
    database_password: SecretStr

    @property
    def database_url(self):
        return SecretStr(
            f"postgresql+psycopg://{self.database_user}:{self.database_password.get_secret_value()}@{self.database_host}:{self.database_port}/{self.database_name}?sslmode=require"
        )

    # Frontend
    frontend_url: str = "http://localhost:5173"

    # Supabase
    supabase_project_id: str = "sutnrwodqzpfvuuboksu"
    supabase_secret_key: SecretStr
    supabase_storage_bucket: str = "visions"

    @property
    def supabase_url(self):
        return f"https://{self.supabase_project_id}.supabase.co"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash-exp"


settings = Settings()
