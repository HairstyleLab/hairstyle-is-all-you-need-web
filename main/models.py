from django.db import models
from django.conf import settings

class Gallery(models.Model):
    image_id = models.AutoField(primary_key=True, verbose_name='이미지 식별자')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='gallery',
        verbose_name='사용자 식별자'
    )

    # 이미지가 MEDIA_ROOT 아래 어디에 저장될지
    # 실제 문자열은 'MEDIA_ROOT/upload_path/파일명.png' 형태로 저장됨
    # upload_path='gallery/'
    image_path = models.ImageField(upload_to='gallery/', verbose_name='갤러리 이미지 경로')
    is_deleted = models.BooleanField(default=False, verbose_name='사용자 삭제 여부')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')

    class Meta:
        db_table = 'gallery'
        ordering = ['-created_at']


class HairStyleDictionary(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=24, verbose_name='도감 이름')
    category = models.CharField(max_length=1, verbose_name='도감 카테고리')
    gender = models.CharField(max_length=1, verbose_name='성별')
    description = models.CharField(max_length=600, verbose_name='헤어스타일 설명')

    class Meta:
        db_table = 'pictorial_book'
        unique_together = ('name', 'gender')


class HairStyleImage(models.Model):
    dict_image_id = models.AutoField(primary_key=True, verbose_name='이미지 식별자')
    name_gender = models.ForeignKey(
        HairStyleDictionary,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name='도감 스타일'
    )
    length = models.CharField(max_length=10, verbose_name='헤어스타일 길이')
    image_path = models.CharField(max_length=255, verbose_name='도감 이미지 경로')

    class Meta:
        db_table = 'pictorial_book_image'

class Chat(models.Model):
    chat_id = models.AutoField(primary_key=True, verbose_name='채팅 내역 식별자')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chats',
        verbose_name='사용자 식별자'
    )
    chat_title = models.CharField(max_length=45, verbose_name='채팅 내역 제목')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')

    class Meta:
        db_table = 'chat'
        ordering = ['-created_at']


class Message(models.Model):
    message_id = models.AutoField(primary_key=True, verbose_name='메세지 식별자')
    chat = models.ForeignKey(
        Chat,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='채팅 내역 식별자'
    )
    image = models.ForeignKey(
        Gallery,
        on_delete=models.SET_NULL,
        related_name='messages',
        null=True,
        blank=True,
        verbose_name='이미지 식별자'
    )

    is_answer = models.CharField(max_length=1, verbose_name='Q, A 구분자', default='Q')
    content = models.CharField(max_length=900, verbose_name='메세지 내용')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')

    class Meta:
        db_table = 'message'
        ordering = ['-created_at']