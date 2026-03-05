"""Notification service for sending weekly summary via email and Feishu."""
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.weekly_summary import WeeklySummary
from app.models.systemSettings import SystemSettings
from app.services.email_service import EmailService
from app.services.feishu_service import FeishuService


class NotificationService:
    """Service for sending weekly summary notifications."""

    def __init__(self, db: Session):
        self.db = db

    def send_weekly_summary(
        self,
        summary_id: str,
        send_email: bool = False,
        send_feishu: bool = False
    ) -> Dict[str, Any]:
        """
        Send weekly summary via configured channels.

        Args:
            summary_id: Weekly summary ID
            send_email: Whether to send email notification
            send_feishu: Whether to send Feishu notification

        Returns:
            Dict with results:
            {
                "email_sent": bool,
                "email_error": str | None,
                "feishu_sent": bool,
                "feishu_error": str | None,
                "email_recipient": str | None,
                "feishu_chat_id": str | None
            }
        """
        # Get summary
        summary = self.db.query(WeeklySummary).filter(
            WeeklySummary.id == summary_id
        ).first()

        if not summary:
            return {
                "success": False,
                "error": "Summary not found",
                "email_sent": False,
                "feishu_sent": False
            }

        # Get user
        user = self.db.query(User).filter(User.id == summary.user_id).first()
        if not user:
            return {
                "success": False,
                "error": "User not found",
                "email_sent": False,
                "feishu_sent": False
            }

        # Get system settings
        settings = self.db.query(SystemSettings).filter(
            SystemSettings.user_id == user.id
        ).first()

        result = {
            "success": True,
            "email_sent": False,
            "email_error": None,
            "email_recipient": None,
            "feishu_sent": False,
            "feishu_error": None,
            "feishu_chat_id": None
        }

        # Send email if requested
        if send_email:
            email_result = self._send_email_notification(summary, user, settings)
            result.update(email_result)

        # Send Feishu if requested
        if send_feishu:
            feishu_result = self._send_feishu_notification(summary, user, settings)
            result.update(feishu_result)

        # Check if any channel succeeded
        if send_email and not result["email_sent"]:
            result["success"] = False
        if send_feishu and not result["feishu_sent"] and not send_email:
            result["success"] = False

        return result

    def _send_email_notification(
        self,
        summary: WeeklySummary,
        user: User,
        settings: Optional[SystemSettings]
    ) -> Dict[str, Any]:
        """Send email notification."""
        try:
            # Check if email notifications are enabled
            if settings and not settings.weekly_summary_email_enabled:
                return {
                    "email_sent": False,
                    "email_error": "Email notifications are disabled in settings"
                }

            # Determine recipient email
            recipient_email = None
            if settings and settings.weekly_summary_email:
                recipient_email = settings.weekly_summary_email
            elif user.email:
                recipient_email = user.email

            if not recipient_email:
                return {
                    "email_sent": False,
                    "email_error": "No recipient email configured"
                }

            # Prepare email content
            subject = f"您的{summary.year}年第{summary.week_number}周总结已生成"
            body = self._get_email_body(summary, user)

            # Send email
            email_service = EmailService()
            success, error = email_service.send_email(
                to_email=recipient_email,
                subject=subject,
                body=body
            )

            if success:
                return {
                    "email_sent": True,
                    "email_recipient": recipient_email,
                    "email_error": None
                }
            else:
                return {
                    "email_sent": False,
                    "email_recipient": recipient_email,
                    "email_error": error
                }

        except Exception as e:
            return {
                "email_sent": False,
                "email_error": f"Failed to send email: {str(e)}"
            }

    def _send_feishu_notification(
        self,
        summary: WeeklySummary,
        user: User,
        settings: Optional[SystemSettings]
    ) -> Dict[str, Any]:
        """Send Feishu notification."""
        try:
            # Check if Feishu notifications are enabled
            if not settings or not settings.weekly_summary_feishu_enabled:
                return {
                    "feishu_sent": False,
                    "feishu_error": "Feishu notifications are disabled in settings"
                }

            # Check required credentials
            if not all([
                settings.feishu_app_id,
                settings.feishu_app_secret,
                settings.feishu_chat_id
            ]):
                return {
                    "feishu_sent": False,
                    "feishu_error": "Feishu credentials not configured"
                }

            # Prepare Feishu service
            feishu_service = FeishuService(
                app_id=settings.feishu_app_id,
                app_secret=settings.feishu_app_secret
            )

            # Send card with full stats
            success, message_id, error = feishu_service.send_weekly_summary_card(
                chat_id=settings.feishu_chat_id,
                username=user.username,
                year=summary.year,
                week_number=summary.week_number,
                start_date=str(summary.start_date),
                end_date=str(summary.end_date),
                total_tasks=summary.total_tasks,
                completed_tasks=summary.completed_tasks,
                completion_rate=summary.completion_rate,
                stats=summary.stats
            )

            if success:
                return {
                    "feishu_sent": True,
                    "feishu_chat_id": settings.feishu_chat_id,
                    "feishu_error": None
                }
            else:
                return {
                    "feishu_sent": False,
                    "feishu_chat_id": settings.feishu_chat_id,
                    "feishu_error": error
                }

        except Exception as e:
            return {
                "feishu_sent": False,
                "feishu_error": f"Failed to send Feishu notification: {str(e)}"
            }

    def _get_email_body(self, summary: WeeklySummary, user: User) -> str:
        """Generate HTML email body for weekly summary."""
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
                .stat-box {{ background: white; border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 8px; }}
                .stat-row {{ display: flex; justify-content: space-between; margin: 5px 0; }}
                .stat-label {{ color: #6b7280; }}
                .stat-value {{ font-weight: bold; color: #111827; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
                .button {{ display: inline-block; padding: 12px 24px; background: linear-gradient(to right, #6366f1, #a855f7); color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Fix Life 周总结</h1>
                </div>
                <div class="content">
                    <h2>您好 {user.username}，</h2>
                    <p>您的{summary.year}年第{summary.week_number}周总结已生成！</p>

                    <div class="stat-box">
                        <h3 style="margin-top: 0;">📊 本周统计</h3>
                        <div class="stat-row">
                            <span class="stat-label">时间范围</span>
                            <span class="stat-value">{summary.start_date} 至 {summary.end_date}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">总任务数</span>
                            <span class="stat-value">{summary.total_tasks}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">已完成</span>
                            <span class="stat-value">{summary.completed_tasks}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">完成率</span>
                            <span class="stat-value">{summary.completion_rate}%</span>
                        </div>
                    </div>

                    <div style="text-align: center;">
                        <a href="http://localhost:5173/weekly-summaries/{summary.id}" class="button">查看详细报告</a>
                    </div>

                    <p>请登录系统查看完整报告和每日详情。</p>
                </div>
                <div class="footer">
                    <p>此邮件由系统自动发送，请勿回复。</p>
                </div>
            </div>
        </body>
        </html>
        """
