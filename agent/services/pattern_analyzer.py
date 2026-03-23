"""Behavioral pattern analysis — conversation mode selection, baseline updates, alert evaluation."""
from __future__ import annotations

import logging
import os
import statistics
from datetime import datetime, timezone
from typing import Any

import anthropic

from integrations.supabase_client import get_supabase

logger = logging.getLogger("breso.pattern_analyzer")

_anthropic_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY", ""))


# ---------------------------------------------------------------------------
# Real-time keyword-based pattern detection
# ---------------------------------------------------------------------------


class PatternAnalyzer:
    """Keyword-based crisis and warning detection for incoming messages."""

    CRISIS_KEYWORDS_ES = [
        "no quiero vivir", "me quiero morir", "suicid",
        "hacerme daño", "no vale la pena", "desaparecer",
        "no puedo más", "todo es inútil", "mejor sin mí",
    ]

    CRISIS_KEYWORDS_EN = [
        "want to die", "kill myself", "suicid",
        "hurt myself", "not worth living", "disappear",
        "cant go on", "everything is pointless", "better without me",
    ]

    WARNING_KEYWORDS_ES = [
        "no duermo", "no como", "estoy solo", "nadie me entiende",
        "me siento vacío", "no tengo ganas", "todo me da igual",
        "ya no disfruto", "me siento mal hace días",
    ]

    def analyze_message(self, message: str, history: list, language: str = "es") -> dict:
        """
        Analyze a message for crisis / warning signals.
        Returns {'level': 'red'|'orange'|'yellow'|'green', 'trigger': str|None, 'keyword': str|None}
        """
        message_lower = message.lower()

        # Check crisis keywords
        crisis_keywords = (
            self.CRISIS_KEYWORDS_ES if language == "es" else self.CRISIS_KEYWORDS_EN
        )
        for keyword in crisis_keywords:
            if keyword in message_lower:
                return {"level": "red", "trigger": "keyword", "keyword": keyword}

        # Check warning keywords in current message
        warning_count = sum(1 for kw in self.WARNING_KEYWORDS_ES if kw in message_lower)
        if warning_count >= 2:
            return {"level": "orange", "trigger": "multiple_warnings", "keyword": None}

        # Check sustained pattern across last 5 history messages
        if len(history) >= 3:
            negative_count = sum(
                1
                for msg in history[-5:]
                if msg.get("role") == "user"
                and any(kw in msg.get("content", "").lower() for kw in self.WARNING_KEYWORDS_ES)
            )
            if negative_count >= 3:
                return {"level": "orange", "trigger": "sustained_pattern", "keyword": None}

        return {"level": "green", "trigger": None, "keyword": None}

    async def analyze_message_with_semantic(
        self, message: str, history: list, language: str = "es"
    ) -> dict:
        """
        Analyze message using both keyword detection and Claude semantic risk scoring.
        Keyword detection takes precedence for crisis-level signals.
        Semantic score fills in the gaps for nuanced risk.
        """
        # Run keyword check first — always takes precedence for red
        keyword_result = self.analyze_message(message, history, language)
        if keyword_result["level"] == "red":
            return keyword_result

        # Complement with semantic scoring
        semantic_score = await get_semantic_risk_score(message, history)

        if semantic_score > 0.8:
            return {"level": "red", "trigger": "semantic_risk", "keyword": None, "semantic_score": semantic_score}
        if semantic_score > 0.6:
            return {"level": "orange", "trigger": "semantic_risk", "keyword": None, "semantic_score": semantic_score}
        if semantic_score > 0.4:
            return {"level": "yellow", "trigger": "semantic_risk", "keyword": None, "semantic_score": semantic_score}

        # Fall back to keyword result (orange or green)
        return {**keyword_result, "semantic_score": semantic_score}


_analyzer = PatternAnalyzer()


