#!/usr/bin/env python3
"""
Backend Flask para WhatsApp Advanced Automation Suite
API REST para automação de grupos e extração de contatos
"""

import os
import sys
import json
import csv
import subprocess
import tempfile
import logging
import threading
import time
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Estado global da aplicação
app_state = {
    'automation_running': False,
    'automation_process': None,
    'automation_status': {
        'isRunning': False,
        'isPaused': False,
        'currentStep': 'Aguardando início da automação',
        'progress': 0,
        'totalContacts': 0,
        'processedContacts': 0,
        'currentGroup': '',
        'currentGroupIndex': 0,
        'totalGroups': 0,
        'logs': [],
        'estimatedTimeRemaining': '',
        'canResume': False,
        'sessionPersisted': False,
        'connectionStatus': 'disconnected',
        'currentSessionId': '',
        'groupsInCurrentSession': 0,
    },
    'contacts': [],
    'last_config': None
}

def ensure_reports_directory():
    """Garante que o diretório reports existe"""
    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    return reports_dir

def convert_js_to_python(obj):
    """Converte recursivamente valores JavaScript para Python"""
    if isinstance(obj, dict):
        result = {}
        for key, value in obj.items():
            result[key] = convert_js_to_python(value)
        return result
    elif isinstance(obj, list):
        return [convert_js_to_python(item) for item in obj]
    elif obj == 'true' or obj is True:
        return True
    elif obj == 'false' or obj is False:
        return False
    elif obj == 'null' or obj is None:
        return None
    else:
        return obj

def validate_phone_number(numero):
    """Valida e formata número de telefone"""
    try:
        # Remove todos os caracteres não numéricos
        numero_limpo = ''.join(filter(str.isdigit, str(numero)))
        
        # Verifica se tem pelo menos 10 dígitos
        if len(numero_limpo) < 10:
            return None
        
        # Adiciona DDI brasileiro se não tiver
        if not numero_limpo.startswith('55'):
            numero_limpo = f"55{numero_limpo}"
        
        return numero_limpo
    except:
        return None

def process_csv_data(file_content):
    """Processa dados do CSV de forma robusta"""
    try:
        contacts = []
        
        # Tenta diferentes encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        csv_text = None
        
        for encoding in encodings:
            try:
                if isinstance(file_content, bytes):
                    csv_text = file_content.decode(encoding)
                else:
                    csv_text = file_content
                break
            except UnicodeDecodeError:
                continue
        
        if not csv_text:
            raise Exception("Não foi possível decodificar o arquivo CSV")
        
        # Processa CSV linha por linha
        lines = csv_text.strip().split('\n')
        if len(lines) < 2:
            raise Exception("CSV deve ter pelo menos cabeçalho e uma linha de dados")
        
        # Verifica cabeçalho
        header = lines[0].lower().strip()
        if 'nome' not in header or 'numero' not in header or 'tipo' not in header:
            raise Exception("CSV deve ter colunas: nome, numero, tipo")
        
        # Processa dados
        reader = csv.DictReader(lines)
        for row_num, row in enumerate(reader, 2):
            try:
                # Extrai dados da linha
                nome = row.get('nome', '').strip()
                numero = row.get('numero', '').strip()
                tipo = row.get('tipo', '').strip().lower()
                
                # Valida número
                numero_validado = validate_phone_number(numero)
                if not numero_validado:
                    print(f"⚠️  Linha {row_num}: Número inválido '{numero}'")
                    continue
                
                # Valida tipo
                if tipo not in ['lead', 'administrador']:
                    print(f"⚠️  Linha {row_num}: Tipo inválido '{tipo}' (deve ser 'lead' ou 'administrador')")
                    continue
                
                # Adiciona contato válido
                contact = {
                    'nome': nome if nome else f"Contato {len(contacts) + 1}",
                    'numero': numero_validado,
                    'tipo': tipo
                }
                contacts.append(contact)
                print(f"✅ Contato válido: {contact['nome']} ({contact['numero']}) - {contact['tipo']}")
                
            except Exception as e:
                print(f"❌ Erro na linha {row_num}: {e}")
                continue
        
        if not contacts:
            raise Exception("Nenhum contato válido encontrado no CSV")
        
        return contacts
        
    except Exception as e:
        print(f"❌ Erro ao processar CSV: {e}")
        raise

