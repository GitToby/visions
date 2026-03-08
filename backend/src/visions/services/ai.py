"""
Google Gemini image-to-image generation using the google-genai SDK.
"""

from pydantic_ai import Agent, BinaryImage
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider

from visions.core.config import SETTINGS

provider = GoogleProvider(api_key=SETTINGS.gemini_api_key.get_secret_value())
model = GoogleModel(SETTINGS.gemini_model, provider=provider)
agent = Agent(model, output_type=BinaryImage)


def system_prompt(style_name: str, style_description: str, extra_context: str | None = None) -> str:
    prompt = (
        f"You are an expert interior designer. Redesign this room in the '{style_name}' style.\n\n"
        f"Style description: {style_description}\n\n"
        "Requirements:\n"
        "- Output a photorealistic interior photograph.\n"
        "- Preserve the room's layout, dimensions, windows, and doors exactly.\n"
        "- Replace furnishings, colours, textures, and decor to match the style.\n"
        "- Keep aspect ratio, framing and scale true to the original image.\n"
        "- Maintain realistic lighting and proportions."
    )
    if extra_context:
        prompt += f"\n\nAdditional instructions:\n\n{extra_context}"
    return prompt
