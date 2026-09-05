"""
db.py — SQLAlchemy database engine for the Prescription Engine.

Shares the same sentinel_health MySQL database as Module 1 and Module 2.
Uses connection pooling for thread/async safety.
"""

import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv(override=True)

DB_HOST     = os.getenv("DB_HOST", "localhost")
DB_PORT     = os.getenv("DB_PORT", "3306")
DB_NAME     = os.getenv("DB_NAME", "sentinel_health")
DB_USER     = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# SQLAlchemy engine — connection pool shared across all service calls
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,   # recycle connections every 30 minutes
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_engine():
    """Return the shared SQLAlchemy engine."""
    return engine


@contextmanager
def get_db_session() -> Session:
    """
    Context manager yielding a SQLAlchemy session.
    Automatically commits on success, rolls back on any exception.
    
    Usage:
        with get_db_session() as session:
            session.execute(...)
    """
    session: Session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def check_mysql_connection() -> bool:
    """Ping the database. Returns True if reachable, False otherwise."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
