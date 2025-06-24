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

def install_backend_dependencies():
    """Instala as dependências do backend"""
    print("📦 Instalando dependências do backend...")
    try:
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], cwd="backend", capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Dependências do backend instaladas com sucesso")
        else:
            print(f"⚠️  Aviso na instalação das dependências: {result.stderr}")
    except Exception as e:
        print(f"❌ Erro ao instalar dependências do backend: {e}")

def start_backend():
    """Inicia o servidor backend Flask"""
    print("🐍 Iniciando backend Python...")
    try:
        # Usa subprocess.Popen com cwd para manter o diretório correto
        process = subprocess.Popen([sys.executable, "app.py"], cwd="backend")
        # Removed process.wait() to allow backend to run in background
    except Exception as e:
        print(f"❌ Erro no backend: {e}")

def start_frontend():
    """Inicia o servidor frontend React"""
    print("⚛️  Iniciando frontend React...")
    try:
        subprocess.run(["npm", "run", "dev"])
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
        time.sleep(15)  # Aumentado de 10 para 15 segundos
        
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