async def get_semantic_risk_score(message: str, history: list) -> float:
    """
    Ask Claude to evaluate risk level 1-10.
    Returns normalized 0.0-1.0 score.
    """
    try:
        recent = history[-5:] if len(history) > 5 else history
        context = "\n".join([
            f"{m.get('role', 'user')}: {m.get('content', '')}"
            for m in recent
        ])

        response = _anthropic_client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=10,
            messages=[{
                "role": "user",
                "content": (
                    f"Rate the emotional risk level of this message from 1-10.\n"
                    f"1 = very positive/stable\n"
                    f"10 = crisis/immediate danger\n\n"
                    f"Context: {context}\n"
                    f"Current message: {message}\n\n"
                    f"Respond with ONLY a number 1-10."
                ),
            }],
        )

        score = float(response.content[0].text.strip())
        return min(max(score / 10.0, 0.0), 1.0)
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "pattern_analyzer.semantic_risk_error", "error": str(exc)})
        return 0.5


def analyze_message(message: str, history: list, language: str = "es") -> dict:
    """Module-level convenience wrapper for PatternAnalyzer.analyze_message."""
    return _analyzer.analyze_message(message, history, language)


async def analyze_message_with_semantic(
    message: str, history: list, language: str = "es"
) -> dict:
    """Module-level convenience wrapper for semantic-enhanced analysis."""
    return await _analyzer.analyze_message_with_semantic(message, history, language)


def check_sustained_negativity(history_scores: list) -> bool:
    """
    Returns True if the last 5 tone scores are all below -0.2 (sustained negativity).
    Used after each check-in to decide whether to trigger a family alert.
    history_scores: list of float tone scores, most recent last.
    """
    if not history_scores or len(history_scores) < 5:
        return False
    recent = history_scores[-5:]
    return all(score < -0.2 for score in recent if score is not None)


# ---------------------------------------------------------------------------
# Conversation mode selection
# ---------------------------------------------------------------------------


def select_conversation_mode(user_id: str) -> str:
    """
    Select the most appropriate conversation mode for the user's next check-in.
    Returns one of: listen | motivate | propose | celebrate | silent_alert.
    Falls back to 'listen' on any error.
    """
    try:
        supabase = get_supabase()

        # Fetch last 5 check-ins
        checkins_resp = (
            supabase.table("check_ins")
            .select("tone_score, engagement_flag, responded_at")
            .eq("user_id", user_id)
            .order("scheduled_at", desc=True)
            .limit(5)
            .execute()
        )
        checkins: list[dict] = checkins_resp.data or []

        # Baseline readiness check — require at least 7 responded check-ins
        all_responded_resp = (
            supabase.table("check_ins")
            .select("id", count="exact")
            .eq("user_id", user_id)
            .not_.is_("responded_at", "null")
            .execute()
        )
        responded_count: int = all_responded_resp.count or 0

        if responded_count < 7:
            return "listen"

        # Check user's alert_level field
        user_resp = (
            supabase.table("users")
            .select("alert_level")
            .eq("id", user_id)
            .single()
            .execute()
        )
        user_data: dict = user_resp.data or {}
        if user_data.get("alert_level") == "level1":
            return "silent_alert"

        if not checkins:
            return "listen"

        latest = checkins[0]
        latest_tone: float | None = latest.get("tone_score")

        # Tone-based rules
        if latest_tone is not None:
            if latest_tone < -0.3:
                return "listen"
            if latest_tone > 0.4:
                return "celebrate"

        # Low engagement in last 2 check-ins
        recent_two = checkins[:2]
        if len(recent_two) >= 2 and all(not c.get("engagement_flag", True) for c in recent_two):
            return "motivate"

        return "propose"

    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "pattern_analyzer.mode_selection_error", "error": str(exc)})
        return "listen"


# ---------------------------------------------------------------------------
# Baseline update
# ---------------------------------------------------------------------------


