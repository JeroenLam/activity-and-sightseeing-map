from fastapi import APIRouter

from app.middleware.auth import DB, CurrentUserId
from app.schemas.statistics import StatisticsResponse
from app.services import statistics_service

router = APIRouter(prefix="/api/statistics", tags=["statistics"])


@router.get("", response_model=StatisticsResponse)
async def get_statistics(user_id: CurrentUserId, db: DB):
    return await statistics_service.get_statistics(db, user_id)
