from collections import deque
from typing import Dict, List, Optional
from models import TransferJob


class QueueManager:
    def __init__(self):
        self._queues: Dict[str, deque] = {}

    def add_jobs(self, console_id: str, jobs: List[TransferJob]) -> None:
        if console_id not in self._queues:
            self._queues[console_id] = deque()
        for job in jobs:
            self._queues[console_id].append(job)

    def next_job(self, console_id: str) -> Optional[TransferJob]:
        q = self._queues.get(console_id)
        if q:
            return q.popleft()
        return None

    def clear(self, console_id: str) -> None:
        self._queues[console_id] = deque()

    def pending_count(self, console_id: str) -> int:
        return len(self._queues.get(console_id, []))

    def all_pending(self, console_id: str) -> List[TransferJob]:
        return list(self._queues.get(console_id, []))
