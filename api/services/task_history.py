# -*- coding: utf-8 -*-
"""郑老师 MediaCrawler 魔改版 - 持久化任务历史。"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class TaskHistoryStore:
    """Small JSON-backed task history store.

    Designed for local/single-user WebUI use. It records crawler task lifecycle
    so browser/API restarts do not erase completed or failed task information.
    """

    def __init__(self) -> None:
        self._root = Path(__file__).parent.parent.parent
        self._dir = self._root / "data" / "zheng_modded"
        self._path = self._dir / "task_history.json"
        self._lock = threading.RLock()
        self._max_records = 1000

    def _ensure(self) -> None:
        self._dir.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._write([])

    def _read(self) -> List[Dict[str, Any]]:
        self._ensure()
        try:
            raw = self._path.read_text(encoding="utf-8")
            data = json.loads(raw or "[]")
            return data if isinstance(data, list) else []
        except (OSError, json.JSONDecodeError):
            return []

    def _write(self, items: List[Dict[str, Any]]) -> None:
        self._dir.mkdir(parents=True, exist_ok=True)
        temp = self._path.with_suffix(".tmp")
        temp.write_text(
            json.dumps(items[-self._max_records :], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temp.replace(self._path)

    def create(self, config: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.now().isoformat(timespec="seconds")
        task = {
            "id": uuid.uuid4().hex[:12],
            "status": "running",
            "created_at": now,
            "started_at": now,
            "finished_at": None,
            "exit_code": None,
            "error": None,
            "retry_of": None,
            "config": config,
        }
        with self._lock:
            items = self._read()
            items.append(task)
            self._write(items)
        return task

    def update(self, task_id: str, **changes: Any) -> Optional[Dict[str, Any]]:
        with self._lock:
            items = self._read()
            found = None
            for item in items:
                if item.get("id") == task_id:
                    item.update(changes)
                    found = item
                    break
            if found:
                self._write(items)
            return found

    def finish(self, task_id: str, status: str, exit_code: Optional[int] = None, error: Optional[str] = None) -> None:
        self.update(
            task_id,
            status=status,
            exit_code=exit_code,
            error=error,
            finished_at=datetime.now().isoformat(timespec="seconds"),
        )

    def list(self, limit: int = 100, status: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock:
            items = self._read()
        if status:
            items = [x for x in items if x.get("status") == status]
        items.reverse()
        return items[: max(1, min(limit, 1000))]

    def get(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for item in self._read():
                if item.get("id") == task_id:
                    return item
        return None

    def remove(self, task_id: str) -> bool:
        with self._lock:
            items = self._read()
            new_items = [x for x in items if x.get("id") != task_id]
            if len(new_items) == len(items):
                return False
            self._write(new_items)
            return True

    def clear(self, status: Optional[str] = None) -> int:
        with self._lock:
            items = self._read()
            if status:
                new_items = [x for x in items if x.get("status") != status]
            else:
                new_items = []
            removed = len(items) - len(new_items)
            self._write(new_items)
            return removed


task_history_store = TaskHistoryStore()
