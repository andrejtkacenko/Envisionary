from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Project, Note, Task

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"]
        )
        return user
    
    def get_credentials(self, user):
        try:
            token = GoogleToken.objects.get(user=user)
            credentials = Credentials(
                # ...
            )
            if credentials.expired:
                try:
                    credentials.refresh(GoogleRequest())
                    token.access_token = credentials.token
                    token.expiry = credentials.expiry
                    token.save()
                except Exception as e:
                    logger.error(f"Token refresh failed for user {user.username}: {e}")
                    return None
            return credentials
        except GoogleToken.DoesNotExist:
            logger.error(f"No Google token found for user {user.username}")
            return None
        
class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "description", "created_at"]

    def validate(self, data):
        if not data.get("name"):
            raise serializers.ValidationError("Name is required")
        return data
    
# api/serializers.py
class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "title", "content", "tags", "project", "created_at", "updated_at"]

    def validate_project(self, value):
        if value and value.user != self.context["request"].user:
            raise serializers.ValidationError("Project does not belong to user")
        return value
    
    def validate_tags(self, value):
        if not isinstance(value, list) or not all(isinstance(tag, str) for tag in value):
            raise serializers.ValidationError("Tags must be a list of strings")
        return value
    
class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ["id", "title", "description", "status", "project", "created_at", "updated_at"]

    def validate_project(self, value):
        if value and value.user != self.context["request"].user:
            raise serializers.ValidationError("Project does not belong to user")
        return value