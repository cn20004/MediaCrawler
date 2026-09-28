# -*- coding: utf-8 -*-
"""郑老师 MediaCrawler 魔改版 - 同行监控 API。"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..schemas import (
    CrawlerStartRequest,
    CrawlerTypeEnum,
    LoginTypeEnum,
    PlatformEnum,
    SaveDataOptionEnum,
)
from ..services import crawler_manager
from ..services.watchlist import watchlist_store

router = APIRouter(prefix="/watchlist", tags=["zheng-watchlist"])


class WatchlistCreateRequest(BaseModel):
    platform: PlatformEnum
    creator_id: str = Field(min_length=1, max_length=500)
    name: str = Field(default="", max_length=200)
    note: str = Field(default="", max_length=500)
    enabled: bool = True


class WatchlistUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    note: Optional[str] = Field(default=None, max_length=500)
    enabled: Optional[bool] = None


@router.get("")
async def list_watchlist():
    return {"items": watchlist_store.list()}


@router.post("")
async def add_watchlist(request: WatchlistCreateRequest):
    item = watchlist_store.add(
        platform=request.platform.value,
        creator_id=request.creator_id.strip(),
        name=request.name.strip(),
        note=request.note.strip(),
        enabled=request.enabled,
    )
    return item


@router.patch("/{item_id}")
async def update_watchlist(item_id: str, request: WatchlistUpdateRequest):
    changes = {k: v for k, v in request.model_dump().items() if v is not None}
    item = watchlist_store.update(item_id, **changes)
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return item


@router.delete("/{item_id}")
async def remove_watchlist(item_id: str):
    if not watchlist_store.remove(item_id):
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"status": "ok"}


@router.post("/{item_id}/check")
async def check_creator(item_id: str):
    if crawler_manager.process and crawler_manager.process.poll() is None:
        raise HTTPException(status_code=400, detail="Crawler is already running")

    item = watchlist_store.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    if not item.get("enabled", True):
        raise HTTPException(status_code=400, detail="Watchlist item is disabled")

    request = CrawlerStartRequest(
        platform=PlatformEnum(item["platform"]),
        login_type=LoginTypeEnum.QRCODE,
        crawler_type=CrawlerTypeEnum.CREATOR,
        creator_ids=item["creator_id"],
        start_page=1,
        enable_comments=True,
        enable_sub_comments=False,
        save_option=SaveDataOptionEnum.JSONL,
        headless=False,
    )

    success = await crawler_manager.start(request)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to start creator check")

    watchlist_store.update(
        item_id,
        last_checked_at=datetime.now().isoformat(timespec="seconds"),
        last_task_id=crawler_manager.current_task_id,
        last_status="running",
    )

    return {
        "status": "ok",
        "task_id": crawler_manager.current_task_id,
        "creator": item,
    }
