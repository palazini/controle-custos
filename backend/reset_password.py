import os
import sys
import django

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User

username = "gabriel.palazini"
try:
    user = User.objects.get(username=username)
    user.set_password("admin123")
    user.save()
    print(f"SUCESSO: Senha do usuário '{username}' alterada para 'admin123'")
except User.DoesNotExist:
    print(f"ERRO: Usuário '{username}' não encontrado!")
except Exception as e:
    print(f"ERRO: {e}")
