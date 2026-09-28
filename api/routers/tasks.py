# -*- coding: utf-8 -*-
"""郑老师 MediaCrawler 魔改版 - 任务中心 API。"""

from fastapi import APIRouter, HTTPException, Query

from ..schemas import CrawlerStartRequest
from ..services import crawler_manager
from ..services.task_history import task_history_store

router = APIRouter(prefix="/tasks", tags=["zheng-tasks"])


@router.get("")
async def list_tasks(
    limit: int = Query(default=100, ge=1, le=1000),
    status: str | None = None,
):
    return {"tasks": task_history_store.list(limit=limit, status=status)}


@router.get("/{task_id}")
async def get_task(task_id: str):
    task = task_history_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/{task_id}/retry")
async def retry_task(task_id: str):
    if crawler_manager.process and crawler_manager.process.poll() is None:
        raise HTTPException(status_code=400, detail="Crawler is already running")

    task = task_history_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    try:
        request = CrawlerStartRequest(**task["config"])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Stored task config is invalid: {exc}") from exc

    success = await crawler_manager.start(request, retry_of=task_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to retry task")

    return {
        "status": "ok",
        "message": "Task restarted",
        "task_id": crawler_manager.current_task_id,
        "retry_of": task_id,
    }


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    if not task_history_store.remove(task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "ok"}


@router.delete("")
async def clear_tasks(status: str | None = None):
    removed = task_history_store.clear(status=status)
    return {"status": "ok", "removed": removed}
