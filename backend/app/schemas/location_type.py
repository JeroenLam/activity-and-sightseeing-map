from pydantic import BaseModel, Field


class LocationTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    icon: str = ""


class LocationTypeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    color: str | None = Field(None, pattern=r"^#[0-9a-fA-F]{6}$")
    icon: str | None = None


class LocationTypeResponse(BaseModel):
    id: str
    name: str
    color: str
    icon: str

    model_config = {"from_attributes": True}
