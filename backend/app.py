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
Gerado automaticamente em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
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
        
        # Configuração REAL da automação
        self.config = {repr(config)}
        
        # Contatos REAIS
        self.contacts = {repr(contacts)}
        
        print("INICIANDO WhatsApp Automation REAL")
        print(f"Sessao: session_{{datetime.now().strftime('%Y%m%d_%H%M%S')}}")
        print(f"Total de contatos: {{len(self.contacts)}}")
    
    async def start_browser(self):
        """Inicia navegador Chrome REAL"""
        try:
            print("Iniciando WhatsApp Automation REAL")
            print("Iniciando navegador Chrome REAL...")
            
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=False,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images',
                    '--disable-javascript-harmony-shipping',
                    '--disable-background-networking',
                    '--disable-background-timer-throttling',
                    '--disable-client-side-phishing-detection',
                    '--disable-default-apps',
                    '--disable-hang-monitor',
                    '--disable-popup-blocking',
                    '--disable-prompt-on-repost',
                    '--disable-sync',
                    '--disable-translate',
                    '--disable-web-resources',
                    '--disable-web-security',
                    '--no-first-run',
                    '--no-default-browser-check',
                    '--no-pings',
                    '--password-store=basic',
                    '--use-mock-keychain'
                ]
            )
            
            context = await self.browser.new_context(
                viewport={{'width': 1366, 'height': 768}},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                extra_http_headers={{
                    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
                }}
            )
            
            # Remove indicadores de automação
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {{
                    get: () => undefined,
                }});
                
                window.chrome = {{
                    runtime: {{}}
                }};
                
                Object.defineProperty(navigator, 'plugins', {{
                    get: () => [1, 2, 3, 4, 5],
                }});
                
                Object.defineProperty(navigator, 'languages', {{
                    get: () => ['pt-BR', 'pt', 'en'],
                }});
            """)
            
            self.page = await context.new_page()
            
            print("Acessando WhatsApp Web...")
            await self.page.goto('https://web.whatsapp.com', wait_until='networkidle')
            
            print("Aguardando login no WhatsApp Web REAL...")
            print("Escaneie o QR Code com seu celular")
            
            # Aguarda login com timeout maior (10 minutos)
            try:
                await self.page.wait_for_selector('[data-testid="chat-list"]', timeout=600000)  # 10 minutos
                print("Login realizado com sucesso!")
            except:
                try:
                    await self.page.wait_for_selector('div[data-testid="chat-list"]', timeout=300000)  # 5 minutos
                    print("Login realizado com sucesso!")
                except Exception as e:
                    print(f"Timeout no login: {{e}}")
                    return False
            
            await asyncio.sleep(10)
            return True
            
        except Exception as e:
            print(f"Erro ao iniciar navegador: {{e}}")
            return False
    
    async def create_group(self, group_name):
        """Cria um novo grupo no WhatsApp"""
        try:
            print(f"Criando grupo: {{group_name}}")
            
            # Aguarda um pouco para garantir que a página está carregada
            await asyncio.sleep(3)
            
            # Clica no menu de opções
            menu_selectors = [
                '[data-testid="Mais opções"]',
                'div[title="Mais opções"]',
                'span[data-testid="Mais opções"]',
                'div[aria-label="Mais opções"]'
            ]
            
            menu_clicked = False
            for selector in menu_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=15000)
                    await self.page.click(selector)
                    menu_clicked = True
                    print(f"Menu clicado com seletor: {{selector}}")
                    break
                except Exception as e:
                    print(f"Tentativa com seletor {{selector}} falhou: {{e}}")
                    continue
            
            if not menu_clicked:
                raise Exception("Menu nao encontrado")
            
            await asyncio.sleep(3)
            
            # Clica em "Novo grupo"
            new_group_selectors = [
                'div[role="button"]:has-text("Novo grupo")',
                'li:has-text("Novo grupo")',
                'div:has-text("New group")',
                '[data-testid="new-group"]'
            ]
            
            group_clicked = False
            for selector in new_group_selectors:
                try:
                    await self.page.click(selector)
                    group_clicked = True
                    print(f"Novo grupo clicado com seletor: {{selector}}")
                    break
                except Exception as e:
                    print(f"Tentativa novo grupo com {{selector}} falhou: {{e}}")
                    continue
            
            if not group_clicked:
                raise Exception("Opcao Novo grupo nao encontrada")
            
            await asyncio.sleep(5)
            
            # Aguarda tela de seleção de contatos
            await self.page.wait_for_selector('input[data-testid="contact-list-search"]', timeout=20000)
            print(f"Tela de criacao de grupo aberta para: {{group_name}}")
            return True
            
        except Exception as e:
            print(f"Erro ao criar grupo {{group_name}}: {{e}}")
            return False
    
    async def search_and_add_contact(self, contact):
        """Pesquisa e adiciona um contato ao grupo"""
        try:
            print(f"Buscando contato: {{contact.get('nome', 'Sem nome')}} ({{contact['numero']}})")
            
            # Limpa a caixa de pesquisa
            search_box = await self.page.wait_for_selector('input[data-testid="contact-list-search"]', timeout=15000)
            await search_box.click()
            await search_box.fill('')
            await asyncio.sleep(1)
            
            # Pesquisa pelo nome ou número
            search_term = contact.get('nome', '') or contact['numero']
            print(f"Pesquisando por: {{search_term}}")
            
            await search_box.type(search_term, delay=100)
            await asyncio.sleep(4)  # Aguarda resultados da pesquisa
            
            # Tenta encontrar o contato - sempre clica no primeiro resultado
            contact_selectors = [
                'div[data-testid="cell-frame-container"]:first-child'
            ]
            
            contact_found = False
            for selector in contact_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=8000)
                    await self.page.click(selector)
                    contact_found = True
                    print(f"Contato clicado com seletor: {{selector}}")
                    break
                except Exception as e:
                    print(f"Tentativa contato com {{selector}} falhou: {{e}}")
                    continue
            
            if contact_found:
                delay = random.uniform(self.config['delay']['min'], self.config['delay']['max'])
                await asyncio.sleep(delay)
                print(f"Contato adicionado: {{contact.get('nome', 'Sem nome')}} ({{contact['numero']}})")
                return True
            else:
                print(f"Contato NAO encontrado: {{contact.get('nome', 'Sem nome')}} ({{contact['numero']}})")
                return False
                
        except Exception as e:
            print(f"Erro ao adicionar {{contact.get('nome', 'Sem nome')}}: {{e}}")
            return False
    
    async def finalize_group_creation(self, group_name):
        """Finaliza a criação do grupo"""
        try:
            print(f"Finalizando criacao do grupo: {{group_name}}")
            
            # Clica no botão avançar
            next_selectors = [
                '[data-testid="next-button"]',
                'div[role="button"]:has-text("Avançar")',
                'button:has-text("Avançar")',
                'div[role="button"]:has-text("Next")'
            ]
            
            next_clicked = False
            for selector in next_selectors:
                try:
                    await self.page.click(selector)
                    next_clicked = True
                    print(f"Botao Avancar clicado com seletor: {{selector}}")
                    break
                except Exception as e:
                    print(f"Tentativa avancar com {{selector}} falhou: {{e}}")
                    continue
            
            if not next_clicked:
                raise Exception("Botao Avancar nao encontrado")
            
            await asyncio.sleep(4)
            
            # Define o nome do grupo
            name_input_selectors = [
                'input[data-testid="group-subject-input"]',
                'div[data-testid="group-subject-input"]'
            ]
            
            name_input = None
            for selector in name_input_selectors:
                try:
                    name_input = await self.page.wait_for_selector(selector, timeout=15000)
                    print(f"Campo nome encontrado com seletor: {{selector}}")
                    break
                except Exception as e:
                    print(f"Tentativa campo nome com {{selector}} falhou: {{e}}")
                    continue
            
            if not name_input:
                raise Exception("Campo de nome do grupo nao encontrado")
            
            await name_input.click()
            await name_input.fill('')
            await name_input.type(group_name, delay=100)
            await asyncio.sleep(2)
            
            # Clica em criar grupo
            create_selectors = [
                '[data-testid="create-group-button"]',
                'div[role="button"]:has-text("Criar")',
                'button:has-text("Criar")',
                'div[role="button"]:has-text("Create")'
            ]
            
            create_clicked = False
            for selector in create_selectors:
                try:
                    await self.page.click(selector)
                    create_clicked = True
                    print(f"Botao Criar clicado com seletor: {{selector}}")
                    break
                except Exception as e:
                    print(f"Tentativa criar com {{selector}} falhou: {{e}}")
                    continue
            
            if not create_clicked:
                raise Exception("Botao Criar nao encontrado")
            
            await asyncio.sleep(10)  # Aguarda criação do grupo
            
            print(f"Grupo '{{group_name}}' criado com sucesso!")
            return True
            
        except Exception as e:
            print(f"Erro ao finalizar criacao do grupo: {{e}}")
            return False
    
    async def send_welcome_message(self, group_name):
        """Envia mensagem de boas-vindas"""
        try:
            if not self.config['welcomeMessage'].strip():
                return True
            
            print(f"Enviando mensagem de boas-vindas para {{group_name}}")
            
            # Localiza a caixa de texto
            message_selectors = [
                '[data-testid="conversation-compose-box-input"]',
                'div[contenteditable="true"][data-tab="10"]'
            ]
            
            message_box = None
            for selector in message_selectors:
                try:
                    message_box = await self.page.wait_for_selector(selector, timeout=15000)
                    print(f"Caixa de mensagem encontrada com seletor: {{selector}}")
                    break
                except Exception as e:
                    print(f"Tentativa caixa mensagem com {{selector}} falhou: {{e}}")
                    continue
            
            if not message_box:
                print("Caixa de mensagem nao encontrada")
                return False
            
            # Digita e envia a mensagem
            await message_box.click()
            await message_box.type(self.config['welcomeMessage'], delay=50)
            await asyncio.sleep(2)
            await self.page.keyboard.press('Enter')
            await asyncio.sleep(3)
            
            print(f"Mensagem de boas-vindas enviada para {{group_name}}")
            return True
            
        except Exception as e:
            print(f"Erro ao enviar mensagem: {{e}}")
            return False
    
    async def process_automation(self):
        """Processa a automação completa"""
        try:
            leads = [c for c in self.contacts if c['tipo'] == 'lead']
            admins = [c for c in self.contacts if c['tipo'] == 'administrador']
            
            print(f"Processando automacao:")
            print(f"  - {{len(leads)}} leads")
            print(f"  - {{len(admins)}} administradores")
            
            # Se não há leads suficientes, cria um grupo com todos
            if len(leads) == 0:
                print("Nenhum lead encontrado, criando grupo com todos os contatos")
                leads = self.contacts
                admins = []  # Evita duplicação
            
            # Calcula grupos necessários (mínimo 1)
            groups_needed = max(1, (len(leads) + 998) // 999)
            
            print(f"Grupos a serem criados: {{groups_needed}}")
            
            for group_num in range(groups_needed):
                group_name = f"{{self.config['baseName']}} {{group_num + 1}}"
                
                print(f"\\n=== PROCESSANDO GRUPO {{group_num + 1}}/{{groups_needed}}: {{group_name}} ===")
                
                # Cria o grupo
                if not await self.create_group(group_name):
                    print(f"ERRO: Falha ao criar grupo {{group_name}}")
                    continue
                
                # Adiciona contatos do grupo atual
                start_idx = group_num * 999
                end_idx = min(start_idx + 999, len(leads))
                group_leads = leads[start_idx:end_idx]
                
                print(f"Adicionando {{len(group_leads)}} leads ao grupo...")
                
                # Adiciona leads
                for i, lead in enumerate(group_leads, 1):
                    print(f"  Adicionando lead {{i}}/{{len(group_leads)}}: {{lead.get('nome', 'Sem nome')}}")
                    await self.search_and_add_contact(lead)
                
                # Adiciona administradores
                if admins:
                    print(f"Adicionando {{len(admins)}} administradores ao grupo...")
                    for i, admin in enumerate(admins, 1):
                        print(f"  Adicionando admin {{i}}/{{len(admins)}}: {{admin.get('nome', 'Sem nome')}}")
                        await self.search_and_add_contact(admin)
                
                # Finaliza criação do grupo
                if not await self.finalize_group_creation(group_name):
                    print(f"ERRO: Falha ao finalizar grupo {{group_name}}")
                    continue
                
                # Envia mensagem de boas-vindas
                await self.send_welcome_message(group_name)
                
                print(f"Grupo {{group_name}} processado com sucesso!")
                
                # Delay entre grupos se houver mais de um
                if group_num < groups_needed - 1:
                    if self.config.get('enableBanPrevention', False):
                        delay_time = random.uniform(
                            self.config.get('groupDelay', {{}}).get('min', 30),
                            self.config.get('groupDelay', {{}}).get('max', 90)
                        )
                        print(f"Delay anti-ban: Aguardando {{delay_time:.1f}} segundos...")
                    else:
                        delay_time = 5
                        print(f"Aguardando {{delay_time}} segundos...")
                    
                    await asyncio.sleep(delay_time)
            
            print("\\n=== AUTOMACAO CONCLUIDA COM SUCESSO! ===")
            print(f"{{groups_needed}} grupos criados")
            print(f"{{len(self.contacts)}} contatos processados")
            
        except Exception as e:
            print(f"Erro na automacao: {{e}}")
    
    async def run(self):
        """Executa a automação completa"""
        try:
            print("Iniciando automacao REAL do WhatsApp...")
            
            # Inicia navegador
            if not await self.start_browser():
                print("ERRO: Falha ao iniciar navegador")
                return
            
            # Processa automação
            await self.process_automation()
            
            print("\\nAutomacao concluida! Aguardando 60 segundos antes de fechar...")
            await asyncio.sleep(60)
            
        except Exception as e:
            print(f"Erro geral na automacao: {{e}}")
        
        finally:
            try:
                if self.browser:
                    await self.browser.close()
                    print("Navegador fechado")
                
                if self.playwright:
                    await self.playwright.stop()
                    print("Playwright finalizado")
            except:
                pass

# Função principal
async def main():
    print("WhatsApp REAL Automation Tool")
    print("=" * 50)
    
    automation = WhatsAppRealAutomation()
    await automation.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\nAutomacao interrompida pelo usuario")
    except Exception as e:
        print(f"Erro fatal: {{e}}")
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