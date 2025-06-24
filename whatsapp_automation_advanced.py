#!/usr/bin/env python3
"""
WhatsApp Advanced Group Automation Tool
Ferramenta avançada de automação para criação de grupos no WhatsApp Web
Gerado automaticamente pela interface web

Requisitos:
- Python 3.8+
- pip install playwright pandas asyncio
- playwright install chromium

Uso:
1. Execute: python whatsapp_automation_advanced.py
2. Escaneie o QR Code quando solicitado
3. Aguarde o processamento automático
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

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('whatsapp_automation.log'),
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
        
        # Configurações padrão (serão atualizadas pela interface)
        self.config = {
            'base_name': 'Grupo VIP',
            'max_members': 999,
            'delay': {'min': 2, 'max': 6},
            'group_delay': {'min': 30, 'max': 90},
            'create_multiple': True,
            'welcome_message': 'Bem-vindos ao nosso grupo! 🎉',
            'enable_ban_prevention': True,
            'max_groups_per_session': 10
        }
        
        # Contatos serão carregados
        self.contacts = []
        
        logger.info(f"🚀 Automação avançada inicializada - Sessão: {self.session_id}")
    
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
                        continue
                    
                    # Garante formato do número com DDI
                    numero = contact['numero'].replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
                    if not numero.startswith('55'):
                        numero = f"55{numero}"
                    contact['numero'] = numero
                    
                    contacts.append(contact)
            
            self.contacts = contacts
            logger.info(f"📁 {len(contacts)} contatos carregados do CSV")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao carregar CSV: {e}")
            return False
    
    async def start_browser(self):
        """Inicia o navegador e abre o WhatsApp Web"""
        try:
            logger.info("🌐 Iniciando navegador...")
            
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=False,
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security'
                ]
            )
            
            context = await self.browser.new_context(
                viewport={'width': 1366, 'height': 768},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            
            self.page = await context.new_page()
            await self.page.goto('https://web.whatsapp.com', wait_until='networkidle')
            
            logger.info("📱 Aguardando login no WhatsApp Web...")
            logger.info("   🔍 Escaneie o QR Code com seu celular")
            
            # Aguarda login
            try:
                await self.page.wait_for_selector('[data-testid="chat-list"]', timeout=300000)
                logger.info("✅ Login realizado com sucesso!")
            except:
                await self.page.wait_for_selector('div[data-testid="chat-list"]', timeout=180000)
                logger.info("✅ Login realizado com sucesso!")
            
            await asyncio.sleep(5)
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar navegador: {e}")
            return False
    
    async def create_group(self, group_name):
        """Cria um novo grupo no WhatsApp"""
        try:
            logger.info(f"👥 Criando grupo: {group_name}")
            
            # Clica no menu de opções
            menu_selectors = [
                '[data-testid="menu"]',
                'div[title="Menu"]',
                'span[data-testid="menu"]'
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
            
            await asyncio.sleep(2)
            
            # Clica em "Novo grupo"
            new_group_selectors = [
                'div[role="button"]:has-text("Novo grupo")',
                'li:has-text("Novo grupo")',
                'div:has-text("New group")'
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
            
            await asyncio.sleep(3)
            
            # Aguarda a tela de seleção de contatos
            await self.page.wait_for_selector('input[data-testid="contact-list-search"]', timeout=15000)
            logger.info(f"✅ Tela de criação de grupo aberta para: {group_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao criar grupo {group_name}: {e}")
            return False
    
    async def search_and_add_contact(self, contact):
        """Pesquisa e adiciona um contato ao grupo"""
        try:
            # Limpa a caixa de pesquisa
            search_box = await self.page.wait_for_selector('input[data-testid="contact-list-search"]', timeout=10000)
            await search_box.click()
            await search_box.fill('')
            await asyncio.sleep(1)
            
            # Pesquisa pelo nome ou número
            search_term = contact.get('nome', '') or contact['numero']
            await search_box.type(search_term, delay=100)
            await asyncio.sleep(3)
            
            # Tenta encontrar o contato
            contact_selectors = [
                f'div[data-testid="cell-frame-container"]:has-text("{contact.get("nome", "")}")',
                f'div[data-testid="cell-frame-container"]:has-text("{contact["numero"]}")',
                'div[data-testid="cell-frame-container"]:first-child'
            ]
            
            contact_found = False
            for selector in contact_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=5000)
                    await self.page.click(selector)
                    contact_found = True
                    break
                except:
                    continue
            
            if contact_found:
                delay = random.uniform(self.config['delay']['min'], self.config['delay']['max'])
                await asyncio.sleep(delay)
                logger.info(f"✅ Contato adicionado: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
                return True
            else:
                logger.warning(f"⚠️  Contato não encontrado: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao adicionar {contact.get('nome', 'Sem nome')}: {e}")
            return False
    
    async def finalize_group_creation(self, group_name):
        """Finaliza a criação do grupo"""
        try:
            # Clica no botão avançar
            next_selectors = [
                '[data-testid="next-button"]',
                'div[role="button"]:has-text("Avançar")',
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
            
            await asyncio.sleep(3)
            
            # Define o nome do grupo
            name_input_selectors = [
                'input[data-testid="group-subject-input"]',
                'div[data-testid="group-subject-input"]'
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
            await name_input.type(group_name, delay=100)
            await asyncio.sleep(2)
            
            # Clica em criar grupo
            create_selectors = [
                '[data-testid="create-group-button"]',
                'div[role="button"]:has-text("Criar")',
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
            
            await asyncio.sleep(8)
            
            logger.info(f"✅ Grupo '{group_name}' criado com sucesso!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao finalizar criação do grupo: {e}")
            return False
    
    async def send_welcome_message(self, group_name):
        """Envia mensagem de boas-vindas"""
        try:
            if not self.config['welcome_message'].strip():
                return True
            
            logger.info(f"💬 Enviando mensagem de boas-vindas para {group_name}")
            
            # Localiza a caixa de texto
            message_selectors = [
                '[data-testid="conversation-compose-box-input"]',
                'div[contenteditable="true"][data-tab="10"]'
            ]
            
            message_box = None
            for selector in message_selectors:
                try:
                    message_box = await self.page.wait_for_selector(selector, timeout=10000)
                    break
                except:
                    continue
            
            if not message_box:
                logger.warning(f"⚠️  Não foi possível encontrar caixa de mensagem")
                return False
            
            # Digita e envia a mensagem
            await message_box.click()
            await message_box.type(self.config['welcome_message'], delay=50)
            await asyncio.sleep(2)
            await self.page.keyboard.press('Enter')
            await asyncio.sleep(3)
            
            logger.info(f"✅ Mensagem de boas-vindas enviada para {group_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar mensagem: {e}")
            return False
    
    async def promote_to_admin(self, contact, group_name):
        """Promove um contato a administrador"""
        try:
            logger.info(f"👑 Promovendo {contact.get('nome', 'Sem nome')} a administrador...")
            
            # Abre info do grupo
            info_selectors = [
                '[data-testid="conversation-info-header"]',
                'header[data-testid="conversation-header"]'
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
            
            await asyncio.sleep(3)
            
            # Procura pelo contato
            search_term = contact.get('nome', '') or contact['numero']
            participant_selectors = [
                f'div:has-text("{search_term}")',
                f'span:has-text("{search_term}")'
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
                logger.warning(f"⚠️  Participante não encontrado: {search_term}")
                return False
            
            await asyncio.sleep(2)
            
            # Clica em "Tornar administrador"
            admin_selectors = [
                'div[role="button"]:has-text("Tornar administrador")',
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
            
            await asyncio.sleep(2)
            
            # Volta para o chat
            back_selectors = [
                '[data-testid="back"]',
                'button[aria-label="Voltar"]'
            ]
            
            for selector in back_selectors:
                try:
                    await self.page.click(selector)
                    break
                except:
                    continue
            
            await asyncio.sleep(2)
            
            logger.info(f"✅ {contact.get('nome', 'Sem nome')} promovido a administrador")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao promover {contact.get('nome', 'Sem nome')}: {e}")
            return False
    
    async def process_single_group(self, group_data, group_index, total_groups):
        """Processa um único grupo"""
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
        
        try:
            # Cria o grupo
            if not await self.create_group(group_name):
                report['errors'].append({'contact': {'nome': 'N/A', 'numero': 'N/A'}, 'error': 'Falha ao criar grupo'})
                self.reports.append(report)
                return report
            
            # Adiciona leads
            logger.info(f"👥 Adicionando {len(leads)} leads...")
            for lead in leads:
                if await self.search_and_add_contact(lead):
                    report['members_added'].append(lead)
                else:
                    report['errors'].append({
                        'contact': lead,
                        'error': 'Lead não encontrado'
                    })
            
            # Adiciona administradores
            logger.info(f"👑 Adicionando {len(admins)} administradores...")
            for admin in admins:
                if await self.search_and_add_contact(admin):
                    report['members_added'].append(admin)
                else:
                    report['errors'].append({
                        'contact': admin,
                        'error': 'Admin não encontrado'
                    })
            
            # Finaliza criação
            if not await self.finalize_group_creation(group_name):
                report['errors'].append({'contact': {'nome': 'N/A', 'numero': 'N/A'}, 'error': 'Falha ao finalizar grupo'})
                self.reports.append(report)
                return report
            
            # Envia mensagem de boas-vindas
            if await self.send_welcome_message(group_name):
                report['welcome_message_sent'] = True
            
            # Promove administradores
            logger.info(f"👑 Promovendo {len(admins)} administradores...")
            for admin in admins:
                if await self.promote_to_admin(admin, group_name):
                    report['admins_promoted'].append(admin)
                else:
                    report['errors'].append({
                        'contact': admin,
                        'error': 'Falha ao promover'
                    })
            
            self.reports.append(report)
            
            # Log do resultado
            logger.info(f"📊 Grupo '{group_name}' processado:")
            logger.info(f"   ✅ {len(report['members_added'])} membros adicionados")
            logger.info(f"   👑 {len(report['admins_promoted'])} administradores promovidos")
            logger.info(f"   💬 Mensagem: {'Enviada' if report['welcome_message_sent'] else 'Falhou'}")
            logger.info(f"   ❌ {len(report['errors'])} erros")
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Erro ao processar grupo {group_name}: {e}")
            report['errors'].append({'contact': {'nome': 'N/A', 'numero': 'N/A'}, 'error': str(e)})
            self.reports.append(report)
            return report
    
    def calculate_batch_groups(self):
        """Calcula grupos em lotes"""
        leads = [c for c in self.contacts if c['tipo'] == 'lead']
        admins = [c for c in self.contacts if c['tipo'] == 'administrador']
        
        groups_needed = math.ceil(len(leads) / self.config['max_members'])
        batch_groups = []
        
        for group_num in range(groups_needed):
            group_name = f"{self.config['base_name']} {group_num + 1}"
            
            start_idx = group_num * self.config['max_members']
            end_idx = min(start_idx + self.config['max_members'], len(leads))
            group_leads = leads[start_idx:end_idx]
            
            batch_groups.append({
                'group_name': group_name,
                'leads': group_leads,
                'admins': admins.copy(),
                'total_members': len(group_leads) + len(admins)
            })
        
        return batch_groups
    
    async def process_all_groups(self):
        """Processa todos os grupos"""
        self.start_time = datetime.now()
        batch_groups = self.calculate_batch_groups()
        total_groups = len(batch_groups)
        
        logger.info(f"🚀 Iniciando automação:")
        logger.info(f"   📊 {len(self.contacts):,} contatos totais")
        logger.info(f"   📋 {total_groups} grupos para criar")
        
        for group_index, group_data in enumerate(batch_groups, 1):
            logger.info(f"\n{'='*60}")
            logger.info(f"🔄 PROCESSANDO GRUPO {group_index}/{total_groups}")
            logger.info(f"{'='*60}")
            
            await self.process_single_group(group_data, group_index, total_groups)
            
            # Delay entre grupos
            if group_index < total_groups:
                if self.config['enable_ban_prevention']:
                    delay_time = random.uniform(self.config['group_delay']['min'], self.config['group_delay']['max'])
                    logger.info(f"🛡️  Delay anti-ban: {delay_time:.1f}s...")
                else:
                    delay_time = 5
                    logger.info(f"⏳ Aguardando {delay_time}s...")
                
                await asyncio.sleep(delay_time)
        
        total_time = datetime.now() - self.start_time
        logger.info(f"\n🏁 AUTOMAÇÃO CONCLUÍDA!")
        logger.info(f"   ⏱️  Tempo total: {total_time}")
        logger.info(f"   📊 {total_groups} grupos processados")
    
    def generate_csv_report(self):
        """Gera relatório CSV"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f'relatorio_whatsapp_{timestamp}.csv'
        
        try:
            with open(report_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['grupo', 'nome', 'numero', 'tipo', 'status', 'erro', 'timestamp']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                
                for report in self.reports:
                    group_name = report['group_name']
                    timestamp = report['timestamp']
                    
                    # Membros adicionados
                    for member in report['members_added']:
                        writer.writerow({
                            'grupo': group_name,
                            'nome': member.get('nome', ''),
                            'numero': member['numero'],
                            'tipo': member['tipo'],
                            'status': 'Adicionado',
                            'erro': '',
                            'timestamp': timestamp
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
                            'timestamp': timestamp
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
                            'timestamp': timestamp
                        })
            
            logger.info(f"📄 Relatório CSV salvo: {report_file}")
            return report_file
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar relatório: {e}")
            return None
    
    async def run(self, csv_file_path=None):
        """Executa a automação completa"""
        try:
            logger.info("🚀 Iniciando WhatsApp Advanced Automation")
            logger.info("="*60)
            
            # Carrega contatos
            if csv_file_path:
                if not self.load_contacts_from_csv(csv_file_path):
                    return
            
            if not self.contacts:
                logger.error("❌ Nenhum contato encontrado")
                return
            
            # Inicia navegador
            if not await self.start_browser():
                return
            
            # Processa grupos
            await self.process_all_groups()
            
            # Gera relatório
            self.generate_csv_report()
            
            logger.info("✅ Automação concluída!")
            
        except Exception as e:
            logger.error(f"❌ Erro geral: {e}")
        
        finally:
            logger.info("⏳ Aguardando 10 segundos...")
            await asyncio.sleep(10)
            
            if self.browser:
                await self.browser.close()
            
            if self.playwright:
                await self.playwright.stop()

# Função principal
async def main():
    print("🚀 WhatsApp Advanced Automation Tool")
    print("="*60)
    print("Ferramenta gerada automaticamente pela interface web")
    print("="*60)
    
    # Solicita arquivo CSV
    csv_file = input("📁 Digite o caminho do arquivo CSV: ").strip()
    if not csv_file:
        csv_file = 'contatos.csv'
    
    if not os.path.exists(csv_file):
        print(f"❌ Arquivo não encontrado: {csv_file}")
        return
    
    automation = WhatsAppAdvancedAutomation()
    await automation.run(csv_file)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️  Automação interrompida")
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        input("Pressione Enter para sair...")