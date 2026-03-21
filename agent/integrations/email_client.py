"""Email client — transactional emails via Resend."""
from __future__ import annotations

import logging
import os

import resend

resend.api_key = os.getenv("RESEND_API_KEY", "")

logger = logging.getLogger("breso.email")

LEVEL_SUBJECT = {
    "yellow": "Soledad notó algo sobre {patient_name}",
    "orange": "Puede ser buen momento para hablarle a {patient_name}",
    "red": "Importante: {patient_name} puede necesitar apoyo hoy",
}

LEVEL_COLOR = {
    "yellow": "#F59E0B",
    "orange": "#F97316",
    "red": "#EF4444",
}


def send_alert_email(
    to_email: str,
    to_name: str,
    patient_name: str,
    alert_level: str,
    message: str,
) -> dict:
    """
    Send an alert email to a trusted contact.
    alert_level: "yellow" | "orange" | "red"
    """
    color = LEVEL_COLOR.get(alert_level, "#7C9A7E")
    subject_template = LEVEL_SUBJECT.get(alert_level, "Mensaje sobre {patient_name}")
    subject = subject_template.format(patient_name=patient_name)

    html_content = f"""
    <div style="font-family: Inter, sans-serif;
                max-width: 600px; margin: 0 auto;
                padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 32px;">🌱</span>
        <h1 style="color: #7C9A7E; font-weight: 400;
                   font-size: 24px; margin: 8px 0;">
          Soledad
        </h1>
        <p style="color: #6B7280; font-size: 14px;">
          por BRESO
        </p>
      </div>

      <div style="background: #FAF8F5; border-radius: 12px;
                  padding: 32px; margin-bottom: 24px;">
        <p style="color: #2D2D2D; font-size: 16px;
                  line-height: 1.7; margin: 0 0 16px;">
          Hola {to_name},
        </p>
        <p style="color: #2D2D2D; font-size: 16px;
                  line-height: 1.7; margin: 0 0 16px;">
          {message}
        </p>
        <p style="color: #6B7280; font-size: 14px;
                  line-height: 1.6; margin: 0;">
          No es necesario que menciones que recibiste
          este mensaje. A veces simplemente estar
          presente ya hace la diferencia.
        </p>
      </div>

      <div style="border-left: 3px solid {color};
                  padding-left: 16px; margin-bottom: 32px;">
        <p style="color: #6B7280; font-size: 13px; margin: 0;">
          Este mensaje fue enviado por Soledad, la
          acompañante de bienestar emocional de {patient_name}.
          Solo vos recibís estas notificaciones.
        </p>
      </div>

      <p style="color: #9CA3AF; font-size: 12px;
                text-align: center;">
        BRESO — Bienestar emocional para Latinoamérica
      </p>
    </div>
    """

    try:
        response = resend.Emails.send({
            "from": "Soledad <soledad@breso.app>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        })
        logger.info(
            {
                "event": "email.alert.sent",
                "to": to_email,
                "level": alert_level,
                "id": response.get("id") if isinstance(response, dict) else getattr(response, "id", None),
            }
        )
        return {"success": True, "id": response.get("id") if isinstance(response, dict) else getattr(response, "id", None)}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "email.alert.failed", "error": str(exc), "to": to_email})
        return {"success": False, "error": str(exc)}


def send_checkin_reminder(to_email: str, user_name: str) -> None:
    """Send a proactive daily check-in reminder from Soledad."""
    html = f"""
    <div style="font-family: Inter, sans-serif;
                max-width: 600px; margin: 0 auto;
                padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 48px;">🌱</span>
        <h1 style="color: #7C9A7E; font-weight: 400;
                   font-size: 24px; margin: 8px 0;">
          Soledad
        </h1>
      </div>
      <p style="color: #2D2D2D; font-size: 18px;
                line-height: 1.7; margin: 0 0 16px;">
        Hola {user_name},
      </p>
      <p style="color: #2D2D2D; font-size: 16px;
                line-height: 1.7; margin: 0 0 24px;">
        Hoy no tuvimos nuestro momento. No pasa nada,
        los días se complican.
      </p>
      <p style="color: #2D2D2D; font-size: 16px;
                line-height: 1.7; margin: 0 0 32px;">
        Si tenés unos minutos, estoy acá.
      </p>
      <div style="text-align: center;">
        <a href="https://mindbridge-theta.vercel.app/chat"
           style="background: #7C9A7E; color: white;
                  padding: 16px 32px; border-radius: 8px;
                  text-decoration: none; font-size: 16px;
                  display: inline-block;">
          Hablar con Soledad
        </a>
      </div>
      <p style="color: #9CA3AF; font-size: 12px;
                text-align: center; margin-top: 32px;">
        — Soledad, por BRESO
      </p>
    </div>
    """
    try:
        resend.Emails.send({
            "from": "Soledad <soledad@breso.app>",
            "to": [to_email],
            "subject": f"Hola {user_name}, ¿cómo terminó el día?",
            "html": html,
        })
        logger.info({"event": "email.reminder.sent", "to": to_email})
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "email.reminder.failed", "error": str(exc), "to": to_email})


def send_welcome_email(to_email: str, user_name: str) -> None:
    """Send a welcome email from Soledad on first registration."""
    html_content = f"""
    <div style="font-family: Inter, sans-serif;
                max-width: 600px; margin: 0 auto;
                padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 32px;">🌱</span>
        <h1 style="color: #7C9A7E; font-weight: 400;
                   font-size: 24px; margin: 8px 0;">
          Bienvenido/a a BRESO
        </h1>
      </div>
      <p style="color: #2D2D2D; font-size: 16px;
                line-height: 1.7;">
        Hola {user_name},
      </p>
      <p style="color: #2D2D2D; font-size: 16px;
                line-height: 1.7;">
        Me llamo Soledad. Voy a estar acá cada vez
        que quieras hablar.
      </p>
      <p style="color: #2D2D2D; font-size: 16px;
                line-height: 1.7;">
        No hay apuros ni expectativas. Empezamos
        cuando vos quieras.
      </p>
      <p style="color: #6B7280; font-size: 14px;
                line-height: 1.6; margin-top: 32px;">
        — Soledad, por BRESO
      </p>
    </div>
    """
    try:
        resend.Emails.send({
            "from": "Soledad <soledad@breso.app>",
            "to": [to_email],
            "subject": "Hola, soy Soledad",
            "html": html_content,
        })
        logger.info({"event": "email.welcome.sent", "to": to_email})
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "email.welcome.failed", "error": str(exc), "to": to_email})
