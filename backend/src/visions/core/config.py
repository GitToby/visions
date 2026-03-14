from loguru import logger
from pydantic import BaseModel, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

try:
    # version is generated using setuptoold scm on sync. This might not exist.
    from ._version import __version__
except ImportError:
    __version__ = "-"


class RenderSettings(BaseModel):
    """
    https://render.com/docs/environment-variables
    """

    render: bool = False
    is_pull_request: bool = False
    render_service_id: str | None = None
    render_service_name: str | None = None
    render_service_type: str | None = None
    render_external_hostname: str | None = None
    render_external_url: str | None = None
    render_git_branch: str | None = None
    render_git_commit: str | None = None
    render_git_repo_slug: str | None = None
    render_instance_id: str | None = None

    def is_local(self) -> bool:
        return not self.render


class Settings(RenderSettings, BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    # Application
    app_name: str = "Visions API"
    debug: bool = False
    version: str = __version__
    api_base_url: str = "http://localhost:8000"
    cors_origins: list[str] = ["http://localhost:8088"]

    cors_origins_regex: str = r"^https://visions-(api|web)(-pr-[0-9]+)?\.onrender\.com[/]?.*$"
    """Regex to allow CORS origins from render previews on PRs - https://regex101.com/"""

    # Database (NeonDB PostgreSQL connection string)
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

    # Supabase
    supabase_project_id: str = "sutnrwodqzpfvuuboksu"
    supabase_secret_key: SecretStr

    # S3-compatible storage (Supabase Storage S3 endpoint)
    # Generate these from: Supabase Dashboard > Project Settings > Storage > S3 Access Keys
    s3_access_key_id: str = "205bf89a6c954f326a2b15e2bf09cd0b"
    s3_secret_access_key: SecretStr
    s3_region: str = "eu-west-1"
    s3_bucket__rooms: str = "visions-rooms"
    s3_bucket__styles: str = "visions-styles"

    @property
    def supabase_url(self):
        return f"https://{self.supabase_project_id}.supabase.co"

    @property
    def s3_endpoint_url(self) -> str:
        return f"https://{self.supabase_project_id}.storage.supabase.co/storage/v1/s3"

    # Frontend
    # def frontend_url(self) -> str:
    #     return "http://localhost:8088" if self.is_local else self.render_external_url

    # Gemini via pydantic-ai
    # https://aistudio.google.com/api-keys
    gemini_api_key: SecretStr
    # https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-5-flash-image
    gemini_model: str = "gemini-2.5-flash-image"

    generation_cost: float = 1.0
    generation_cost_pro: float = 0.75


SETTINGS = Settings()  # pyright: ignore[reportCallIssue]
logger.info(f"Loaded settings: {SETTINGS}")
