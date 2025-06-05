# api/tests.py
from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from .models import Project, Note, Task
from .serializers import ProjectSerializer, NoteSerializer, TaskSerializer

class APITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.client.login(username="testuser", password="testpass")
        # Получение CSRF-токена
        response = self.client.get("/api/get-csrf-token/")
        self.client.cookies['csrftoken'] = response.json()['csrfToken']

    def test_create_project(self):
        response = self.client.post(
            "/api/projects/",
            {"name": "Test Project", "description": "Test"},
            HTTP_X_CSRFTOKEN=self.client.cookies['csrftoken'].value
        )
        self.assertEqual(response.status_code, 201)

    def test_create_task(self):
        project = Project.objects.create(name="Test Project", user=self.user)
        response = self.client.post(
            "/api/tasks/",
            {"title": "Test Task", "project": project.id},
            HTTP_X_CSRFTOKEN=self.client.cookies['csrftoken'].value
        )
        self.assertEqual(response.status_code, 201)

    def test_create_note(self):
        response = self.client.post(
            "/api/notes/",
            {
                "title": "Test Note",
                "content": "Content",
                "tags": ["test"],  # Убедись, что tags — список строк
            },
            format='json',  # Явно укажи JSON-формат
            HTTP_X_CSRFTOKEN=self.client.cookies['csrftoken'].value
        )
        self.assertEqual(response.status_code, 201)