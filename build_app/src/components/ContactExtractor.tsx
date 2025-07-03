import React, { useState, useCallback } from 'react';
import { Download, Users, Search, Filter, AlertTriangle, CheckCircle, Clock, FileText, Copy, Check } from 'lucide-react';
import { ExtractedContact, ExtractionStatus, ExtractionConfig, ExtractionReport } from '../types';

interface ContactExtractorProps {
  lgpdConsent: boolean;
}

export const ContactExtractor: React.FC<ContactExtractorProps> = ({ lgpdConsent }) => {
  const [extractionStatus, setExtractionStatus] = useState<ExtractionStatus>({
    isRunning: false,
    currentStep: '',
    progress: 0,
    totalGroups: 0,
    processedGroups: 0,
    currentGroup: '',
    logs: [],
    estimatedTimeRemaining: '',
    extractedContacts: [],
    uniqueContacts: 0,
    duplicatesFound: 0,
  });

  const [config, setConfig] = useState<ExtractionConfig>({
    groupNameFilter: '',
    includeAdmins: true,
    removeDuplicates: true,
    delay: { min: 2, max: 4 },
  });

  const [extractionReport, setExtractionReport] = useState<ExtractionReport | null>(null);
  const [copied, setCopied] = useState(false);

  const handleStartExtraction = useCallback(() => {
    if (!lgpdConsent) return;

    // Simula o início da extração
    setExtractionStatus({
      isRunning: true,
      currentStep: 'Preparando extração de contatos... Execute o script Python para extração real',
      progress: 0,
      totalGroups: 25, // Simulado
      processedGroups: 0,
      currentGroup: '',
      estimatedTimeRemaining: '5 min',
      extractedContacts: [],
      uniqueContacts: 0,
      duplicatesFound: 0,
      logs: [
        '🔍 Iniciando extração de contatos de grupos',
        '📱 Conectando ao WhatsApp Web...',
        '📋 Listando grupos disponíveis...',
        config.groupNameFilter ? `🔍 Filtro aplicado: "${config.groupNameFilter}"` : '📊 Extraindo de todos os grupos',
        `⏱️  Delay configurado: ${config.delay.min}s-${config.delay.max}s`,
        '⚠️  Execute o script Python para extração real'
      ].filter(Boolean),
    });

    // Simula progresso da extração
    const progressInterval = setInterval(() => {
      setExtractionStatus(prev => {
        if (prev.progress >= 100) {
          clearInterval(progressInterval);
          
          // Gera dados simulados de extração
          const simulatedContacts: ExtractedContact[] = [
            { nome: 'João Silva', numero: '5562999999999', grupo: 'Grupo VIP 1', isAdmin: false, extractedAt: new Date().toISOString() },
            { nome: 'Maria Santos', numero: '5562888888888', grupo: 'Grupo VIP 1', isAdmin: true, extractedAt: new Date().toISOString() },
            { nome: 'Pedro Costa', numero: '5562777777777', grupo: 'Grupo VIP 2', isAdmin: false, extractedAt: new Date().toISOString() },
            { nome: 'Ana Lima', numero: '5562666666666', grupo: 'Grupo VIP 2', isAdmin: false, extractedAt: new Date().toISOString() },
            { nome: 'Carlos Admin', numero: '5562555555555', grupo: 'Grupo VIP 3', isAdmin: true, extractedAt: new Date().toISOString() },
            { nome: '', numero: '5562444444444', grupo: 'Grupo VIP 3', isAdmin: false, extractedAt: new Date().toISOString() },
            { nome: 'Lucia Ferreira', numero: '5562333333333', grupo: 'Grupo Leads', isAdmin: false, extractedAt: new Date().toISOString() },
            { nome: 'Roberto Silva', numero: '5562222222222', grupo: 'Grupo Leads', isAdmin: false, extractedAt: new Date().toISOString() },
          ];

          const uniqueContacts = config.removeDuplicates ? 
            simulatedContacts.filter((contact, index, self) => 
              index === self.findIndex(c => c.numero === contact.numero)
            ) : simulatedContacts;

          const report: ExtractionReport = {
            totalGroupsScanned: 25,
            totalContactsExtracted: simulatedContacts.length,
            uniqueContacts: uniqueContacts.length,
            duplicatesRemoved: simulatedContacts.length - uniqueContacts.length,
            groupsWithErrors: ['Grupo Privado 1', 'Grupo Restrito 2'],
            extractionTime: '4 min 32s',
            timestamp: new Date().toISOString(),
          };

          setExtractionReport(report);

          return {
            ...prev,
            isRunning: false,
            currentStep: 'Demonstração de extração concluída - Execute o script Python para extração real',
            estimatedTimeRemaining: '0 min',
            extractedContacts: uniqueContacts,
            uniqueContacts: uniqueContacts.length,
            duplicatesFound: simulatedContacts.length - uniqueContacts.length,
            logs: [...prev.logs, '✅ Demonstração da extração concluída', `📊 ${uniqueContacts.length} contatos únicos extraídos`, '💾 Dados prontos para download']
          };
        }

        const newProgress = Math.min(prev.progress + 4, 100);
        const newLogs = [...prev.logs];
        const currentGroupIndex = Math.ceil((newProgress / 100) * 25);
        
        if (newProgress === 12) {
          newLogs.push('📱 WhatsApp Web conectado (modo demonstração)');
        } else if (newProgress === 24) {
          newLogs.push('📋 25 grupos encontrados (modo demonstração)');
        } else if (newProgress === 36) {
          newLogs.push('👥 Extraindo contatos do Grupo VIP 1 (modo demonstração)');
        } else if (newProgress === 48) {
          newLogs.push('👥 Extraindo contatos do Grupo VIP 2 (modo demonstração)');
        } else if (newProgress === 60) {
          newLogs.push('👥 Extraindo contatos do Grupo Leads (modo demonstração)');
        } else if (newProgress === 72) {
          newLogs.push('🔍 Removendo duplicatas (modo demonstração)');
        } else if (newProgress === 84) {
          newLogs.push('📊 Processando dados extraídos (modo demonstração)');
        } else if (newProgress === 96) {
          newLogs.push('📄 Gerando relatório de extração (modo demonstração)');
        }

        const remainingProgress = 100 - newProgress;
        const estimatedTimeRemaining = Math.ceil((remainingProgress / 100) * 5);

        return {
          ...prev,
          progress: newProgress,
          processedGroups: currentGroupIndex,
          currentStep: newProgress < 100 
            ? `Demonstração em progresso... Extraindo grupo ${currentGroupIndex}/25` 
            : 'Demonstração concluída - Execute o script Python para extração real',
          currentGroup: `Grupo ${currentGroupIndex}`,
          estimatedTimeRemaining: estimatedTimeRemaining > 0 ? `${estimatedTimeRemaining} min` : '< 1 min',
          logs: newLogs
        };
      });
    }, 1500);
  }, [lgpdConsent, config]);

  const handleStopExtraction = useCallback(() => {
    setExtractionStatus(prev => ({
      ...prev,
      isRunning: false,
      currentStep: 'Extração interrompida pelo usuário',
      estimatedTimeRemaining: '',
      logs: [...prev.logs, '⏹️ Extração interrompida pelo usuário']
    }));
  }, []);

  const generateExtractionCode = () => {
    return `#!/usr/bin/env python3
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
            'group_name_filter': '${config.groupNameFilter}',
            'include_admins': ${config.includeAdmins ? 'True' : 'False'},
            'remove_duplicates': ${config.removeDuplicates ? 'True' : 'False'},
            'delay_min': ${config.delay.min},
            'delay_max': ${config.delay.max}
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
                        number_match = re.search(r'\\+?[\\d\\s\\-\\(\\)]{10,}', subtitle)
                        if number_match:
                            number = re.sub(r'[\\s\\-\\(\\)]', '', number_match.group())
                    
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
    print("Configurações carregadas da interface web")
    print("="*50)
    
    extractor = WhatsAppContactExtractor()
    await extractor.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\\n⏹️  Extração interrompida pelo usuário")
    except Exception as e:
        print(f"❌ Erro fatal: {e}")
        input("Pressione Enter para sair...")
`;
  };

  const copyCodeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateExtractionCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const downloadExtractionScript = () => {
    const code = generateExtractionCode();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whatsapp_contact_extractor.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadContactsCSV = () => {
    if (extractionStatus.extractedContacts.length === 0) return;

    const csvContent = [
      'nome,numero,grupo,is_admin,extracted_at',
      ...extractionStatus.extractedContacts.map(contact => 
        `"${contact.nome || ''}","${contact.numero}","${contact.grupo}","${contact.isAdmin ? 'Sim' : 'Não'}","${contact.extractedAt}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contatos_extraidos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadContactsJSON = () => {
    if (extractionStatus.extractedContacts.length === 0) return;

    const jsonData = {
      extraction_info: {
        timestamp: new Date().toISOString(),
        total_contacts: extractionStatus.extractedContacts.length,
        unique_contacts: extractionStatus.uniqueContacts,
        duplicates_found: extractionStatus.duplicatesFound,
        config: config
      },
      contacts: extractionStatus.extractedContacts
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contatos_extraidos_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const progressPercentage = extractionStatus.totalGroups > 0 
    ? Math.round((extractionStatus.processedGroups / extractionStatus.totalGroups) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Search className="h-5 w-5 text-blue-600" />
          </div>
          <span>Extrator de Contatos de Grupos</span>
        </h2>
        
        <div className="flex space-x-3">
          {!extractionStatus.isRunning ? (
            <button
              onClick={handleStartExtraction}
              disabled={!lgpdConsent}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <Search className="h-4 w-4" />
              <span>Extrair Contatos</span>
            </button>
          ) : (
            <button
              onClick={handleStopExtraction}
              className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 flex items-center space-x-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Parar Extração</span>
            </button>
          )}
        </div>
      </div>

      {!lgpdConsent && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">Consentimento LGPD Necessário</h3>
              <p className="text-red-700 mt-1">
                É necessário aceitar os termos de proteção de dados antes de extrair contatos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configurações de Extração */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Configurações de Extração</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Filtro por Nome do Grupo (opcional)
            </label>
            <input
              type="text"
              value={config.groupNameFilter}
              onChange={(e) => setConfig({ ...config, groupNameFilter: e.target.value })}
              placeholder="Ex: VIP, Leads, Clientes..."
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <p className="text-xs text-blue-600 mt-1">
              Deixe vazio para extrair de todos os grupos
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-2">
              Delay Entre Grupos (segundos)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                max="10"
                value={config.delay.min}
                onChange={(e) => setConfig({ 
                  ...config, 
                  delay: { ...config.delay, min: parseFloat(e.target.value) || 2 }
                })}
                className="w-full px-2 py-2 border border-blue-300 rounded text-sm"
                placeholder="Min"
              />
              <input
                type="number"
                min="2"
                max="15"
                value={config.delay.max}
                onChange={(e) => setConfig({ 
                  ...config, 
                  delay: { ...config.delay, max: parseFloat(e.target.value) || 4 }
                })}
                className="w-full px-2 py-2 border border-blue-300 rounded text-sm"
                placeholder="Max"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <label className="flex items-center space-x-3 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={config.includeAdmins}
              onChange={(e) => setConfig({ ...config, includeAdmins: e.target.checked })}
              className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <div>
              <span className="text-sm font-medium text-blue-900">Identificar Administradores</span>
              <p className="text-xs text-blue-700">Marcar contatos que são admins dos grupos</p>
            </div>
          </label>
          
          <label className="flex items-center space-x-3 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
            <input
              type="checkbox"
              checked={config.removeDuplicates}
              onChange={(e) => setConfig({ ...config, removeDuplicates: e.target.checked })}
              className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <div>
              <span className="text-sm font-medium text-blue-900">Remover Duplicatas</span>
              <p className="text-xs text-blue-700">Manter apenas um registro por número</p>
            </div>
          </label>
        </div>
      </div>

      {/* Status da Extração */}
      {extractionStatus.isRunning && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Search className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">Extração em Progresso</span>
            </div>
            <div className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full">
              Grupo {extractionStatus.processedGroups} de {extractionStatus.totalGroups}
            </div>
          </div>
          
          <p className="text-green-800 mb-4 font-medium">{extractionStatus.currentStep}</p>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-green-700">
              <span>Progresso</span>
              <span>{extractionStatus.processedGroups} de {extractionStatus.totalGroups} grupos ({progressPercentage}%)</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-green-600 to-green-700 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            {extractionStatus.estimatedTimeRemaining && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Tempo Restante</span>
                <span className="font-medium">{extractionStatus.estimatedTimeRemaining}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs da Extração */}
      {extractionStatus.logs.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Log da Extração</span>
          </h3>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {extractionStatus.logs.slice(-10).map((log, index) => (
              <div key={index} className="text-sm text-gray-700 font-mono bg-white px-3 py-1 rounded border">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultados da Extração */}
      {extractionStatus.extractedContacts.length > 0 && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-4 flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Resultados da Extração</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 text-center border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">{extractionStatus.extractedContacts.length}</div>
                <div className="text-sm text-purple-700">Contatos Extraídos</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center border border-purple-200">
                <div className="text-2xl font-bold text-green-900">{extractionStatus.uniqueContacts}</div>
                <div className="text-sm text-green-700">Contatos Únicos</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center border border-purple-200">
                <div className="text-2xl font-bold text-amber-900">{extractionStatus.duplicatesFound}</div>
                <div className="text-sm text-amber-700">Duplicatas Removidas</div>
              </div>
              
              <div className="bg-white rounded-lg p-4 text-center border border-purple-200">
                <div className="text-2xl font-bold text-blue-900">{extractionStatus.processedGroups}</div>
                <div className="text-sm text-blue-700">Grupos Processados</div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={downloadContactsCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 text-sm transition-all duration-200"
              >
                <Download className="h-4 w-4" />
                <span>Baixar CSV</span>
              </button>
              
              <button
                onClick={downloadContactsJSON}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm transition-all duration-200"
              >
                <Download className="h-4 w-4" />
                <span>Baixar JSON</span>
              </button>
            </div>
          </div>

          {/* Preview dos Contatos */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">Preview dos Contatos Extraídos</h4>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2 border-b">Nome</th>
                    <th className="text-left p-2 border-b">Número</th>
                    <th className="text-left p-2 border-b">Grupo</th>
                    <th className="text-left p-2 border-b">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {extractionStatus.extractedContacts.slice(0, 10).map((contact, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{contact.nome || '(sem nome)'}</td>
                      <td className="p-2 font-mono">{contact.numero}</td>
                      <td className="p-2">{contact.grupo}</td>
                      <td className="p-2">
                        {contact.isAdmin ? (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">Admin</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">Membro</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {extractionStatus.extractedContacts.length > 10 && (
                <p className="text-center text-gray-500 mt-2 text-sm">
                  ... e mais {extractionStatus.extractedContacts.length - 10} contatos
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gerador de Código Python */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <span>Código Python - Extrator de Contatos</span>
          </h3>
          
          <div className="flex space-x-3">
            <button
              onClick={copyCodeToClipboard}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 text-sm transition-all duration-200"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>
            
            <button
              onClick={downloadExtractionScript}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 text-sm transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              <span>Download</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
          <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
            {generateExtractionCode()}
          </pre>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">📋 Como Usar o Extrator de Contatos</h3>
            <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
              <li>Configure os filtros e opções de extração acima</li>
              <li>Clique em "Extrair Contatos" para gerar o código Python</li>
              <li>Baixe o script Python gerado</li>
              <li>Execute: <code className="bg-amber-100 px-1 rounded">python whatsapp_contact_extractor.py</code></li>
              <li>Escaneie o QR Code do WhatsApp Web</li>
              <li>Aguarde a extração automática de todos os grupos</li>
              <li>Os contatos serão salvos em arquivos CSV e JSON</li>
            </ol>
            <div className="mt-3 p-3 bg-amber-100 rounded border border-amber-300">
              <p className="text-xs text-amber-800">
                <strong>⚠️ Importante:</strong> Esta ferramenta extrai contatos apenas dos grupos em que você participa. 
                Respeite a privacidade dos contatos e use os dados de forma responsável, conforme LGPD.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};