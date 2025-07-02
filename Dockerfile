FROM consol/centos-xfce-vnc

USER root

# Instalações básicas
RUN yum -y install python3 python3-pip git && \
    pip3 install --upgrade pip

# Usa imagem base com XFCE e VNC
FROM consol/centos-xfce-vnc

# Define variáveis de ambiente para evitar prompts do Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PYTHONUNBUFFERED=1

# Instala dependências Python
COPY ./backend /app/backend
WORKDIR /app/backend

# Instala pip e dependências
RUN yum -y install epel-release && \
    yum -y install python3 python3-pip && \
    pip3 install -r requirements.txt

# Instala Playwright e navegador Chromium
RUN pip3 install playwright && \
    playwright install chromium

# Expõe a porta da API Flask
EXPOSE 10000

# Comando para iniciar VNC + Flask via Gunicorn
CMD /dockerstartup/vnc_startup.sh & \
    xvfb-run --auto-servernum --server-args='-screen 0 1366x768x24' \
    gunicorn app:app --bind 0.0.0.0:10000

