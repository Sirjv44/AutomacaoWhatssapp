#!/usr/bin/env python3
"""
WhatsApp Contact Extractor Tool
Ferramenta para extrair contatos de todos os grupos do WhatsApp Web

Requisitos:
- Python 3.8+
- pip install playwright pandas asyncio
- playwright install chromium

Uso:
1. Execute: python whatsapp_contact_extractor.py
2. Escaneie o QR Code quando solicitado
3. Aguarde a extração automática de todos os grupos
"""

import asyncio
import json
import csv
import re
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright
import logging

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('whatsapp_contact_extraction.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WhatsAppContactExtractor:
    def __init__(self):
        self.page = None
        self.browser = None
        self.playwright = None
        self.extracted_contacts = []
        
        # Configurações da extração
        self.config = {
            'group_name_filter': '',
            'include_admins': True,
            'remove_duplicates': True,
            'delay_min': 2,
            'delay_max': 4
        }
        
        logger.info(f"Configuração da extração: {self.config}")
    
    async def start_browser(self):
        """Inicia o navegador e abre o WhatsApp Web"""
        try:
            logger.info("🌐 Iniciando navegador para extração de contatos...")
            
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
                await self.page.wait_for_selector('[data-testid="chat-list"]', timeout=180000)
                logger.info("✅ Login realizado com sucesso!")
            except:
                await self.page.wait_for_selector('div[data-testid="chat-list"]', timeout=120000)
                logger.info("✅ Login realizado com sucesso!")
            
            await asyncio.sleep(5)
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar navegador: {e}")
            return False
    
    async def get_all_groups(self):
        """Lista todos os grupos disponíveis"""
        try:
            logger.info("📋 Listando todos os grupos...")
            
            # Localiza a lista de chats
            chat_list_selectors = [
                '[data-testid="chat-list"]',
                'div[data-testid="chat-list"]',
                '#pane-side'
            ]
            
            chat_list = None
            for selector in chat_list_selectors:
                try:
                    chat_list = await self.page.wait_for_selector(selector, timeout=10000)
                    break
                except:
                    continue
            
            if not chat_list:
                raise Exception("Não foi possível encontrar a lista de chats")
            
            # Busca por elementos de grupo
            group_selectors = [
                '[data-testid="cell-frame-container"]',
                'div[data-testid="cell-frame-container"]',
                '.zoWT4'  # Seletor alternativo
            ]
            
            groups = []
            for selector in group_selectors:
                try:
                    group_elements = await self.page.query_selector_all(selector)
                    if group_elements:
                        for element in group_elements:
                            try:
                                # Verifica se é um grupo (não conversa individual)
                                group_indicator = await element.query_selector('[data-testid="group-icon"], .group-icon, [title*="grupo"], [title*="group"]')
                                if group_indicator:
                                    # Extrai nome do grupo
                                    name_element = await element.query_selector('[data-testid="conversation-title"], .ggj6brxn, ._21S-L')
                                    if name_element:
                                        group_name = await name_element.inner_text()
                                        if group_name and group_name.strip():
                                            # Aplica filtro se configurado
                                            if not self.config['group_name_filter'] or self.config['group_name_filter'].lower() in group_name.lower():
                                                groups.append({
                                                    'name': group_name.strip(),
                                                    'element': element
                                                })
                            except Exception as e:
                                logger.debug(f"Erro ao processar elemento de grupo: {e}")
                                continue
                    break
                except:
                    continue
            
            logger.info(f"📊 {len(groups)} grupos encontrados")
            if self.config['group_name_filter']:
                logger.info(f"🔍 Filtro aplicado: '{self.config['group_name_filter']}'")
            
            return groups
            
        except Exception as e:
            logger.error(f"❌ Erro ao listar grupos: {e}")
            return []
    
    async def extract_contacts_from_group(self, group):
        """Extrai contatos de um grupo específico"""
        try:
            group_name = group['name']
            logger.info(f"👥 Extraindo contatos do grupo: {group_name}")
            
            # Clica no grupo
            await group['element'].click()
            await asyncio.sleep(3)
            
            # Abre informações do grupo
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
                logger.warning(f"⚠️  Não foi possível abrir informações do grupo {group_name}")
                return []
            
            await asyncio.sleep(3)
            
            # Procura pela lista de participantes
            participants_selectors = [
                '[data-testid="group-participant-list"]',
                'div[data-testid="group-participant-list"]',
                '.group-participants'
            ]
            
            participants_list = None
            for selector in participants_selectors:
                try:
                    participants_list = await self.page.wait_for_selector(selector, timeout=10000)
                    break
                except:
                    continue
            
            if not participants_list:
                logger.warning(f"⚠️  Lista de participantes não encontrada para {group_name}")
                return []
            
            # Extrai informações dos participantes
            participant_elements = await self.page.query_selector_all('[data-testid="cell-frame-container"]')
            contacts = []
            
            for element in participant_elements:
                try:
                    # Extrai nome
                    name_element = await element.query_selector('[data-testid="conversation-title"], .ggj6brxn')
                    name = ''
                    if name_element:
                        name = await name_element.inner_text()
                    
                    # Extrai número (pode estar em diferentes lugares)
                    number_element = await element.query_selector('[data-testid="subtitle"], .zoWT4')
                    number = ''
                    if number_element:
                        subtitle = await number_element.inner_text()
                        # Extrai número usando regex
                        number_match = re.search(r'\+?[\d\s\-\(\)]{10,}', subtitle)
                        if number_match:
                            number = re.sub(r'[\s\-\(\)]', '', number_match.group())
                    
                    # Verifica se é administrador
                    is_admin = False
                    if self.config['include_admins']:
                        admin_element = await element.query_selector('[title*="admin"], [title*="Admin"], .admin-badge')
                        is_admin = admin_element is not None
                    
                    if number:  # Só adiciona se tiver número
                        # Garante formato com DDI
                        if not number.startswith('55') and len(number) >= 10:
                            number = f"55{number}"
                        
                        contact = {
                            'nome': name.strip() if name else '',
                            'numero': number,
                            'grupo': group_name,
                            'isAdmin': is_admin,
                            'extractedAt': datetime.now().isoformat()
                        }
                        contacts.append(contact)
                        
                except Exception as e:
                    logger.debug(f"Erro ao processar participante: {e}")
                    continue
            
            logger.info(f"✅ {len(contacts)} contatos extraídos de {group_name}")
            
            # Volta para a lista de chats
            back_selectors = [
                '[data-testid="back"]',
                'button[aria-label="Voltar"]',
                'div[role="button"][aria-label="Back"]'
            ]
            
            for selector in back_selectors:
                try:
                    await self.page.click(selector)
                    await asyncio.sleep(2)
                    await self.page.click(selector)  # Pode precisar clicar duas vezes
                    break
                except:
                    continue
            
            await asyncio.sleep(2)
            return contacts
            
        except Exception as e:
            logger.error(f"❌ Erro ao extrair contatos do grupo {group.get('name', 'Desconhecido')}: {e}")
            return []
    
    async def extract_all_contacts(self):
        """Extrai contatos de todos os grupos"""
        try:
            groups = await self.get_all_groups()
            if not groups:
                logger.error("❌ Nenhum grupo encontrado")
                return
            
            all_contacts = []
            
            for i, group in enumerate(groups, 1):
                logger.info(f"🔄 Processando grupo {i}/{len(groups)}: {group['name']}")
                
                contacts = await self.extract_contacts_from_group(group)
                all_contacts.extend(contacts)
                
                # Delay entre grupos
                if i < len(groups):
                    delay = self.config['delay_min'] + (self.config['delay_max'] - self.config['delay_min']) * 0.5
                    logger.info(f"⏳ Aguardando {delay}s antes do próximo grupo...")
                    await asyncio.sleep(delay)
            
            # Remove duplicatas se configurado
            if self.config['remove_duplicates']:
                logger.info("🔍 Removendo contatos duplicados...")
                unique_contacts = []
                seen_numbers = set()
                
                for contact in all_contacts:
                    if contact['numero'] not in seen_numbers:
                        unique_contacts.append(contact)
                        seen_numbers.add(contact['numero'])
                
                duplicates_removed = len(all_contacts) - len(unique_contacts)
                logger.info(f"📊 {duplicates_removed} duplicatas removidas")
                all_contacts = unique_contacts
            
            self.extracted_contacts = all_contacts
            logger.info(f"✅ Extração concluída: {len(all_contacts)} contatos únicos")
            
        except Exception as e:
            logger.error(f"❌ Erro na extração: {e}")
    
    def generate_csv_report(self):
        """Gera relatório CSV dos contatos extraídos"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f'contatos_extraidos_{timestamp}.csv'
        
        try:
            with open(report_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['nome', 'numero', 'grupo', 'is_admin', 'extracted_at']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                
                for contact in self.extracted_contacts:
                    writer.writerow({
                        'nome': contact.get('nome', ''),
                        'numero': contact['numero'],
                        'grupo': contact['grupo'],
                        'is_admin': 'Sim' if contact.get('isAdmin', False) else 'Não',
                        'extracted_at': contact['extractedAt']
                    })
            
            logger.info(f"📄 Relatório CSV salvo em: {report_file}")
            return report_file
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar relatório CSV: {e}")
            return None
    
    def generate_json_report(self):
        """Gera relatório JSON dos contatos extraídos"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f'contatos_extraidos_{timestamp}.json'
        
        try:
            with open(report_file, 'w', encoding='utf-8') as jsonfile:
                json.dump({
                    'extraction_info': {
                        'timestamp': datetime.now().isoformat(),
                        'total_contacts': len(self.extracted_contacts),
                        'config': self.config
                    },
                    'contacts': self.extracted_contacts
                }, jsonfile, ensure_ascii=False, indent=2)
            
            logger.info(f"📄 Relatório JSON salvo em: {report_file}")
            return report_file
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar relatório JSON: {e}")
            return None
    
    async def run(self):
        """Executa a extração completa"""
        try:
            logger.info("🔍 Iniciando WhatsApp Contact Extractor")
            logger.info("="*50)
            
            # Inicia navegador e faz login
            if not await self.start_browser():
                logger.error("❌ Falha ao iniciar navegador")
                return
            
            # Extrai contatos de todos os grupos
            await self.extract_all_contacts()
            
            # Gera relatórios
            csv_file = self.generate_csv_report()
            json_file = self.generate_json_report()
            
            logger.info("✅ Extração concluída com sucesso!")
            logger.info(f"📊 Total de contatos extraídos: {len(self.extracted_contacts)}")
            
            if csv_file:
                logger.info(f"📄 Relatório CSV: {csv_file}")
            if json_file:
                logger.info(f"📄 Relatório JSON: {json_file}")
            
        except Exception as e:
            logger.error(f"❌ Erro geral na extração: {e}")
        
        finally:
            logger.info("⏳ Aguardando 10 segundos antes de fechar o navegador...")
            await asyncio.sleep(10)
            
            if self.browser:
                await self.browser.close()
                logger.info("🔒 Navegador fechado")
            
            if self.playwright:
                await self.playwright.stop()

# Função principal
async def main():
    print("🔍 WhatsApp Contact Extractor Tool")
    print("="*50)
    print("Ferramenta para extrair contatos de grupos do WhatsApp")
    print("="*50)
    
    # Configurações opcionais
    print("\n🔧 Configurações (pressione Enter para usar padrões):")
    
    extractor = WhatsAppContactExtractor()
    
    group_filter = input("🔍 Filtrar grupos por nome (deixe vazio para todos): ").strip()
    if group_filter:
        extractor.config['group_name_filter'] = group_filter
    
    include_admins = input("👑 Identificar administradores? (S/n): ").strip().lower()
    if include_admins == 'n':
        extractor.config['include_admins'] = False
    
    remove_duplicates = input("🔄 Remover duplicatas? (S/n): ").strip().lower()
    if remove_duplicates == 'n':
        extractor.config['remove_duplicates'] = False
    
    await extractor.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️  Extração interrompida pelo usuário")
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        input("Pressione Enter para sair...")