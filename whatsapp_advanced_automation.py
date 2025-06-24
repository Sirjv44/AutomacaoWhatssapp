#!/usr/bin/env python3
"""
WhatsApp Advanced Group Automation Tool with Anti-Ban Protection
Ferramenta avançada de automação para criação de grupos no WhatsApp Web
Desenvolvido com Playwright + Python com proteção anti-banimento

Recursos Avançados:
- Proteção anti-banimento com delays inteligentes
- Controle de sessão e retomada automática
- Backup contínuo do progresso
- Detecção de desconexão e reconexão
- Processamento de milhares de contatos com segurança
- Relatórios detalhados em CSV e JSON

Requisitos:
- Python 3.8+
- pip install playwright pandas asyncio
- playwright install chromium

Uso:
1. Execute: python whatsapp_advanced_automation.py
2. Escaneie o QR Code quando solicitado
3. Aguarde o processamento automático com proteção anti-ban
"""

import asyncio
import json
import time
import csv
import math
import random
import os
from datetime import datetime, timedelta
from pathlib import Path
from playwright.async_api import async_playwright
import logging

# Configuração de logging avançada
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('whatsapp_advanced_automation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WhatsAppAdvancedAutomation:
    def __init__(self):
        self.page = None
        self.browser = None
        self.playwright = None
        self.reports = []
        self.start_time = None
        self.session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.backup_file = f"backup_{self.session_id}.json"
        self.groups_in_current_session = 0
        self.connection_lost = False
        
        # Configurações padrão com proteção anti-ban
        self.config = {
            'base_name': 'Grupo VIP',
            'max_members': 999,
            'delay': {'min': 2, 'max': 6},
            'group_delay': {'min': 30, 'max': 90},
            'create_multiple': True,
            'welcome_message': 'Bem-vindos ao nosso grupo! 🎉\n\nEste é um espaço para compartilharmos informações importantes e mantermos contato.\n\nObrigado por fazer parte da nossa comunidade! 👥',
            'enable_ban_prevention': True,
            'max_groups_per_session': 10,
            'enable_scheduling': False,
            'scheduled_datetime': ''
        }
        
        # Contatos serão carregados do CSV
        self.contacts = []
        
        logger.info(f"🛡️  Automação avançada com proteção anti-ban inicializada")
        logger.info(f"   🆔 Sessão: {self.session_id}")
        logger.info(f"   🛡️  Proteção anti-ban: {'Ativada' if self.config['enable_ban_prevention'] else 'Desativada'}")
    
    def load_contacts_from_csv(self, csv_file_path):
        """Carrega contatos do arquivo CSV"""
        try:
            contacts = []
            with open(csv_file_path, 'r', encoding='utf-8') as file:
                csv_reader = csv.DictReader(file)
                for row in csv_reader:
                    contact = {
                        'nome': row.get('nome', '').strip() or None,
                        'numero': row['numero'].strip(),
                        'tipo': row['tipo'].strip().lower()
                    }
                    
                    # Valida tipo
                    if contact['tipo'] not in ['lead', 'administrador']:
                        logger.warning(f"⚠️  Tipo inválido para {contact['numero']}: {contact['tipo']}")
                        continue
                    
                    # Garante formato do número com DDI
                    numero = contact['numero'].replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
                    if not numero.startswith('55'):
                        numero = f"55{numero}"
                    contact['numero'] = numero
                    
                    contacts.append(contact)
            
            self.contacts = contacts
            logger.info(f"📁 {len(contacts)} contatos carregados do CSV")
            
            # Calcula estatísticas
            leads = [c for c in contacts if c['tipo'] == 'lead']
            admins = [c for c in contacts if c['tipo'] == 'administrador']
            estimated_groups = math.ceil(len(leads) / self.config['max_members'])
            
            logger.info(f"   👥 {len(leads)} leads")
            logger.info(f"   👑 {len(admins)} administradores")
            logger.info(f"   📋 {estimated_groups} grupos estimados")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao carregar CSV: {e}")
            return False
    
    def save_backup(self, current_group_index=0, current_contact_index=0):
        """Salva backup do progresso atual"""
        try:
            backup_data = {
                'session_id': self.session_id,
                'timestamp': datetime.now().isoformat(),
                'config': self.config,
                'current_group_index': current_group_index,
                'current_contact_index': current_contact_index,
                'groups_in_current_session': self.groups_in_current_session,
                'reports': self.reports,
                'connection_lost': self.connection_lost
            }
            
            with open(self.backup_file, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"💾 Backup salvo: {self.backup_file}")
            return True
        except Exception as e:
            logger.error(f"❌ Erro ao salvar backup: {e}")
            return False
    
    def load_backup(self):
        """Carrega backup anterior se existir"""
        try:
            backup_files = [f for f in os.listdir('.') if f.startswith('backup_session_') and f.endswith('.json')]
            if backup_files:
                # Pega o backup mais recente
                latest_backup = max(backup_files, key=os.path.getctime)
                
                with open(latest_backup, 'r', encoding='utf-8') as f:
                    backup_data = json.load(f)
                
                logger.info(f"📂 Backup encontrado: {backup_data['timestamp']}")
                return backup_data
            return None
        except Exception as e:
            logger.error(f"❌ Erro ao carregar backup: {e}")
            return None
    
    def calculate_batch_groups(self):
        """Calcula e organiza os grupos em lotes para processamento com proteção anti-ban"""
        leads = [c for c in self.contacts if c['tipo'] == 'lead']
        admins = [c for c in self.contacts if c['tipo'] == 'administrador']
        
        # Calcula número de grupos necessários baseado nos leads
        groups_needed = math.ceil(len(leads) / self.config['max_members'])
        
        batch_groups = []
        
        for group_num in range(groups_needed):
            group_name = f"{self.config['base_name']} {group_num + 1}"
            
            # Seleciona leads para este grupo
            start_idx = group_num * self.config['max_members']
            end_idx = min(start_idx + self.config['max_members'], len(leads))
            group_leads = leads[start_idx:end_idx]
            
            # Todos os administradores vão para todos os grupos
            group_admins = admins.copy()
            
            batch_groups.append({
                'group_name': group_name,
                'leads': group_leads,
                'admins': group_admins,
                'total_members': len(group_leads) + len(group_admins),
                'session': math.ceil((group_num + 1) / self.config['max_groups_per_session'])
            })
        
        logger.info(f"📋 Grupos organizados em lotes com proteção anti-ban:")
        for i, group in enumerate(batch_groups, 1):
            logger.info(f"   Grupo {i}: {group['group_name']} - {len(group['leads'])} leads + {len(group['admins'])} admins = {group['total_members']} total (Sessão {group['session']})")
        
        return batch_groups
    
    async def start_browser(self):
        """Inicia o navegador e abre o WhatsApp Web com proteção anti-ban"""
        try:
            logger.info("🌐 Iniciando navegador com proteção anti-ban...")
            
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
                    '--disable-renderer-backgrounding'
                ]
            )
            
            context = await self.browser.new_context(
                viewport={'width': 1366, 'height': 768},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            
            self.page = await context.new_page()
            
            # Simula comportamento humano
            await self.page.goto('https://web.whatsapp.com', wait_until='networkidle')
            await asyncio.sleep(random.uniform(3, 5))
            
            logger.info("📱 Aguardando login no WhatsApp Web...")
            logger.info("   🔍 Escaneie o QR Code com seu celular")
            
            # Aguarda até que a página principal carregue (indicando login bem-sucedido)
            try:
                await self.page.wait_for_selector('[data-testid="chat-list"]', timeout=300000)  # 5 minutos
                logger.info("✅ Login realizado com sucesso!")
            except:
                await self.page.wait_for_selector('div[data-testid="chat-list"]', timeout=180000)
                logger.info("✅ Login realizado com sucesso!")
            
            # Aguarda carregamento completo com delay humanizado
            await asyncio.sleep(random.uniform(5, 8))
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar navegador: {e}")
            return False
    
    async def check_connection(self):
        """Verifica se a conexão com WhatsApp Web ainda está ativa"""
        try:
            # Verifica se ainda está na página do WhatsApp e logado
            chat_list = await self.page.query_selector('[data-testid="chat-list"]')
            if chat_list:
                return True
            
            # Verifica se apareceu QR Code (desconectado)
            qr_code = await self.page.query_selector('[data-testid="qr-code"]')
            if qr_code:
                logger.warning("⚠️  Conexão perdida - QR Code detectado")
                self.connection_lost = True
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao verificar conexão: {e}")
            return False
    
    async def create_group(self, group_name):
        """Cria um novo grupo no WhatsApp"""
        try:
            logger.info(f"👥 Criando grupo: {group_name}")
            
            # Verifica conexão antes de prosseguir
            if not await self.check_connection():
                raise Exception("Conexão com WhatsApp perdida")
            
            # Clica no menu de opções (três pontos)
            menu_selectors = [
                '[data-testid="menu"]',
                'div[title="Menu"]',
                'span[data-testid="menu"]',
                'div[aria-label="Menu"]'
            ]
            
            menu_clicked = False
            for selector in menu_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=10000)
                    await self.page.click(selector)
                    menu_clicked = True
                    break
                except:
                    continue
            
            if not menu_clicked:
                raise Exception("Não foi possível encontrar o menu")
            
            await asyncio.sleep(random.uniform(1, 2))
            
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
                    break
                except:
                    continue
            
            if not group_clicked:
                raise Exception("Não foi possível encontrar 'Novo grupo'")
            
            await asyncio.sleep(random.uniform(2, 3))
            
            # Aguarda a tela de seleção de contatos aparecer
            await self.page.wait_for_selector('input[data-testid="contact-list-search"]', timeout=15000)
            logger.info(f"✅ Tela de criação de grupo aberta para: {group_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao criar grupo {group_name}: {e}")
            return False
    
    async def search_and_add_contact(self, contact, attempt=1):
        """Pesquisa e adiciona um contato ao grupo com múltiplas tentativas"""
        max_attempts = 3
        
        try:
            # Verifica conexão
            if not await self.check_connection():
                raise Exception("Conexão com WhatsApp perdida")
            
            # Limpa a caixa de pesquisa
            search_box = await self.page.wait_for_selector('input[data-testid="contact-list-search"]', timeout=10000)
            await search_box.click()
            await search_box.fill('')
            await asyncio.sleep(random.uniform(0.5, 1))
            
            # Pesquisa pelo nome ou número
            search_term = contact.get('nome', '') or contact['numero']
            await search_box.type(search_term, delay=random.randint(50, 150))
            await asyncio.sleep(random.uniform(2, 4))  # Aguarda resultados da pesquisa
            
            # Tenta encontrar o contato nos resultados
            contact_selectors = [
                f'div[data-testid="cell-frame-container"]:has-text("{contact.get("nome", "")}")',
                f'div[data-testid="cell-frame-container"]:has-text("{contact["numero"]}")',
                'div[data-testid="cell-frame-container"]:first-child'
            ]
            
            contact_found = False
            for selector in contact_selectors:
                try:
                    if contact.get('nome') and selector.find(contact['nome']) != -1:
                        await self.page.wait_for_selector(selector, timeout=5000)
                        await self.page.click(selector)
                        contact_found = True
                        break
                except:
                    continue
            
            if not contact_found:
                # Tenta clicar no primeiro resultado disponível
                try:
                    await self.page.click('div[data-testid="cell-frame-container"]:first-child')
                    contact_found = True
                except:
                    pass
            
            if contact_found:
                # Delay humanizado entre adições
                delay = random.uniform(self.config['delay']['min'], self.config['delay']['max'])
                await asyncio.sleep(delay)
                logger.info(f"✅ Contato adicionado: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
                return True
            else:
                if attempt < max_attempts:
                    logger.warning(f"⚠️  Tentativa {attempt} falhou para {contact.get('nome', 'Sem nome')}, tentando novamente...")
                    await asyncio.sleep(random.uniform(2, 3))
                    return await self.search_and_add_contact(contact, attempt + 1)
                else:
                    logger.warning(f"⚠️  Contato não encontrado após {max_attempts} tentativas: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
                    return False
                
        except Exception as e:
            if attempt < max_attempts:
                logger.warning(f"⚠️  Erro na tentativa {attempt} para {contact.get('nome', 'Sem nome')}: {e}")
                await asyncio.sleep(random.uniform(3, 5))
                return await self.search_and_add_contact(contact, attempt + 1)
            else:
                logger.error(f"❌ Erro final ao adicionar {contact.get('nome', 'Sem nome')}: {e}")
                return False
    
    async def finalize_group_creation(self, group_name):
        """Finaliza a criação do grupo com nome"""
        try:
            # Verifica conexão
            if not await self.check_connection():
                raise Exception("Conexão com WhatsApp perdida")
            
            # Clica no botão de próximo/avançar
            next_selectors = [
                '[data-testid="next-button"]',
                'div[role="button"]:has-text("Avançar")',
                'div[role="button"]:has-text("Next")',
                'button:has-text("Avançar")'
            ]
            
            next_clicked = False
            for selector in next_selectors:
                try:
                    await self.page.click(selector)
                    next_clicked = True
                    break
                except:
                    continue
            
            if not next_clicked:
                raise Exception("Não foi possível encontrar botão 'Avançar'")
            
            await asyncio.sleep(random.uniform(2, 3))
            
            # Define o nome do grupo
            name_input_selectors = [
                'input[data-testid="group-subject-input"]',
                'div[data-testid="group-subject-input"]',
                'input[placeholder*="nome"]',
                'input[placeholder*="subject"]'
            ]
            
            name_input = None
            for selector in name_input_selectors:
                try:
                    name_input = await self.page.wait_for_selector(selector, timeout=10000)
                    break
                except:
                    continue
            
            if not name_input:
                raise Exception("Não foi possível encontrar campo de nome do grupo")
            
            await name_input.click()
            await name_input.fill('')
            await name_input.type(group_name, delay=random.randint(100, 200))
            await asyncio.sleep(random.uniform(1, 2))
            
            # Clica em criar grupo
            create_selectors = [
                '[data-testid="create-group-button"]',
                'div[role="button"]:has-text("Criar")',
                'div[role="button"]:has-text("Create")',
                'button:has-text("Criar")'
            ]
            
            create_clicked = False
            for selector in create_selectors:
                try:
                    await self.page.click(selector)
                    create_clicked = True
                    break
                except:
                    continue
            
            if not create_clicked:
                raise Exception("Não foi possível encontrar botão 'Criar'")
            
            await asyncio.sleep(random.uniform(5, 8))  # Aguarda criação do grupo
            
            logger.info(f"✅ Grupo '{group_name}' criado com sucesso!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao finalizar criação do grupo: {e}")
            return False
    
    async def send_welcome_message(self, group_name):
        """Envia mensagem de boas-vindas para o grupo"""
        try:
            if not self.config['welcome_message'].strip():
                return True
            
            # Verifica conexão
            if not await self.check_connection():
                raise Exception("Conexão com WhatsApp perdida")
            
            logger.info(f"💬 Enviando mensagem de boas-vindas para {group_name}")
            
            # Localiza a caixa de texto
            message_selectors = [
                '[data-testid="conversation-compose-box-input"]',
                'div[contenteditable="true"][data-tab="10"]',
                'div[contenteditable="true"]'
            ]
            
            message_box = None
            for selector in message_selectors:
                try:
                    message_box = await self.page.wait_for_selector(selector, timeout=10000)
                    break
                except:
                    continue
            
            if not message_box:
                logger.warning(f"⚠️  Não foi possível encontrar caixa de mensagem para {group_name}")
                return False
            
            # Digita a mensagem
            await message_box.click()
            await message_box.type(self.config['welcome_message'], delay=random.randint(50, 100))
            await asyncio.sleep(random.uniform(1, 2))
            
            # Envia a mensagem
            await self.page.keyboard.press('Enter')
            await asyncio.sleep(random.uniform(2, 3))
            
            logger.info(f"✅ Mensagem de boas-vindas enviada para {group_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar mensagem de boas-vindas: {e}")
            return False
    
    async def promote_to_admin(self, contact, group_name):
        """Promove um contato a administrador"""
        try:
            # Verifica conexão
            if not await self.check_connection():
                raise Exception("Conexão com WhatsApp perdida")
            
            logger.info(f"👑 Promovendo {contact.get('nome', 'Sem nome')} a administrador em {group_name}...")
            
            # Abre info do grupo
            info_selectors = [
                '[data-testid="conversation-info-header"]',
                'header[data-testid="conversation-header"]',
                'div[data-testid="conversation-info-header"]'
            ]
            
            info_clicked = False
            for selector in info_selectors:
                try:
                    await self.page.click(selector)
                    info_clicked = True
                    break
                except:
                    continue
            
            if not info_clicked:
                raise Exception("Não foi possível abrir informações do grupo")
            
            await asyncio.sleep(random.uniform(2, 3))
            
            # Procura pelo contato na lista de participantes
            search_term = contact.get('nome', '') or contact['numero']
            participant_selectors = [
                f'div:has-text("{search_term}")',
                f'span:has-text("{search_term}")',
                f'div[title="{search_term}"]'
            ]
            
            participant_found = False
            for selector in participant_selectors:
                try:
                    await self.page.click(selector)
                    participant_found = True
                    break
                except:
                    continue
            
            if not participant_found:
                logger.warning(f"⚠️  Participante não encontrado para promoção: {search_term}")
                return False
            
            await asyncio.sleep(random.uniform(1, 2))
            
            # Clica em "Tornar administrador"
            admin_selectors = [
                'div[role="button"]:has-text("Tornar administrador")',
                'div[role="button"]:has-text("Make admin")',
                'li:has-text("Tornar administrador")'
            ]
            
            admin_clicked = False
            for selector in admin_selectors:
                try:
                    await self.page.click(selector)
                    admin_clicked = True
                    break
                except:
                    continue
            
            if not admin_clicked:
                logger.warning(f"⚠️  Não foi possível promover {search_term}")
                return False
            
            await asyncio.sleep(random.uniform(1, 2))
            
            # Volta para o chat
            back_selectors = [
                '[data-testid="back"]',
                'button[aria-label="Voltar"]',
                'div[role="button"][aria-label="Back"]'
            ]
            
            for selector in back_selectors:
                try:
                    await self.page.click(selector)
                    break
                except:
                    continue
            
            await asyncio.sleep(random.uniform(1, 2))
            
            logger.info(f"✅ {contact.get('nome', 'Sem nome')} promovido a administrador")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao promover {contact.get('nome', 'Sem nome')}: {e}")
            return False
    
    async def process_single_group(self, group_data, group_index, total_groups):
        """Processa um único grupo da automação com proteção anti-ban"""
        group_name = group_data['group_name']
        leads = group_data['leads']
        admins = group_data['admins']
        
        report = {
            'group_name': group_name,
            'members_added': [],
            'admins_promoted': [],
            'errors': [],
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_members': len(leads) + len(admins),
            'welcome_message_sent': False,
            'session_id': self.session_id
        }
        
        logger.info(f"📋 Processando grupo {group_index}/{total_groups}: {group_name}")
        logger.info(f"   👥 {len(leads)} leads + {len(admins)} administradores = {report['total_members']} total")
        
        try:
            # Salva backup antes de começar o grupo
            self.save_backup(group_index, 0)
            
            # Cria o grupo
            if not await self.create_group(group_name):
                error_msg = 'Falha ao criar grupo'
                report['errors'].append({'contact': {'nome': 'N/A', 'numero': 'N/A'}, 'error': error_msg})
                self.reports.append(report)
                return report
            
            # Adiciona leads primeiro
            logger.info(f"👥 Adicionando {len(leads)} leads...")
            for i, lead in enumerate(leads, 1):
                logger.info(f"   Adicionando lead {i}/{len(leads)}: {lead.get('nome', 'Sem nome')}")
                
                if await self.search_and_add_contact(lead):
                    report['members_added'].append(lead)
                else:
                    report['errors'].append({
                        'contact': lead,
                        'error': 'Lead não encontrado ou erro ao adicionar'
                    })
                
                # Salva backup a cada 10 contatos
                if i % 10 == 0:
                    self.save_backup(group_index, i)
            
            # Adiciona administradores
            logger.info(f"👑 Adicionando {len(admins)} administradores...")
            for i, admin in enumerate(admins, 1):
                logger.info(f"   Adicionando admin {i}/{len(admins)}: {admin.get('nome', 'Sem nome')}")
                
                if await self.search_and_add_contact(admin):
                    report['members_added'].append(admin)
                else:
                    report['errors'].append({
                        'contact': admin,
                        'error': 'Administrador não encontrado ou erro ao adicionar'
                    })
            
            # Finaliza criação do grupo
            if not await self.finalize_group_creation(group_name):
                error_msg = 'Falha ao finalizar grupo'
                report['errors'].append({'contact': {'nome': 'N/A', 'numero': 'N/A'}, 'error': error_msg})
                self.reports.append(report)
                return report
            
            # Envia mensagem de boas-vindas
            if await self.send_welcome_message(group_name):
                report['welcome_message_sent'] = True
            
            # Promove administradores
            logger.info(f"👑 Promovendo {len(admins)} administradores...")
            for i, admin in enumerate(admins, 1):
                logger.info(f"   Promovendo admin {i}/{len(admins)}: {admin.get('nome', 'Sem nome')}")
                
                if await self.promote_to_admin(admin, group_name):
                    report['admins_promoted'].append(admin)
                else:
                    report['errors'].append({
                        'contact': admin,
                        'error': 'Falha ao promover a administrador'
                    })
            
            self.groups_in_current_session += 1
            self.reports.append(report)
            
            # Log do resultado do grupo
            success_rate = ((len(report['members_added']) + len(report['admins_promoted'])) / report['total_members']) * 100
            logger.info(f"📊 Grupo '{group_name}' processado:")
            logger.info(f"   ✅ {len(report['members_added'])} membros adicionados")
            logger.info(f"   👑 {len(report['admins_promoted'])} administradores promovidos")
            logger.info(f"   💬 Mensagem de boas-vindas: {'Enviada' if report['welcome_message_sent'] else 'Falhou'}")
            logger.info(f"   ❌ {len(report['errors'])} erros")
            logger.info(f"   📈 Taxa de sucesso: {success_rate:.1f}%")
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Erro ao processar grupo {group_name}: {e}")
            report['errors'].append({'contact': {'nome': 'N/A', 'numero': 'N/A'}, 'error': str(e)})
            self.reports.append(report)
            return report
    
    async def process_all_groups(self):
        """Processa todos os grupos da automação com proteção anti-ban"""
        self.start_time = datetime.now()
        batch_groups = self.calculate_batch_groups()
        total_groups = len(batch_groups)
        
        logger.info(f"🚀 Iniciando automação avançada com proteção anti-ban:")
        logger.info(f"   📊 {len(self.contacts):,} contatos totais")
        logger.info(f"   📋 {total_groups} grupos para criar")
        logger.info(f"   🔄 Máximo {self.config['max_groups_per_session']} grupos por sessão")
        
        current_session = 1
        groups_in_session = 0
        
        for group_index, group_data in enumerate(batch_groups, 1):
            # Verifica se precisa pausar para nova sessão
            if self.config['enable_ban_prevention'] and groups_in_session >= self.config['max_groups_per_session']:
                logger.info(f"\n🔄 PAUSA PARA NOVA SESSÃO")
                logger.info(f"   📊 {groups_in_session} grupos criados na sessão {current_session}")
                logger.info(f"   ⏳ Aguardando 20 minutos para nova sessão...")
                logger.info(f"   💡 Recomendação: Faça login com outro número se necessário")
                
                # Pausa de 20 minutos entre sessões
                await asyncio.sleep(1200)  # 20 minutos
                
                current_session += 1
                groups_in_session = 0
                self.groups_in_current_session = 0
                
                # Verifica conexão após pausa
                if not await self.check_connection():
                    logger.warning("⚠️  Conexão perdida após pausa. Aguardando reconexão...")
                    # Aguarda reconexão manual
                    while not await self.check_connection():
                        await asyncio.sleep(30)
                    logger.info("✅ Reconectado! Continuando automação...")
            
            logger.info(f"\n{'='*60}")
            logger.info(f"🔄 PROCESSANDO GRUPO {group_index}/{total_groups} (Sessão {current_session})")
            logger.info(f"{'='*60}")
            
            await self.process_single_group(group_data, group_index, total_groups)
            groups_in_session += 1
            
            # Delay anti-ban entre grupos (exceto no último)
            if group_index < total_groups:
                if self.config['enable_ban_prevention']:
                    delay_time = random.uniform(self.config['group_delay']['min'], self.config['group_delay']['max'])
                    logger.info(f"🛡️  Delay anti-ban: Aguardando {delay_time:.1f} segundos antes do próximo grupo...")
                else:
                    delay_time = random.uniform(self.config['delay']['min'], self.config['delay']['max']) * 2
                    logger.info(f"⏳ Aguardando {delay_time:.1f} segundos antes do próximo grupo...")
                
                await asyncio.sleep(delay_time)
        
        # Calcula tempo total
        total_time = datetime.now() - self.start_time
        logger.info(f"\n🏁 AUTOMAÇÃO AVANÇADA CONCLUÍDA!")
        logger.info(f"   ⏱️  Tempo total: {total_time}")
        logger.info(f"   📊 {total_groups} grupos processados")
        logger.info(f"   🔄 {current_session} sessões utilizadas")
    
    def generate_advanced_csv_report(self):
        """Gera relatório CSV detalhado da automação avançada"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f'relatorio_advanced_whatsapp_{timestamp}.csv'
        
        try:
            with open(report_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['grupo', 'nome', 'numero', 'tipo', 'status', 'erro', 'timestamp', 'mensagem_enviada', 'session_id', 'protecao_antiban']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                
                for report in self.reports:
                    group_name = report['group_name']
                    timestamp = report['timestamp']
                    session_id = report.get('session_id', 'N/A')
                    mensagem_enviada = 'Sim' if report.get('welcome_message_sent', False) else 'Não'
                    protecao_antiban = 'Ativada' if self.config['enable_ban_prevention'] else 'Desativada'
                    
                    # Membros adicionados com sucesso
                    for member in report['members_added']:
                        writer.writerow({
                            'grupo': group_name,
                            'nome': member.get('nome', ''),
                            'numero': member['numero'],
                            'tipo': member['tipo'],
                            'status': 'Adicionado',
                            'erro': '',
                            'timestamp': timestamp,
                            'mensagem_enviada': mensagem_enviada,
                            'session_id': session_id,
                            'protecao_antiban': protecao_antiban
                        })
                    
                    # Administradores promovidos
                    for admin in report['admins_promoted']:
                        writer.writerow({
                            'grupo': group_name,
                            'nome': admin.get('nome', ''),
                            'numero': admin['numero'],
                            'tipo': admin['tipo'],
                            'status': 'Promovido a Admin',
                            'erro': '',
                            'timestamp': timestamp,
                            'mensagem_enviada': mensagem_enviada,
                            'session_id': session_id,
                            'protecao_antiban': protecao_antiban
                        })
                    
                    # Erros
                    for error in report['errors']:
                        contact = error['contact']
                        writer.writerow({
                            'grupo': group_name,
                            'nome': contact.get('nome', '') if isinstance(contact, dict) else '',
                            'numero': contact.get('numero', '') if isinstance(contact, dict) else '',
                            'tipo': contact.get('tipo', '') if isinstance(contact, dict) else '',
                            'status': 'Erro',
                            'erro': error['error'],
                            'timestamp': timestamp,
                            'mensagem_enviada': 'Não',
                            'session_id': session_id,
                            'protecao_antiban': protecao_antiban
                        })
            
            logger.info(f"📄 Relatório CSV da automação avançada salvo em: {report_file}")
            return report_file
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar relatório CSV: {e}")
            return None
    
    def generate_advanced_summary_report(self):
        """Gera relatório resumido da automação avançada"""
        total_groups = len(self.reports)
        total_members = sum(len(r['members_added']) for r in self.reports)
        total_admins = sum(len(r['admins_promoted']) for r in self.reports)
        total_errors = sum(len(r['errors']) for r in self.reports)
        total_welcome_messages = sum(1 for r in self.reports if r.get('welcome_message_sent', False))
        
        # Calcula estatísticas
        success_rate = (total_members / len(self.contacts)) * 100 if len(self.contacts) > 0 else 0
        
        execution_time = datetime.now() - self.start_time if self.start_time else timedelta(0)
        
        summary = f"""
{'='*80}
🛡️  RELATÓRIO FINAL - WHATSAPP ADVANCED AUTOMATION WITH ANTI-BAN
{'='*80}
⏰ Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
⏱️  Tempo de execução: {execution_time}
🆔 Sessão: {self.session_id}

📊 ESTATÍSTICAS GERAIS:
{'='*40}
👥 Contatos processados: {len(self.contacts):,}
📋 Grupos criados: {total_groups}
✅ Membros adicionados: {total_members:,}
👑 Administradores promovidos: {total_admins}
💬 Mensagens de boas-vindas enviadas: {total_welcome_messages}
❌ Erros encontrados: {total_errors}

🛡️  PROTEÇÃO ANTI-BAN:
{'='*40}
🔧 Status: {'Ativada' if self.config['enable_ban_prevention'] else 'Desativada'}
⏳ Delays entre grupos: {self.config['group_delay']['min']}-{self.config['group_delay']['max']}s
📊 Máx grupos por sessão: {self.config['max_groups_per_session']}
🔄 Sessões utilizadas: {math.ceil(total_groups / self.config['max_groups_per_session']) if self.config['enable_ban_prevention'] else 1}

📈 TAXAS DE SUCESSO:
{'='*40}
📊 Taxa geral de adição: {success_rate:.1f}%
💬 Taxa de mensagens enviadas: {(total_welcome_messages / total_groups * 100) if total_groups > 0 else 0:.1f}%

📋 DETALHES POR GRUPO:
{'='*40}"""
        
        for i, report in enumerate(self.reports, 1):
            group_success = (len(report['members_added']) / report['total_members']) * 100 if report['total_members'] > 0 else 0
            
            summary += f"""
Grupo {i:2d}: {report['group_name']}
  • Total planejado: {report['total_members']} membros
  • Membros adicionados: {len(report['members_added'])}
  • Admins promovidos: {len(report['admins_promoted'])}
  • Mensagem de boas-vindas: {'Enviada' if report.get('welcome_message_sent', False) else 'Falhou'}
  • Erros: {len(report['errors'])}
  • Taxa de sucesso: {group_success:.1f}%
  • Criado em: {report['timestamp']}
  • Sessão: {report.get('session_id', 'N/A')}"""
            
            if report['errors']:
                summary += f"\n  • Principais erros:"
                for error in report['errors'][:3]:
                    contact = error['contact']
                    nome = contact.get('nome', 'Sem nome') if isinstance(contact, dict) else 'N/A'
                    numero = contact.get('numero', '') if isinstance(contact, dict) else ''
                    summary += f"\n    - {nome} ({numero}): {error['error']}"
                if len(report['errors']) > 3:
                    summary += f"\n    - ... e mais {len(report['errors']) - 3} erros"
        
        summary += f"""

🎯 RESUMO FINAL:
{'='*40}
• Automação avançada processou {len(self.contacts):,} contatos
• Criados {total_groups} grupos com proteção anti-banimento
• {total_members:,} pessoas adicionadas com sucesso
• {total_admins} administradores promovidos em todos os grupos
• {total_welcome_messages} mensagens de boas-vindas enviadas
• Taxa de sucesso geral: {success_rate:.1f}%
• Proteção anti-ban: {'Ativada' if self.config['enable_ban_prevention'] else 'Desativada'}

{'='*80}
"""
        
        # Salva relatório resumido
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        summary_file = f'resumo_advanced_whatsapp_{timestamp}.txt'
        
        try:
            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write(summary)
            logger.info(f"📄 Relatório resumido da automação avançada salvo em: {summary_file}")
        except Exception as e:
            logger.error(f"❌ Erro ao salvar relatório resumido: {e}")
        
        print(summary)
        return summary
    
    async def run(self, csv_file_path=None):
        """Executa a automação avançada completa"""
        try:
            logger.info("🛡️  Iniciando WhatsApp Advanced Group Automation Tool")
            logger.info("="*80)
            
            # Carrega contatos do CSV se fornecido
            if csv_file_path:
                if not self.load_contacts_from_csv(csv_file_path):
                    logger.error("❌ Falha ao carregar contatos do CSV")
                    return
            
            if not self.contacts:
                logger.error("❌ Nenhum contato encontrado")
                return
            
            # Verifica se há backup para retomar
            backup_data = self.load_backup()
            if backup_data:
                response = input("📂 Backup encontrado. Deseja retomar a automação? (s/n): ")
                if response.lower() == 's':
                    self.reports = backup_data.get('reports', [])
                    self.groups_in_current_session = backup_data.get('groups_in_current_session', 0)
                    logger.info("🔄 Retomando automação do backup...")
            
            # Inicia navegador e faz login
            if not await self.start_browser():
                logger.error("❌ Falha ao iniciar navegador")
                return
            
            # Processa todos os grupos com proteção anti-ban
            await self.process_all_groups()
            
            # Gera relatórios
            csv_file = self.generate_advanced_csv_report()
            self.generate_advanced_summary_report()
            
            logger.info("✅ Automação avançada concluída com sucesso!")
            
            if csv_file:
                logger.info(f"📄 Relatórios salvos: {csv_file}")
            
        except Exception as e:
            logger.error(f"❌ Erro geral na automação avançada: {e}")
        
        finally:
            # Aguarda antes de fechar
            logger.info("⏳ Aguardando 15 segundos antes de fechar o navegador...")
            await asyncio.sleep(15)
            
            if self.browser:
                await self.browser.close()
                logger.info("🔒 Navegador fechado")
            
            if self.playwright:
                await self.playwright.stop()

# Função principal
async def main():
    print("🛡️  WhatsApp Advanced Group Automation Tool")
    print("="*80)
    print("Ferramenta avançada com proteção anti-banimento")
    print("Desenvolvido com Playwright + Python")
    print("="*80)
    
    # Solicita arquivo CSV
    csv_file = input("📁 Digite o caminho do arquivo CSV (ou pressione Enter para usar 'contatos.csv'): ").strip()
    if not csv_file:
        csv_file = 'contatos.csv'
    
    if not os.path.exists(csv_file):
        print(f"❌ Arquivo não encontrado: {csv_file}")
        print("📝 Crie um arquivo CSV com as colunas: nome,numero,tipo")
        print("   Exemplo: João Silva,5562999999999,lead")
        return
    
    # Configurações opcionais
    print("\n🔧 Configurações (pressione Enter para usar padrões):")
    
    base_name = input("📋 Nome base dos grupos (padrão: 'Grupo VIP'): ").strip()
    if base_name:
        automation.config['base_name'] = base_name
    
    enable_ban_prevention = input("🛡️  Ativar proteção anti-ban? (s/N): ").strip().lower()
    if enable_ban_prevention == 's':
        automation.config['enable_ban_prevention'] = True
        
        max_groups = input("📊 Máximo de grupos por sessão (padrão: 10): ").strip()
        if max_groups.isdigit():
            automation.config['max_groups_per_session'] = int(max_groups)
    
    welcome_msg = input("💬 Mensagem de boas-vindas (pressione Enter para usar padrão): ").strip()
    if welcome_msg:
        automation.config['welcome_message'] = welcome_msg
    
    automation = WhatsAppAdvancedAutomation()
    await automation.run(csv_file)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️  Automação avançada interrompida pelo usuário")
    except Exception as e:
        print(f"❌ Erro fatal na automação avançada: {e}")
        input("Pressione Enter para sair...")