def update_baseline(user_id: str) -> bool:
    """
    Recompute and upsert the behavioral baseline for a user.
    Updates users.baseline_ready when checkins_count >= 7.
    Returns True on success.
    """
    try:
        supabase = get_supabase()

        resp = (
            supabase.table("check_ins")
            .select(
                "tone_score, response_delay_seconds, word_count, engagement_flag, responded_at"
            )
            .eq("user_id", user_id)
            .not_.is_("responded_at", "null")
            .execute()
        )
        checkins: list[dict] = resp.data or []
        count = len(checkins)

        if count == 0:
            return False

        def _safe_stdev(values: list[float]) -> float:
            if len(values) < 2:
                return 0.0
            try:
                return statistics.stdev(values)
            except statistics.StatisticsError:
                return 0.0

        tone_scores = [c["tone_score"] for c in checkins if c.get("tone_score") is not None]
        delays = [
            c["response_delay_seconds"]
            for c in checkins
            if c.get("response_delay_seconds") is not None
        ]
        word_counts = [c["word_count"] for c in checkins if c.get("word_count") is not None]
        engaged = [c for c in checkins if c.get("engagement_flag") is True]

        avg_tone = statistics.mean(tone_scores) if tone_scores else 0.0
        tone_std = _safe_stdev(tone_scores)
        avg_delay = statistics.mean(delays) if delays else 0.0
        delay_std = _safe_stdev(delays)
        avg_words = statistics.mean(word_counts) if word_counts else 0.0
        words_std = _safe_stdev(word_counts)
        engagement_rate = len(engaged) / count if count > 0 else 0.0

        baseline_payload: dict[str, Any] = {
            "user_id": user_id,
            "computed_at": datetime.now(timezone.utc).isoformat(),
            "checkins_count": count,
            "avg_tone_score": avg_tone,
            "tone_stddev": tone_std,
            "avg_response_delay_seconds": avg_delay,
            "delay_stddev": delay_std,
            "avg_word_count": avg_words,
            "wordcount_stddev": words_std,
            "engagement_rate": engagement_rate,
        }

        supabase.table("behavioral_baselines").upsert(baseline_payload).execute()

        if count >= 7:
            supabase.table("users").update({"baseline_ready": True}).eq("id", user_id).execute()

        logger.info(
            {
                "event": "pattern_analyzer.baseline_updated",
                "user_id": user_id,
                "checkins_count": count,
            }
        )
        return True

    except Exception as exc:  # noqa: BLE001
        logger.warning(
            {
                "event": "pattern_analyzer.baseline_update_error",
                "user_id": user_id,
                "error": str(exc),
            }
        )
        return False


# ---------------------------------------------------------------------------
# Alert level evaluation
# ---------------------------------------------------------------------------


