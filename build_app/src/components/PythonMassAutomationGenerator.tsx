import React, { useState } from 'react';
import { Code, Download, Copy, Check, Terminal, Zap } from 'lucide-react';
import { Contact, GroupConfig, MassAutomationStats } from '../types';

interface PythonMassAutomationGeneratorProps {
  contacts: Contact[];
  config: GroupConfig;
  stats: MassAutomationStats;
}

export const PythonMassAutomationGenerator: React.FC<PythonMassAutomationGeneratorProps> = ({
  contacts,
  config,
  stats,
}) => {
  const [copied, setCopied] = useState(false);

  const generatePythonCode = () => {
    const contactsJson = JSON.stringify(contacts, null, 2);
    
    return `#!/usr/bin/env python3
"""
WhatsApp Mass Group Automation Tool
Ferramenta de automação em massa para criação de múltiplos grupos no WhatsApp Web
Desenvolvido com Playwright + Python para processar milhares de contatos

Capacidades:
- Processamento de milhares de contatos
- Criação automática de múltiplos grupos (até 999 membros cada)
- Distribuição inteligente de leads e administradores
- Relatórios detalhados em CSV e TXT
- Tratamento robusto de erros

Requisitos:
- Python 3.8+
- pip install playwright pandas asyncio
- playwright install chromium

Uso:
1. Execute: python whatsapp_mass_automation.py
2. Escaneie o QR Code quando solicitado
3. Aguarde o processamento automático de todos os grupos
"""

import asyncio
import json
import time
import csv
import math
from datetime import datetime, timedelta
from pathlib import Path
from playwright.async_api import async_playwright
import logging

# Configuração de logging avançada
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('whatsapp_mass_automation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WhatsAppMassAutomation:
    def __init__(self):
        self.page = None
        self.browser = None
        self.playwright = None
        self.reports = []
        self.start_time = None
        
        # Configurações geradas automaticamente
        self.config = {
            'base_name': '${config.baseName}',
            'max_members': 999,  # Limite máximo para automação em massa
            'delay': ${config.delay},
            'create_multiple': True  # Sempre habilitado para automação em massa
        }
        
        # Contatos carregados da interface (${contacts.length.toLocaleString()} contatos)
        self.contacts = ${contactsJson}
        
        # Estatísticas da automação
        self.stats = {
            'total_contacts': ${stats.totalContacts},
            'total_leads': ${stats.totalLeads},
            'total_admins': ${stats.totalAdmins},
            'estimated_groups': ${stats.estimatedGroups}
        }
        
        logger.info(f"🚀 Automação em massa inicializada:")
        logger.info(f"   📊 {self.stats['total_contacts']:,} contatos totais")
        logger.info(f"   👥 {self.stats['total_leads']:,} leads")
        logger.info(f"   👑 {self.stats['total_admins']} administradores")
        logger.info(f"   📋 {self.stats['estimated_groups']} grupos estimados")
    
    def calculate_batch_groups(self):
        """Calcula e organiza os grupos em lotes para processamento em massa"""
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
                'total_members': len(group_leads) + len(group_admins)
            })
        
        logger.info(f"📋 Grupos organizados em lotes:")
        for i, group in enumerate(batch_groups, 1):
            logger.info(f"   Grupo {i}: {group['group_name']} - {len(group['leads'])} leads + {len(group['admins'])} admins = {group['total_members']} total")
        
        return batch_groups
    
    async def start_browser(self):
        """Inicia o navegador e abre o WhatsApp Web"""
        try:
            logger.info("🌐 Iniciando navegador para automação em massa...")
            
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=False,  # Modo visível para escaneamento do QR Code
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
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            
            self.page = await context.new_page()
            await self.page.goto('https://web.whatsapp.com', wait_until='networkidle')
            
            logger.info("📱 Aguardando login no WhatsApp Web...")
            logger.info("   🔍 Escaneie o QR Code com seu celular")
            
            # Aguarda até que a página principal carregue (indicando login bem-sucedido)
            try:
                await self.page.wait_for_selector('[data-testid="chat-list"]', timeout=180000)  # 3 minutos
                logger.info("✅ Login realizado com sucesso!")
            except:
                await self.page.wait_for_selector('div[data-testid="chat-list"]', timeout=120000)
                logger.info("✅ Login realizado com sucesso!")
            
            await asyncio.sleep(5)  # Aguarda carregamento completo
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao iniciar navegador: {e}")
            return False
    
    async def create_group(self, group_name):
        """Cria um novo grupo no WhatsApp"""
        try:
            logger.info(f"👥 Criando grupo: {group_name}")
            
            # Clica no menu de opções (três pontos)
            menu_selectors = [
                '[data-testid="menu"]',
                'div[title="Menu"]',
                'span[data-testid="menu"]',
                'div[aria-label="Menu"]',
                'div[role="button"][title="Menu"]'
            ]
            
            menu_clicked = False
            for selector in menu_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=5000)
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
                'div:has-text("New group")',
                '[data-testid="new-group"]',
                'div[aria-label="Novo grupo"]'
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
            # Limpa a caixa de pesquisa
            search_box = await self.page.wait_for_selector('input[data-testid="contact-list-search"]', timeout=10000)
            await search_box.click()
            await search_box.fill('')
            await asyncio.sleep(1)
            
            # Pesquisa pelo nome ou número
            search_term = contact.get('nome', '') or contact['numero']
            await search_box.type(search_term, delay=100)
            await asyncio.sleep(3)  # Aguarda resultados da pesquisa
            
            # Tenta encontrar o contato nos resultados
            contact_selectors = [
                f'div[data-testid="cell-frame-container"]:has-text("{contact.get("nome", "")}")',
                f'div[data-testid="cell-frame-container"]:has-text("{contact["numero"]}")',
                f'span:has-text("{contact.get("nome", "")}")',
                f'span:has-text("{contact["numero"]}")',
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
                await asyncio.sleep(self.config['delay'])
                logger.info(f"✅ Contato adicionado: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
                return True
            else:
                if attempt < max_attempts:
                    logger.warning(f"⚠️  Tentativa {attempt} falhou para {contact.get('nome', 'Sem nome')}, tentando novamente...")
                    await asyncio.sleep(2)
                    return await self.search_and_add_contact(contact, attempt + 1)
                else:
                    logger.warning(f"⚠️  Contato não encontrado após {max_attempts} tentativas: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
                    return False
                
        except Exception as e:
            if attempt < max_attempts:
                logger.warning(f"⚠️  Erro na tentativa {attempt} para {contact.get('nome', 'Sem nome')}: {e}")
                await asyncio.sleep(3)
                return await self.search_and_add_contact(contact, attempt + 1)
            else:
                logger.error(f"❌ Erro final ao adicionar {contact.get('nome', 'Sem nome')}: {e}")
                return False
    
    async def finalize_group_creation(self, group_name):
        """Finaliza a criação do grupo com nome"""
        try:
            # Clica no botão de próximo/avançar
            next_selectors = [
                '[data-testid="next-button"]',
                'div[role="button"]:has-text("Avançar")',
                'div[role="button"]:has-text("Next")',
                'button:has-text("Avançar")',
                'div[aria-label="Avançar"]'
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
            await name_input.type(group_name, delay=100)
            await asyncio.sleep(2)
            
            # Clica em criar grupo
            create_selectors = [
                '[data-testid="create-group-button"]',
                'div[role="button"]:has-text("Criar")',
                'div[role="button"]:has-text("Create")',
                'button:has-text("Criar")',
                'div[aria-label="Criar grupo"]'
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
            
            await asyncio.sleep(8)  # Aguarda criação do grupo
            
            logger.info(f"✅ Grupo '{group_name}' criado com sucesso!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao finalizar criação do grupo: {e}")
            return False
    
    async def promote_to_admin(self, contact, group_name):
        """Promove um contato a administrador"""
        try:
            logger.info(f"👑 Promovendo {contact.get('nome', 'Sem nome')} a administrador em {group_name}...")
            
            # Abre info do grupo
            info_selectors = [
                '[data-testid="conversation-info-header"]',
                'header[data-testid="conversation-header"]',
                'div[data-testid="conversation-info-header"]',
                'div[data-testid="chat-header"]'
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
            
            await asyncio.sleep(2)
            
            # Clica em "Tornar administrador"
            admin_selectors = [
                'div[role="button"]:has-text("Tornar administrador")',
                'div[role="button"]:has-text("Make admin")',
                'li:has-text("Tornar administrador")',
                'div[aria-label="Tornar administrador"]'
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
                'button[aria-label="Voltar"]',
                'div[role="button"][aria-label="Back"]'
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
        """Processa um único grupo da automação em massa"""
        group_name = group_data['group_name']
        leads = group_data['leads']
        admins = group_data['admins']
        
        report = {
            'group_name': group_name,
            'members_added': [],
            'admins_promoted': [],
            'errors': [],
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'total_members': len(leads) + len(admins)
        }
        
        logger.info(f"📋 Processando grupo {group_index}/{total_groups}: {group_name}")
        logger.info(f"   👥 {len(leads)} leads + {len(admins)} administradores = {report['total_members']} total")
        
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
        
        self.reports.append(report)
        
        # Log do resultado do grupo
        success_rate = ((len(report['members_added']) + len(report['admins_promoted'])) / report['total_members']) * 100
        logger.info(f"📊 Grupo '{group_name}' processado:")
        logger.info(f"   ✅ {len(report['members_added'])} membros adicionados")
        logger.info(f"   👑 {len(report['admins_promoted'])} administradores promovidos")
        logger.info(f"   ❌ {len(report['errors'])} erros")
        logger.info(f"   📈 Taxa de sucesso: {success_rate:.1f}%")
        
        return report
    
    async def process_all_groups(self):
        """Processa todos os grupos da automação em massa"""
        self.start_time = datetime.now()
        batch_groups = self.calculate_batch_groups()
        total_groups = len(batch_groups)
        
        logger.info(f"🚀 Iniciando automação em massa:")
        logger.info(f"   📊 {self.stats['total_contacts']:,} contatos totais")
        logger.info(f"   📋 {total_groups} grupos para criar")
        logger.info(f"   ⏱️  Tempo estimado: {self.estimate_total_time()} minutos")
        
        for group_index, group_data in enumerate(batch_groups, 1):
            logger.info(f"\\n{'='*60}")
            logger.info(f"🔄 PROCESSANDO GRUPO {group_index}/{total_groups}")
            logger.info(f"{'='*60}")
            
            await self.process_single_group(group_data, group_index, total_groups)
            
            # Delay entre grupos (exceto no último)
            if group_index < total_groups:
                delay_time = self.config['delay'] * 2  # Delay maior entre grupos
                logger.info(f"⏳ Aguardando {delay_time} segundos antes do próximo grupo...")
                await asyncio.sleep(delay_time)
        
        # Calcula tempo total
        total_time = datetime.now() - self.start_time
        logger.info(f"\\n🏁 AUTOMAÇÃO EM MASSA CONCLUÍDA!")
        logger.info(f"   ⏱️  Tempo total: {total_time}")
        logger.info(f"   📊 {total_groups} grupos processados")
    
    def estimate_total_time(self):
        """Estima o tempo total da automação"""
        # Estimativa baseada em: contatos * delay + overhead por grupo
        total_contacts = self.stats['total_contacts']
        total_groups = self.stats['estimated_groups']
        
        contact_time = total_contacts * self.config['delay']  # Tempo para adicionar contatos
        group_overhead = total_groups * 30  # 30 segundos de overhead por grupo
        
        total_seconds = contact_time + group_overhead
        return math.ceil(total_seconds / 60)  # Retorna em minutos
    
    def generate_mass_csv_report(self):
        """Gera relatório CSV detalhado da automação em massa"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f'relatorio_mass_whatsapp_{timestamp}.csv'
        
        try:
            with open(report_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['grupo', 'nome', 'numero', 'tipo', 'status', 'erro', 'timestamp']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                
                for report in self.reports:
                    group_name = report['group_name']
                    timestamp = report['timestamp']
                    
                    # Membros adicionados com sucesso
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
            
            logger.info(f"📄 Relatório CSV da automação em massa salvo em: {report_file}")
            return report_file
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar relatório CSV: {e}")
            return None
    
    def generate_mass_summary_report(self):
        """Gera relatório resumido da automação em massa"""
        total_groups = len(self.reports)
        total_members = sum(len(r['members_added']) for r in self.reports)
        total_admins = sum(len(r['admins_promoted']) for r in self.reports)
        total_errors = sum(len(r['errors']) for r in self.reports)
        
        # Calcula estatísticas
        success_rate = (total_members / self.stats['total_contacts']) * 100 if self.stats['total_contacts'] > 0 else 0
        admin_success_rate = (total_admins / (self.stats['total_admins'] * total_groups)) * 100 if self.stats['total_admins'] > 0 else 0
        
        execution_time = datetime.now() - self.start_time if self.start_time else timedelta(0)
        
        summary = f"""
{'='*80}
🚀 RELATÓRIO FINAL - WHATSAPP MASS GROUP AUTOMATION
{'='*80}
⏰ Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
⏱️  Tempo de execução: {execution_time}

📊 ESTATÍSTICAS GERAIS:
{'='*40}
👥 Contatos processados: {self.stats['total_contacts']:,}
📋 Grupos criados: {total_groups}
✅ Membros adicionados: {total_members:,}
👑 Administradores promovidos: {total_admins}
❌ Erros encontrados: {total_errors}

📈 TAXAS DE SUCESSO:
{'='*40}
📊 Taxa geral de adição: {success_rate:.1f}%
👑 Taxa de promoção de admins: {admin_success_rate:.1f}%

📋 DETALHES POR GRUPO:
{'='*40}"""
        
        for i, report in enumerate(self.reports, 1):
            group_success = (len(report['members_added']) / report['total_members']) * 100 if report['total_members'] > 0 else 0
            
            summary += f"""
Grupo {i:2d}: {report['group_name']}
  • Total planejado: {report['total_members']} membros
  • Membros adicionados: {len(report['members_added'])}
  • Admins promovidos: {len(report['admins_promoted'])}
  • Erros: {len(report['errors'])}
  • Taxa de sucesso: {group_success:.1f}%
  • Criado em: {report['timestamp']}"""
            
            if report['errors']:
                summary += f"\\n  • Principais erros:"
                for error in report['errors'][:3]:
                    contact = error['contact']
                    nome = contact.get('nome', 'Sem nome') if isinstance(contact, dict) else 'N/A'
                    numero = contact.get('numero', '') if isinstance(contact, dict) else ''
                    summary += f"\\n    - {nome} ({numero}): {error['error']}"
                if len(report['errors']) > 3:
                    summary += f"\\n    - ... e mais {len(report['errors']) - 3} erros"
        
        summary += f"""

🎯 RESUMO FINAL:
{'='*40}
• Automação em massa processou {self.stats['total_contacts']:,} contatos
• Criados {total_groups} grupos com até 999 membros cada
• {total_members:,} pessoas adicionadas com sucesso
• {total_admins} administradores promovidos em todos os grupos
• Taxa de sucesso geral: {success_rate:.1f}%

{'='*80}
"""
        
        # Salva relatório resumido
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        summary_file = f'resumo_mass_whatsapp_{timestamp}.txt'
        
        try:
            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write(summary)
            logger.info(f"📄 Relatório resumido da automação em massa salvo em: {summary_file}")
        except Exception as e:
            logger.error(f"❌ Erro ao salvar relatório resumido: {e}")
        
        print(summary)
        return summary
    
    async def run(self):
        """Executa a automação em massa completa"""
        try:
            logger.info("🤖 Iniciando WhatsApp Mass Group Automation Tool")
            logger.info("="*80)
            logger.info(f"🎯 Objetivo: Processar {self.stats['total_contacts']:,} contatos em {self.stats['estimated_groups']} grupos")
            
            if not self.contacts:
                logger.error("❌ Nenhum contato encontrado")
                return
            
            # Inicia navegador e faz login
            if not await self.start_browser():
                logger.error("❌ Falha ao iniciar navegador")
                return
            
            # Processa todos os grupos em massa
            await self.process_all_groups()
            
            # Gera relatórios
            csv_file = self.generate_mass_csv_report()
            self.generate_mass_summary_report()
            
            logger.info("✅ Automação em massa concluída com sucesso!")
            
            if csv_file:
                logger.info(f"📄 Relatórios salvos: {csv_file}")
            
        except Exception as e:
            logger.error(f"❌ Erro geral na automação em massa: {e}")
        
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
    print("🚀 WhatsApp Mass Group Automation Tool")
    print("="*80)
    print("Ferramenta de automação em massa gerada automaticamente")
    print(f"📊 Configurada para processar ${stats.totalContacts.toLocaleString()} contatos")
    print(f"📋 Criará ${stats.estimatedGroups} grupos com até 999 membros cada")
    print(f"⏱️  Tempo estimado: ${stats.estimatedTime}")
    print("="*80)
    
    automation = WhatsAppMassAutomation()
    await automation.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\n⏹️  Automação em massa interrompida pelo usuário")
    except Exception as e:
        print(f"❌ Erro fatal na automação em massa: {e}")
        input("Pressione Enter para sair...")
`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatePythonCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const downloadScript = () => {
    const code = generatePythonCode();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatsapp_mass_automation.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (contacts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Zap className="h-5 w-5 text-purple-600" />
          </div>
          <span>Código Python - Automação em Massa</span>
        </h2>
        
        <div className="flex space-x-3">
          <button
            onClick={copyToClipboard}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
          
          <button
            onClick={downloadScript}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 text-sm transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto border">
        <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap leading-relaxed">
          {generatePythonCode()}
        </pre>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center space-x-2 mb-3">
            <Terminal className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Instalação para Automação em Massa</h3>
          </div>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Instale o Python 3.8+ no seu sistema</li>
            <li>Abra o terminal/prompt de comando</li>
            <li>Execute: <code className="bg-blue-100 px-2 py-1 rounded text-xs">pip install playwright pandas asyncio</code></li>
            <li>Execute: <code className="bg-blue-100 px-2 py-1 rounded text-xs">playwright install chromium</code></li>
            <li>Baixe o script Python gerado</li>
            <li>Execute: <code className="bg-blue-100 px-2 py-1 rounded text-xs">python whatsapp_mass_automation.py</code></li>
          </ol>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-purple-900">Recursos da Automação em Massa</h3>
          </div>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• <strong>Processamento em larga escala:</strong> Milhares de contatos</li>
            <li>• <strong>Grupos automáticos:</strong> Até 999 membros por grupo</li>
            <li>• <strong>Distribuição inteligente:</strong> Leads + admins globais</li>
            <li>• <strong>Numeração sequencial:</strong> Grupo VIP 1, 2, 3...</li>
            <li>• <strong>Relatórios detalhados:</strong> CSV + TXT com estatísticas</li>
            <li>• <strong>Tratamento de erros:</strong> Múltiplas tentativas</li>
            <li>• <strong>Logs em tempo real:</strong> Acompanhamento completo</li>
            <li>• <strong>Estimativa de tempo:</strong> Previsão de conclusão</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <div className="flex items-center space-x-2 mb-3">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-green-900">Configuração Atual da Automação</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
            <div className="font-bold text-lg text-green-900">{stats.totalContacts.toLocaleString()}</div>
            <div className="text-green-700">Total de Contatos</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
            <div className="font-bold text-lg text-green-900">{stats.estimatedGroups}</div>
            <div className="text-green-700">Grupos a Criar</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
            <div className="font-bold text-lg text-green-900">{stats.totalAdmins}</div>
            <div className="text-green-700">Admins Globais</div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-200 text-center">
            <div className="font-bold text-lg text-green-900">{stats.estimatedTime}</div>
            <div className="text-green-700">Tempo Estimado</div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">⚠️ Importante - Automação em Massa:</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• <strong>Grande escala:</strong> Esta automação processará {stats.totalContacts.toLocaleString()} contatos</li>
              <li>• <strong>Tempo de execução:</strong> Pode levar várias horas para completar</li>
              <li>• <strong>Conexão estável:</strong> Mantenha internet estável durante todo o processo</li>
              <li>• <strong>Monitoramento:</strong> Acompanhe os logs para detectar problemas</li>
              <li>• <strong>Teste recomendado:</strong> Teste com uma amostra menor primeiro</li>
              <li>• <strong>Backup:</strong> Mantenha backup dos contatos antes de executar</li>
              <li>• <strong>Horário adequado:</strong> Execute em horários de menor uso</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};