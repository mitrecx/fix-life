"""Email service for sending emails via SMTP."""
import smtplib
import random
import string
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.verification_code import VerificationCode


class EmailService:
    """Service for sending emails via SMTP."""

    def __init__(self, db: Session):
        self.db = db

    def generate_verification_code(self) -> str:
        """Generate a 6-digit verification code."""
        return ''.join(random.choices(string.digits, k=6))

    def send_verification_email(self, email: str, purpose: str = "register") -> tuple[bool, str, Optional[str]]:
        """
        Send a verification code to the given email.

        Args:
            email: Email address to send code to
            purpose: Purpose of the code (register, reset_password, etc.)

        Returns:
            Tuple of (success: bool, message: str, code: str|None)
        """
        try:
            # Generate verification code
            code = self.generate_verification_code()

            # Calculate expiration time
            expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES)

            # Invalidate any existing unused codes for this email and purpose
            self.db.query(VerificationCode).filter(
                VerificationCode.email == email,
                VerificationCode.purpose == purpose,
                VerificationCode.used.is_(None)
            ).update({"used": datetime.now(timezone.utc)})

            # Save new verification code to database
            verification_code = VerificationCode(
                email=email,
                code=code,
                purpose=purpose,
                expires_at=expires_at
            )
            self.db.add(verification_code)
            self.db.commit()

            # Try to send email
            email_sent, error_msg = self._send_email(
                to_email=email,
                subject="Fix Life - 验证码",
                body=self._get_verification_email_body(code)
            )

            if email_sent:
                return True, "验证码已发送", code
            else:
                # Email failed but code was saved - return code for development
                return True, f"邮件发送失败: {error_msg}，验证码: {code}", code

        except Exception as e:
            return False, f"发送验证码失败: {str(e)}", None

    def verify_code(self, email: str, code: str, purpose: str = "register") -> tuple[bool, str]:
        """
        Verify a code for the given email and purpose.

        Args:
            email: Email address
            code: Verification code to check
            purpose: Purpose of the code (register, reset_password, etc.)

        Returns:
            Tuple of (success: bool, message: str)
        """
        verification_code = self.db.query(VerificationCode).filter(
            VerificationCode.email == email,
            VerificationCode.code == code,
            VerificationCode.purpose == purpose,
            VerificationCode.used.is_(None)
        ).first()

        if not verification_code:
            return False, "验证码无效或已过期"

        if not verification_code.is_valid():
            return False, "验证码已过期"

        # Mark code as used
        verification_code.mark_as_used()
        self.db.commit()

        return True, "验证成功"

    def _send_email(self, to_email: str, subject: str, body: str) -> tuple[bool, Optional[str]]:
        """
        Send email via SMTP.

        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body (HTML)

        Returns:
            Tuple of (success: bool, error_message: str|None)
        """
        try:
            msg = MIMEMultipart('alternative')
            msg['From'] = settings.SMTP_FROM
            msg['To'] = to_email
            msg['Subject'] = subject

            html_part = MIMEText(body, 'html')
            msg.attach(html_part)

            # Connect to SMTP server and send
            if settings.SMTP_USE_SSL:
                server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT)
            elif settings.SMTP_USE_TLS:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
                server.starttls()
            else:
                server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)

            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

            server.send_message(msg)
            server.quit()

            return True, None

        except Exception as e:
            return False, str(e)

    def _get_verification_email_body(self, code: str) -> str:
        """Generate HTML email body for verification code."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(to right, #6366f1, #a855f7, #ec4899); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .code {{ background: white; border: 2px dashed #6366f1; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Fix Life</h1>
                </div>
                <div class="content">
                    <h2>邮箱验证码</h2>
                    <p>您好，</p>
                    <p>您正在注册 Fix Life 账户，您的验证码是：</p>
                    <div class="code">{code}</div>
                    <p>验证码有效期为 <strong>10分钟</strong>，请尽快完成验证。</p>
                    <p>如果这不是您本人操作，请忽略此邮件。</p>
                </div>
                <div class="footer">
                    <p>此邮件由系统自动发送，请勿回复。</p>
                </div>
            </div>
        </body>
        </html>
        """
