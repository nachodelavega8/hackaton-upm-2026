import logging
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import AvatarUpdate, Token, UserCreate, UserLogin, UserOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["user"])

# ─── JWT ──────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET", "weatherself-change-this-in-production-please")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 30

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

VALID_AVATAR_STATES = {"tired", "energized", "sick", "athletic", "important"}


def _hash(password: str) -> str:
    return pwd_ctx.hash(password)


def _verify(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def _create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ─── DEPENDENCY ───────────────────────────────────────────────────────────────

async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not creds:
        return None
    payload = _decode_token(creds.credentials)
    if not payload:
        return None
    uid = payload.get("sub")
    if not uid:
        return None
    return db.query(User).filter(User.id == int(uid)).first()


async def require_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    user = await get_current_user(creds, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=Token, status_code=201)
async def register(body: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=_hash(body.password),
        avatar_state="energized",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return Token(access_token=_create_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
async def login(body: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not _verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return Token(access_token=_create_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(require_user)):
    return current_user


@router.put("/avatar", response_model=UserOut)
async def update_avatar(
    body: AvatarUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    if body.avatar_state not in VALID_AVATAR_STATES:
        raise HTTPException(
            status_code=400,
            detail=f"avatar_state must be one of: {sorted(VALID_AVATAR_STATES)}",
        )
    current_user.avatar_state = body.avatar_state
    db.commit()
    db.refresh(current_user)
    return current_user
