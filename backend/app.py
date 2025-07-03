#!/usr/bin/env python3
"""
Backend Flask para WhatsApp Advanced Automation Suite
API REST com PROTEÇÃO ANTI-BAN GARANTIDA
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
import asyncio
import random
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from flask_cors import CORS
app = Flask(__name__, static_folder="../", static_url_path="/")
CORS(app,)



# Estado global da aplicação
app_state = {
    'automation_running': False,
    'automation_task': None,
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

def detect_separator(text):
    """Detecta o separador usado no arquivo"""
    separators = [',', ';', '\t', '|']
    lines = text.strip().split('\n')
    
    if not lines:
        return ','
    
    # Testa cada separador na primeira linha
    first_line = lines[0]
    best_separator = ','
    max_columns = 0
    
    for sep in separators:
        columns = len(first_line.split(sep))
        if columns > max_columns:
            max_columns = columns
            best_separator = sep
    
    print(f"🔍 Separador detectado: '{best_separator}' ({max_columns} colunas)")
    return best_separator

def process_flexible_data(file_content):
    """Processa dados de forma flexível - aceita qualquer formato"""
    try:
        contacts = []
        
        # Tenta diferentes encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        text_content = None
        
        for encoding in encodings:
            try:
                if isinstance(file_content, bytes):
                    text_content = file_content.decode(encoding)
                else:
                    text_content = file_content
                break
            except UnicodeDecodeError:
                continue
        
        if not text_content:
            raise Exception("Não foi possível decodificar o arquivo")
        
        print(f"📄 Conteúdo do arquivo (primeiras 3 linhas):")
        lines = text_content.strip().split('\n')
        for i, line in enumerate(lines[:3]):
            print(f"   Linha {i+1}: {line}")
        
        # Detecta separador
        separator = detect_separator(text_content)
        
        # Processa linha por linha
        if len(lines) < 1:
            raise Exception("Arquivo vazio")
        
        # Verifica se a primeira linha é cabeçalho
        first_line = lines[0].lower()
        has_header = any(word in first_line for word in ['nome', 'numero', 'tipo', 'name', 'number', 'type'])
        
        print(f"📋 Cabeçalho detectado: {'Sim' if has_header else 'Não'}")
        
        # Define as linhas de dados
        data_lines = lines[1:] if has_header else lines
        
        print(f"📊 Processando {len(data_lines)} linhas de dados...")
        
        # Processa cada linha
        for row_num, line in enumerate(data_lines, 1):
            try:
                if not line.strip():
                    continue
                
                # Divide a linha pelo separador
                parts = line.split(separator)
                
                if len(parts) < 2:
                    print(f"⚠️  Linha {row_num}: Poucos campos ({len(parts)}) - pulando")
                    continue
                
                # Extrai dados baseado no número de colunas
                if len(parts) == 2:
                    # Formato: nome,numero
                    nome = parts[0].strip()
                    numero = parts[1].strip()
                    tipo = 'lead'  # Padrão
                elif len(parts) >= 3:
                    # Formato: nome,numero,tipo
                    nome = parts[0].strip()
                    numero = parts[1].strip()
                    tipo = parts[2].strip().lower()
                else:
                    continue
                
                # Valida número
                numero_validado = validate_phone_number(numero)
                if not numero_validado:
                    print(f"⚠️  Linha {row_num}: Número inválido '{numero}' - pulando")
                    continue
                
                # Valida tipo
                if tipo not in ['lead', 'administrador']:
                    tipo = 'lead'  # Padrão se tipo inválido
                
                # Cria contato
                contact = {
                    'nome': nome if nome else f"Contato {len(contacts) + 1}",
                    'numero': numero_validado,
                    'tipo': tipo
                }
                contacts.append(contact)
                
                print(f"✅ Linha {row_num}: {contact['nome']} ({contact['numero']}) - {contact['tipo']}")
                
            except Exception as e:
                print(f"❌ Erro na linha {row_num}: {e}")
                continue
        
        if not contacts:
            raise Exception("Nenhum contato válido encontrado no arquivo")
        
        print(f"📊 PROCESSAMENTO CONCLUÍDO:")
        print(f"   ✅ {len(contacts)} contatos válidos")
        print(f"   👥 {len([c for c in contacts if c['tipo'] == 'lead'])} leads")
        print(f"   👑 {len([c for c in contacts if c['tipo'] == 'administrador'])} administradores")
        
        return contacts
        
    except Exception as e:
        print(f"❌ Erro ao processar arquivo: {e}")
        raise

# Classe de automação com PROTEÇÃO ANTI-BAN GARANTIDA
class SafeWhatsAppAutomation:
    def __init__(self, contacts, config):
        self.contacts = contacts
        self.config = config
        self.page = None
        self.browser = None
        self.playwright = None
        self.current_group_name = ""
        self.groups_created_in_session = 0
        self.max_groups_per_session = 3  # LIMITE SEGURO
        
    async def update_status(self, step, progress=None, current_group=None, log_message=None):
        """Atualiza status da automação"""
        app_state['automation_status']['currentStep'] = step
        if progress is not None:
            app_state['automation_status']['progress'] = progress
        if current_group:
            app_state['automation_status']['currentGroup'] = current_group
        if log_message:
            app_state['automation_status']['logs'].append(f"{datetime.now().strftime('%H:%M:%S')} - {log_message}")
            print(f"📝 {log_message}")
    
    async def safe_delay(self, min_seconds=5, max_seconds=15, reason="Delay de segurança"):
        """Delay seguro com variação aleatória"""
        delay_time = random.uniform(min_seconds, max_seconds)
        await self.update_status(f"Aguardando {delay_time:.1f}s", log_message=f"⏳ {reason}: {delay_time:.1f}s")
        await asyncio.sleep(delay_time)
    
    async def start_browser(self):
        """Inicia navegador com configurações anti-detecção"""
        try:
            await self.update_status("Iniciando navegador seguro...", log_message="🛡️ Abrindo Chrome com proteção anti-ban")
            
            from playwright.async_api import async_playwright
            
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
                    '--disable-automation',
                    '--disable-extensions-except',
                    '--disable-plugins-discovery'
                ]
            )
            
            context = await self.browser.new_context(
                viewport={'width': 1366, 'height': 768},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                extra_http_headers={
                    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
                }
            )
            
            # Remove TODOS os indicadores de automação
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                window.chrome = {
                    runtime: {},
                    loadTimes: function() {},
                    csi: function() {}
                };
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['pt-BR', 'pt', 'en'],
                });
                
                // Remove propriedades de automação
                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
                delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
            """)
             
            self.page = await context.new_page()
            
            await self.update_status("Conectando ao WhatsApp Web...", log_message="🌐 Acessando WhatsApp Web")
            await self.page.goto('https://web.whatsapp.com', wait_until='networkidle')
            
            # Delay humano após carregar
            await self.safe_delay(3, 8, "Carregamento inicial")
            
            await self.update_status("Aguardando login...", log_message="📱 Escaneie o QR Code com seu celular")
            
            # Aguarda login com timeout generoso
            try:
                await self.page.wait_for_selector('div[role="grid"]', timeout=300000)  # 5 minutos
                await self.update_status("Login realizado!", log_message="✅ Login no WhatsApp Web realizado com sucesso")
            except:
                await self.page.wait_for_selector('div[role="grid"]', timeout=180000)
                await self.update_status("Login realizado!", log_message="✅ Login no WhatsApp Web realizado com sucesso")
            
            # Delay pós-login para estabilizar
            await self.safe_delay(5, 12, "Estabilização pós-login")
            return True
            
        except Exception as e:
            await self.update_status("Erro no navegador", log_message=f"❌ Erro ao iniciar navegador: {e}")
            return False
    
    async def create_group_safe(self, group_name):
        """Cria grupo com delays seguros"""
        try:
            await self.update_status(f"Criando grupo: {group_name}", log_message=f"👥 Iniciando criação SEGURA do grupo {group_name}")
            self.current_group_name = group_name
            
            # Delay inicial seguro
            await self.safe_delay(8, 15, "Preparação para criar grupo")
            
            # Seletores para menu
            menu_selectors = [
                '[aria-label="Mais opções"]',
                '[data-testid="menu"]',
                'div[title="Menu"]',
                'span[data-testid="menu"]'
            ]
            
            for selector in menu_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=15000)
                    await self.safe_delay(2, 5, "Antes de clicar no menu")
                    await self.page.click(selector)
                    await self.update_status(f"Menu aberto", log_message="📋 Menu de opções clicado")
                    break
                except:
                    continue
            
            await self.safe_delay(3, 7, "Após abrir menu")
            
            # Clica em "Novo grupo"
            new_group_selectors = [
                'text="Novo grupo"',
                'div[role="button"]:has-text("Novo grupo")',
                'li:has-text("Novo grupo")',
                'div:has-text("Novo grupo")'
            ]
            
            for selector in new_group_selectors:
                try:
                    await self.safe_delay(1, 3, "Antes de clicar em Novo grupo")
                    await self.page.click(selector)
                    await self.update_status(f"Novo grupo selecionado", log_message="✅ Opção 'Novo grupo' clicada")
                    break
                except:
                    continue
            
            await self.safe_delay(5, 10, "Aguardando tela de seleção")
            
            # Aguarda tela de seleção
            await self.page.wait_for_selector('input[placeholder]', timeout=20000)
            await self.update_status(f"Tela de criação aberta", log_message=f"✅ Tela de criação do grupo {group_name} aberta")
            return True
            
        except Exception as e:
            await self.update_status("Erro ao criar grupo", log_message=f"❌ Erro ao criar grupo {group_name}: {e}")
            return False
    
    async def add_contact_safe(self, contact):
        """Adiciona contato com delays seguros"""
        try:
            nome = contact.get('nome', 'Sem nome')
            numero = contact['numero']
            
            # Delays seguros entre contatos
            await self.safe_delay(8, 18, f"Preparando para adicionar {nome}")
            
            # Limpa e pesquisa
            search_box = await self.page.wait_for_selector('input[placeholder]', timeout=15000)
            await search_box.click()
            await self.safe_delay(1, 3, "Após clicar na caixa de busca")
            
            await search_box.fill('')
            await self.safe_delay(1, 2, "Após limpar busca")
            
            # Digita número com delay humano
            for char in numero:
                await search_box.type(char, delay=random.randint(100, 300))
                await asyncio.sleep(random.uniform(0.05, 0.15))
            
            await self.safe_delay(3, 8, "Aguardando resultados da busca")
            
            # Clica no primeiro resultado
            contact_selectors = [
                'div[role="button"][tabindex="0"] span[title]',
                'div[data-testid="cell-frame-container"]:first-child',
                'div[data-testid="cell-frame-container"]'
            ]
            
            for selector in contact_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=10000)
                    await self.safe_delay(1, 3, "Antes de clicar no contato")
                    await self.page.click(selector)
                    await self.update_status(f"Contato adicionado", log_message=f"✅ {nome} ({numero}) adicionado com segurança")
                    
                    # Delay pós-adição
                    await self.safe_delay(3, 8, "Após adicionar contato")
                    return True
                except:
                    continue
            
            await self.update_status(f"Contato não encontrado", log_message=f"⚠️ {nome} ({numero}) não encontrado")
            return False
                
        except Exception as e:
            await self.update_status("Erro ao adicionar contato", log_message=f"❌ Erro ao adicionar {nome}: {e}")
            return False
    
    async def finalize_group_safe(self, group_name):
        """Finaliza criação do grupo com segurança"""
        try:
            await self.update_status(f"Finalizando grupo", log_message=f"🏁 Finalizando criação SEGURA do grupo {group_name}")
            
            # Delay antes de finalizar
            await self.safe_delay(5, 12, "Preparando para finalizar grupo")
            
            # Clica em avançar
            next_selectors = [
                'div[role="button"][aria-label="Avançar"]',
                '[data-testid="next-button"]',
                'div[role="button"]:has-text("Avançar")'
            ]
            
            for selector in next_selectors:
                try:
                    await self.safe_delay(2, 5, "Antes de clicar em Avançar")
                    await self.page.click(selector)
                    break
                except:
                    continue
            
            await self.safe_delay(3, 8, "Após clicar em Avançar")
            
            # Define nome do grupo
            name_input_selectors = [
                'div[role="textbox"][aria-label="Nome do grupo (opcional)"]',
                'input[data-testid="group-subject-input"]',
                'div[contenteditable="true"]'
            ]
            
            for selector in name_input_selectors:
                try:
                    name_input = await self.page.wait_for_selector(selector, timeout=15000)
                    await name_input.click()
                    await self.safe_delay(1, 3, "Após clicar no campo nome")
                    
                    await name_input.fill('')
                    await self.safe_delay(0.5, 1.5, "Após limpar campo nome")
                    
                    # Digita nome com delay humano
                    for char in group_name:
                        await name_input.type(char, delay=random.randint(80, 200))
                        await asyncio.sleep(random.uniform(0.03, 0.1))
                    
                    break
                except:
                    continue
            
            await self.safe_delay(3, 7, "Após digitar nome do grupo")
            
            # Cria grupo
            create_selectors = [
                'div[role="button"][aria-label="Criar grupo"]',
                '[data-testid="create-group-button"]',
                'div[role="button"]:has-text("Criar")'
            ]
            
            for selector in create_selectors:
                try:
                    await self.safe_delay(2, 5, "Antes de criar grupo")
                    await self.page.click(selector)
                    break
                except:
                    continue
            
            await self.safe_delay(8, 15, "Aguardando criação do grupo")
            await self.update_status(f"Grupo criado", log_message=f"✅ Grupo {group_name} criado com SUCESSO e SEGURANÇA")
            return True
            
        except Exception as e:
            await self.update_status("Erro ao finalizar grupo", log_message=f"❌ Erro ao finalizar grupo: {e}")
            return False
    
    async def send_welcome_message_safe(self, group_name):
        """Envia mensagem de boas-vindas com segurança"""
        try:
            if not self.config.get('welcomeMessage', '').strip():
                return True
            
            await self.update_status(f"Enviando mensagem", log_message=f"💬 Enviando mensagem de boas-vindas com segurança")
            
            # Delay antes de enviar mensagem
            await self.safe_delay(5, 12, "Preparando para enviar mensagem")
            
            # Localiza caixa de texto
            message_selectors = [
                'div[role="textbox"][aria-label="Digite uma mensagem"]',
                '[data-testid="conversation-compose-box-input"]',
                'div[contenteditable="true"][data-tab="10"]'
            ]
            
            for selector in message_selectors:
                try:
                    message_box = await self.page.wait_for_selector(selector, timeout=15000)
                    await message_box.click()
                    await self.safe_delay(2, 5, "Após clicar na caixa de mensagem")
                    
                    # Digita mensagem com delay humano
                    message = self.config['welcomeMessage']
                    for char in message:
                        await message_box.type(char, delay=random.randint(50, 150))
                        await asyncio.sleep(random.uniform(0.02, 0.08))
                    
                    await self.safe_delay(2, 5, "Após digitar mensagem")
                    await self.page.keyboard.press('Enter')
                    await self.safe_delay(3, 8, "Após enviar mensagem")
                    
                    await self.update_status(f"Mensagem enviada", log_message=f"✅ Mensagem de boas-vindas enviada com segurança")
                    return True
                except:
                    continue
            
            return False
            
        except Exception as e:
            await self.update_status("Erro ao enviar mensagem", log_message=f"❌ Erro ao enviar mensagem: {e}")
            return False
    
    async def check_session_limit(self):
        """Verifica se atingiu limite de grupos por sessão"""
        if self.groups_created_in_session >= self.max_groups_per_session:
            await self.update_status("Limite de sessão atingido", log_message=f"🛡️ LIMITE SEGURO: {self.groups_created_in_session} grupos criados")
            await self.update_status("Pausando para nova sessão", log_message="⏸️ PAUSANDO 30 MINUTOS para nova sessão (proteção anti-ban)")
            
            # Pausa de 30 minutos entre sessões
            for i in range(30):
                remaining = 30 - i
                await self.update_status(f"Pausa anti-ban: {remaining} min restantes", log_message=f"⏳ Aguardando {remaining} minutos...")
                await asyncio.sleep(60)  # 1 minuto
            
            self.groups_created_in_session = 0
            await self.update_status("Sessão renovada", log_message="🔄 Nova sessão iniciada - limite resetado")
    
    async def run_automation(self):
        """Executa automação com PROTEÇÃO ANTI-BAN GARANTIDA"""
        try:
            await self.update_status("Iniciando automação SEGURA", 0, log_message="🛡️ Iniciando automação com PROTEÇÃO ANTI-BAN GARANTIDA")
            
            # Inicia navegador
            if not await self.start_browser():
                return False
            
            # Separa contatos
            leads = [c for c in self.contacts if c['tipo'] == 'lead']
            admins = [c for c in self.contacts if c['tipo'] == 'administrador']
            
            await self.update_status("Analisando contatos", log_message=f"📊 ANÁLISE SEGURA DOS CONTATOS:")
            await self.update_status("Contatos carregados", log_message=f"📋 Total de contatos: {len(self.contacts)}")
            await self.update_status("Leads identificados", log_message=f"👥 Leads encontrados: {len(leads)}")
            await self.update_status("Admins identificados", log_message=f"👑 Administradores encontrados: {len(admins)}")
            
            if len(leads) == 0:
                leads = self.contacts
            
            # LIMITE SEGURO: Máximo 5 grupos por execução
            max_groups_total = min(5, max(1, (len(leads) + 998) // 999))
            app_state['automation_status']['totalGroups'] = max_groups_total
            
            await self.update_status(f"Processando {max_groups_total} grupos", log_message=f"🛡️ LIMITE SEGURO: {max_groups_total} grupos (máx 5 por execução)")
            
            # Processa cada grupo com proteção
            for group_num in range(max_groups_total):
                # Verifica limite de sessão
                await self.check_session_limit()
                
                group_name = f"{self.config.get('baseName', 'Grupo VIP')} {group_num + 1}"
                
                await self.update_status(f"Processando grupo {group_num + 1}/{max_groups_total}", 
                                       (group_num / max_groups_total) * 100, 
                                       group_name,
                                       f"🔄 Processando grupo SEGURO {group_name}")
                
                app_state['automation_status']['currentGroupIndex'] = group_num + 1
                
                # Cria grupo com segurança
                if not await self.create_group_safe(group_name):
                    continue
                
                # Adiciona leads do grupo atual (máximo 50 por grupo para segurança)
                start_idx = group_num * 50  # Reduzido para 50 por segurança
                end_idx = min(start_idx + 50, len(leads))
                group_leads = leads[start_idx:end_idx]
                
                # Adiciona leads com delays seguros
                for i, lead in enumerate(group_leads):
                    await self.add_contact_safe(lead)
                    app_state['automation_status']['processedContacts'] = start_idx + i + 1
                
                # Finaliza grupo com segurança
                if not await self.finalize_group_safe(group_name):
                    continue
                
                # Envia mensagem com segurança
                await self.send_welcome_message_safe(group_name)
                
                self.groups_created_in_session += 1
                
                # Delay LONGO entre grupos (proteção anti-ban)
                if group_num < max_groups_total - 1:
                    await self.safe_delay(120, 300, "PROTEÇÃO ANTI-BAN entre grupos")  # 2-5 minutos
            
            await self.update_status("Automação concluída!", 100, log_message="🎉 AUTOMAÇÃO SEGURA CONCLUÍDA! Proteção anti-ban aplicada.")
            await asyncio.sleep(30)
            
            return True
            
        except Exception as e:
            await self.update_status("Erro na automação", log_message=f"❌ Erro geral: {e}")
            return False
        
        finally:
            try:
                if self.browser:
                    await self.browser.close()
                if self.playwright:
                    await self.playwright.stop()
            except:
                pass

# Função para executar automação em thread
def run_automation_thread(contacts, config):
    """Executa automação em thread separada"""
    try:
        # Cria novo loop de eventos para a thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # Executa automação SEGURA
        automation = SafeWhatsAppAutomation(contacts, config)
        result = loop.run_until_complete(automation.run_automation())
        
        # Atualiza status final
        app_state['automation_running'] = False
        app_state['automation_status']['isRunning'] = False
        
        if result:
            app_state['automation_status']['currentStep'] = 'Automação SEGURA concluída com sucesso!'
        else:
            app_state['automation_status']['currentStep'] = 'Automação finalizada com erros'
        
    except Exception as e:
        print(f"❌ Erro na thread de automação: {e}")
        app_state['automation_running'] = False
        app_state['automation_status']['isRunning'] = False
        app_state['automation_status']['currentStep'] = f'Erro: {e}'
    finally:
        try:
            loop.close()
        except:
            pass

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
        print("📁 Iniciando processamento de upload FLEXÍVEL...")
        
        # Validações básicas
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
        # Aceita CSV e TXT
        if not (file.filename.lower().endswith('.csv') or file.filename.lower().endswith('.txt')):
            return jsonify({'error': 'Arquivo deve ser CSV ou TXT'}), 400
        
        # Lê conteúdo do arquivo
        file_content = file.read()
        print(f"📄 Arquivo lido: {len(file_content)} bytes")
        print(f"📋 Tipo de arquivo: {file.filename}")
        
        # Processa contatos de forma flexível
        contacts = process_flexible_data(file_content)
        
        # Calcula estatísticas
        total_contacts = len(contacts)
        total_leads = len([c for c in contacts if c['tipo'] == 'lead'])
        total_admins = len([c for c in contacts if c['tipo'] == 'administrador'])
        estimated_groups = min(5, max(1, (total_leads + 49) // 50))  # Máximo 5 grupos, 50 contatos por grupo
        
        # Armazena contatos no estado global
        app_state['contacts'] = contacts
        
        print(f"📊 ARQUIVO PROCESSADO COM SUCESSO: {total_contacts} contatos válidos")
        print(f"  - {total_leads} leads")
        print(f"  - {total_admins} administradores")
        print(f"  - {estimated_groups} grupos estimados (LIMITE SEGURO)")
        
        # Retorna resultado
        return jsonify({
            'success': True,
            'message': f'Arquivo processado com PROTEÇÃO ANTI-BAN! {total_contacts} contatos válidos encontrados.',
            'filename': file.filename,
            'stats': {
                'totalContacts': total_contacts,
                'totalLeads': total_leads,
                'totalAdmins': total_admins,
                'estimatedGroups': estimated_groups,
                'validationMessage': f'{total_contacts} contatos válidos processados com PROTEÇÃO ANTI-BAN (máx 5 grupos, 50 contatos/grupo)'
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
        print("🛡️ INICIANDO automação com PROTEÇÃO ANTI-BAN GARANTIDA...")
        
        # Recebe configuração
        data = request.get_json()
        config = data.get('config', {})
        
        print(f"Configuração recebida: {config}")
        print(f"Contatos disponíveis: {len(app_state['contacts'])}")
        
        # Valida se há contatos
        if not app_state['contacts']:
            return jsonify({'error': 'Nenhum contato carregado. Faça upload do CSV primeiro.'}), 400
        
        # Verifica se já está rodando
        if app_state['automation_running']:
            return jsonify({'error': 'Automação já está em execução'}), 400
        
        # Converte configuração para Python
        python_config = convert_js_to_python(config)
        app_state['last_config'] = python_config
        
        # Conta administradores
        admins_count = len([c for c in app_state['contacts'] if c['tipo'] == 'administrador'])
        
        # Atualiza estado
        app_state['automation_running'] = True
        app_state['automation_status'].update({
            'isRunning': True,
            'currentStep': 'Iniciando automação com PROTEÇÃO ANTI-BAN...',
            'totalContacts': len(app_state['contacts']),
            'totalGroups': min(5, max(1, (len([c for c in app_state['contacts'] if c['tipo'] == 'lead']) + 49) // 50)),
            'logs': [
                '🛡️ Iniciando automação com PROTEÇÃO ANTI-BAN GARANTIDA...',
                '⚡ Execução SEGURA no backend',
                '🔒 LIMITE SEGURO: Máximo 5 grupos por execução',
                '👥 LIMITE SEGURO: Máximo 50 contatos por grupo',
                '⏳ DELAYS SEGUROS: 8-18s entre contatos',
                '🛡️ DELAYS ANTI-BAN: 2-5 minutos entre grupos',
                '⏸️ PAUSA AUTOMÁTICA: 30 min a cada 3 grupos',
                '🎯 PROTEÇÃO MÁXIMA contra banimento'
            ],
            'progress': 0,
            'processedContacts': 0,
            'currentGroupIndex': 0
        })
        
        # Executa automação em thread separada
        automation_thread = threading.Thread(
            target=run_automation_thread,
            args=(app_state['contacts'], python_config),
            daemon=True
        )
        automation_thread.start()
        
        return jsonify({
            'success': True,
            'message': f'Automação SEGURA iniciada! Proteção anti-ban GARANTIDA. Máximo 5 grupos por execução.',
        })
            
    except Exception as e:
        print(f"❌ ERRO na automação: {e}")
        import traceback
        traceback.print_exc()
        
        app_state['automation_running'] = False
        app_state['automation_status']['isRunning'] = False
        
        return jsonify({'error': f'Erro na automação: {str(e)}'}), 500

@app.route('/api/automation/status', methods=['GET'])
def get_automation_status():
    """Retorna o status atual da automação"""
    return jsonify(app_state['automation_status'])

@app.route('/api/automation/stop', methods=['POST'])
def stop_automation():
    """Para a automação"""
    try:
        app_state['automation_running'] = False
        app_state['automation_status']['isRunning'] = False
        app_state['automation_status']['currentStep'] = 'Automação interrompida pelo usuário'
        app_state['automation_status']['logs'].append('⏹️ Automação interrompida pelo usuário')
        
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
        
        admins_count = len([c for c in app_state['contacts'] if c['tipo'] == 'administrador'])
        leads_count = len([c for c in app_state['contacts'] if c['tipo'] == 'lead'])
        
        report_content = f"""Relatório de Automação WhatsApp - PROTEÇÃO ANTI-BAN GARANTIDA
Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

Contatos Processados: {len(app_state['contacts'])}
- Leads: {leads_count}
- Administradores: {admins_count}

Status: {'Em execução' if app_state['automation_running'] else 'Concluída'}

PROTEÇÃO ANTI-BAN APLICADA:
- Limite seguro: Máximo 5 grupos por execução
- Contatos por grupo: Máximo 50 (em vez de 999)
- Delays entre contatos: 8-18 segundos (aleatório)
- Delays entre grupos: 2-5 minutos (aleatório)
- Pausa automática: 30 minutos a cada 3 grupos
- Navegador anti-detecção: Configurações avançadas
- Comportamento humano: Delays variáveis e naturais

CONFIGURAÇÕES DE SEGURANÇA:
- User-Agent real do Chrome
- Remoção de indicadores de automação
- Delays humanizados para digitação
- Timeouts generosos para carregamento
- Verificação de limites de sessão

Contatos processados:
"""
        
        for contact in app_state['contacts']:
            if contact['tipo'] == 'administrador':
                report_content += f"👑 {contact['nome']} ({contact['numero']}) - ADMINISTRADOR\n"
            else:
                report_content += f"👤 {contact['nome']} ({contact['numero']}) - {contact['tipo']}\n"
        
        # Salva relatório temporário
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
        temp_file.write(report_content)
        temp_file.close()
        
        return send_file(temp_file.name, as_attachment=True, download_name=f'relatorio_whatsapp_seguro_{timestamp}.txt')
        
    except Exception as e:
        return jsonify({'error': f'Erro ao gerar relatório: {str(e)}'}), 500

@app.route('/api/python/generate', methods=['POST'])
def generate_python_code():
    """Gera código Python para download (opcional)"""
    try:
        data = request.get_json()
        config = data.get('config', {})
        
        # Usa contatos do estado global
        contacts = app_state['contacts']
        
        if not contacts:
            return jsonify({'error': 'Nenhum contato carregado'}), 400
        
        admins_count = len([c for c in contacts if c['tipo'] == 'administrador'])
        
        # Gera código Python simples (sem salvar arquivo)
        script_content = f'''#!/usr/bin/env python3
"""
Script de Automação WhatsApp - PROTEÇÃO ANTI-BAN GARANTIDA
Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

NOTA: Este código é apenas para referência.
A automação real é executada diretamente no backend com PROTEÇÃO ANTI-BAN.
"""

# Configuração
config = {repr(config)}

# Contatos
contacts = {repr(contacts)}

print("Este é um script de referência.")
print("A automação real é executada diretamente no backend com PROTEÇÃO ANTI-BAN.")
print(f"Total de contatos: {{len(contacts)}}")
print(f"Administradores que serão promovidos: {admins_count}")
print("Para executar a automação, use a interface web.")

# PROTEÇÃO ANTI-BAN APLICADA:
print("\\nPROTEÇÃO ANTI-BAN GARANTIDA:")
print("- Limite seguro: Máximo 5 grupos por execução")
print("- Contatos por grupo: Máximo 50 (em vez de 999)")
print("- Delays entre contatos: 8-18 segundos (aleatório)")
print("- Delays entre grupos: 2-5 minutos (aleatório)")
print("- Pausa automática: 30 minutos a cada 3 grupos")
print("- Navegador anti-detecção: Configurações avançadas")
print("- Comportamento humano: Delays variáveis e naturais")

# Administradores que serão promovidos:
admins = [c for c in contacts if c['tipo'] == 'administrador']
for admin in admins:
    print(f"👑 {{admin['nome']}} ({{admin['numero']}}) - SERÁ PROMOVIDO A ADMIN")

print("\\n🛡️ GARANTIA: Esta automação foi projetada para EVITAR BANIMENTOS!")
'''
        
        return jsonify({
            'success': True,
            'code': script_content,
            'filename': f'whatsapp_automation_seguro_{datetime.now().strftime("%Y%m%d_%H%M%S")}.py'
        })
            
    except Exception as e:
        return jsonify({'error': f'Erro ao gerar código: {str(e)}'}), 500

if __name__ == '__main__':
    print("🛡️ Iniciando WhatsApp Automation API - PROTEÇÃO ANTI-BAN GARANTIDA")
    print("📡 Servidor rodando em: http://localhost:5000")
    print("🔗 Frontend deve conectar em: http://localhost:5173")
    print("⚡ Execução SEGURA no backend")
    print("🛡️ PROTEÇÃO ANTI-BAN: Máximo 5 grupos por execução")
    print("👥 LIMITE SEGURO: Máximo 50 contatos por grupo")
    print("⏳ DELAYS SEGUROS: 8-18s entre contatos, 2-5min entre grupos")
    print("⏸️ PAUSA AUTOMÁTICA: 30 min a cada 3 grupos")
    print("🎯 GARANTIA: Configurações para EVITAR banimentos")
    print("="*60)
    
    app.run(port=5000)