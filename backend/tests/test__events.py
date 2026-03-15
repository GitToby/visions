import asyncio
import uuid

import pytest

from visions.services.events import MemoryEventService


@pytest.fixture
def svc() -> MemoryEventService:
    return MemoryEventService()


@pytest.mark.asyncio
async def test_sub_receives_published_data(svc: MemoryEventService):
    # Arrange
    topic = uuid.uuid4()
    expected = "hello"

    async def _collect():
        results = []
        async for msg in svc.sub(topic):
            results.append(msg)
            break  # stop after first message
        return results

    # Act
    task = asyncio.create_task(_collect())
    await asyncio.sleep(0)  # allow subscriber to register
    await svc.pub(topic, expected)
    results = await task

    # Assert
    assert results == [expected]


@pytest.mark.asyncio
async def test_multiple_subscribers_each_receive_message(svc: MemoryEventService):
    # Arrange
    topic = uuid.uuid4()

    async def _one():
        async for msg in svc.sub(topic):
            return msg

    # Act
    t1 = asyncio.create_task(_one())
    t2 = asyncio.create_task(_one())
    await asyncio.sleep(0)  # let both tasks register
    await svc.pub(topic, "broadcast")
    r1, r2 = await asyncio.gather(t1, t2)

    # Assert
    assert r1 == "broadcast"
    assert r2 == "broadcast"


@pytest.mark.asyncio
async def test_topics_are_isolated(svc: MemoryEventService):
    # Arrange
    topic_a = uuid.uuid4()
    topic_b = uuid.uuid4()
    received: list[str] = []

    async def _listen_a():
        async for msg in svc.sub(topic_a):
            received.append(msg)
            break

    # Act
    task = asyncio.create_task(_listen_a())
    await asyncio.sleep(0)
    await svc.pub(topic_b, "wrong_topic")  # should not reach topic_a subscriber
    await svc.pub(topic_a, "right_topic")
    await task

    # Assert
    assert received == ["right_topic"]


@pytest.mark.asyncio
async def test_pub_with_no_subscribers_is_noop(svc: MemoryEventService):
    # Arrange
    topic = uuid.uuid4()

    # Act & Assert — should not raise
    await svc.pub(topic, "nobody_listening")


@pytest.mark.asyncio
async def test_subscriber_removed_after_generator_exits(svc: MemoryEventService):
    # Arrange
    topic = uuid.uuid4()

    async def _one_shot():
        async for _ in svc.sub(topic):
            break

    task = asyncio.create_task(_one_shot())
    await asyncio.sleep(0)  # sleep to allow event loop to process
    await svc.pub(topic, "trigger")
    await task

    # Act: publish again after subscriber exited
    await svc.pub(topic, "after_exit")
    await asyncio.sleep(0)  # sleep to allow event loop to process

    # Assert: topic queue set is empty (subscriber cleaned up)
    assert len(svc._topics[topic]) == 0


@pytest.mark.asyncio
async def test_multiple_messages_delivered_in_order(svc: MemoryEventService):
    # Arrange
    topic = uuid.uuid4()
    messages = ["first", "second", "third"]
    received: list[str] = []

    async def _collect():
        async for msg in svc.sub(topic):
            received.append(msg)
            if len(received) == len(messages):
                break

    # Act
    task = asyncio.create_task(_collect())
    await asyncio.sleep(0)  # sleep to allow event loop to process
    for msg in messages:
        await svc.pub(topic, msg)
    await task

    # Assert
    assert received == messages


@pytest.mark.asyncio
async def test_concurrent_pubs_all_delivered(svc: MemoryEventService):
    # Arrange
    topic = uuid.uuid4()
    n = 10
    received: list[int] = []

    async def _collect():
        async for msg in svc.sub(topic):
            received.append(msg)
            if len(received) == n:
                break

    # Act
    task = asyncio.create_task(_collect())
    await asyncio.gather(*[svc.pub(topic, i) for i in range(n)])
    await task

    # Assert
    assert len(received) == n
    assert sorted(received) == list(range(n))
