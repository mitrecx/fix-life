"""Feishu service for sending messages via Feishu Open Platform API."""
import json
import requests
from typing import Dict, Any, Optional, Tuple
from datetime import datetime


class FeishuService:
    """Service for sending messages via Feishu Open Platform API."""

    def __init__(self, app_id: str, app_secret: str):
        """
        Initialize Feishu service with app credentials.

        Args:
            app_id: Feishu app ID (e.g., cli_xxxxxxxxxxxxx)
            app_secret: Feishu app secret
        """
        self.app_id = app_id
        self.app_secret = app_secret
        self.base_url = "https://open.feishu.cn/open-apis"
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    def get_access_token(self) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Get tenant access token for API requests.

        Returns:
            Tuple of (success: bool, token: str|None, error_message: str|None)
        """
        # Check if current token is still valid
        if self._access_token and self._token_expires_at:
            if datetime.now() < self._token_expires_at:
                return True, self._access_token, None

        try:
            url = f"{self.base_url}/auth/v3/tenant_access_token/internal"
            payload = {
                "app_id": self.app_id,
                "app_secret": self.app_secret
            }

            response = requests.post(url, json=payload, timeout=10)
            data = response.json()

            if data.get("code") == 0:
                token = data.get("tenant_access_token")
                expire = data.get("expire", 7200)  # Default 2 hours

                # Set token with expiration buffer (subtract 5 minutes for safety)
                self._access_token = token
                self._token_expires_at = datetime.now().timestamp() + expire - 300

                return True, token, None
            else:
                error_msg = data.get("msg", "Unknown error")
                return False, None, f"Failed to get access token: {error_msg}"

        except requests.RequestException as e:
            return False, None, f"Request failed: {str(e)}"
        except Exception as e:
            return False, None, f"Unexpected error: {str(e)}"

    def send_text_message(
        self,
        chat_id: str,
        text: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Send a text message to a Feishu group chat.

        Args:
            chat_id: Target group chat ID (open_chat_id)
            text: Message text content

        Returns:
            Tuple of (success: bool, message_id: str|None, error_message: str|None)
        """
        return self.send_message(
            chat_id=chat_id,
            msg_type="text",
            content={"text": text}
        )

    def send_post_message(
        self,
        chat_id: str,
        title: str,
        content: list
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Send a rich text message to a Feishu group chat.

        Args:
            chat_id: Target group chat ID (open_chat_id)
            title: Message title
            content: Rich text content (see Feishu API docs for format)

        Returns:
            Tuple of (success: bool, message_id: str|None, error_message: str|None)
        """
        post_content = {
            "post": {
                "zh_cn": {
                    "title": title,
                    "content": content
                }
            }
        }
        return self.send_message(
            chat_id=chat_id,
            msg_type="post",
            content=post_content
        )

    def send_card_message(
        self,
        chat_id: str,
        card_content: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Send an interactive card message to a Feishu group chat.

        Args:
            chat_id: Target group chat ID (open_chat_id)
            card_content: Card content JSON (see Feishu API docs for format)

        Returns:
            Tuple of (success: bool, message_id: str|None, error_message: str|None)
        """
        return self.send_message(
            chat_id=chat_id,
            msg_type="interactive",
            content=card_content
        )

    def send_message(
        self,
        chat_id: str,
        msg_type: str,
        content: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Send a message to a Feishu group chat.

        Args:
            chat_id: Target group chat ID (open_chat_id)
            msg_type: Message type (text, post, interactive)
            content: Message content

        Returns:
            Tuple of (success: bool, message_id: str|None, error_message: str|None)
        """
        # Get access token
        success, token, error = self.get_access_token()
        if not success:
            return False, None, error

        try:
            # receive_id_type should be a query parameter, not in the body
            url = f"{self.base_url}/im/v1/messages?receive_id_type=chat_id"
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }

            payload = {
                "receive_id": chat_id,
                "msg_type": msg_type,
                "content": json.dumps(content, ensure_ascii=False)
            }

            response = requests.post(url, headers=headers, json=payload, timeout=10)
            data = response.json()

            if data.get("code") == 0:
                message_id = data.get("data", {}).get("msg_id")
                return True, message_id, None
            else:
                error_msg = data.get("msg", "Unknown error")
                error_code = data.get("code")
                # Log full response for debugging
                print(f"[DEBUG] Feishu API Error Response: {data}")
                print(f"[DEBUG] Request payload: {payload}")
                return False, None, f"Failed to send message (code: {error_code}): {error_msg}"

        except requests.RequestException as e:
            return False, None, f"Request failed: {str(e)}"
        except Exception as e:
            return False, None, f"Unexpected error: {str(e)}"

    def send_weekly_summary_card(
        self,
        chat_id: str,
        username: str,
        year: int,
        week_number: int,
        start_date: str,
        end_date: str,
        total_tasks: int,
        completed_tasks: int,
        completion_rate: float,
        stats: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Send a weekly summary card to a Feishu group chat.

        Args:
            chat_id: Target group chat ID
            username: User's name
            year: Year of the summary
            week_number: Week number
            start_date: Start date string
            end_date: End date string
            total_tasks: Total number of tasks
            completed_tasks: Number of completed tasks
            completion_rate: Completion rate percentage
            stats: Full statistics including daily_data

        Returns:
            Tuple of (success: bool, message_id: str|None, error_message: str|None)
        """
        # Build daily summary text with full task list
        daily_data = stats.get("daily_data", [])
        daily_summary_lines = []

        for day_data in sorted(daily_data, key=lambda x: x["date"]):
            date_str = day_data["date"]
            title = day_data.get("title", "")
            day_total = day_data.get("total_tasks", 0)
            day_completed = day_data.get("completed_tasks", 0)
            day_rate = day_data.get("completion_rate", 0)
            tasks = day_data.get("tasks", [])

            # Format date (remove year for brevity)
            date_short = date_str[5:]  # MM-DD

            # Build task list
            task_lines = []
            for task in tasks:
                task_title = task.get("title", "")
                task_status = task.get("status", "todo")

                # Status emoji
                status_map = {
                    "done": "✅",
                    "in-progress": "🔄",
                    "todo": "⬜",
                    "cancelled": "❌"
                }
                status_emoji = status_map.get(task_status, "⬜")

                task_lines.append(f"  {status_emoji} {task_title}")

            tasks_text = "\n".join(task_lines) if task_lines else "  无任务"

            day_line = f"**{date_short}** {title}\n任务: {day_completed}/{day_total} ({day_rate}%)\n{tasks_text}"
            daily_summary_lines.append(day_line)

        daily_summary_text = "\n\n".join(daily_summary_lines)

        card_content = {
            "config": {
                "wide_screen_mode": True
            },
            "header": {
                "title": {
                    "content": f"📊 {username}的周总结",
                    "tag": "plain_text"
                },
                "template": "blue"
            },
            "elements": [
                {
                    "tag": "div",
                    "text": {
                        "content": f"**时间范围**\n{year}年第{week_number}周 ({start_date} 至 {end_date})",
                        "tag": "lark_md"
                    }
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "fields": [
                        {
                            "is_short": True,
                            "text": {
                                "content": f"**总任务数**\n{total_tasks}",
                                "tag": "lark_md"
                            }
                        },
                        {
                            "is_short": True,
                            "text": {
                                "content": f"**已完成**\n{completed_tasks}",
                                "tag": "lark_md"
                            }
                        },
                        {
                            "is_short": True,
                            "text": {
                                "content": f"**完成率**\n{completion_rate}%",
                                "tag": "lark_md"
                            }
                        }
                    ]
                },
                {
                    "tag": "hr"
                },
                {
                    "tag": "div",
                    "text": {
                        "content": f"**每日详情**\n\n{daily_summary_text}",
                        "tag": "lark_md"
                    }
                }
            ]
        }

        return self.send_card_message(chat_id, card_content)
