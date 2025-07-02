FROM consol/centos-xfce-vnc

USER root

# Instalações básicas
RUN yum -y update && \
    yum -y install epel-release && \
    yum -y install python3 python3-pip git xvfb && \
    pip3 install --upgrade pip

# Instala dependências do projeto
COPY ./backend /app/backend
WORKDIR /app/backend
RUN pip3 install -r requirements.txt

# Instala o Playwright e os browsers
RUN pip3 install playwright && playwright install chromium

# Expõe a porta da API Flask
EXPOSE 10000

# Inicia o Xvfb + VNC + Gunicorn
CMD /dockerstartup/vnc_startup.sh & \
    Xvfb :99 -screen 0 1280x1024x24 & \
    export DISPLAY=:99 && \
    gunicorn app:app --bind 0.0.0.0:10000
