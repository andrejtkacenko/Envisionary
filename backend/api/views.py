from django.middleware.csrf import get_token
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Project, Note
from .serializers import UserSerializer, ProjectSerializer, NoteSerializer, TaskSerializer
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request as GoogleRequest
from django.shortcuts import redirect
from datetime import datetime, timedelta
import os
from .models import GoogleToken
import logging
from django.conf import settings
from .utils import get_google_credentials



logger = logging.getLogger(__name__)

class CSRFTokenView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        token = get_token(request)
        return Response({"csrfToken": token})

class RegisterView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            login(request, user)
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, email=email, password=password)
        if user:
            login(request, user)
            return Response({'message': 'Login successful'}, status=status.HTTP_200_OK)
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            

            

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        logout(request)
        return Response({"message": "Logout successful"})

class CheckAuthView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        if request.user.is_authenticated:
            return Response({"isAuthenticated": True, "username": request.user.username})
        return Response({"isAuthenticated": False})

class ProjectView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        projects = Project.objects.filter(user=request.user)
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ProjectSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def put(self, request, pk):
        project = Project.objects.get(pk=pk, user=request.user)
        serializer = ProjectSerializer(project, data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        project = Project.objects.get(pk=pk, user=request.user)
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class NoteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notes = Note.objects.filter(user=request.user)
        serializer = NoteSerializer(notes, many=True)
        return Response(serializer.data)

    def post(self, request):
        project_id = request.data.get("project")
        project = None
        if project_id:
            try:
                project = Project.objects.get(id=project_id, user=request.user)
            except Project.DoesNotExist:
                return Response({"error": "Project not found or not owned by user"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = NoteSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(project=project, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        try:
            note = Note.objects.get(pk=pk, user=request.user)
        except Note.DoesNotExist:
            return Response({"error": "Note not found or not owned by user"}, status=status.HTTP_404_NOT_FOUND)
        serializer = NoteSerializer(note, data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            note = Note.objects.get(pk=pk, user=request.user)
        except Note.DoesNotExist:
            return Response({"error": "Note not found or not owned by user"}, status=status.HTTP_404_NOT_FOUND)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class TaskView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tasks = Task.objects.filter(user=request.user)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

    def post(self, request):
        project_id = request.data.get("project")
        project = None
        if project_id:
            try:
                project = Project.objects.get(id=project_id, user=request.user)
            except Project.DoesNotExist:
                return Response({"error": "Project not found or not owned by user"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = TaskSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(project=project, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GoogleAuthView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        logger.info("GoogleAuthView: User: %s, Session ID: %s", request.user, request.session.session_key)
        flow = Flow.from_client_config(
            settings.GOOGLE_OAUTH2_CLIENT_CONFIG,
            scopes=["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
        )
        flow.redirect_uri = settings.GOOGLE_OAUTH2_REDIRECT_URI
        auth_url, state = flow.authorization_url(access_type="offline", include_granted_scopes="true")
        request.session["google_oauth_state"] = state
        request.session.modified = True
        logger.info("GoogleAuthView: State stored: %s, Auth URL: %s", state, auth_url)
        return Response({"auth_url": auth_url})
    
    

class GoogleCallbackView(APIView):
    def get(self, request):
        if not request.user.is_authenticated:
            logger.error("Unauthenticated user in GoogleCallbackView")
            return Response({"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        session_state = request.session.get("google_oauth_state")
        request_state = request.GET.get("state", None)

        logger.info(f"GoogleCallbackView: User: {request.user.username}, Session ID: {request.session.session_key}")
        logger.info(f"GoogleCallbackView: Session state: {session_state}, Request state: {request_state}")

        if session_state != request_state:
            logger.error("State mismatch in Google callback")
            return Response({"error": "State mismatch"}, status=status.HTTP_400_BAD_REQUEST)

        flow = Flow.from_client_config(
            settings.GOOGLE_OAUTH2_CLIENT_CONFIG,
            scopes=["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
            redirect_uri=settings.GOOGLE_OAUTH2_REDIRECT_URI
        )
        flow.fetch_token(code=request.GET.get("code"))
        credentials = flow.credentials

        logger.info("Fetching token with code: %s", request.GET.get("code"))

        GoogleToken.objects.update_or_create(
            user=request.user,
            defaults={
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "expiry": credentials.expiry,
            }
        )

        logger.info(f"Tokens stored for user {request.user.username}: {credentials.__dict__}")

        return redirect("http://localhost:5173/dashboard?google_connected=true")
    

class GoogleEventsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        credentials = get_google_credentials(request.user)
        if not credentials:
            return Response({"error": "Google Calendar not connected"}, status=status.HTTP_400_BAD_REQUEST)
        # Остальной код без изменений

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        credentials = self.get_credentials(request.user)
        if not credentials:
            return Response({"error": "Google Calendar not connected"}, status=status.HTTP_400_BAD_REQUEST)

        service = build("calendar", "v3", credentials=credentials)
        time_min = request.GET.get("timeMin", datetime.utcnow().isoformat() + "Z")
        time_max = request.GET.get("timeMax", None)
        events_result = service.events().list(
            calendarId="primary",
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy="startTime"
        ).execute()
        events = events_result.get("items", [])
        logger.info(f"Events fetched: {events}")
        return Response(events, status=status.HTTP_200_OK)

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        credentials = self.get_credentials(request.user)
        if not credentials:
            return Response({"error": "Google Calendar not connected"}, status=status.HTTP_400_BAD_REQUEST)

        service = build("calendar", "v3", credentials=credentials)
        event = {
            "summary": request.data.get("summary"),
            "description": request.data.get("description"),
            "start": request.data.get("start"),
            "end": request.data.get("end"),
            "attendees": request.data.get("attendees"),
        }
        try:
            event = service.events().insert(calendarId="primary", body=event).execute()
            logger.info(f"Event created: {event}")
            return Response(event, status=status.HTTP_201_CREATED)
        except HttpError as error:
            logger.error(f"Error creating event: {error}")
            return Response({"error": str(error)}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        credentials = self.get_credentials(request.user)
        if not credentials:
            return Response({"error": "Google Calendar not connected"}, status=status.HTTP_400_BAD_REQUEST)

        service = build("calendar", "v3", credentials=credentials)
        event_id = request.data.get("id")
        if not event_id:
            return Response({"error": "Event ID required"}, status=status.HTTP_400_BAD_REQUEST)

        event = {
            "summary": request.data.get("summary"),
            "description": request.data.get("description"),
            "start": request.data.get("start"),
            "end": request.data.get("end"),
            "attendees": request.data.get("attendees"),
        }
        try:
            updated_event = service.events().update(
                calendarId="primary", eventId=event_id, body=event
            ).execute()
            logger.info(f"Event updated: {updated_event}")
            return Response(updated_event, status=status.HTTP_200_OK)
        except HttpError as error:
            logger.error(f"Error updating event: {error}")
            return Response({"error": str(error)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "User not authenticated"}, status=status.HTTP_401_UNAUTHORIZED)

        credentials = self.get_credentials(request.user)
        if not credentials:
            return Response({"error": "Google Calendar not connected"}, status=status.HTTP_400_BAD_REQUEST)

        service = build("calendar", "v3", credentials=credentials)
        event_id = request.data.get("id")
        if not event_id:
            return Response({"error": "Event ID required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            service.events().delete(calendarId="primary", eventId=event_id).execute()
            logger.info(f"Event deleted: {event_id}")
            return Response({"message": "Event deleted successfully"}, status=status.HTTP_200_OK)
        except HttpError as error:
            logger.error(f"Error deleting event: {error}")
            return Response({"error": str(error)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Добавить в views.py
class GoogleStatusView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            GoogleToken.objects.get(user=request.user)
            return Response({"connected": True}, status=status.HTTP_200_OK)
        except GoogleToken.DoesNotExist:
            return Response({"connected": False}, status=status.HTTP_200_OK)
        

class LinkTelegramView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        telegram_id = request.data.get("telegram_id")
        if not telegram_id:
            return Response({"error": "Telegram ID required"}, status=status.HTTP_400_BAD_REQUEST)
        UserProfile.objects.update_or_create(
            user=request.user,
            defaults={"telegram_id": telegram_id}
        )
        return Response({"message": "Telegram ID linked"}, status=status.HTTP_200_OK)
    

class NotebookLMView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Заглушка для интеграции NotebookLM
        return Response({"message": "NotebookLM integration placeholder"}, status=status.HTTP_200_OK)

class LocalFileView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        file_name = request.data.get("file_name")
        file_path = request.data.get("file_path")
        return Response({"message": f"File {file_name} metadata saved"}, status=status.HTTP_200_OK)

class OfflineSyncView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Заглушка для синхронизации оффлайн-данных
        return Response({"message": "Offline sync placeholder"}, status=status.HTTP_200_OK)
# class ClearSessionView(APIView):
#     permission_classes = [IsAuthenticated]
#     def post(self, request):
#         request.session.flush()
#         return Response({"message": "Session cleared"}, status=status.HTTP_200_OK)