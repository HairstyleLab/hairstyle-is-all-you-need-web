import os
from django.conf import settings
from django.core.management.base import BaseCommand
from pictorial_book.models import HairStyleDictionary, HairStyleImage

BASE_DIR = os.path.join(settings.MEDIA_ROOT, "pictorial_book")

class Command(BaseCommand):
    help = "Load pictorial book images into DB"

    def handle(self, *args, **kwargs):

        for gender in os.listdir(BASE_DIR):
            gender_path = os.path.join(BASE_DIR, gender)
            if not os.path.isdir(gender_path):
                continue

            for category in os.listdir(gender_path):
                category_path = os.path.join(gender_path, category)
                if not os.path.isdir(category_path):
                    continue

                for name in os.listdir(category_path):
                    name_path = os.path.join(category_path, name)
                    if not os.path.isdir(name_path):
                        continue

                    dict_obj, created = HairStyleDictionary.objects.get_or_create(
                        name=name,
                        gender=gender,
                        category=category,
                        defaults={"description": ""}
                    )

                    for length in os.listdir(name_path):
                        length_path = os.path.join(name_path, length)
                        if not os.path.isdir(length_path):
                            continue

                        for filename in os.listdir(length_path):
                            file_path = f"pictorial_book/{gender}/{category}/{name}/{length}/{filename}"

                            HairStyleImage.objects.create(
                                name_gender=dict_obj,
                                length=length,
                                image_path=file_path
                            )

                            self.stdout.write(
                                self.style.SUCCESS(f"Added: {file_path}")
                            )