@app.route('/api/health', methods=['GET'])
def health_check():
    """Verifica se a API está funcionando"""
    return jsonify({
        'status': 'ok',
        'message': 'WhatsApp Automation API está funcionando',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    try:
        print("📁 Iniciando processamento de upload CSV...")
        
        # Validações básicas
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
        if not file.filename.lower().endswith('.csv'):
            return jsonify({'error': 'Arquivo deve ser CSV'}), 400
        
        # Lê conteúdo do arquivo
        file_content = file.read()
        print(f"📄 Arquivo lido: {len(file_content)} bytes")
        
        # Processa contatos
        contacts = process_csv_data(file_content)
        
        # Calcula estatísticas
        total_contacts = len(contacts)
        total_leads = len([c for c in contacts if c['tipo'] == 'lead'])
        total_admins = len([c for c in contacts if c['tipo'] == 'administrador'])
        estimated_groups = max(1, (total_leads + 998) // 999)  # Arredonda para cima
        
        # Armazena contatos no estado global
        app_state['contacts'] = contacts
        
        print(f"📊 ARQUIVO CSV PROCESSADO: {total_contacts} contatos válidos")
        print(f"  - {total_leads} leads")
        print(f"  - {total_admins} administradores")
        print(f"  - {estimated_groups} grupos estimados")
        
        # Retorna resultado
        return jsonify({
            'success': True,
            'message': f'CSV processado com sucesso! {total_contacts} contatos válidos encontrados.',
            'filename': file.filename,
            'stats': {
                'totalContacts': total_contacts,
                'totalLeads': total_leads,
                'totalAdmins': total_admins,
                'estimatedGroups': estimated_groups,
                'validationMessage': f'{total_contacts} contatos válidos processados'
            },
            'contacts': contacts[:10]  # Primeiros 10 para preview
        })
        
    except Exception as e:
        print(f"❌ Erro geral no upload: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro ao processar arquivo: {str(e)}'}), 500

@app.route('/api/automation/start', methods=['POST'])
def start_automation():
    try:
        print("🚀 INICIANDO automação REAL...")
        
        # Recebe configuração
        data = request.get_json()
        config = data.get('config', {})
        
        print(f"Configuração recebida: {config}")
        print(f"Contatos disponíveis: {len(app_state['contacts'])}")
        
        # Valida se há contatos
        if not app_state['contacts']:
            return jsonify({'error': 'Nenhum contato carregado. Faça upload do CSV primeiro.'}), 400
        
        # Converte configuração para Python
        python_config = convert_js_to_python(config)
        app_state['last_config'] = python_config
        
        # Atualiza estado
        app_state['automation_running'] = True
        app_state['automation_status'].update({
            'isRunning': True,
            'currentStep': 'Gerando script de automação...',
            'totalContacts': len(app_state['contacts']),
            'totalGroups': max(1, (len([c for c in app_state['contacts'] if c['tipo'] == 'lead']) + 998) // 999),
            'logs': ['Iniciando automação REAL...', 'Gerando script Python com Playwright...']
        })
        
        # Gera e executa script Python
        script_path = generate_automation_script(app_state['contacts'], python_config)
        
        if script_path:
            print(f"✅ Script gerado: {script_path}")
            
            # Executa script em background usando thread
            automation_thread = threading.Thread(
                target=execute_automation_script_async, 
                args=(script_path,),
                daemon=True
            )
            automation_thread.start()
            
            return jsonify({
                'success': True,
                'message': 'Automação iniciada com sucesso! O navegador será aberto automaticamente.',
                'script_path': str(script_path)
            })
        else:
            app_state['automation_running'] = False
            app_state['automation_status']['isRunning'] = False
            return jsonify({'error': 'Erro ao gerar script de automação'}), 500
            
    except Exception as e:
        print(f"❌ ERRO na automação: {e}")
        import traceback
        traceback.print_exc()
        
        app_state['automation_running'] = False
        app_state['automation_status']['isRunning'] = False
        
        return jsonify({'error': f'Erro na automação: {str(e)}'}), 500

def generate_automation_script(contacts, config):
    """Gera script Python para automação REAL"""
    try:
        # Garante que o diretório reports existe
        reports_dir = ensure_reports_directory()
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        script_filename = f"automation_script_{timestamp}.py"
        script_path = reports_dir / script_filename
        
        print(f"📝 Gerando script: {script_path}")
        
        # Gera código Python REAL
        script_content = f'''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Automação REAL do WhatsApp
Gerado automaticamente em 24/06/2025 14:31:33
"""

import asyncio
import sys
import os
import random
import time
from datetime import datetime
from playwright.async_api import async_playwright

# Configuração de codificação para Windows
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

class WhatsAppRealAutomation:
    def __init__(self):
        self.page = None
        self.browser = None
        self.playwright = None

        self.config = {
            'baseName': 'Grupo VIP',
            'maxMembers': 999,
            'delay': {'min': 2, 'max': 6},
            'groupDelay': {'min': 30, 'max': 90},
            'createMultiple': True,
            'welcomeMessage': 'Bem-vindos ao nosso grupo! 🎉\n\nEste é um espaço para compartilharmos informações importantes e mantermos contato.\n\nObrigado por fazer parte da nossa comunidade! 👥',
            'enableScheduling': False,
            'enableBanPrevention': True,
            'maxGroupsPerSession': 10
        }

        self.contacts = [
            {'nome': 'Junin', 'numero': '5562994732873', 'tipo': 'administrador'},
            {'nome': 'João Vitor Parreira Guimarães', 'numero': '5562982747219', 'tipo': 'lead'}
        ]

        print("[INIT] Iniciando WhatsApp Automation REAL", flush=True)
        print(f"[INFO] Sessao: session_{datetime.now().strftime('%Y%m%d_%H%M%S')}", flush=True)
        print(f"[INFO] Total de contatos: {{len(self.contacts)}}", flush=True)

    async def start_browser(self):
        print("[START] Abrindo navegador Chrome REAL...", flush=True)
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=False)
            context = await self.browser.new_context(
                viewport={'width': 1366, 'height': 768},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self.page = await context.new_page()

            print("[NAV] Acessando WhatsApp Web...", flush=True)
            await self.page.goto('https://web.whatsapp.com', wait_until='load')

            print("[WAIT] Aguardando login no WhatsApp Web (10 minutos)...", flush=True)
            await self.page.wait_for_selector('div[role="grid"]', timeout=600000)
            print("[OK] Login realizado com sucesso!", flush=True)
            await asyncio.sleep(5)
            return True
        except Exception as e:
            print(f"[ERROR] Falha ao iniciar navegador: {{e}}", flush=True)
            return False

    async def create_group(self, group_name):
        print(f"[START] Criando grupo: {{group_name}}", flush=True)
        try:
            await asyncio.sleep(3)
            await self.page.click('[aria-label="Mais opções"]')
            await asyncio.sleep(1)
            await self.page.click('text="Novo grupo"')
            await asyncio.sleep(3)
            print(f"[OK] Tela de novo grupo aberta: {{group_name}}", flush=True)
            return True
        except Exception as e:
            print(f"[ERROR] Erro ao criar grupo {{group_name}}: {{e}}", flush=True)
            return False

    async def search_and_add_contact(self, contact):
        print(f"[SEARCH] Procurando contato: {{contact['nome']}} ({{contact['numero']}})", flush=True)
        try:
            search_box = await self.page.wait_for_selector('input[placeholder]', timeout=15000)
            await search_box.fill(contact['numero'])
            await asyncio.sleep(3)
            await self.page.wait_for_selector('div[role="button"][tabindex="0"] span[title]', timeout=30000)
            contact_buttons = await self.page.query_selector_all('div[role="button"][tabindex="0"] span[title]')

            if contact_buttons:
                # Clica no primeiro contato da lista (ou ajuste se quiser lógica por nome/número)
                await contact_buttons[0].click()
                print(f"[OK] Contato {{contact['nome']}} clicado.", flush=True)
                return True
            else:
                print(f"[ERROR] Nenhum contato encontrado na busca por {{contact['numero']}}", flush=True)
                return False

            await asyncio.sleep(1)
            print(f"[OK] Contato adicionado: {{contact['nome']}}", flush=True)
            return True
        except Exception as e:
            print(f"[ERROR] Erro ao adicionar contato {{contact['nome']}}: {{e}}", flush=True)
            return False

    async def finalize_group_creation(self, group_name):
        print(f"[FINALIZE] Finalizando grupo: {{group_name}}", flush=True)
        try:
            await self.page.click('div[role="button"][aria-label="Avançar"]')
            await asyncio.sleep(2)
            subject_input = await self.page.wait_for_selector('input[data-testid="group-subject-input"]', timeout=10000)
            await subject_input.fill(group_name)
            await asyncio.sleep(1)
            await self.page.click('[data-testid="create-group-button"]')
            await asyncio.sleep(5)
            print(f"[OK] Grupo '{{group_name}}' criado com sucesso!", flush=True)
            return True
        except Exception as e:
            print(f"[ERROR] Erro ao finalizar grupo {{group_name}}: {{e}}", flush=True)
            return False

    async def send_welcome_message(self, group_name):
        print(f"[SEND] Enviando mensagem de boas-vindas ao grupo: {{group_name}}", flush=True)
        try:
            message_box = await self.page.wait_for_selector('[data-testid="conversation-compose-box-input"]', timeout=15000)
            await message_box.type(self.config['welcomeMessage'])
            await asyncio.sleep(1)
            await self.page.keyboard.press('Enter')
            print(f"[OK] Mensagem enviada para {{group_name}}", flush=True)
        except Exception as e:
            print(f"[ERROR] Falha ao enviar mensagem: {e}", flush=True)

    async def process_automation(self):
        print("[PROCESS] Iniciando processo de automação...", flush=True)
        try:
            leads = [c for c in self.contacts if c['tipo'] == 'lead']
            admins = [c for c in self.contacts if c['tipo'] == 'administrador']

            total_groups = max(1, (len(leads) + 998) // 999)
            print(f"[INFO] Total de grupos a criar: {{total_groups}}", flush=True)

            for group_index in range(total_groups):
                group_name = f"{{self.config['baseName']}} {{group_index + 1}}"

                if not await self.create_group(group_name):
                    print(f"[SKIP] Pulando grupo {{group_name}} devido a erro na criação", flush=True)
                    continue

                for contact in leads + admins:
                    await self.search_and_add_contact(contact)

                await self.finalize_group_creation(group_name)
                await self.send_welcome_message(group_name)

                print(f"[DONE] Grupo {{group_name}} finalizado!", flush=True)
                await asyncio.sleep(3)

        except Exception as e:
            print(f"[ERROR] Falha no process_automation: {{e}}", flush=True)

    async def run(self):
        print("[RUN] Iniciando execução da automação...", flush=True)
        try:
            browser_started = await self.start_browser()
            if not browser_started:
                print("[FATAL] Navegador não iniciou. Encerrando...", flush=True)
                return

            await self.process_automation()

        except Exception as e:
            print(f"[ERROR] Erro geral no run(): {{e}}", flush=True)
        finally:
            try:
                if self.browser:
                    await self.browser.close()
                    print("[CLOSE] Navegador fechado.", flush=True)
                if self.playwright:
                    await self.playwright.stop()
                    print("[CLOSE] Playwright finalizado.", flush=True)
            except Exception as e:
                print(f"[ERROR] Falha ao fechar navegador: {{e}}", flush=True)

async def main():
    print("[MAIN] WhatsApp REAL Automation Tool Iniciado", flush=True)
    automation = WhatsAppRealAutomation()
    await automation.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("[EXIT] Automação interrompida pelo usuário", flush=True)
    except Exception as e:
        print(f"[FATAL] Erro fatal na execução: {e}", flush=True)
        input("Pressione Enter para sair...")

'''
        
        # Salva o script
        with open(script_path, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        print(f"✅ Script salvo em: {script_path}")
        return script_path
        
    except Exception as e:
        print(f"❌ Erro ao gerar script: {e}")
        import traceback
        traceback.print_exc()
        return None

def execute_automation_script_async(script_path):
    """Executa o script de automação em background usando thread"""
    try:
        print(f"🚀 Executando script em thread: {script_path}")
        
        # Atualiza status
        app_state['automation_status']['currentStep'] = 'Executando automação...'
        app_state['automation_status']['logs'].append('Script Python executando...')
        
        # Configura ambiente
        env = os.environ.copy()
        env['PYTHONIOENCODING'] = 'utf-8'
        
        # Executa o script Python REAL usando Popen para não bloquear
        process = subprocess.Popen([
    sys.executable, str(script_path)
], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)

        
        # Armazena o processo
        app_state['automation_process'] = process
        
        # Monitora o processo em tempo real
        while process.poll() is None:
            time.sleep(2)
            # Atualiza status periodicamente
            app_state['automation_status']['logs'].append(f'Automação em execução... PID: {process.pid}')
        
        # Processo terminou
        stdout, stderr = process.communicate()
        
        if process.returncode == 0:
            print("✅ Script executado com sucesso!")
            app_state['automation_status']['logs'].append("Automação executada com sucesso!")
            app_state['automation_status']['currentStep'] = 'Automação concluída com sucesso'
        else:
            print(f"❌ Erro na execução: {stderr}")
            app_state['automation_status']['logs'].append(f"Erro: {stderr}")
            app_state['automation_status']['currentStep'] = f'Erro na automação: {stderr}'
        
        # Atualiza estado final
        app_state['automation_running'] = False
        app_state['automation_status']['isRunning'] = False
        app_state['automation_process'] = None
        
    except Exception as e:
        print(f"❌ ERRO na automação: {e}")
        import traceback
        traceback.print_exc()
        app_state['automation_status']['logs'].append(f"Erro na execução: {e}")
        app_state['automation_status']['currentStep'] = f'Erro fatal: {e}'
        app_state['automation_running'] = False
        app_state['automation_status']['isRunning'] = False
        app_state['automation_process'] = None

@app.route('/api/automation/status', methods=['GET'])
def get_automation_status():
    """Retorna o status atual da automação"""
    return jsonify(app_state['automation_status'])

@app.route('/api/automation/stop', methods=['POST'])
def stop_automation():
    """Para a automação"""
    try:
        # Para o processo se estiver rodando
        if app_state['automation_process']:
            app_state['automation_process'].terminate()
            app_state['automation_process'] = None
        
        app_state['automation_running'] = False
        app_state['automation_status']['isRunning'] = False
        app_state['automation_status']['currentStep'] = 'Automação interrompida pelo usuário'
        app_state['automation_status']['logs'].append('Automação interrompida pelo usuário')
        
        return jsonify({'success': True, 'message': 'Automação interrompida'})
    except Exception as e:
        return jsonify({'error': f'Erro ao parar automação: {str(e)}'}), 500

@app.route('/api/automation/pause', methods=['POST'])
def pause_automation():
    """Pausa a automação"""
    app_state['automation_status']['isPaused'] = True
    app_state['automation_status']['currentStep'] = 'Automação pausada'
    
    return jsonify({'success': True, 'message': 'Automação pausada'})

@app.route('/api/automation/resume', methods=['POST'])
def resume_automation():
    """Retoma a automação"""
    app_state['automation_status']['isPaused'] = False
    app_state['automation_status']['currentStep'] = 'Automação retomada'
    
    return jsonify({'success': True, 'message': 'Automação retomada'})

@app.route('/api/download/report', methods=['GET'])
def download_report():
    """Download do relatório de automação"""
    try:
        # Gera relatório simples
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_content = f"""Relatório de Automação WhatsApp
Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

Contatos Processados: {len(app_state['contacts'])}
Status: {'Em execução' if app_state['automation_running'] else 'Concluída'}

Contatos:
"""
        
        for contact in app_state['contacts']:
            report_content += f"- {contact['nome']} ({contact['numero']}) - {contact['tipo']}\n"
        
        # Salva relatório temporário
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
        temp_file.write(report_content)
        temp_file.close()
        
        return send_file(temp_file.name, as_attachment=True, download_name=f'relatorio_whatsapp_{timestamp}.txt')
        
    except Exception as e:
        return jsonify({'error': f'Erro ao gerar relatório: {str(e)}'}), 500

@app.route('/api/python/generate', methods=['POST'])
def generate_python_code():
    """Gera código Python para download"""
    try:
        data = request.get_json()
        config = data.get('config', {})
        
        # Usa contatos do estado global
        contacts = app_state['contacts']
        
        if not contacts:
            return jsonify({'error': 'Nenhum contato carregado'}), 400
        
        # Gera script
        script_path = generate_automation_script(contacts, config)
        
        if script_path:
            # Lê conteúdo do script
            with open(script_path, 'r', encoding='utf-8') as f:
                script_content = f.read()
            
            return jsonify({
                'success': True,
                'code': script_content,
                'filename': f'whatsapp_automation_{datetime.now().strftime("%Y%m%d_%H%M%S")}.py'
            })
        else:
            return jsonify({'error': 'Erro ao gerar código Python'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Erro ao gerar código: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Iniciando WhatsApp Automation API")
    print("📡 Servidor rodando em: http://localhost:5000")
    print("🔗 Frontend deve conectar em: http://localhost:5173")
    print("="*60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)