#!/usr/bin/env python3
"""
Script para instalar dependências do WhatsApp Automation Tool
"""

import subprocess
import sys
import os

def run_command(command):
    """Executa um comando e retorna o resultado"""
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        return False, e.stderr

def main():
    print("🔧 Instalando dependências do WhatsApp Automation Tool")
    print("="*60)
    
    # Verifica se Python está instalado
    print("🐍 Verificando Python...")
    success, output = run_command("python --version")
    if not success:
        success, output = run_command("python3 --version")
        if not success:
            print("❌ Python não encontrado. Instale Python 3.8+ primeiro.")
            return
    
    print(f"✅ {output.strip()}")
    
    # Instala pip se necessário
    print("\n📦 Verificando pip...")
    success, output = run_command("pip --version")
    if not success:
        print("📦 Instalando pip...")
        success, output = run_command("python -m ensurepip --upgrade")
        if not success:
            print("❌ Erro ao instalar pip")
            return
    
    print("✅ pip disponível")
    
    # Instala dependências
    print("\n📚 Instalando dependências Python...")
    
    dependencies = [
        "playwright>=1.40.0",
        "pandas>=2.0.0"
    ]
    
    for dep in dependencies:
        print(f"   Instalando {dep}...")
        success, output = run_command(f"pip install {dep}")
        if not success:
            print(f"❌ Erro ao instalar {dep}: {output}")
            return
        print(f"   ✅ {dep} instalado")
    
    # Instala navegadores do Playwright
    print("\n🌐 Instalando navegadores do Playwright...")
    success, output = run_command("playwright install chromium")
    if not success:
        print(f"❌ Erro ao instalar navegadores: {output}")
        return
    
    print("✅ Navegadores instalados")
    
    # Cria arquivo de exemplo CSV
    print("\n📄 Criando arquivo de exemplo...")
    csv_content = """nome,numero,tipo
João Silva,5562999999999,lead
Maria Santos,5562888888888,administrador
Pedro Costa,5562777777777,lead
Ana Lima,5562666666666,lead
Carlos Admin,5562555555555,administrador
"""
    
    with open('contatos_exemplo.csv', 'w', encoding='utf-8') as f:
        f.write(csv_content)
    
    print("✅ Arquivo 'contatos_exemplo.csv' criado")
    
    print("\n🎉 Instalação concluída com sucesso!")
    print("\n📋 Próximos passos:")
    print("1. Edite o arquivo 'contatos_exemplo.csv' com seus contatos")
    print("2. Execute: python whatsapp_advanced_automation.py")
    print("3. Ou execute: python whatsapp_contact_extractor.py")
    print("\n⚠️  Lembre-se de usar com responsabilidade!")

if __name__ == "__main__":
    main()