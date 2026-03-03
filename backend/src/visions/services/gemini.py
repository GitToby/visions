"""Google Gemini image-to-image generation using the google-genai SDK."""

from fastapi import HTTPException, status
from google import genai
from google.genai import types

from visions.core.config import settings


def _client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _build_prompt(style_name: str, style_description: str) -> str:
    return (
        f"You are an expert interior designer. Redesign this room in the '{style_name}' style.\n\n"
        f"Style description: {style_description}\n\n"
        "Requirements:\n"
        "- Preserve the room's layout, dimensions, windows, and doors exactly.\n"
        "- Replace furnishings, colours, textures, and decor to match the style.\n"
        "- Maintain realistic lighting and proportions.\n"
        "- Output a photorealistic interior photograph."
    )


async def generate_room_redesign(
    *,
    room_image_bytes: bytes,
    style_name: str,
    style_description: str,
) -> bytes:
    """Send room image + style prompt to Gemini and return the generated image bytes.

    Raises HTTPException on any Gemini API failure.
    """
    prompt = _build_prompt(style_name, style_description)
    image_part = types.Part.from_bytes(data=room_image_bytes, mime_type="image/jpeg")

    try:
        response = _client().models.generate_content(
            model=settings.gemini_model,
            contents=[prompt, image_part],
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            ),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini generation failed: {exc}",
        ) from exc

    # Extract raw image bytes from the first image part in the response
    # todo: make this check correctly on None response - check docs
    assert response.candidates is not None, "Gemini returned no candidates"
    assert response.candidates[0].content is not None, "Gemini returned no candidates"
    assert response.candidates[0].content.parts is not None, "Gemini returned no candidates"

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            assert part.inline_data.data is not None, "Gemini returned no candidates"
            return part.inline_data.data

    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Gemini returned no image data",
    )
