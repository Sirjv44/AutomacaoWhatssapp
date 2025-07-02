FROM mcr.microsoft.com/playwright/python:v1.48.0-focal

RUN apt-get update && apt-get install -y \
    xfce4 xfce4-goodies tightvncserver git curl net-tools \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Clona o noVNC para /opt/novnc
RUN git clone https://github.com/novnc/noVNC.git /opt/novnc

# Configura senha VNC
RUN mkdir -p /root/.vnc && \
    echo 'password' | vncpasswd -f > /root/.vnc/passwd && \
    chmod 600 /root/.vnc/passwd

WORKDIR /app
COPY ./backend /app/backend
WORKDIR /app/backend

RUN pip install --upgrade pip && pip install -r requirements.txt

EXPOSE 6901 10000

CMD bash -c "vncserver :1 -geometry 1280x800 -depth 24 && /opt/novnc/utils/novnc_proxy --vnc localhost:5901 --listen 6901 & gunicorn app:app --bind 0.0.0.0:10000"
