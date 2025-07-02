FROM consol/centos-xfce-vnc

USER root

# Instalações básicas
RUN yum -y install python3 python3-pip git && \
    pip3 install --upgrade pip

# Instala dependências do projeto
COPY ./backend /app/backend
WORKDIR /app/backend
RUN pip3 install -r requirements.txt

# Instala o Playwright, Xvfb e os browsers
RUN yum -y install xorg-x11-server-Xvfb && \
    pip3 install playwright && playwright install chromium


# Expõe a porta da API Flask
EXPOSE 10000

# Inicia o Gunicorn ao lado do VNC
CMD /dockerstartup/vnc_startup.sh & gunicorn app:app --bind 0.0.0.0:10000
