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
          por BRENSO
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
        BRENSO — Bienestar emocional para Latinoamérica
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


def send_invite_email(
    to_email: str,
    family_name: str,
    invite_link: str,
) -> dict:
    """Send a family invite email to a patient."""
    html_content = f"""
    <div style="font-family: Inter, sans-serif;
                max-width: 600px; margin: 0 auto;
                padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 32px;">🌱</span>
        <h1 style="color: #7C9A7E; font-weight: 400;
                   font-size: 24px; margin: 8px 0;">
          BRENSO
        </h1>
      </div>

      <div style="background: #FAF8F5; border-radius: 12px;
                  padding: 32px; margin-bottom: 24px;">
        <p style="color: #2D2D2D; font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
          <strong>{family_name}</strong> quiere acompañarte en BRENSO.
        </p>
        <p style="color: #2D2D2D; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
          Al aceptar, {family_name} podrá estar al tanto de tu bienestar
          de manera discreta y amorosa.
        </p>
        <div style="text-align: center;">
          <a href="{invite_link}"
             style="display: inline-block; background: #7C9A7E; color: white;
                    padding: 14px 32px; border-radius: 8px; text-decoration: none;
                    font-size: 16px; font-weight: 500;">
            Aceptar invitación
          </a>
        </div>
      </div>

      <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
        Si no esperabas este mensaje, podés ignorarlo con tranquilidad.
      </p>
      <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
        BRENSO — Bienestar emocional para Latinoamérica
      </p>
    </div>
    """

    try:
        response = resend.Emails.send({
            "from": "Soledad <soledad@breso.app>",
            "to": [to_email],
            "subject": f"{family_name} quiere acompañarte en BRENSO",
            "html": html_content,
        })
        email_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", None)
        logger.info({"event": "email.invite.sent", "to": to_email, "id": email_id})
        return {"success": True, "id": email_id}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "email.invite.failed", "error": str(exc), "to": to_email})
        return {"success": False, "error": str(exc)}


def send_contact_invite_email(
    to_email: str,
    to_name: str,
    patient_name: str,
    invite_url: str,
) -> dict:
    """
    Send an invite email from a patient to their trusted contact.
    Direction: patient → contact (e.g. "Juan te agregó como contacto de confianza").
    """
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:600px;
                margin:0 auto;padding:40px 20px;">
      <div style="text-align:center;margin-bottom:32px;">
        <span style="font-size:48px;">🌱</span>
        <h1 style="color:#7C9A7E;font-weight:400;font-size:24px;">
          Soledad
        </h1>
        <p style="color:#6B7280;font-size:14px;">por BRENSO</p>
      </div>
      <p style="color:#2D2D2D;font-size:16px;line-height:1.7;">
        Hola {to_name},
      </p>
      <p style="color:#2D2D2D;font-size:16px;line-height:1.7;">
        {patient_name} te agregó como contacto de confianza en BRENSO.
        Esto significa que si Soledad detecta que {patient_name}
        necesita apoyo, vas a recibir una notificación.
      </p>
      <p style="color:#2D2D2D;font-size:16px;line-height:1.7;">
        Para activar tu acceso al panel de seguimiento,
        hacé click acá:
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="{invite_url}"
           style="background:#7C9A7E;color:white;padding:16px 32px;
                  border-radius:8px;text-decoration:none;font-size:16px;">
          Activar mi acceso
        </a>
      </div>
      <p style="color:#6B7280;font-size:14px;line-height:1.6;">
        No vas a poder ver el contenido de las conversaciones
        de {patient_name}. Solo recibirás alertas cuando
        sea necesario.
      </p>
      <p style="color:#9CA3AF;font-size:12px;text-align:center;
                margin-top:32px;">
        — Soledad, por BRENSO
      </p>
    </div>
    """
    try:
        response = resend.Emails.send({
            "from": "Soledad <soledad@breso.app>",
            "to": [to_email],
            "subject": f"{patient_name} te agregó como contacto de confianza",
            "html": html,
        })
        email_id = response.get("id") if isinstance(response, dict) else getattr(response, "id", None)
        logger.info({"event": "email.contact_invite.sent", "to": to_email, "id": email_id})
        return {"success": True, "id": email_id}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "email.contact_invite.failed", "error": str(exc), "to": to_email})
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
        — Soledad, por BRENSO
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


def send_streak_celebration(to_email: str, user_name: str, streak: int, custom_message: str = "") -> None:
    """Send a streak milestone celebration email."""
    milestone_messages = {
        3:  "Tres días seguidos. No es poco — es una decisión que repetiste tres veces.",
        7:  "Una semana entera. Eso ya es un hábito.",
        14: "Dos semanas. Soledad te conoce cada vez mejor.",
        30: "Un mes. Muy pocas personas llegan hasta acá. Vos llegaste.",
        60: "Dos meses de conversaciones. Eso es mucho coraje.",
        100: "100 días. Eso es extraordinario.",
    }
    body = custom_message or milestone_messages.get(streak, f"{streak} días seguidos con Soledad.")
    html_content = f"""
    <div style="font-family: Inter, sans-serif;
                max-width: 600px; margin: 0 auto;
                padding: 40px 20px; text-align: center;">
      <span style="font-size: 48px;">🔥</span>
      <h1 style="color: #7C9A7E; font-weight: 400;
                 font-size: 24px; margin: 16px 0 8px;">
        {streak} días con Soledad
      </h1>
      <p style="color: #2D2D2D; font-size: 16px;
                line-height: 1.7; margin: 0 0 24px;">
        Hola {user_name},
      </p>
      <p style="color: #2D2D2D; font-size: 18px;
                line-height: 1.7; margin: 0 0 32px;
                font-style: italic;">
        "{body}"
      </p>
      <div style="text-align: center;">
        <a href="https://mindbridge-theta.vercel.app/chat"
           style="background: #7C9A7E; color: white;
                  padding: 16px 32px; border-radius: 8px;
                  text-decoration: none; font-size: 16px;
                  display: inline-block;">
          Seguir con Soledad
        </a>
      </div>
      <p style="color: #9CA3AF; font-size: 12px;
                text-align: center; margin-top: 32px;">
        — Soledad, por BRENSO
      </p>
    </div>
    """
    try:
        resend.Emails.send({
            "from": "Soledad <soledad@breso.app>",
            "to": [to_email],
            "subject": f"🔥 {streak} días seguidos — {user_name}, esto es real",
            "html": html_content,
        })
        logger.info({"event": "email.streak_celebration.sent", "to": to_email, "streak": streak})
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "email.streak_celebration.failed", "error": str(exc), "to": to_email})


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
          Bienvenido/a a BRENSO
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
        — Soledad, por BRENSO
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
