import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, UserProfile, WeatherRecord
from app.schemas.schemas import AvatarUpdate, ProfileUpdate, Token, UserCreate, UserLogin, UserOut
from app.services.jwt_service import create_access_token, verify_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["user"])

# ─── CRYPTO ───────────────────────────────────────────────────────────────────
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)

VALID_AVATAR_STATES = {"tired", "energized", "sick", "athletic", "important"}


def _hash(password: str) -> str:
    return _pwd.hash(password)


def _verify(plain: str, hashed: str) -> bool:
    return _pwd.verify(plain, hashed)


# ─── AUTH DEPENDENCIES ────────────────────────────────────────────────────────

async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Soft auth — returns None if no/invalid token (used by endpoints that work
    with or without authentication, e.g. weather fetching for anonymous users).
    """
    if not creds:
        return None
    try:
        payload = verify_token(creds.credentials)
    except HTTPException:
        return None
    uid = payload.get("sub")
    if not uid:
        return None
    return db.query(User).filter(User.id == int(uid)).first()


async def require_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """
    Hard auth — raises HTTP 401 if the request lacks a valid token.
    All protected routes use this dependency.
    """
    if not creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = verify_token(creds.credentials)   # raises 401 internally if bad
    uid = payload.get("sub")
    user = db.query(User).filter(User.id == int(uid)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=Token, status_code=201)
async def register(body: UserCreate, db: Session = Depends(get_db)):
    username = body.username.strip()
    email = body.email.strip().lower()

    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="El nombre de usuario ya está en uso")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="El correo electrónico ya está en uso")

    user = User(
        username=username,
        email=email,
        hashed_password=_hash(body.password),
        avatar_state="energized",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user_id=user.id, username=user.username)
    return Token(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=Token)
async def login(body: UserLogin, db: Session = Depends(get_db)):
    username = body.username.strip()
    email = body.email.strip().lower()
    user = db.query(User).filter(User.username == username, User.email == email).first()
    if not user or not _verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Correo, usuario o contraseña incorrectos")

    token = create_access_token(user_id=user.id, username=user.username)
    return Token(access_token=token, user=UserOut.model_validate(user))


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


@router.put("/profile", response_model=UserOut)
async def update_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    if current_user.profile is None:
        current_user.profile = UserProfile(age_range=body.age_range)
    else:
        current_user.profile.age_range = body.age_range

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me")
async def delete_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_user),
):
    db.query(WeatherRecord).filter(WeatherRecord.user_id == current_user.id).delete(synchronize_session=False)
    db.delete(current_user)
    db.commit()
    return {"detail": "Cuenta eliminada correctamente"}
