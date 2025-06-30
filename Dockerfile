# Usa imagem base do Playwright + Python
FROM mcr.microsoft.com/playwright/python:v1.48.0-focal

# Instala o servidor X virtual (para rodar browsers em modo não headless)
RUN apt-get update && apt-get install -y \
    xvfb \
    && apt-get clean

# Cria diretório de trabalho
WORKDIR /app

# Copia os arquivos da aplicação
COPY . .

# Instala as dependências Python
RUN pip install --upgrade pip && pip install -r requirements.txt

# Expõe a porta da aplicação
EXPOSE 10000

# Inicia o Gunicorn com xvfb para suportar navegador com GUI
CMD ["xvfb-run", "gunicorn", "backend.app:app", "--bind", "0.0.0.0:10000"]
