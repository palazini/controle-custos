import os
import sys
import django

# Adiciona o diretório atual ao path para encontrar o módulo core
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User

try:
    superusers = User.objects.filter(is_superuser=True)
    if superusers.exists():
        print("SUPERUSERS_FOUND")
        for u in superusers:
            print(f"User: {u.username}")
    else:
        print("NO_SUPERUSERS")
except Exception as e:
    print(f"Error: {e}")
