FROM mcr.microsoft.com/playwright/python:v1.48.0-focal

# Instala dependências gráficas
RUN apt-get update && apt-get install -y \
    xfce4 xfce4-goodies tightvncserver novnc websockify curl net-tools \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Cria diretórios para VNC/noVNC
RUN mkdir -p /root/.vnc && \
    echo 'password' | vncpasswd -f > /root/.vnc/passwd && \
    chmod 600 /root/.vnc/passwd

# Copia sua aplicação
WORKDIR /app
COPY ./backend /app/backend
WORKDIR /app/backend

# Instala dependências da aplicação
RUN pip install --upgrade pip && pip install -r requirements.txt

# Exponha as portas do noVNC e da API Flask
EXPOSE 6901 10000

# Inicia VNC + API
CMD bash -c "vncserver :1 && /usr/share/novnc/utils/novnc_proxy --vnc localhost:5901 --listen 6901 & gunicorn app:app --bind 0.0.0.0:10000"
