#!/usr/bin/env python3
"""
Script para iniciar a aplicação completa WhatsApp Automation
Frontend (buildado) + Backend (Flask + Playwright)
"""

import subprocess
import sys
import os
import time
import threading
import webbrowser
import platform
from http.server import SimpleHTTPRequestHandler
from socketserver import TCPServer

# Caminho base do script
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
DIST_DIR = os.path.join(BASE_DIR, "dist")

def serve_frontend():
    """Serviço estático para o build do React (porta 5173)"""
    try:
        os.chdir(DIST_DIR)
        handler = SimpleHTTPRequestHandler
        with TCPServer(("localhost", 5173), handler) as httpd:
            print("⚛️ Frontend React (static) rodando em http://localhost:5173")
            httpd.serve_forever()
    except Exception as e:
        print(f"❌ Erro ao iniciar frontend: {e}")

def install_backend_dependencies():
    """Instala as dependências do backend"""
    print("📦 Instalando dependências do backend...")
    try:
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], cwd=BACKEND_DIR, capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Dependências do backend instaladas com sucesso")
            print("🚀 Instalando navegadores do Playwright...")
            result_playwright = subprocess.run([
                sys.executable, "-m", "playwright", "install", "chromium"
            ], cwd=BACKEND_DIR, capture_output=True, text=True)

            if result_playwright.returncode == 0:
                print("✅ Navegadores do Playwright instalados com sucesso")
            else:
                print(f"⚠️ Aviso na instalação dos navegadores: {result_playwright.stderr}")
        else:
            print(f"⚠️ Aviso na instalação das dependências: {result.stderr}")
    except Exception as e:
        print(f"❌ Erro ao instalar dependências do backend: {e}")

def start_backend():
    """Inicia o servidor backend (Flask)"""
    print("🐍 Iniciando backend Flask...")
    try:
        subprocess.Popen(["python", "app.py"], cwd=BACKEND_DIR, shell=True)
    except Exception as e:
        print(f"❌ Erro ao iniciar o backend: {e}")

def open_browser():
    """Abre o navegador apontando para a interface"""
    time.sleep(5)  # Tempo para garantir que tudo iniciou
    print("🌐 Abrindo navegador em http://localhost:5173")
    webbrowser.open("http://localhost:5173")

def main():
    print("🚀 WhatsApp Automation Suite")
    print("=" * 60)
    print("🐍 Backend Python (Flask API)")
    print("⚛️ Frontend React (buildado)")
    print("=" * 60)

    index_path = os.path.join(DIST_DIR, "index.html")
    assets_path = os.path.join(DIST_DIR, "assets")

    if not os.path.exists(BACKEND_DIR) or not os.path.exists(os.path.join(BACKEND_DIR, "app.py")):
        print("❌ Backend não encontrado em backend/app.py")
        return

    if not os.path.exists(index_path) or not os.path.exists(assets_path):
        print("❌ Frontend buildado não encontrado (index.html ou pasta assets ausente)")
        return

    try:
        install_backend_dependencies()

        # Inicia frontend (porta 5173)
        frontend_thread = threading.Thread(target=serve_frontend, daemon=True)
        frontend_thread.start()

        # Inicia backend (porta 5000)
        backend_thread = threading.Thread(target=start_backend, daemon=True)
        backend_thread.start()

        open_browser()

        # Mantém o processo ativo
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n⏹ Aplicação interrompida pelo usuário")
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()
