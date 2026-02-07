# Backend Style Guide
## Python/FastAPI Development Standards

---

## Configuration Pattern

```python
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

# Pattern 1: BaseSettings (Environment Variables)
class Settings(BaseSettings):
    # API Keys
    elevenlabs_api_key: str
    anthropic_api_key: str

    class Config:
        env_file = ".env"

# Pattern 2: Config Classes (Domain Specific)
class RedisConfig:
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        max_connections: int = 50
    ):
        self.host = host
        self.port = port
        self.max_connections = max_connections

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

---

## WebSocket Handler Pattern

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict
import uuid

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.sessions: Dict[str, SessionContext] = {}

    async def connect(self, websocket: WebSocket, client_ip: str) -> str:
        await websocket.accept()
        session_id = str(uuid.uuid4())

        self.active_connections[session_id] = websocket
        self.sessions[session_id] = SessionContext(session_id, client_ip)

        await self.sessions[session_id].initialize()
        return session_id

    async def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
        if session_id in self.sessions:
            del self.sessions[session_id]

    async def send_json(self, session_id: str, data: dict):
        if websocket := self.active_connections.get(session_id):
            await websocket.send_json(data)

manager = ConnectionManager()

@app.websocket("/ws/voice")
async def websocket_endpoint(websocket: WebSocket):
    session_id = await manager.connect(websocket, websocket.client.host)

    try:
        await manager.send_json(session_id, {
            "type": "connection_established",
            "session_id": session_id
        })

        while True:
            data = await websocket.receive_json()
            await handle_message(session_id, data)

    except WebSocketDisconnect:
        await manager.disconnect(session_id)
```

---

## Async LLM Pattern

```python
from anthropic import AsyncAnthropic
import asyncio
from typing import List, Tuple

from app.monitoring.service_metrics import monitor_service_method

class LLMProcessor:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    @monitor_service_method("llm", "process")
    async def process_with_tools(
        self,
        message: str,
        context: dict,
        session_id: str
    ) -> Tuple[str, List[dict]]:
        # ... implementation
```

---

## Error Handling Pattern

```python
from typing import Any
import logging
import asyncio

logger = logging.getLogger(__name__)

class APIError(Exception):
    def __init__(self, message: str, code: str = "API_ERROR", details: Any = None):
        self.message = message
        self.code = code
        self.details = details
        super().__init__(message)

async def with_retry(
    func,
    max_retries: int = 3,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
):
    for attempt in range(max_retries):
        try:
            return await func()
        except exceptions as e:
            if attempt == max_retries - 1:
                raise

            wait_time = backoff_factor ** attempt
            logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait_time}s")
            await asyncio.sleep(wait_time)

async def safe_api_call(func, fallback=None):
    try:
        return await func()
    except Exception as e:
        logger.error(f"API call failed: {e}")
        if fallback:
            return await fallback()
        raise
```

---

## Type Hints

All functions must have type hints:

```python
# ✅ Good
async def process_audio(
    chunk: bytes,
    session_id: str,
    vad_threshold: float = 0.5
) -> TranscriptionResult:
    ...

# ❌ Bad: No types
async def process_audio(chunk, session_id, vad_threshold=0.5):
    ...
```

---

## Dependency Injection

Use DI pattern - no global singletons:

```python
# ✅ Good: Injected dependencies for business logic
class VoiceService:
    def __init__(self, stt_client: STTClient, tts_client: TTSClient):
        self.stt_client = stt_client
        self.tts_client = tts_client

# ✅ Good: Factory/Accessor for Infrastructure
# Infrastructure components (Circuit Breakers, Monitors) can be retrieved via factory
class ElevenLabsTTSService:
    def __init__(self, api_key: Optional[str] = None):
        self.circuit_breaker = get_circuit_breaker("elevenlabs_tts")
        self.monitor = get_memory_monitor()

# ❌ Bad: Global singleton for business logic
stt_client = STTClient()  # Module-level singleton

class VoiceService:
    def __init__(self):
        self.stt_client = stt_client  # Uses global
```

---

## Logging

Use structured logging:

```python
import logging

logger = logging.getLogger(__name__)

# Appropriate levels
logger.debug("Processing chunk", extra={"size": len(chunk)})
logger.info("Session started", extra={"session_id": session_id})
logger.warning("Rate limit approaching", extra={"usage": usage})
logger.error("API call failed", extra={"error": str(e)})
```

---

## File Structure

```
[module]/
├── __init__.py           # Exports
├── [implementation].py   # Source files
├── README_[module].md    # Module overview
├── docs_[name]/          # Documentation
│   └── ARC_[name].md     # Architecture doc
└── tests_[name]/         # Tests
    └── test_[file].py
```

---

## Testing Pattern (pytest)

```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_websocket():
    ws = AsyncMock()
    ws.accept = AsyncMock()
    ws.send_json = AsyncMock()
    ws.receive_json = AsyncMock()
    return ws

@pytest.mark.asyncio
async def test_connection_manager_connect(mock_websocket):
    manager = ConnectionManager()
    session_id = await manager.connect(mock_websocket, "127.0.0.1")
    
    assert session_id in manager.active_connections
    mock_websocket.accept.assert_called_once()

@pytest.mark.asyncio
async def test_rate_limit_enforcement():
    limiter = RateLimiter(requests_per_minute=3)
    client_ip = "192.168.1.1"
    
    for _ in range(3):
        assert await limiter.check(client_ip) is True
    
    assert await limiter.check(client_ip) is False
```

---

## Pre-Check Commands

```bash
# Dead code detection
python -m vulture [file] --min-confidence 90

# Unused imports
python -m autoflake --check [file]

# Type issues
python -m mypy [file] --ignore-missing-imports

# Magic numbers
grep -n "[^a-zA-Z0-9_][3-9][0-9]*[^a-zA-Z0-9_]" [file]
```

---

## Code Review Checklist

- [ ] Type hints on all functions
- [ ] Error handling with specific exceptions
- [ ] Async/await used properly
- [ ] No hardcoded values (use config/constants)
- [ ] Logging instead of print statements
- [ ] DI pattern (no global singletons)
- [ ] Env vars documented in .env.example
- [ ] No commented-out code
- [ ] No magic numbers (extract to constants)
- [ ] Tests colocated with source
