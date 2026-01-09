import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User

print(f"{'Username':<20} | {'Is Staff':<10} | {'Is Superuser':<15}")
print("-" * 50)

users = User.objects.all()
if not users.exists():
    print("Nenhum usuário encontrado no banco de dados!")
else:
    for u in users:
        print(f"{u.username:<20} | {str(u.is_staff):<10} | {str(u.is_superuser):<15}")
