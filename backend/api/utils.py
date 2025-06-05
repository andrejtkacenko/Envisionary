from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request as GoogleRequest
from django.conf import settings
import logging
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

def get_google_credentials(user):
    try:
        token = GoogleToken.objects.get(user=user)
        credentials = Credentials(
            token=token.access_token,
            refresh_token=token.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_OAUTH2_CLIENT_CONFIG["web"]["client_id"],
            client_secret=settings.GOOGLE_OAUTH2_CLIENT_CONFIG["web"]["client_secret"],
        )
        if credentials.expired:
            logger.info(f"Refreshing token for user {user.username}")
            credentials.refresh(GoogleRequest())
            token.access_token = credentials.token
            token.expiry = credentials.expiry
            token.save()
        return credentials
    except GoogleToken.DoesNotExist:
        logger.error(f"No Google token found for user {user.username}")
        return None


class GoogleAuthError(APIException):
    status_code = 400
    default_detail = 'Google authentication failed'
    default_code = 'google_auth_failed'