def evaluate_alert_level(user_id: str) -> str | None:
    """
    Evaluate whether the user's recent patterns warrant a wellness alert.
    Returns: 'mild' | 'moderate' | 'high' | None
    """
    try:
        supabase = get_supabase()

        # Fetch baseline
        baseline_resp = (
            supabase.table("behavioral_baselines")
            .select("*")
            .eq("user_id", user_id)
            .order("computed_at", desc=True)
            .limit(1)
            .execute()
        )
        baselines: list[dict] = baseline_resp.data or []
        if not baselines:
            return None  # Baseline not ready

        baseline = baselines[0]
        checkins_count: int = baseline.get("checkins_count", 0)
        if checkins_count < 7:
            return None

        # Fetch last 7 check-ins
        checkins_resp = (
            supabase.table("check_ins")
            .select(
                "tone_score, response_delay_seconds, word_count, "
                "engagement_flag, responded_at, scheduled_at"
            )
            .eq("user_id", user_id)
            .order("scheduled_at", desc=True)
            .limit(7)
            .execute()
        )
        checkins: list[dict] = checkins_resp.data or []
        if not checkins:
            return None

        # ------------------------------------------------------------------
        # Non-response streak checks (engagement_flag = False)
        # ------------------------------------------------------------------
        non_response_streak = 0
        for c in checkins:
            if not c.get("engagement_flag", True):
                non_response_streak += 1
            else:
                break

        if non_response_streak >= 2:
            # Check if the gap from the last RESPONDED check-in > 48 h
            last_responded: dict | None = None
            for c in checkins:
                if c.get("responded_at"):
                    last_responded = c
                    break

            if last_responded:
                try:
                    last_ts = datetime.fromisoformat(
                        last_responded["responded_at"].replace("Z", "+00:00")
                    )
                    gap_hours = (
                        datetime.now(timezone.utc) - last_ts
                    ).total_seconds() / 3600
                    if gap_hours >= 48:
                        logger.info(
                            {
                                "event": "pattern_analyzer.alert_detected",
                                "user_id": user_id,
                                "level": "high",
                                "reason": "48h_no_response",
                            }
                        )
                        return "high"
                except Exception:  # noqa: BLE001
                    pass

            logger.info(
                {
                    "event": "pattern_analyzer.alert_detected",
                    "user_id": user_id,
                    "level": "mild",
                    "reason": "non_response_streak",
                }
            )
            return "mild"

        # ------------------------------------------------------------------
        # Latest check-in crisis keywords
        # ------------------------------------------------------------------
        latest = checkins[0]
        # crisis_keywords flag is stored in tone analysis result, look for it:
        if latest.get("contains_crisis_keywords") is True:
            return "high"

        # ------------------------------------------------------------------
        # Z-score analysis
        # ------------------------------------------------------------------
        avg_tone: float = baseline.get("avg_tone_score", 0.0)
        tone_std: float = baseline.get("tone_stddev", 1.0) or 1.0
        avg_delay: float = baseline.get("avg_response_delay_seconds", 0.0)
        delay_std: float = baseline.get("delay_stddev", 1.0) or 1.0
        avg_words: float = baseline.get("avg_word_count", 0.0)
        words_std: float = baseline.get("wordcount_stddev", 1.0) or 1.0

        def z(value: float | None, mean: float, std: float) -> float | None:
            if value is None:
                return None
            return (value - mean) / std

        # Collect z-scores per check-in across last 7
        concern_counts: dict[str, int] = {
            "tone": 0,
            "delay": 0,
            "word_count": 0,
        }

        for c in checkins:
            zt = z(c.get("tone_score"), avg_tone, tone_std)
            zd = z(c.get("response_delay_seconds"), avg_delay, delay_std)
            zw = z(c.get("word_count"), avg_words, words_std)

            # High alert: any single z <= -3.0
            if (zt is not None and zt <= -3.0) or (zw is not None and zw <= -3.0):
                return "high"
            if zd is not None and zd >= 3.0:  # Delay spike (3+ std above normal)
                return "high"

            if zt is not None and zt <= -1.5:
                concern_counts["tone"] += 1
            if zd is not None and zd >= 1.5:
                concern_counts["delay"] += 1
            if zw is not None and zw <= -1.5:
                concern_counts["word_count"] += 1

        # Consecutive mild signals (3+ check-ins) → mild
        mild_dims = [k for k, v in concern_counts.items() if v >= 3]
        if not mild_dims:
            return None

        # Level 2: 2+ dims with z <= -2.0 for 2+ check-ins
        moderate_dims: list[str] = []
        for dim_key, threshold_z, mean, std, field in [
            ("tone", -2.0, avg_tone, tone_std, "tone_score"),
            ("word_count", -2.0, avg_words, words_std, "word_count"),
        ]:
            consecutive_moderate = sum(
                1
                for c in checkins
                if z(c.get(field), mean, std) is not None
                and z(c.get(field), mean, std) <= threshold_z
            )
            if consecutive_moderate >= 2:
                moderate_dims.append(dim_key)

        # Check delay for moderate (z >= 2.0)
        delay_moderate = sum(
            1
            for c in checkins
            if z(c.get("response_delay_seconds"), avg_delay, delay_std) is not None
            and z(c.get("response_delay_seconds"), avg_delay, delay_std) >= 2.0
        )
        if delay_moderate >= 2:
            moderate_dims.append("delay")

        if len(moderate_dims) >= 2:
            return "moderate"

        # Sustained mild for 5+ consecutive check-ins
        if any(v >= 5 for v in concern_counts.values()):
            return "moderate"

        return "mild"

    except Exception as exc:  # noqa: BLE001
        logger.warning(
            {
                "event": "pattern_analyzer.alert_eval_error",
                "user_id": user_id,
                "error": str(exc),
            }
        )
        return None
