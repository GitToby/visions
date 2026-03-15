import asyncio
import uuid
from abc import abstractmethod
from collections import defaultdict
from collections.abc import AsyncGenerator

from psycopg.connection_async import AsyncConnection

from visions.core.config import SETTINGS
from visions.models import GenerationJob


class EventService[K, T]:
    def __init__(self):
        self._lock = asyncio.Lock()

    @abstractmethod
    async def pub(self, topic: K, data: T): ...

    @abstractmethod
    def sub(self, topic: K) -> AsyncGenerator[T]: ...


class MemoryEventService[K, T](EventService[K, T]):
    def __init__(self):
        self._topics: dict[K, set[asyncio.Queue[T]]] = defaultdict(set)
        super().__init__()

    async def pub(self, topic: K, data: T):
        qs = list(self._topics[topic])
        await asyncio.gather(*[q.put(data) for q in qs])

    async def sub(self, topic: K) -> AsyncGenerator[T]:
        q = asyncio.Queue[T]()
        self._topics[topic].add(q)
        try:
            while True:
                data = await q.get()
                yield data
        finally:
            async with self._lock:
                self._topics[topic].remove(q)


ROOM_GENERATIONS = MemoryEventService[uuid.UUID, GenerationJob]()


# eventaually move over over to this if it works.
class PostgresEventService(EventService[str, str]):
    def __init__(self):
        super().__init__()
        self.dsn = SETTINGS.database_url.get_secret_value().replace(
            "postgresql+psycopg", "postgresql"
        )
        self._conn = AsyncConnection.connect(self.dsn)
        self._connections = {}

    async def pub(self, topic: str, data: str):
        conn = await self._conn
        async with conn.cursor() as cur:
            await cur.execute("NOTIFY %s %s", (topic, data))

    async def sub(self, topic: str):
        conn = await self._conn
        async with conn.cursor() as cur:
            await cur.execute("LISTEN %s", (topic,))
            async for e in conn.notifies():
                yield e.payload

    async def close(self):
        conn = await self._conn
        await conn.close()
