# -*- coding: utf-8 -*-
"""郑老师 MediaCrawler 魔改版 - 同行监控名单持久化。"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class WatchlistStore:
    def __init__(self) -> None:
        self._root = Path(__file__).parent.parent.parent
        self._dir = self._root / "data" / "zheng_modded"
        self._path = self._dir / "creator_watchlist.json"
        self._lock = threading.RLock()

    def _ensure(self) -> None:
        self._dir.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._write([])

    def _read(self) -> List[Dict[str, Any]]:
        self._ensure()
        try:
            data = json.loads(self._path.read_text(encoding="utf-8") or "[]")
            return data if isinstance(data, list) else []
        except (OSError, json.JSONDecodeError):
            return []

    def _write(self, items: List[Dict[str, Any]]) -> None:
        self._dir.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(".tmp")
        tmp.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self._path)

    def list(self) -> List[Dict[str, Any]]:
        with self._lock:
            items = self._read()
        return sorted(items, key=lambda x: x.get("created_at", ""), reverse=True)

    def add(
        self,
        platform: str,
        creator_id: str,
        name: str = "",
        note: str = "",
        enabled: bool = True,
    ) -> Dict[str, Any]:
        key = f"{platform}:{creator_id}".strip().lower()
        with self._lock:
            items = self._read()
            for item in items:
                if item.get("key") == key:
                    item.update({
                        "name": name or item.get("name", ""),
                        "note": note,
                        "enabled": enabled,
                        "updated_at": datetime.now().isoformat(timespec="seconds"),
                    })
                    self._write(items)
                    return item

            now = datetime.now().isoformat(timespec="seconds")
            item = {
                "id": uuid.uuid4().hex[:12],
                "key": key,
                "platform": platform,
                "creator_id": creator_id,
                "name": name,
                "note": note,
                "enabled": enabled,
                "created_at": now,
                "updated_at": now,
                "last_checked_at": None,
                "last_task_id": None,
                "last_status": None,
            }
            items.append(item)
            self._write(items)
            return item

    def update(self, item_id: str, **changes: Any) -> Optional[Dict[str, Any]]:
        with self._lock:
            items = self._read()
            for item in items:
                if item.get("id") == item_id:
                    item.update(changes)
                    item["updated_at"] = datetime.now().isoformat(timespec="seconds")
                    self._write(items)
                    return item
        return None

    def remove(self, item_id: str) -> bool:
        with self._lock:
            items = self._read()
            new_items = [x for x in items if x.get("id") != item_id]
            if len(new_items) == len(items):
                return False
            self._write(new_items)
            return True

    def get(self, item_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            for item in self._read():
                if item.get("id") == item_id:
                    return item
        return None


watchlist_store = WatchlistStore()
