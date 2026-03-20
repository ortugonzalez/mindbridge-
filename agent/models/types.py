"""Pydantic models for all BRESO entities."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class Language(str, Enum):
    es = "es"
    en = "en"


class ConversationMode(str, Enum):
    listen = "listen"
    motivate = "motivate"
    propose = "propose"
    celebrate = "celebrate"
    silent_alert = "silent_alert"


class AlertLevel(str, Enum):
    mild = "mild"
    moderate = "moderate"
    high = "high"


class SubscriptionTier(str, Enum):
    essential = "essential"
    premium = "premium"


# ---------------------------------------------------------------------------
# User models
# ---------------------------------------------------------------------------

class User(BaseModel):
    id: str
    created_at: Optional[datetime] = None
    language: Language
    timezone: str
    checkin_time_preference: str = Field(description="Time in HH:MM format")
    baseline_ready: bool = False
    wallet_address: Optional[str] = None
    consent_tx_hash: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    password: str
    language: Language
    timezone: str
    checkin_time_preference: str = "09:00"


# ---------------------------------------------------------------------------
# Check-in models
# ---------------------------------------------------------------------------

class CheckIn(BaseModel):
    id: str
    user_id: str
    scheduled_at: datetime
    responded_at: Optional[datetime] = None
    response_delay_seconds: Optional[int] = None
    word_count: Optional[int] = None
    tone_score: Optional[float] = Field(default=None, ge=-1.0, le=1.0)
    engagement_flag: bool
    prompt_version: str
    llm_model_id: Optional[str] = None
    llm_latency_ms: Optional[int] = None


class CheckInResponse(BaseModel):
    """API response returned when a check-in is created or fetched."""
    checkin_id: str
    message: str
    conversation_mode: ConversationMode
    scheduled_at: datetime


class CheckInSubmit(BaseModel):
    checkin_id: str
    response_text: str = Field(max_length=2000)


class CheckInResult(BaseModel):
    checkin_id: str
    processed: bool
    tone_score: Optional[float] = None
    follow_up_message: Optional[str] = None
    baseline_updated: bool


# ---------------------------------------------------------------------------
# Behavioral baseline
# ---------------------------------------------------------------------------

class BehavioralBaseline(BaseModel):
    user_id: str
    computed_at: datetime
    checkins_count: int
    avg_tone_score: float
    tone_stddev: float
    avg_response_delay_seconds: float
    delay_stddev: float
    avg_word_count: float
    wordcount_stddev: float
    engagement_rate: float


# ---------------------------------------------------------------------------
# Personalization profile
# ---------------------------------------------------------------------------

class PersonalizationProfile(BaseModel):
    user_id: str
    updated_at: datetime
    interests: list[str] = Field(default_factory=list)
    hobbies: list[str] = Field(default_factory=list)
    joy_triggers: list[str] = Field(default_factory=list)
    energy_drains: list[str] = Field(default_factory=list)
    energy_by_hour: dict[str, str] = Field(default_factory=dict)
    active_hours: list[int] = Field(default_factory=list)
    checkins_contributing: int = 0


# ---------------------------------------------------------------------------
# Trusted contacts & alerts
# ---------------------------------------------------------------------------

class TrustedContact(BaseModel):
    id: str
    user_id: str
    contact_email: str
    relationship_label: str
    zk_verified: bool
    alert_threshold: AlertLevel
    active: bool


class ContactCreate(BaseModel):
    contact_email: str
    relationship_label: str
    alert_threshold: AlertLevel


class Alert(BaseModel):
    id: str
    user_id: str
    triggered_at: datetime
    severity_level: AlertLevel
    triggering_dimensions: list[str] = Field(default_factory=list)
    contact_notified_at: Optional[datetime] = None
    booking_initiated: bool
    on_chain_tx_hash: Optional[str] = None


# ---------------------------------------------------------------------------
# Subscription
# ---------------------------------------------------------------------------

class Subscription(BaseModel):
    id: str
    user_id: str
    tier: SubscriptionTier
    status: str
    started_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    payment_tx_hash: Optional[str] = None
    payment_amount_usdt: Optional[float] = None
