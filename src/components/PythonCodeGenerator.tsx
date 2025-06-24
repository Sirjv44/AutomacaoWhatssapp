import React, { useState } from 'react';
import { Code, Download, Copy, Check, Terminal } from 'lucide-react';
import { Contact, GroupConfig } from '../types';

interface PythonCodeGeneratorProps {
  contacts: Contact[];
  config: GroupConfig;
}

export const PythonCodeGenerator: React.FC<PythonCodeGeneratorProps> = ({
  contacts,
  config,
}) => {
  const [copied, setCopied] = useState(false);

  const generatePythonCode = () => {
    const contactsJson = JSON.stringify(contacts, null, 2);
    
    return `#!/usr/bin/env python3
"""
WhatsApp Group Automation Tool
Ferramenta completa de automação para criação de grupos no WhatsApp Web
Desenvolvido com Playwright + Python

Requisitos:
- Python 3.8+
- pip install playwright pandas asyncio
- playwright install chromium

Uso:
1. Execute: python whatsapp_automation.py
2. Escaneie o QR Code quando solicitado
3. Aguarde o processamento automático
"""

import asyncio
import json
import time
import csv
from datetime import datetime
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

class WhatsAppAutomation:
    def __init__(self):
        self.page = None
        self.browser = None
        self.playwright = None
        self.reports = []
        
        # Configurações geradas automaticamente
        self.config = {
            'base_name': '${config.baseName}',
            'max_members': ${config.maxMembers},
            'delay': ${config.delay},
            'create_multiple': ${config.createMultiple ? 'True' : 'False'}
        }
        
        # Contatos carregados da interface
        self.contacts = ${contactsJson}
        
        logger.info(f"Configuração carregada: {self.config}")
        logger.info(f"Total de contatos: {len(self.contacts)}")
    
    async def start_browser(self):
        """Inicia o navegador e abre o WhatsApp Web"""
        try:
            logger.info("🚀 Iniciando navegador...")
            
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(
                headless=False,  # Modo visível para escaneamento do QR Code
                args=[
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            )
            
            context = await self.browser.new_context(
                viewport={'width': 1366, 'height': 768},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            )
            
            self.page = await context.new_page()
            await self.page.goto('https://web.whatsapp.com', wait_until='networkidle')
            
            logger.info("📱 Aguardando login no WhatsApp Web...")
            logger.info("   Escaneie o QR Code com seu celular")
            
            # Aguarda até que a página principal carregue (indicando login bem-sucedido)
            try:
                await self.page.wait_for_selector('[data-testid="chat-list"]', timeout=120000)
                logger.info("✅ Login realizado com sucesso!")
            except:
                await self.page.wait_for_selector('div[data-testid="chat-list"]', timeout=60000)
                logger.info("✅ Login realizado com sucesso!")
            
            await asyncio.sleep(3)  # Aguarda carregamento completo
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
                'div[aria-label="Menu"]'
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
            
            await asyncio.sleep(1)
            
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
            
            await asyncio.sleep(2)
            
            # Aguarda a tela de seleção de contatos aparecer
            await self.page.wait_for_selector('input[data-testid="contact-list-search"]', timeout=10000)
            logger.info(f"✅ Tela de criação de grupo aberta para: {group_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao criar grupo {group_name}: {e}")
            return False
    
    async def search_and_add_contact(self, contact):
        """Pesquisa e adiciona um contato ao grupo"""
        try:
            # Limpa a caixa de pesquisa
            search_box = await self.page.wait_for_selector('input[data-testid="contact-list-search"]', timeout=5000)
            await search_box.click()
            await search_box.fill('')
            await asyncio.sleep(0.5)
            
            # Pesquisa pelo nome ou número
            search_term = contact.get('nome', '') or contact['numero']
            await search_box.type(search_term)
            await asyncio.sleep(2)  # Aguarda resultados da pesquisa
            
            # Tenta encontrar o contato nos resultados
            contact_selectors = [
                f'div[data-testid="cell-frame-container"]:has-text("{contact.get("nome", "")}")',
                f'div[data-testid="cell-frame-container"]:has-text("{contact["numero"]}")',
                f'span:has-text("{contact.get("nome", "")}")',
                f'span:has-text("{contact["numero"]}")'
            ]
            
            contact_found = False
            for selector in contact_selectors:
                try:
                    if contact.get('nome') and selector.find(contact['nome']) != -1:
                        await self.page.wait_for_selector(selector, timeout=3000)
                        await self.page.click(selector)
                        contact_found = True
                        break
                except:
                    continue
            
            if not contact_found:
                # Tenta clicar no primeiro resultado
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
                logger.warning(f"⚠️  Contato não encontrado: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao adicionar {contact.get('nome', 'Sem nome')}: {e}")
            return False
    
    async def finalize_group_creation(self, group_name):
        """Finaliza a criação do grupo com nome"""
        try:
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
            
            await asyncio.sleep(2)
            
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
                    name_input = await self.page.wait_for_selector(selector, timeout=5000)
                    break
                except:
                    continue
            
            if not name_input:
                raise Exception("Não foi possível encontrar campo de nome do grupo")
            
            await name_input.click()
            await name_input.fill('')
            await name_input.type(group_name)
            await asyncio.sleep(1)
            
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
            
            await asyncio.sleep(5)  # Aguarda criação do grupo
            
            logger.info(f"✅ Grupo '{group_name}' criado com sucesso!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao finalizar criação do grupo: {e}")
            return False
    
    async def promote_to_admin(self, contact):
        """Promove um contato a administrador"""
        try:
            logger.info(f"👑 Promovendo {contact.get('nome', 'Sem nome')} a administrador...")
            
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
            
            await asyncio.sleep(2)
            
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
            
            await asyncio.sleep(1)
            
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
            
            await asyncio.sleep(1)
            
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
            
            await asyncio.sleep(1)
            
            logger.info(f"✅ {contact.get('nome', 'Sem nome')} promovido a administrador")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao promover {contact.get('nome', 'Sem nome')}: {e}")
            return False
    
    async def process_single_group(self, group_name, contacts):
        """Processa um único grupo"""
        report = {
            'group_name': group_name,
            'members_added': [],
            'admins_promoted': [],
            'errors': [],
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info(f"📋 Processando grupo: {group_name} com {len(contacts)} contatos")
        
        # Cria o grupo
        if not await self.create_group(group_name):
            error_msg = 'Falha ao criar grupo'
            report['errors'].append({'contact': {'nome': 'N/A', 'numero': 'N/A'}, 'error': error_msg})
            self.reports.append(report)
            return report
        
        # Adiciona contatos
        added_count = 0
        for contact in contacts:
            if added_count >= self.config['max_members']:
                logger.warning(f"⚠️  Limite de membros atingido para o grupo {group_name}")
                break
                
            if await self.search_and_add_contact(contact):
                report['members_added'].append(contact)
                added_count += 1
            else:
                report['errors'].append({
                    'contact': contact,
                    'error': 'Contato não encontrado ou erro ao adicionar'
                })
        
        # Finaliza criação do grupo
        if not await self.finalize_group_creation(group_name):
            error_msg = 'Falha ao finalizar grupo'
            report['errors'].append({'contact': {'nome': 'N/A', 'numero': 'N/A'}, 'error': error_msg})
            self.reports.append(report)
            return report
        
        # Promove administradores
        admin_contacts = [c for c in contacts if c['tipo'] == 'administrador']
        logger.info(f"👑 Promovendo {len(admin_contacts)} administradores...")
        
        for admin in admin_contacts:
            if await self.promote_to_admin(admin):
                report['admins_promoted'].append(admin)
            else:
                report['errors'].append({
                    'contact': admin,
                    'error': 'Falha ao promover a administrador'
                })
        
        self.reports.append(report)
        logger.info(f"📊 Grupo '{group_name}' processado: {len(report['members_added'])} membros, {len(report['admins_promoted'])} admins, {len(report['errors'])} erros")
        
        return report
    
    async def process_all_groups(self):
        """Processa todos os grupos necessários"""
        total_contacts = len(self.contacts)
        leads = [c for c in self.contacts if c['tipo'] == 'lead']
        admins = [c for c in self.contacts if c['tipo'] == 'administrador']
        
        logger.info(f"📋 Processando {total_contacts} contatos:")
        logger.info(f"   👥 {len(leads)} leads")
        logger.info(f"   👑 {len(admins)} administradores")
        
        # Calcula número de grupos necessários
        groups_needed = 1
        if self.config['create_multiple'] and total_contacts > self.config['max_members']:
            groups_needed = (total_contacts + self.config['max_members'] - 1) // self.config['max_members']
        
        logger.info(f"📊 Serão criados {groups_needed} grupo(s)")
        
        # Distribui administradores entre os grupos
        admins_per_group = len(admins) // groups_needed if groups_needed > 0 else len(admins)
        
        for group_num in range(groups_needed):
            group_name = self.config['base_name']
            if groups_needed > 1:
                group_name += f" {group_num + 1}"
            
            # Seleciona contatos para este grupo
            start_idx = group_num * self.config['max_members']
            end_idx = min(start_idx + self.config['max_members'], total_contacts)
            
            # Pega leads para este grupo
            group_leads = leads[start_idx:min(end_idx, len(leads))]
            
            # Distribui administradores
            admin_start = group_num * admins_per_group
            admin_end = min(admin_start + admins_per_group, len(admins))
            if group_num == groups_needed - 1:  # Último grupo pega admins restantes
                admin_end = len(admins)
            group_admins = admins[admin_start:admin_end]
            
            # Combina leads e admins para este grupo
            group_contacts = group_leads + group_admins
            
            if len(group_contacts) > 0:
                await self.process_single_group(group_name, group_contacts)
                
                # Delay entre grupos
                if group_num < groups_needed - 1:
                    logger.info(f"⏳ Aguardando {self.config['delay']} segundos antes do próximo grupo...")
                    await asyncio.sleep(self.config['delay'])
    
    def generate_csv_report(self):
        """Gera relatório em formato CSV"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = f'relatorio_whatsapp_{timestamp}.csv'
        
        try:
            with open(report_file, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['grupo', 'nome', 'numero', 'status', 'erro']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                
                for report in self.reports:
                    group_name = report['group_name']
                    
                    # Membros adicionados com sucesso
                    for member in report['members_added']:
                        writer.writerow({
                            'grupo': group_name,
                            'nome': member.get('nome', ''),
                            'numero': member['numero'],
                            'status': 'Adicionado',
                            'erro': ''
                        })
                    
                    # Administradores promovidos
                    for admin in report['admins_promoted']:
                        writer.writerow({
                            'grupo': group_name,
                            'nome': admin.get('nome', ''),
                            'numero': admin['numero'],
                            'status': 'Promovido a Admin',
                            'erro': ''
                        })
                    
                    # Erros
                    for error in report['errors']:
                        contact = error['contact']
                        writer.writerow({
                            'grupo': group_name,
                            'nome': contact.get('nome', '') if isinstance(contact, dict) else '',
                            'numero': contact.get('numero', '') if isinstance(contact, dict) else '',
                            'status': 'Erro',
                            'erro': error['error']
                        })
            
            logger.info(f"📄 Relatório CSV salvo em: {report_file}")
            return report_file
            
        except Exception as e:
            logger.error(f"❌ Erro ao gerar relatório CSV: {e}")
            return None
    
    def generate_summary_report(self):
        """Gera relatório resumido"""
        total_groups = len(self.reports)
        total_members = sum(len(r['members_added']) for r in self.reports)
        total_admins = sum(len(r['admins_promoted']) for r in self.reports)
        total_errors = sum(len(r['errors']) for r in self.reports)
        
        summary = f"""
{'='*60}
📊 RELATÓRIO FINAL - WHATSAPP GROUP AUTOMATION
{'='*60}
⏰ Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
👥 Grupos criados: {total_groups}
👤 Membros adicionados: {total_members}
👑 Administradores promovidos: {total_admins}
❌ Erros encontrados: {total_errors}
{'='*60}

DETALHES POR GRUPO:
"""
        
        for i, report in enumerate(self.reports, 1):
            summary += f"""
Grupo {i}: {report['group_name']}
  • Membros: {len(report['members_added'])}
  • Admins: {len(report['admins_promoted'])}
  • Erros: {len(report['errors'])}
  • Criado em: {report['timestamp']}
"""
            
            if report['errors']:
                summary += "  • Principais erros:\\n"
                for error in report['errors'][:3]:
                    contact = error['contact']
                    nome = contact.get('nome', 'Sem nome') if isinstance(contact, dict) else 'N/A'
                    numero = contact.get('numero', '') if isinstance(contact, dict) else ''
                    summary += f"    - {nome} ({numero}): {error['error']}\\n"
        
        summary += f"\\n{'='*60}\\n"
        
        # Salva relatório resumido
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        summary_file = f'resumo_whatsapp_{timestamp}.txt'
        
        try:
            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write(summary)
            logger.info(f"📄 Relatório resumido salvo em: {summary_file}")
        except Exception as e:
            logger.error(f"❌ Erro ao salvar relatório resumido: {e}")
        
        print(summary)
        return summary
    
    async def run(self):
        """Executa a automação completa"""
        try:
            logger.info("🤖 Iniciando WhatsApp Group Automation Tool")
            logger.info("="*50)
            
            if not self.contacts:
                logger.error("❌ Nenhum contato encontrado")
                return
            
            # Inicia navegador e faz login
            if not await self.start_browser():
                logger.error("❌ Falha ao iniciar navegador")
                return
            
            # Processa todos os grupos
            await self.process_all_groups()
            
            # Gera relatórios
            csv_file = self.generate_csv_report()
            self.generate_summary_report()
            
            logger.info("✅ Automação concluída com sucesso!")
            
            if csv_file:
                logger.info(f"📄 Relatórios salvos: {csv_file}")
            
        except Exception as e:
            logger.error(f"❌ Erro geral na automação: {e}")
        
        finally:
            # Aguarda antes de fechar
            logger.info("⏳ Aguardando 10 segundos antes de fechar o navegador...")
            await asyncio.sleep(10)
            
            if self.browser:
                await self.browser.close()
                logger.info("🔒 Navegador fechado")
            
            if self.playwright:
                await self.playwright.stop()

# Função principal
async def main():
    print("🤖 WhatsApp Group Automation Tool")
    print("="*50)
    print("Ferramenta gerada automaticamente pela interface web")
    print("Configurações e contatos já carregados")
    print("="*50)
    
    automation = WhatsAppAutomation()
    await automation.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\n⏹️  Automação interrompida pelo usuário")
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
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
    a.download = 'whatsapp_automation.py';
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
            <Code className="h-5 w-5 text-purple-600" />
          </div>
          <span>Código Python Gerado</span>
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
            <h3 className="font-semibold text-blue-900">Instruções de Instalação</h3>
          </div>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Instale o Python 3.8+ no seu sistema</li>
            <li>Abra o terminal/prompt de comando</li>
            <li>Execute: <code className="bg-blue-100 px-2 py-1 rounded text-xs">pip install playwright pandas</code></li>
            <li>Execute: <code className="bg-blue-100 px-2 py-1 rounded text-xs">playwright install chromium</code></li>
            <li>Baixe o script Python gerado</li>
            <li>Execute: <code className="bg-blue-100 px-2 py-1 rounded text-xs">python whatsapp_automation.py</code></li>
          </ol>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Funcionalidades Incluídas</h3>
          </div>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Criação automática de grupos</li>
            <li>• Adição de contatos como membros</li>
            <li>• Promoção de administradores</li>
            <li>• Tratamento de erros robusto</li>
            <li>• Relatórios em CSV e TXT</li>
            <li>• Logs detalhados de execução</li>
            <li>• Delays humanizados</li>
            <li>• Suporte a múltiplos grupos</li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">⚠️ Importante - Leia antes de usar:</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• <strong>Use com responsabilidade</strong> e respeite os termos de uso do WhatsApp</li>
              <li>• <strong>Teste primeiro</strong> com poucos contatos para verificar funcionamento</li>
              <li>• <strong>Mantenha delays adequados</strong> para evitar bloqueios automáticos</li>
              <li>• <strong>Monitore a execução</strong> e interrompa se necessário</li>
              <li>• <strong>Backup dos contatos</strong> antes de executar automações</li>
              <li>• <strong>Este código foi gerado automaticamente</strong> baseado na sua configuração</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};