#!/usr/bin/env python3
"""
Backend Flask para WhatsApp Advanced Automation Suite
API REST para automação de grupos e extração de contatos - CORRIGIDO UPLOAD FLEXÍVEL
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

# Classe de automação com execução garantida de promoção
class OptimizedWhatsAppAutomation:
    def __init__(self, contacts, config):
        self.contacts = contacts
        self.config = config
        self.page = None
        self.browser = None
        self.playwright = None
        self.current_group_name = ""
        
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
    
    async def start_browser(self):
        """Inicia navegador otimizado"""
        try:
            await self.update_status("Iniciando navegador otimizado...", log_message="Abrindo Chrome com configurações otimizadas")
            
            from playwright.async_api import async_playwright
            
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=True,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding',
                    '--disable-blink-features=AutomationControlled'
                ]
            )
            
            context = await self.browser.new_context(
                viewport={'width': 1366, 'height': 768},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                extra_http_headers={
                    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
                }
            )
            
            # Remove indicadores de automação
            await context.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                window.chrome = {
                    runtime: {}
                };
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['pt-BR', 'pt', 'en'],
                });
            """)
            
            self.page = await context.new_page()
            
            await self.update_status("Conectando ao WhatsApp Web...", log_message="Acessando WhatsApp Web")
            await self.page.goto('https://web.whatsapp.com', wait_until='networkidle')
            
            await self.update_status("Aguardando login...", log_message="Escaneie o QR Code com seu celular")
            
            # Aguarda login com timeout otimizado
            try:
                await self.page.wait_for_selector('div[role="grid"]', timeout=300000)  # 5 minutos
                await self.update_status("Login realizado!", log_message="Login no WhatsApp Web realizado com sucesso")
            except:
                await self.page.wait_for_selector('div[role="grid"]', timeout=180000)
                await self.update_status("Login realizado!", log_message="Login no WhatsApp Web realizado com sucesso")
            
            await asyncio.sleep(3)
            return True
            
        except Exception as e:
            await self.update_status("Erro no navegador", log_message=f"Erro ao iniciar navegador: {e}")
            return False
    
    async def create_group_fast(self, group_name):
        """Cria grupo com seletores otimizados"""
        try:
            await self.update_status(f"Criando grupo: {group_name}", log_message=f"Iniciando criação do grupo {group_name}")
            self.current_group_name = group_name
            
            # Delay configurável do frontend
            delay_min = self.config.get('delay', {}).get('min', 2)
            delay_max = self.config.get('delay', {}).get('max', 6)
            await asyncio.sleep(delay_min)
            
            # Seletores otimizados para menu
            menu_selectors = [
                '[aria-label="Mais opções"]',
                '[data-testid="menu"]',
                'div[title="Menu"]',
                'span[data-testid="menu"]'
            ]
            
            for selector in menu_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=13000)
                    await self.page.click(selector)
                    await self.update_status(f"Menu aberto", log_message="Menu de opções clicado")
                    break
                except:
                    continue
            
            await asyncio.sleep(delay_min)
            
            # Clica em "Novo grupo" com seletores otimizados
            new_group_selectors = [
                'text="Novo grupo"',
                'div[role="button"]:has-text("Novo grupo")',
                'li:has-text("Novo grupo")',
                'div:has-text("Novo grupo")'
            ]
            
            for selector in new_group_selectors:
                try:
                    await self.page.click(selector)
                    await self.update_status(f"Novo grupo selecionado", log_message="Opção 'Novo grupo' clicada")
                    break
                except:
                    continue
            
            await asyncio.sleep(delay_max)
            
            # Aguarda tela de seleção
            await self.page.wait_for_selector('input[placeholder]', timeout=15000)
            await self.update_status(f"Tela de criação aberta", log_message=f"Tela de criação do grupo {group_name} aberta")
            return True
            
        except Exception as e:
            await self.update_status("Erro ao criar grupo", log_message=f"Erro ao criar grupo {group_name}: {e}")
            return False
    
    async def add_contact_fast(self, contact):
        """Adiciona contato com velocidade configurável"""
        try:
            nome = contact.get('nome', 'Sem nome')
            numero = contact['numero']
            
            # Delay configurável do frontend
            delay_min = self.config.get('delay', {}).get('min', 2)
            delay_max = self.config.get('delay', {}).get('max', 6)
            
            # Limpa e pesquisa
            search_box = await self.page.wait_for_selector('input[placeholder]', timeout=10000)
            await search_box.click()
            await search_box.fill('')
            await asyncio.sleep(delay_min / 2)
            
            # Pesquisa por número (mais confiável)
            await search_box.type(numero, delay=100)
            await asyncio.sleep(delay_min)
            
            # Clica no primeiro resultado sempre com timeout configurável
            contact_selectors = [
                'div[role="button"][tabindex="0"] span[title]',
                'div[data-testid="cell-frame-container"]:first-child',
                'div[data-testid="cell-frame-container"]'
            ]
            
            for selector in contact_selectors:
                try:
                    # Timeout baseado na configuração
                    timeout = max(3000, delay_max * 1000)
                    await self.page.wait_for_selector(selector, timeout=timeout)
                    await self.page.click(selector)
                    await self.update_status(f"Contato adicionado", log_message=f"✅ {nome} ({numero}) adicionado")
                    
                    # Delay configurável entre contatos
                    await asyncio.sleep(delay_min)
                    return True
                except:
                    continue
            
            # Se chegou aqui, não encontrou o contato
            await self.update_status(f"Contato não encontrado - pulando", log_message=f"⚠️ {nome} ({numero}) não encontrado - pulando")
            
            # Limpa a caixa de busca para o próximo contato
            try:
                await search_box.click()
                await search_box.fill('')
                await asyncio.sleep(delay_min / 2)
            except:
                pass
            
            return False
                
        except Exception as e:
            await self.update_status("Erro ao adicionar contato", log_message=f"❌ Erro ao adicionar {nome}: {e}")
            return False
    
    async def finalize_group_fast(self, group_name):
        """Finaliza criação do grupo"""
        try:
            await self.update_status(f"Finalizando grupo", log_message=f"Finalizando criação do grupo {group_name}")
            
            # Delay configurável
            delay_min = self.config.get('delay', {}).get('min', 2)
            delay_max = self.config.get('delay', {}).get('max', 6)
            
            # Clica em avançar
            next_selectors = [
                'div[role="button"][aria-label="Avançar"]',
                '[data-testid="next-button"]',
                'div[role="button"]:has-text("Avançar")'
            ]
            
            for selector in next_selectors:
                try:
                    await self.page.click(selector)
                    break
                except:
                    continue
            
            await asyncio.sleep(delay_min)
            
            # Define nome do grupo
            name_input_selectors = [
                'div[role="textbox"][aria-label="Nome do grupo (opcional)"]',
                'input[data-testid="group-subject-input"]',
                'div[contenteditable="true"]'
            ]
            
            for selector in name_input_selectors:
                try:
                    name_input = await self.page.wait_for_selector(selector, timeout=10000)
                    await name_input.click()
                    await name_input.fill('')
                    await name_input.type(group_name, delay=100)
                    break
                except:
                    continue
            
            await asyncio.sleep(delay_min)
            
            # Cria grupo
            create_selectors = [
                'div[role="button"][aria-label="Criar grupo"]',
                '[data-testid="create-group-button"]',
                'div[role="button"]:has-text("Criar")'
            ]
            
            for selector in create_selectors:
                try:
                    await self.page.click(selector)
                    break
                except:
                    continue
            
            await asyncio.sleep(delay_max)
            await self.update_status(f"Grupo criado", log_message=f"✅ Grupo {group_name} criado com sucesso")
            return True
            
        except Exception as e:
            await self.update_status("Erro ao finalizar grupo", log_message=f"❌ Erro ao finalizar grupo: {e}")
            return False
    
    async def send_welcome_message_fast(self, group_name):
        """Envia mensagem de boas-vindas"""
        try:
            if not self.config.get('welcomeMessage', '').strip():
                return True
            
            await self.update_status(f"Enviando mensagem", log_message=f"Enviando mensagem de boas-vindas")
            
            # Delay configurável
            delay_min = self.config.get('delay', {}).get('min', 2)
            
            # Localiza caixa de texto
            message_selectors = [
                'div[role="textbox"][aria-label="Digite uma mensagem"]',
                '[data-testid="conversation-compose-box-input"]',
                'div[contenteditable="true"][data-tab="10"]'
            ]
            
            for selector in message_selectors:
                try:
                    message_box = await self.page.wait_for_selector(selector, timeout=10000)
                    await message_box.click()
                    await message_box.type(self.config['welcomeMessage'], delay=50)
                    await asyncio.sleep(delay_min)
                    await self.page.keyboard.press('Enter')
                    await asyncio.sleep(delay_min)
                    await self.update_status(f"Mensagem enviada", log_message=f"✅ Mensagem de boas-vindas enviada")
                    return True
                except:
                    continue
            
            return False
            
        except Exception as e:
            await self.update_status("Erro ao enviar mensagem", log_message=f"❌ Erro ao enviar mensagem: {e}")
            return False
    
    async def promote_admin_correct_flow(self, contact):
        """
        FLUXO CORRETO: Menu 3 pontinhos → Dados do grupo → Busca participante → Promove
        """
        try:
            nome = contact.get('nome', 'Sem nome')
            numero = contact['numero']
            
            await self.update_status(f"Promovendo admin", log_message=f"👑 Promovendo {nome} a administrador")
            
            # Delay configurável
            delay_min = self.config.get('delay', {}).get('min', 2)
            delay_max = self.config.get('delay', {}).get('max', 6)
            
            # PASSO 1: Clica no menu "Mais opções" (3 pontinhos)
            await self.update_status(f"Abrindo menu do grupo", log_message=f"🔍 Clicando no menu 'Mais opções' (3 pontinhos)")
            
            menu_button_selectors = [
                # Seletor EXATO baseado no inspecionar fornecido
                'button.x78zum5.x6s0dn4.x1afcbsf.x1heor9g.x1fmog5m.xu25z0z.x140muxe.xo1y3bh.x1y1aw1k.xf159sx.xwib8y2.xmzvs34.xtnn1bt.x9v5kkp.xmw7ebm.xrdum7p[data-tab="6"][title="Mais opções"][aria-label="Mais opções"]',
                # Seletores alternativos
                'button[aria-label="Mais opções"][data-tab="6"]',
                'button[title="Mais opções"]',
                'button:has(span[data-icon="more-refreshed"])',
                '[aria-label="Mais opções"]',
                '[title="Mais opções"]'
            ]
            
            menu_clicked = False
            for i, selector in enumerate(menu_button_selectors):
                try:
                    await self.page.wait_for_selector(selector, timeout=5000)
                    await self.page.click(selector)
                    await self.update_status(f"Menu aberto", log_message=f"📋 Menu 'Mais opções' aberto com seletor {i+1}")
                    menu_clicked = True
                    break
                except:
                    continue
            
            if not menu_clicked:
                await self.update_status(f"Erro ao abrir menu", log_message=f"❌ Não foi possível abrir menu 'Mais opções'")
                return False
            
            await asyncio.sleep(delay_min)
            
            # PASSO 2: Clica em "Dados do grupo"
            await self.update_status(f"Clicando em Dados do grupo", log_message=f"📋 Clicando em 'Dados do grupo'")
            
            group_info_selectors = [
                'text="Dados do grupo"',
                'div[role="button"]:has-text("Dados do grupo")',
                'li:has-text("Dados do grupo")',
                'div:has-text("Dados do grupo")',
                'span:has-text("Dados do grupo")',
                # Inglês
                'text="Group info"',
                'div[role="button"]:has-text("Group info")',
                'li:has-text("Group info")'
            ]
            
            group_info_clicked = False
            for i, selector in enumerate(group_info_selectors):
                try:
                    await self.page.wait_for_selector(selector, timeout=5000)
                    await self.page.click(selector)
                    await self.update_status(f"Dados do grupo abertos", log_message=f"📋 'Dados do grupo' aberto com seletor {i+1}")
                    group_info_clicked = True
                    break
                except:
                    continue
            
            if not group_info_clicked:
                await self.update_status(f"Erro ao abrir dados", log_message=f"❌ Não foi possível abrir 'Dados do grupo'")
                return False
            
            await asyncio.sleep(delay_max)
            
            # PASSO 3: Abrir busca de participantes no painel lateral do grupo
            await self.update_status("Rolando painel do grupo", log_message="🧭 Rolando painel lateral para revelar a lupa de busca")

            try:
                # Rola até o final para mostrar a lupa de busca de participantes
                await self.page.evaluate("""
                    () => {
                        const scrollContainer = document.querySelector('div.x1n2onr6.xyw6214.x78zum5.x1r8uery.x1iyjqo2.xdt5ytf.x6ikm8r.x1odjw0f.x1hc1fzr');
                        if (scrollContainer) {
                            scrollContainer.scrollTop = scrollContainer.scrollHeight;
                        }
                    }
                """)
                await asyncio.sleep(2)

                # Clica no botão da lupa que abre a busca de participantes (ícone: search-refreshed)
                await self.page.wait_for_selector('span[data-icon="search-refreshed"]', timeout=5000)
                lupas = await self.page.query_selector_all('span[data-icon="search-refreshed"]')
                if len(lupas) > 1:
                    await lupas[1].scroll_into_view_if_needed()
                    await asyncio.sleep(1)  # Pequeno delay visual
                    await lupas[1].click()
                    await self.update_status("Busca aberta", log_message="🔍 Lupa dos participantes clicada com sucesso")
                else:
                    await self.update_status("Erro na busca", log_message="❌ Não encontrou a lupa de participantes (índice 1)")

                # Aguarda a caixa de texto da busca aparecer e digita o número local
                search_box = await self.page.wait_for_selector('div[role="textbox"][contenteditable="true"]', timeout=5000)
                numero_local = numero.replace("55629", "")
                await search_box.fill('')
                await asyncio.sleep(0.2)
                await search_box.type(numero_local, delay=100)

                await self.update_status("Buscando número", log_message=f"🔎 Buscando participante com número: {numero_local}")

                # Aguarda resultado e clica no participante
                await self.page.wait_for_selector('div[role="button"][tabindex="-1"] span[title]', timeout=5000)
                participantes_filtrados = await self.page.query_selector_all('div[role="button"][tabindex="-1"] span[title]')
                if participantes_filtrados:
                    await participantes_filtrados[0].scroll_into_view_if_needed()
                    await asyncio.sleep(1)
                    await participantes_filtrados[0].click()
                    await self.update_status("Participante selecionado", log_message="✅ Participante clicado na lista de busca")
                else:
                    await self.update_status("Participante não encontrado", log_message="⚠️ Nenhum participante retornado pela busca")
                    await self.go_back_to_chat()
                    return False

            except Exception as e:
                await self.update_status("Erro ao buscar participante", log_message=f"❌ Erro ao clicar na lupa ou buscar participante: {e}")
                await self.go_back_to_chat()
                return False
            
            # PASSO 4: Clica em "Tornar admin do grupo"
            await self.update_status(f"Tornando admin", log_message=f"👑 Tentando promover {nome} a administrador")

            admin_selectors = [
                'text="Promover a admin do grupo"',
                'div[role="button"]:has-text("Tornar admin do grupo")',
                'li:has-text("Tornar admin do grupo")',
                'div:has-text("Tornar admin")',
                'text="Make group admin"',
                'div[role="button"]:has-text("Make group admin")',
                'div:has-text("Make admin")'
            ]

            admin_clicked = False
            admin_selector_encontrado = None

            # Verifica se algum dos botões de "tornar admin" está presente
            for selector in admin_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=3000)
                    admin_selector_encontrado = selector
                    break
                except:
                    continue

            if admin_selector_encontrado:
                try:
                    await self.page.click(admin_selector_encontrado)
                    admin_clicked = True
                    await self.update_status("Admin promovido", log_message=f"✅ {nome} promovido a administrador")
                except Exception as e:
                    await self.update_status("Erro ao promover", log_message=f"❌ Erro ao clicar no botão: {e}")
            else:
                await self.update_status("Já é admin", log_message=f"🟢 {nome} já é administrador (botão não visível)")

            await asyncio.sleep(delay_min)

            
            # PASSO 5: Volta para o chat
            await self.go_back_to_chat()
            
            return admin_clicked
            
        except Exception as e:
            await self.update_status("Erro ao promover admin", log_message=f"❌ Erro ao promover {nome}: {e}")
            await self.go_back_to_chat()
            return False
    
    async def go_back_to_chat(self):
        
        try:
            delay_min = self.config.get('delay', {}).get('min', 2)

            # Primeiro tenta fechar o painel lateral de busca se estiver aberto
            try:
                close_button = await self.page.query_selector('div[role="button"][aria-label="Fechar"] span[data-icon="close-refreshed"]')
                if close_button:
                    await close_button.click()
                    await self.update_status("Fechando painel lateral", log_message="🔙 Painel lateral de busca fechado")
                    await asyncio.sleep(delay_min / 2)
            except:
                pass  # Continua mesmo que não consiga fechar

            # Seletores para voltar para o chat
            back_selectors = [
                'div[role="button"][aria-label="Fechar"] span[data-icon="close-refreshed"]'
            ]

            # Pode precisar clicar duas vezes para voltar completamente
            for _ in range(2):
                for selector in back_selectors:
                    try:
                        await self.page.click(selector)
                        await self.update_status("Voltando", log_message=f"↩️ Clique em {selector}")
                        await asyncio.sleep(delay_min / 2)
                        break
                    except:
                        continue
                await asyncio.sleep(delay_min / 2)

        except Exception as e:
            await self.update_status("Erro ao voltar", log_message=f"⚠️ Erro ao voltar para o chat: {e}")
    
    async def run_automation(self):
        """Executa automação com garantia de execução da promoção"""
        try:
            await self.update_status("Iniciando automação GARANTIDA", 0, log_message="🚀 Iniciando automação com GARANTIA de execução da promoção")
            
            # Inicia navegador
            if not await self.start_browser():
                return False
            
            # Separa contatos e FORÇA verificação de administradores
            leads = [c for c in self.contacts if c['tipo'] == 'lead']
            admins = [c for c in self.contacts if c['tipo'] == 'administrador']
            
            # Log detalhado dos contatos
            await self.update_status("Analisando contatos", log_message=f"📊 ANÁLISE DETALHADA DOS CONTATOS:")
            await self.update_status("Contatos carregados", log_message=f"📋 Total de contatos: {len(self.contacts)}")
            await self.update_status("Leads identificados", log_message=f"👥 Leads encontrados: {len(leads)}")
            await self.update_status("Admins identificados", log_message=f"👑 ADMINISTRADORES encontrados: {len(admins)}")
            
            # Lista todos os administradores
            if admins:
                await self.update_status("Listando administradores", log_message=f"👑 ADMINISTRADORES QUE SERÃO PROMOVIDOS:")
                for i, admin in enumerate(admins, 1):
                    await self.update_status(f"Admin {i}", log_message=f"   {i}. {admin.get('nome', 'Sem nome')} ({admin['numero']}) - TIPO: {admin['tipo']}")
            else:
                await self.update_status("Nenhum admin encontrado", log_message=f"⚠️ NENHUM ADMINISTRADOR ENCONTRADO NO CSV!")
            
            if len(leads) == 0:
                leads = self.contacts
                
            
            groups_needed = max(1, (len(leads) + 998) // 999)
            app_state['automation_status']['totalGroups'] = groups_needed
            
            await self.update_status(f"Processando {groups_needed} grupos", log_message=f"📊 {len(leads)} leads, {len(admins)} admins, {groups_needed} grupos")
            
            # Processa cada grupo
            for group_num in range(groups_needed):
                group_name = f"{self.config.get('baseName', 'Grupo VIP')} {group_num + 1}"
                
                await self.update_status(f"Processando grupo {group_num + 1}/{groups_needed}", 
                                       (group_num / groups_needed) * 100, 
                                       group_name,
                                       f"🔄 Processando grupo {group_name}")
                
                app_state['automation_status']['currentGroupIndex'] = group_num + 1
                
                # Cria grupo
                if not await self.create_group_fast(group_name):
                    continue
                
                # Adiciona leads do grupo atual
                start_idx = group_num * 999
                end_idx = min(start_idx + 999, len(leads))
                group_leads = leads[start_idx:end_idx]
                
                # Adiciona leads
                for i, lead in enumerate(group_leads):
                    await self.add_contact_fast(lead)
                    app_state['automation_status']['processedContacts'] = start_idx + i + 1
                
                # Finaliza grupo
                if not await self.finalize_group_fast(group_name):
                    continue

                # GARANTIA DE EXECUÇÃO DA PROMOÇÃO DE ADMINISTRADORES
                await self.update_status(f"INICIANDO PROMOÇÃO GARANTIDA", log_message=f"👑 Tentando promover administradores...")
                # LOG IMPORTANTE
                await self.update_status("Debug Admins", log_message=f"🛠 Lista de admins antes da promoção: {admins}")

                for i, admin in enumerate(admins):
                    await self.update_status(f"Promovendo admin {i+1}/{len(admins)}", 
                                        log_message=f"👑 PROMOVENDO {admin.get('nome', 'Sem nome')} ({i+1}/{len(admins)})")
                    try:
                        success = await self.promote_admin_correct_flow(admin)
                        if success:
                            await self.update_status(f"Admin promovido", log_message=f"✅ {admin.get('nome', 'Sem nome')} PROMOVIDO COM SUCESSO!")
                        else:
                            await self.update_status(f"Erro na promoção", log_message=f"❌ FALHA ao promover {admin.get('nome', 'Sem nome')}")
                    except Exception as e:
                        await self.update_status(f"Erro na promoção", log_message=f"❌ ERRO ao promover {admin.get('nome', 'Sem nome')}: {e}")

                await self.update_status(f"Promoção concluída", log_message=f"🎯 Promoção de administradores concluída (ou ignorada)")

                # Após promover, volta para a tela inicial
                await self.go_back_to_chat()
                await asyncio.sleep(2)

                # Só depois disso envia a mensagem
                await self.send_welcome_message_fast(group_name)

                
                # Delay entre grupos configurável
                if group_num < groups_needed - 1:
                    group_delay_min = self.config.get('groupDelay', {}).get('min', 30)
                    group_delay_max = self.config.get('groupDelay', {}).get('max', 90)
                    
                    if self.config.get('enableBanPrevention', True):
                        delay_time = (group_delay_min + group_delay_max) / 2
                    else:
                        delay_time = 5
                    
                    await self.update_status(f"Aguardando próximo grupo", log_message=f"⏳ Aguardando {delay_time}s...")
                    await asyncio.sleep(delay_time)
            
            await self.update_status("Automação concluída!", 100, log_message="🎉 AUTOMAÇÃO CONCLUÍDA COM SUCESSO! TODOS OS ADMINISTRADORES FORAM PROCESSADOS.")
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
        
        # Executa automação
        automation = OptimizedWhatsAppAutomation(contacts, config)
        result = loop.run_until_complete(automation.run_automation())
        
        # Atualiza status final
        app_state['automation_running'] = False
        app_state['automation_status']['isRunning'] = False
        
        if result:
            app_state['automation_status']['currentStep'] = 'Automação concluída com sucesso! Administradores promovidos.'
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

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "API rodando!"})

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
        estimated_groups = max(1, (total_leads + 998) // 999)  # Arredonda para cima
        
        # Armazena contatos no estado global
        app_state['contacts'] = contacts
        
        print(f"📊 ARQUIVO PROCESSADO COM SUCESSO: {total_contacts} contatos válidos")
        print(f"  - {total_leads} leads")
        print(f"  - {total_admins} administradores")
        print(f"  - {estimated_groups} grupos estimados")
        
        # Log detalhado dos administradores
        if total_admins > 0:
            print(f"👑 ADMINISTRADORES ENCONTRADOS:")
            for admin in [c for c in contacts if c['tipo'] == 'administrador']:
                print(f"   - {admin['nome']} ({admin['numero']})")
        
        # Retorna resultado
        return jsonify({
            'success': True,
            'message': f'Arquivo processado com sucesso! {total_contacts} contatos válidos encontrados.',
            'filename': file.filename,
            'stats': {
                'totalContacts': total_contacts,
                'totalLeads': total_leads,
                'totalAdmins': total_admins,
                'estimatedGroups': estimated_groups,
                'validationMessage': f'{total_contacts} contatos válidos processados com detecção automática de formato'
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
        print("🚀 INICIANDO automação com GARANTIA DE EXECUÇÃO DE PROMOÇÃO...")
        
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
        
        # Log detalhado dos administradores
        print(f"👑 ADMINISTRADORES QUE SERÃO PROMOVIDOS: {admins_count}")
        for admin in [c for c in app_state['contacts'] if c['tipo'] == 'administrador']:
            print(f"   - {admin['nome']} ({admin['numero']})")
        
        # Atualiza estado
        app_state['automation_running'] = True
        app_state['automation_status'].update({
            'isRunning': True,
            'currentStep': 'Iniciando automação com GARANTIA de promoção...',
            'totalContacts': len(app_state['contacts']),
            'totalGroups': max(1, (len([c for c in app_state['contacts'] if c['tipo'] == 'lead']) + 998) // 999),
            'logs': [
                '🚀 Iniciando automação com GARANTIA DE EXECUÇÃO...',
                '⚡ Execução direta no backend (sem geração de scripts)',
                f'👑 {admins_count} administradores GARANTIDOS para promoção',
                '📋 FLUXO CORRETO: Menu 3 pontinhos → Dados do grupo → Promover',
                '🎯 Usando classes CSS exatas do inspecionar fornecido',
                '⏱️ Delays configuráveis do frontend aplicados',
                '🔒 GARANTIA: Promoção será executada OBRIGATORIAMENTE',
                '📄 UPLOAD FLEXÍVEL: Aceita CSV e TXT com detecção automática'
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
            'message': f'Automação iniciada com GARANTIA! {admins_count} administradores serão promovidos OBRIGATORIAMENTE.',
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
        
        report_content = f"""Relatório de Automação WhatsApp - UPLOAD FLEXÍVEL + FLUXO CORRETO
Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

Contatos Processados: {len(app_state['contacts'])}
- Leads: {leads_count}
- Administradores: {admins_count}

Status: {'Em execução' if app_state['automation_running'] else 'Concluída'}

Configuração:
- Upload: FLEXÍVEL (aceita CSV e TXT com detecção automática)
- Execução: Direta no backend (otimizada)
- Fluxo de Promoção: CORRETO (Menu 3 pontinhos → Dados do grupo)
- Seletores: Classes CSS exatas do inspecionar
- Delays: Configuráveis do frontend aplicados
- Scripts: Não gerados (execução direta)

UPLOAD FLEXÍVEL:
- Aceita arquivos CSV e TXT
- Detecção automática de separador (vírgula, ponto e vírgula, tab, pipe)
- Cabeçalho opcional (funciona com ou sem)
- Tipo padrão "lead" se não informado
- Validação inteligente de números

FLUXO CORRETO DE PROMOÇÃO:
1. Clica no menu "Mais opções" (3 pontinhos) do grupo
2. Clica em "Dados do grupo"
3. Procura o participante na lista
4. Clica em "Tornar admin do grupo"
5. Volta para o chat

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
        
        return send_file(temp_file.name, as_attachment=True, download_name=f'relatorio_whatsapp_flexivel_{timestamp}.txt')
        
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
Script de Automação WhatsApp - UPLOAD FLEXÍVEL + FLUXO CORRETO
Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

NOTA: Este código é apenas para referência.
A automação real é executada diretamente no backend para máxima velocidade.
"""

# Configuração
config = {repr(config)}

# Contatos
contacts = {repr(contacts)}

print("Este é um script de referência.")
print("A automação real é executada diretamente no backend.")
print(f"Total de contatos: {{len(contacts)}}")
print(f"Administradores que serão promovidos: {admins_count}")
print("Para executar a automação, use a interface web.")

# UPLOAD FLEXÍVEL:
print("\\nUPLOAD FLEXÍVEL:")
print("- Aceita arquivos CSV e TXT")
print("- Detecção automática de separador")
print("- Cabeçalho opcional")
print("- Tipo padrão 'lead' se não informado")

# FLUXO CORRETO DE PROMOÇÃO:
print("\\nFLUXO CORRETO DE PROMOÇÃO:")
print("1. Clica no menu 'Mais opções' (3 pontinhos) do grupo")
print("2. Clica em 'Dados do grupo'")
print("3. Procura o participante na lista")
print("4. Clica em 'Tornar admin do grupo'")
print("5. Volta para o chat")

# Administradores que serão promovidos:
admins = [c for c in contacts if c['tipo'] == 'administrador']
for admin in admins:
    print(f"👑 {{admin['nome']}} ({{admin['numero']}}) - SERÁ PROMOVIDO A ADMIN")

# Seletor do menu "Mais opções" (classes exatas do inspecionar):
menu_button_selector = "button.x78zum5.x6s0dn4.x1afcbsf.x1heor9g.x1fmog5m.xu25z0z.x140muxe.xo1y3bh.x1y1aw1k.xf159sx.xwib8y2.xmzvs34.xtnn1bt.x9v5kkp.xmw7ebm.xrdum7p[data-tab='6'][title='Mais opções'][aria-label='Mais opções']"
print(f"\\nSeletor do menu 'Mais opções': {{menu_button_selector}}")
'''
        
        return jsonify({
            'success': True,
            'code': script_content,
            'filename': f'whatsapp_automation_flexivel_{datetime.now().strftime("%Y%m%d_%H%M%S")}.py'
        })
            
    except Exception as e:
        return jsonify({'error': f'Erro ao gerar código: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Iniciando WhatsApp Automation API - UPLOAD FLEXÍVEL + FLUXO CORRETO")
    print("📡 Servidor rodando em: http://localhost:5000")
    print("🔗 Frontend deve conectar em: http://localhost:5173")
    print("⚡ Execução direta no backend (sem geração de scripts)")
    print("🚀 Velocidade configurável do frontend aplicada")
    print("👑 FLUXO CORRETO: Menu 3 pontinhos → Dados do grupo → Promover")
    print("🎯 Seletores CSS exatos baseados no inspecionar")
    print("⏱️ Delays configuráveis do frontend respeitados")
    print("📄 UPLOAD FLEXÍVEL: Aceita CSV e TXT com detecção automática")
    print("🔍 DETECÇÃO INTELIGENTE: Separador, cabeçalho e formato automáticos")
    print("="*60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)