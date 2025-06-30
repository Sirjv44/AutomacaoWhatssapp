# Usa imagem base do Playwright + Python
FROM mcr.microsoft.com/playwright/python:v1.48.0-focal

WORKDIR /app
COPY . .

RUN pip install --upgrade pip && pip install -r requirements.txt

EXPOSE 10000
CMD ["gunicorn", "backend.app:app", "--bind", "0.0.0.0:10000"]
