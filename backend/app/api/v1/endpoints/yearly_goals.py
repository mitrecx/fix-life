from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, get_current_user
from app.schemas.yearly_goal import (
    YearlyGoalCreate,
    YearlyGoalUpdate,
    YearlyGoalResponse,
    YearlyGoalList,
    ProgressUpdate,
)
from app.services.yearly_goal_service import YearlyGoalService

router = APIRouter()


@router.get("/", response_model=YearlyGoalList)
def get_yearly_goals(
    year: Optional[int] = Query(None, ge=2020, le=2100, description="Filter by year"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Get all yearly goals for the current user.

    Filters:
    - year: Filter by specific year
    - category: Filter by category (health, career, learning, etc.)
    - status: Filter by status (pending, in-progress, completed, paused)
    """
    service = YearlyGoalService(db)
    goals = service.get_user_goals(
        user_id=current_user["id"], year=year, category=category, status=status
    )

    return YearlyGoalList(goals=goals, total=len(goals))


@router.post("/", response_model=YearlyGoalResponse, status_code=status.HTTP_201_CREATED)
def create_yearly_goal(
    goal_in: YearlyGoalCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Create a new yearly goal.

    The goal will automatically be set to 'in-progress' status.
    If auto_generate_milestones is True (default), monthly milestones will be created automatically.
    """
    service = YearlyGoalService(db)
    goal = service.create_goal(user_id=current_user["id"], goal_in=goal_in)
    return goal


@router.get("/{goal_id}", response_model=YearlyGoalResponse)
def get_yearly_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Get a single yearly goal by ID."""
    service = YearlyGoalService(db)
    goal = service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )

    if str(goal.user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to access this goal"
        )

    return goal


@router.put("/{goal_id}", response_model=YearlyGoalResponse)
def update_yearly_goal(
    goal_id: str,
    goal_in: YearlyGoalUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Update an existing yearly goal."""
    service = YearlyGoalService(db)
    goal = service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )

    if str(goal.user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this goal"
        )

    updated_goal = service.update_goal(goal_id, goal_in)
    return updated_goal


@router.patch("/{goal_id}/progress", response_model=YearlyGoalResponse)
def update_goal_progress(
    goal_id: str,
    progress_in: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Update goal progress.

    Adds the progress value to the current_value.
    Optionally updates a specific monthly milestone.
    """
    service = YearlyGoalService(db)
    goal = service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )

    if str(goal.user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this goal"
        )

    updated_goal = service.update_progress(goal_id, progress_in)
    return updated_goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_yearly_goal(
    goal_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Delete a yearly goal."""
    service = YearlyGoalService(db)
    goal = service.get_goal(goal_id)

    if not goal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found"
        )

    if str(goal.user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this goal"
        )

    service.delete_goal(goal_id)
