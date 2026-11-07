from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from models import Project, Operator
from auth import get_current_operator
from schemas import ProjectCreate
from cache import get_cached_project_list, set_cached_project_list
from tasks import export_project

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/")
def list_projects(current: Operator = Depends(get_current_operator), db: Session = Depends(get_db)):
    cached = get_cached_project_list(current.org_id)
    if cached is not None:
        return cached
    projects = db.query(Project).filter(Project.org_id == current.org_id).all()
    result = [{"id": p.id, "name": p.name, "status": p.status} for p in projects]
    set_cached_project_list(current.org_id, result)
    return result


# CHALLENGE 1 -- raw SQL injection, string-formatted. The org_id filter is
# layered into the same string as the search term, so a crafted `q` breaks
# tenant scoping too, not just the WHERE clause in general.
# Try: q = x' OR org_id != {your_org_id} --
@router.get("/search")
def search_projects(q: str, current: Operator = Depends(get_current_operator), db: Session = Depends(get_db)):
    sql = f"SELECT id, name, org_id, status FROM projects WHERE org_id = {current.org_id} AND name LIKE '%{q}%'"
    rows = db.execute(text(sql)).fetchall()
    return [dict(r._mapping) for r in rows]


# CHALLENGE 2 -- missing auth dependency entirely. No current-operator check,
# no tenant check, nothing. Any project_id, no token required.
@router.get("/{project_id}/raw")
def get_project_raw(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "not found")
    return {"id": project.id, "name": project.name, "org_id": project.org_id, "status": project.status}


@router.post("/")
def create_project(body: ProjectCreate, current: Operator = Depends(get_current_operator), db: Session = Depends(get_db)):
    project = Project(name=body.name, org_id=current.org_id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"id": project.id, "name": project.name}


# CHALLENGE 3 -- mass assignment. Blindly applies every key in the body,
# including org_id and status, with no allowlist of updatable fields.
@router.put("/{project_id}")
def update_project(project_id: int, body: dict, current: Operator = Depends(get_current_operator), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id, Project.org_id == current.org_id).first()
    if not project:
        raise HTTPException(404, "not found")
    for key, value in body.items():
        setattr(project, key, value)
    db.commit()
    return {"id": project.id, "name": project.name, "org_id": project.org_id, "status": project.status}


@router.post("/{project_id}/export")
def export(project_id: int, current: Operator = Depends(get_current_operator)):
    export_project.delay(project_id, current.org_id)
    return {"queued": True}
