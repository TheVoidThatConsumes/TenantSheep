from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passwords import verify_password
from database import get_db
from models import Operator
from auth import create_access_token
from schemas import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    operator = db.query(Operator).filter(Operator.email == body.email).first()
    if not operator or not verify_password(body.password, operator.password_hash):
        raise HTTPException(401, "invalid credentials")
    token = create_access_token({"operator_id": operator.id, "org_id": operator.org_id})
    return {"access_token": token, "token_type": "bearer"}
