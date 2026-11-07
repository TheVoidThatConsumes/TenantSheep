from celery_app import celery_app
from database import SessionLocal
from models import Project


# CHALLENGE 4 -- Celery task injection. The task trusts whatever org_id is in
# the payload instead of re-deriving it from an authenticated session. Anyone
# who can publish directly to the broker (bypassing the FastAPI app entirely)
# controls org_id outright.
#
# Direct-injection example, run from inside the create-api container:
#   python -c "from tasks import export_project; export_project.delay(1, 999)"
# No HTTP request, no token, no API involved at all.
@celery_app.task(name="export_project")
def export_project(project_id: int, org_id: int):
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"status": "not_found"}
        # BUG: no check that project.org_id == org_id
        return {
            "status": "exported",
            "project_id": project.id,
            "name": project.name,
            "claimed_org_id": org_id,
            "actual_org_id": project.org_id,
        }
    finally:
        db.close()
