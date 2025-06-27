#!/usr/bin/env python3
"""
Script para iniciar a aplicação completa WhatsApp Automation
Frontend React + Backend Python
"""

import subprocess
import sys
import os
import time
import threading
import webbrowser
import platform

def install_backend_dependencies():
    """Instala as dependências do backend"""
    print("📦 Instalando dependências do backend...")
    try:
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], cwd="backend", capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Dependências do backend instaladas com sucesso")
            
            # Agora instalar navegadores do Playwright
            print("🚀 Instalando navegadores do Playwright...")
            result_playwright = subprocess.run([
                sys.executable, "-m", "playwright", "install"
            ], cwd="backend", capture_output=True, text=True)
            
            if result_playwright.returncode == 0:
                print("✅ Navegadores do Playwright instalados com sucesso")
            else:
                print(f"⚠️ Aviso na instalação dos navegadores Playwright: {result_playwright.stderr}")
        
        else:
            print(f"⚠️  Aviso na instalação das dependências: {result.stderr}")
    except Exception as e:
        print(f"❌ Erro ao instalar dependências do backend: {e}")

def start_backend():
    """Inicia o servidor backend Flask"""
    print("🐍 Iniciando backend Python...")
    try:
        process = subprocess.Popen([sys.executable, "app.py"], cwd="backend")
        # Rodando em background, não espera finalizar aqui
    except Exception as e:
        print(f"❌ Erro no backend: {e}")

def start_frontend():
    """Inicia o servidor frontend React"""
    print("⚛️  Iniciando frontend React...")
    try:
        npm_cmd = "npm"
        if platform.system() == "Windows":
            npm_cmd = "npm.cmd"

        # Ajuste aqui o caminho do frontend se estiver em subpasta, por exemplo:
        # frontend_path = os.path.join(os.getcwd(), "frontend")
        frontend_path = os.getcwd()  # Assumindo que package.json está na raiz

        subprocess.run([npm_cmd, "run", "dev"], cwd=frontend_path)
    except Exception as e:
        print(f"❌ Erro no frontend: {e}")

def main():
    print("🚀 WhatsApp Advanced Automation Suite")
    print("="*60)
    print("Iniciando aplicação completa:")
    print("  🐍 Backend Python (Flask API)")
    print("  ⚛️  Frontend React (Interface)")
    print("="*60)
    
    # Verifica se os arquivos necessários existem
    if not os.path.exists("backend/app.py"):
        print("❌ Backend não encontrado em backend/app.py")
        return
    
    if not os.path.exists("package.json"):
        print("❌ Frontend não encontrado - package.json não existe")
        return
    
    try:
        # Instala dependências do backend primeiro
        install_backend_dependencies()
        
        # Inicia backend em thread separada
        backend_thread = threading.Thread(target=start_backend, daemon=True)
        backend_thread.start()
        
        print("⏳ Aguardando backend inicializar...")
        time.sleep(15)  # Tempo para backend iniciar
        
        print("🌐 Abrindo navegador em http://localhost:5173")
        time.sleep(2)
        webbrowser.open("http://localhost:5173")
        
        # Inicia frontend (processo principal)
        start_frontend()
        
    except KeyboardInterrupt:
        print("\n⏹️  Aplicação interrompida pelo usuário")
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    main()
