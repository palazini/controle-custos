# Usar imagem leve do Python
FROM python:3.10-slim

# Evitar criação de arquivos .pyc e logs em buffer
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Diretório de trabalho no container
WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements antes para aproveitar cache do Docker
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copiar todo o código
COPY . /app/

# Coletar arquivos estáticos (CSS/JS admin)
RUN python manage.py collectstatic --noinput

# Expor a porta 8000
EXPOSE 8000

# Comando para iniciar o servidor (Gunicorn)
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "core.wsgi:application"]
