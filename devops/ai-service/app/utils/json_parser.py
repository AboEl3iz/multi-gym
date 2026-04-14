"""
Shared utilities used across multiple routers.

parse_llm_json(raw)
  Strips markdown code fences that LLMs sometimes wrap their output in,
  then parses the result as JSON.  Handles both:
    ```json
    {...}
    ```
  and plain JSON strings.

Bug fixed vs. original inline copy:
  The old implementation tested `raw.endswith("```")` AFTER already calling
  raw.split("\\n", 1)[-1], which leaves a trailing "\\n```" — the endswith
  check could therefore never match, silently leaving the closing fence in the
  string and causing json.loads() to raise a JSONDecodeError.
  The fix below strips *all* lines and checks end-of-string reliably.
"""

import json
import re


def parse_llm_json(raw: str) -> dict:
    """
    Strip optional markdown code fences produced by some LLMs, then
    return the parsed JSON object.

    Handles patterns:
      ```json         ```         (no lang specifier)
      {...}           {...}
      ```             ```
    """
    text = raw.strip()

    # Remove opening fence line: ```json  or  ```  (any fence language)
    text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
    # Remove closing fence (end of string, optional trailing whitespace)
    text = re.sub(r"\n?```\s*$", "", text)

    return json.loads(text.strip())
