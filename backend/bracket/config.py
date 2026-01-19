import logging
import os
import sys
from enum import auto
from typing import Annotated

import sentry_sdk
from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

from bracket.utils.types import EnumAutoStr


class Environment(EnumAutoStr):
    PRODUCTION = auto()
    DEVELOPMENT = auto()
    DEMO = auto()
    CI = auto()

    def get_log_level(self) -> int:
        return {
            Environment.CI: logging.WARNING,
            Environment.DEVELOPMENT: logging.DEBUG,
            Environment.PRODUCTION: logging.INFO,
            Environment.DEMO: logging.INFO,
        }[self]


class Config(BaseSettings):
    admin_email: str | None = None
    admin_password: str | None = None
    allow_insecure_http_sso: bool = False
    allow_user_registration: bool = True
    allow_demo_user_registration: bool = True
    captcha_secret: str | None = None
    base_url: str = "http://localhost:8400"
    cors_origin_regex: str = ""
    cors_origins: str = "*"
    jwt_secret: str
    auto_run_migrations: bool = True
    sentry_dsn: str | None = None
    serve_frontend: bool = False
    api_prefix: str = ""

    # Postgres fields
    postgres_user:str = "bracket_dev"
    postgres_password:str = "bracket_dev"
    postgres_db:str = "bracket_dev"
    postgres_host:str = "localhost"
    postgres_port: int = 5432

    pg_dsn_override: str | None = None

    @property
    def pg_dsn(self) -> str:
        if self.pg_dsn_override:
            return self.pg_dsn_override
        """Generate Postgres DSN from fields"""
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"

    def is_cors_enabled(self) -> bool:
        return self.cors_origins != "*"

    model_config = SettingsConfigDict(extra="ignore")

class CIConfig(Config):
    model_config = SettingsConfigDict(env_file="ci.env", extra="ignore")


class DevelopmentConfig(Config):
    admin_email: Annotated[str | None, Field("test@example.org")]
    admin_password: Annotated[str | None, Field("aeGhoe1ahng2Aezai0Dei6Aih6dieHoo")]
    allow_insecure_http_sso: Annotated[bool, Field(True)]
    jwt_secret: Annotated[
        str, Field("7495204c062787f257b12d03b88d80da1d338796a6449666eb634c9efbbf5fa7")
    ]

    model_config = SettingsConfigDict(env_file="dev.env", extra="ignore")

class ProductionConfig(Config):
    model_config = SettingsConfigDict(env_file="prod.env", extra="ignore")


class DemoConfig(Config):
    model_config = SettingsConfigDict(env_file="demo.env", extra="ignore")


def currently_testing() -> bool:
    return "pytest" in sys.modules


environment = Environment(
    os.getenv("ENVIRONMENT", "CI" if currently_testing() else "DEVELOPMENT").upper()
)
config: Config

match environment:
    case Environment.CI:
        config = CIConfig()  # type: ignore[call-arg]
    case Environment.DEVELOPMENT:
        config = DevelopmentConfig()  # type: ignore[call-arg]
    case Environment.PRODUCTION:
        config = ProductionConfig()  # type: ignore[call-arg]
    case Environment.DEMO:
        config = DemoConfig()  # type: ignore[call-arg]


def init_sentry() -> None:
    if config.sentry_dsn:
        sentry_sdk.init(
            dsn=config.sentry_dsn,
            environment=str(environment.value),
            include_local_variables=False,
        )
