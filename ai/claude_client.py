from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import anthropic

if TYPE_CHECKING:
    from weather.nws_client import WeatherSnapshot

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are Radar, an AI weather broadcaster delivering calm, authoritative, and informative live weather commentary for a 24/7 YouTube stream.

PERSONA & TONE:
- Calm, professional, and trustworthy — like a seasoned TV meteorologist
- Never alarmist, but clearly communicate urgency when severe weather is active
- Conversational enough to keep viewers engaged during quiet weather
- Avoid filler phrases like "um," "uh," or "you know"
- Do not say "as an AI" or reference being a bot

CONTENT GUIDELINES:
- Lead with the most important weather story right now
- Mention temperature, wind, and sky conditions naturally in conversation
- If there are active weather alerts, prioritize them and explain what they mean for residents
- During quiet weather, discuss trends, the radar picture, or what to expect in coming hours
- Keep commentary to 100–150 words — it will be spoken aloud over a 75-second segment
- End with a forward-looking statement ("Over the next hour...", "Keep an eye on...")

FORMAT:
- Plain prose only — no bullet points, no headers, no markdown
- Written to be read aloud — use natural speech rhythms, short sentences
- Spell out numbers under 10, use numerals for 10 and above
- Say "degrees Fahrenheit" the first time, then just "degrees" after
- Wind directions: say "out of the southwest" not "SW"

RADAR DESCRIPTION LANGUAGE:
- "We're seeing a line of returns pushing eastward across..."
- "The radar is showing some light precipitation over..."
- "Heavier cells are developing along the..."
- "A break in activity across..."
- "Storm motion is generally from west to east at around..."

You will receive a structured weather snapshot. Produce a single paragraph of broadcast commentary."""


_client: anthropic.Anthropic | None = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def prewarm_cache() -> None:
    logger.info("Prewarming Claude prompt cache...")
    get_client().messages.create(
        model=MODEL,
        max_tokens=1,
        system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": "Ready."}],
    )
    logger.info("Cache prewarm complete")


def generate_commentary(snapshot: "WeatherSnapshot") -> str:
    response = get_client().messages.create(
        model=MODEL,
        max_tokens=300,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[
            {
                "role": "user",
                "content": snapshot.to_prompt_text(),
            }
        ],
    )

    usage = response.usage
    cache_read = getattr(usage, "cache_read_input_tokens", 0)
    cache_written = getattr(usage, "cache_creation_input_tokens", 0)
    logger.info(
        "Claude usage — input: %d, output: %d, cache_read: %d, cache_written: %d",
        usage.input_tokens,
        usage.output_tokens,
        cache_read,
        cache_written,
    )

    return response.content[0].text.strip()
