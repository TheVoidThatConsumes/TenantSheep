import os
import time
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://tenantsheep:tenantsheep@postgres:5432/tenantsheep_create",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def wait_for_db(retries: int = 30, delay: float = 1.0) -> None:
    """Block until Postgres accepts connections, or give up.

    `docker-compose`'s `depends_on` only waits for the postgres *container*
    to start, not for the database inside it to be ready to accept
    connections -- on a cold `docker compose up` those can be several
    seconds apart. Without this, create_all() below can run against a
    connection that's refused, raise an unhandled OperationalError, and
    crash the whole process before uvicorn ever binds a port. Since
    compose's default restart policy is "no", the container then just
    stays dead until someone notices and restarts it by hand.
    """
    for attempt in range(1, retries + 1):
        try:
            with engine.connect():
                return
        except OperationalError:
            if attempt == retries:
                raise
            time.sleep(delay)
