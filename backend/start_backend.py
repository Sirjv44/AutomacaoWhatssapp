#!/usr/bin/env python3
"""
Script para iniciar o backend da aplicação WhatsApp Automation
"""

import subprocess
import sys
import os
import time

def check_dependencies():
    """Verifica se as dependências estão instaladas"""
    try:
        import flask
        import flask_cors
        print("✅ Dependências Flask encontradas")
        return True
    except ImportError:
        print("❌ Dependências não encontradas")
        return False

def install_dependencies():
    """Instala as dependências necessárias"""
    print("📦 Instalando dependências...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependências instaladas com sucesso")
        return True
    except subprocess.CalledProcessError:
        print("❌ Erro ao instalar dependências")
        return False

def start_backend():
    """Inicia o servidor backend"""
    print("🚀 Iniciando servidor backend...")
    try:
        subprocess.run([sys.executable, "app.py"])
    except KeyboardInterrupt:
        print("\n⏹️  Servidor backend interrompido")
    except Exception as e:
        print(f"❌ Erro ao iniciar servidor: {e}")

def main():
    print("🔧 WhatsApp Automation Backend Starter")
    print("="*50)
    
    # Verifica se está no diretório correto
    if not os.path.exists("app.py"):
        print("❌ Arquivo app.py não encontrado")
        print("   Certifique-se de estar no diretório backend/")
        return
    
    # Verifica dependências
    if not check_dependencies():
        if not install_dependencies():
            return
    
    print("\n🌐 Iniciando servidor em http://localhost:5000")
    print("📡 Frontend React pode se conectar neste endereço")
    print("⏹️  Pressione Ctrl+C para parar o servidor")
    print("="*50)
    
    start_backend()

if __name__ == "__main__":
    main()