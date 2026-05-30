from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UpdateProfileRequest(BaseModel):
    display_name: str | None = Field(None, min_length=1, max_length=255)
    preferred_language: str | None = Field(None, pattern=r"^(nl|en)$")


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    preferred_language: str
    oauth_providers: list[str] = []

    model_config = {"from_attributes": True}


class OAuthConfigResponse(BaseModel):
    google: bool = False
