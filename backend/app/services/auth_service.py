import uuid

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import OAuthProvider, User, UserVisibilitySettings
from app.schemas.auth import RegisterRequest, UserResponse


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


DEFAULT_TYPES = [
    {"name": "Zoo", "color": "#4CAF50", "icon": "paw"},
    {"name": "Museum", "color": "#2196F3", "icon": "museum"},
    {"name": "Museum - History", "color": "#795548", "icon": "history"},
    {"name": "Museum - Art", "color": "#9C27B0", "icon": "palette"},
    {"name": "Museum - War", "color": "#F44336", "icon": "shield"},
    {"name": "Museum - Science", "color": "#FF9800", "icon": "science"},
    {"name": "Theme Park", "color": "#E91E63", "icon": "park"},
]


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.oauth_providers))
        .where(User.email == email)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: str) -> User | None:
    result = await db.execute(
        select(User)
        .options(selectinload(User.oauth_providers))
        .where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def create_local_user(db: AsyncSession, data: RegisterRequest) -> User:
    existing = await get_user_by_email(db, data.email)
    if existing:
        raise ValueError("Email already registered")

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
    )
    db.add(user)

    # Create default visibility settings
    visibility = UserVisibilitySettings(user_id=user.id)
    db.add(visibility)

    # Seed default types
    from app.models.location_type import LocationType

    for t in DEFAULT_TYPES:
        db.add(
            LocationType(
                id=str(uuid.uuid4()),
                user_id=user.id,
                name=t["name"],
                color=t["color"],
                icon=t["icon"],
            )
        )

    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if not user or not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


async def change_password(
    db: AsyncSession, user_id: str, current_password: str, new_password: str
) -> bool:
    user = await get_user_by_id(db, user_id)
    if not user or not user.password_hash:
        return False
    if not verify_password(current_password, user.password_hash):
        return False
    user.password_hash = hash_password(new_password)
    await db.commit()
    return True


async def update_user_profile(
    db: AsyncSession,
    user_id: str,
    display_name: str | None = None,
    preferred_language: str | None = None,
) -> User | None:
    user = await get_user_by_id(db, user_id)
    if not user:
        return None
    if display_name is not None:
        user.display_name = display_name
    if preferred_language is not None:
        user.preferred_language = preferred_language
    await db.commit()
    await db.refresh(user)
    return user


async def get_or_create_oauth_user(
    db: AsyncSession, provider: str, provider_id: str, email: str, display_name: str
) -> User:
    # Check if OAuth link exists
    result = await db.execute(
        select(OAuthProvider).where(
            OAuthProvider.provider == provider,
            OAuthProvider.provider_id == provider_id,
        )
    )
    oauth_link = result.scalar_one_or_none()

    if oauth_link:
        user = await get_user_by_id(db, oauth_link.user_id)
        if user:
            return user

    # Check if user exists by email
    user = await get_user_by_email(db, email)
    if user:
        # Link OAuth to existing user
        db.add(
            OAuthProvider(
                id=str(uuid.uuid4()),
                user_id=user.id,
                provider=provider,
                provider_id=provider_id,
            )
        )
        await db.commit()
        return user

    # Create new user
    user = User(
        id=str(uuid.uuid4()),
        email=email,
        display_name=display_name,
    )
    db.add(user)

    db.add(
        OAuthProvider(
            id=str(uuid.uuid4()),
            user_id=user.id,
            provider=provider,
            provider_id=provider_id,
        )
    )

    visibility = UserVisibilitySettings(user_id=user.id)
    db.add(visibility)

    from app.models.location_type import LocationType

    for t in DEFAULT_TYPES:
        db.add(
            LocationType(
                id=str(uuid.uuid4()),
                user_id=user.id,
                name=t["name"],
                color=t["color"],
                icon=t["icon"],
            )
        )

    await db.commit()
    await db.refresh(user)
    return user


def user_to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        preferred_language=user.preferred_language,
        oauth_providers=[op.provider for op in user.oauth_providers],
    )
