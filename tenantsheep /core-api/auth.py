import os
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database import get_db
from models import Operator

SECRET_KEY = os.getenv("JWT_SECRET", "tenantsheep-create-secret-change-me")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def create_access_token(data: dict, expires_minutes: int = 480) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=expires_minutes)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# This is the CORRECT dependency -- applied per-route by convention, not
# globally. CHALLENGE 2 (routers/projects.py) is a route that simply forgets
# to include it.
def get_current_operator(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> Operator:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials"
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        operator_id = payload.get("operator_id")
        if operator_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    operator = db.query(Operator).filter(Operator.id == operator_id).first()
    if operator is None:
        raise credentials_exception
    return operator
