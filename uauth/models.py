from django.db import models
from django.utils import timezone
from datetime import timedelta

class EmailVerification(models.Model):
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-created_at']
    
    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(minutes=3)
    
    def __str__(self):
        return f"{self.email} - {self.code}"
