"""
/generate/* — Generation endpoints.

  POST /generate/commit-message  ← CD stage 3e — AI git commit message
"""

import json
import logging
import textwrap

from fastapi import APIRouter

from app.models.schemas import CommitMessageRequest, CommitMessageResponse
from app.services.llm_client import llm_complete
from app.utils.json_parser import parse_llm_json

logger = logging.getLogger(__name__)
router = APIRouter()


_COMMIT_SYSTEM_PROMPT = textwrap.dedent("""
You are a DevOps engineer writing a git commit message following the Conventional Commits spec.
The commit updates the Helm values file with a new Docker image tag.
Rules:
- Format: type(scope): short description [AI]
- Type: chore or feat or fix depending on risk level
- Scope: deploy
- Max 72 characters total
- Append " [AI]" to indicate it was AI-generated
- No body, no footer

Output JSON with a single key "message" containing the commit string.
Output ONLY valid JSON — no markdown, no explanation.
""").strip()


@router.post("/commit-message", response_model=CommitMessageResponse)
async def generate_commit_message(req: CommitMessageRequest):
    logger.info(
        "generate_commit_message | app=%s %s→%s risk=%s",
        req.app_name, req.old_tag, req.new_tag, req.risk_level
    )

    user_prompt = textwrap.dedent(f"""
    Application: {req.app_name}
    Old image tag: {req.old_tag}
    New image tag: {req.new_tag}
    Branch: {req.branch}   Commit: {req.commit}
    AI Risk Level: {req.risk_level}

    Generate the conventional commit message now.
    """).strip()

    fallback = f"chore(deploy): update {req.app_name} image to {req.new_tag} [AI]"

    try:
        raw = await llm_complete(_COMMIT_SYSTEM_PROMPT, user_prompt)
        data = parse_llm_json(raw)
        msg = data.get("message", fallback)
        # Guard: must be non-empty and single line
        msg = msg.strip().splitlines()[0] if msg.strip() else fallback
        return CommitMessageResponse(message=msg[:72])
    except Exception as exc:
        logger.warning("generate_commit_message fallback | %s", exc)
        return CommitMessageResponse(message=fallback)
