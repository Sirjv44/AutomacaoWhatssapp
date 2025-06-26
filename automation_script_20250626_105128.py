#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Automação REAL do WhatsApp
Gerado automaticamente em 26/06/2025 10:51:28
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
        self.config = {'baseName': 'Grupo VIP', 'maxMembers': 999, 'delay': {'min': 2, 'max': 6}, 'groupDelay': {'min': 30, 'max': 90}, 'createMultiple': True, 'welcomeMessage': 'Bem-vindos ao nosso grupo! 🎉\n\nEste é um espaço para compartilharmos informações importantes e mantermos contato.\n\nObrigado por fazer parte da nossa comunidade! 👥', 'enableScheduling': False, 'enableBanPrevention': True, 'maxGroupsPerSession': 10}
        
        # Contatos REAIS
        self.contacts = [{'nome': 'Eduardo Gomes', 'numero': '5562919988776', 'tipo': 'administrador'}, {'nome': 'Admin Manual 1', 'numero': '5562982747219', 'tipo': 'administrador'}]
        
        print("INICIANDO WhatsApp Automation REAL")
        print(f"Sessao: session_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        print(f"Total de contatos: {len(self.contacts)}")
    
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
            
            print("Acessando WhatsApp Web...")
            await self.page.goto('https://web.whatsapp.com', wait_until='networkidle')
            
            print("Aguardando login no WhatsApp Web REAL...")
            print("Escaneie o QR Code com seu celular")
            
            # Aguarda login com timeout maior (10 minutos)
            try:
                await self.page.wait_for_selector('div[role="grid"]', timeout=600000)  # 10 minutos
                print("Login realizado com sucesso!")
            except:
                try:
                    await self.page.wait_for_selector('div[role="grid"]', timeout=300000)  # 5 minutos
                    print("Login realizado com sucesso!")
                except Exception as e:
                    print(f"Timeout no login: {e}")
                    return False
            
            await asyncio.sleep(10)
            return True
            
        except Exception as e:
            print(f"Erro ao iniciar navegador: {e}")
            return False
    
    async def create_group(self, group_name):
        """Cria um novo grupo no WhatsApp"""
        try:
            print(f"Criando grupo: {group_name}")
            
            # Aguarda um pouco para garantir que a página está carregada
            await asyncio.sleep(3)
            
            # Clica no menu de opções
            menu_selectors = [
                '[aria-label="Mais opções"]'
            ]
            
            menu_clicked = False
            for selector in menu_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=15000)
                    await self.page.click(selector)
                    menu_clicked = True
                    print(f"Menu clicado com seletor: {selector}")
                    break
                except Exception as e:
                    print(f"Tentativa com seletor {selector} falhou: {e}")
                    continue
            
            if not menu_clicked:
                raise Exception("Menu nao encontrado")
            
            await asyncio.sleep(3)
            
            # Clica em "Novo grupo"
            new_group_selectors = [
                'text="Novo grupo"'
            ]
            
            group_clicked = False
            for selector in new_group_selectors:
                try:
                    await self.page.click(selector)
                    group_clicked = True
                    print(f"Novo grupo clicado com seletor: {selector}")
                    break
                except Exception as e:
                    print(f"Tentativa novo grupo com {selector} falhou: {e}")
                    continue
            
            if not group_clicked:
                raise Exception("Opcao Novo grupo nao encontrada")
            
            await asyncio.sleep(5)
            
            # Aguarda tela de seleção de contatos
            await self.page.wait_for_selector('input[placeholder]', timeout=20000)
            print(f"Tela de criacao de grupo aberta para: {group_name}")
            return True
            
        except Exception as e:
            print(f"Erro ao criar grupo {group_name}: {e}")
            return False
    
    async def search_and_add_contact(self, contact):
        """Pesquisa e adiciona um contato ao grupo"""
        try:
            print(f"Buscando contato: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
            
            # Limpa a caixa de pesquisa
            search_box = await self.page.wait_for_selector('input[placeholder]', timeout=15000)
            await search_box.click()
            await search_box.fill('')
            await asyncio.sleep(1)
            
            # Pesquisa pelo nome ou número
            search_term = contact['numero']
            print(f"Pesquisando por: {search_term}")
            
            await search_box.type(search_term, delay=100)
            await asyncio.sleep(4)  # Aguarda resultados da pesquisa
            
            # Tenta encontrar o contato - sempre clica no primeiro resultado
            contact_selectors = [
                'div[role="button"][tabindex="0"] span[title]'
            ]
            
            contact_found = False
            for selector in contact_selectors:
                try:
                    await self.page.wait_for_selector(selector, timeout=8000)
                    await self.page.click(selector)
                    contact_found = True
                    print(f"Contato clicado com seletor: {selector}")
                    break
                except Exception as e:
                    print(f"Tentativa contato com {selector} falhou: {e}")
                    continue
            
            if contact_found:
                delay = random.uniform(self.config['delay']['min'], self.config['delay']['max'])
                await asyncio.sleep(delay)
                print(f"Contato adicionado: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
                return True
            else:
                print(f"Contato NAO encontrado: {contact.get('nome', 'Sem nome')} ({contact['numero']})")
                return False
                
        except Exception as e:
            print(f"Erro ao adicionar {contact.get('nome', 'Sem nome')}: {e}")
            return False
    
    async def finalize_group_creation(self, group_name):
        """Finaliza a criação do grupo"""
        try:
            print(f"Finalizando criacao do grupo: {group_name}")
            
            # Clica no botão avançar
            next_selectors = [
                'div[role="button"][aria-label="Avançar"]'
            ]
            
            next_clicked = False
            for selector in next_selectors:
                try:
                    await self.page.click(selector)
                    next_clicked = True
                    print(f"Botao Avancar clicado com seletor: {selector}")
                    break
                except Exception as e:
                    print(f"Tentativa avancar com {selector} falhou: {e}")
                    continue
            
            if not next_clicked:
                raise Exception("Botao Avancar nao encontrado")
            
            await asyncio.sleep(4)
            
            # Define o nome do grupo
            name_input_selectors = [
                'div[role="textbox"][aria-label="Nome do grupo (opcional)"]'
            ]
            
            name_input = None
            for selector in name_input_selectors:
                try:
                    name_input = await self.page.wait_for_selector(selector, timeout=15000)
                    print(f"Campo nome encontrado com seletor: {selector}")
                    break
                except Exception as e:
                    print(f"Tentativa campo nome com {selector} falhou: {e}")
                    continue
            
            if not name_input:
                raise Exception("Campo de nome do grupo nao encontrado")
            
            await name_input.click()
            await name_input.fill('')
            await name_input.type(group_name, delay=100)
            await asyncio.sleep(2)
            
            # Clica em criar grupo
            create_selectors = [
                'div[role="button"][aria-label="Criar grupo"]'
            ]
            
            create_clicked = False
            for selector in create_selectors:
                try:
                    await self.page.click(selector)
                    create_clicked = True
                    print(f"Botao Criar clicado com seletor: {selector}")
                    break
                except Exception as e:
                    print(f"Tentativa criar com {selector} falhou: {e}")
                    continue
            
            if not create_clicked:
                raise Exception("Botao Criar nao encontrado")
            
            await asyncio.sleep(10)  # Aguarda criação do grupo
            
            print(f"Grupo '{group_name}' criado com sucesso!")
            return True
            
        except Exception as e:
            print(f"Erro ao finalizar criacao do grupo: {e}")
            return False

    async def promote_to_admin(self, contact):
        try:
            nome = contact.get('nome', '').strip()
            numero = contact.get('numero', '').strip()
            identifier = nome if nome else numero
            print(f"🔍 Promovendo contato: {identifier}...")

            # Abre "Dados do grupo"
            await self.page.wait_for_selector('button:has(svg[title="info"])', timeout=10000)
            await self.page.click('button:has(svg[title="info"])')
            await asyncio.sleep(3)

            # Tenta localizar o contato na lista (por nome OU número formatado)
            search_title = nome if nome else f'+{numero[0:2]} {numero[2:]}'

            found = False
            for _ in range(10):  # Rola até encontrar
                elements = await self.page.query_selector_all(f'span[title="{search_title}"]')
                if elements:
                    found = True
                    break
                await self.page.keyboard.press("PageDown")
                await asyncio.sleep(1)

            if not found:
                print(f"❌ Contato {identifier} não encontrado nos participantes.")
                return False

            # Clica no contato
            await self.page.click(f'span[title="{search_title}"]')
            await asyncio.sleep(2)

            # Clica em "Tornar admin do grupo"
            await self.page.wait_for_selector('text="Tornar admin do grupo"', timeout=5000)
            await self.page.click('text="Tornar admin do grupo"')
            await asyncio.sleep(2)

            print(f"✅ {identifier} promovido a administrador.")
            return True

        except Exception as e:
            print(f"❌ Erro ao promover {identifier} a admin: {e}")
            return False
               
    
    async def send_welcome_message(self, group_name):
        """Envia mensagem de boas-vindas"""
        try:
            if not self.config['welcomeMessage'].strip():
                return True
            
            print(f"Enviando mensagem de boas-vindas para {group_name}")
            
            # Localiza a caixa de texto
            message_selectors = [
                'div[role="textbox"][aria-label="Digite uma mensagem"]'
            ]
            
            message_box = None
            for selector in message_selectors:
                try:
                    message_box = await self.page.wait_for_selector(selector, timeout=15000)
                    print(f"Caixa de mensagem encontrada com seletor: {selector}")
                    break
                except Exception as e:
                    print(f"Tentativa caixa mensagem com {selector} falhou: {e}")
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
            
            print(f"Mensagem de boas-vindas enviada para {group_name}")
            return True
            
        except Exception as e:
            print(f"Erro ao enviar mensagem: {e}")
            return False
    
    async def process_automation(self):
        """Processa a automação completa"""
        try:
            leads = [c for c in self.contacts if c['tipo'] == 'lead']
            admins = [c for c in self.contacts if c['tipo'] == 'administrador']
            
            print(f"Processando automacao:")
            print(f"  - {len(leads)} leads")
            print(f"  - {len(admins)} administradores")
            
            # Se não há leads suficientes, cria um grupo com todos
            if len(leads) == 0:
                print("Nenhum lead encontrado, criando grupo com todos os contatos")

                # Evita duplicar os administradores como leads
                admins = [c for c in self.contacts if c['tipo'] == 'administrador']
                admin_numeros = set(c['numero'] for c in admins)
                
                leads = [c for c in self.contacts if c['numero'] not in admin_numeros]

            
            # Calcula grupos necessários (mínimo 1)
            groups_needed = max(1, (len(leads) + 998) // 999)
            
            print(f"Grupos a serem criados: {groups_needed}")
            
            for group_num in range(groups_needed):
                group_name = f"{self.config['baseName']} {group_num + 1}"
                
                print(f"\n=== PROCESSANDO GRUPO {group_num + 1}/{groups_needed}: {group_name} ===")
                
                # Cria o grupo
                if not await self.create_group(group_name):
                    print(f"ERRO: Falha ao criar grupo {group_name}")
                    continue
                
                # Adiciona contatos do grupo atual
                start_idx = group_num * 999
                end_idx = min(start_idx + 999, len(leads))
                group_leads = leads[start_idx:end_idx]
                
                print(f"Adicionando {len(group_leads)} leads ao grupo...")
                
                # Adiciona leads
                for i, lead in enumerate(group_leads, 1):
                    print(f"  Adicionando lead {i}/{len(group_leads)}: {lead.get('nome', 'Sem nome')}")
                    await self.search_and_add_contact(lead)
                
                # Adiciona administradores
                if admins:
                    print(f"Adicionando {len(admins)} administradores ao grupo...")
                    for i, admin in enumerate(admins, 1):
                        print(f"  Adicionando admin {i}/{len(admins)}: {admin.get('nome', 'Sem nome')}")
                        await self.search_and_add_contact(admin)
                
                # Finaliza criação do grupo
                if not await self.finalize_group_creation(group_name):
                    print(f"ERRO: Falha ao finalizar grupo {group_name}")
                    continue

                # Aguarda a tela do grupo abrir após a criação
                try:
                    await self.page.wait_for_selector('div[role="textbox"][aria-label="Digite uma mensagem"]', timeout=15000)
                    print("Tela do grupo carregada com sucesso.")
                except Exception as e:
                    print(f"Erro ao aguardar tela do grupo: {e}")
                    continue

                # Promove administradores
                if admins:
                    for admin in admins:
                        nome = admin.get('nome', '')
                        if nome:
                            await self.promote_to_admin(admin)
                            if not success:
                                print(f"Falha ao promover: {nome}")

                # Envia mensagem de boas-vindas
                await self.send_welcome_message(group_name)
                
                print(f"Grupo {group_name} processado com sucesso!")
                
                # Delay entre grupos se houver mais de um
                if group_num < groups_needed - 1:
                    if self.config.get('enableBanPrevention', False):
                        delay_time = random.uniform(
                            self.config.get('groupDelay', {}).get('min', 30),
                            self.config.get('groupDelay', {}).get('max', 90)
                        )
                        print(f"Delay anti-ban: Aguardando {delay_time:.1f} segundos...")
                    else:
                        delay_time = 5
                        print(f"Aguardando {delay_time} segundos...")
                    
                    await asyncio.sleep(delay_time)
            
            print("\n=== AUTOMACAO CONCLUIDA COM SUCESSO! ===")
            print(f"{groups_needed} grupos criados")
            print(f"{len(self.contacts)} contatos processados")
            
        except Exception as e:
            print(f"Erro na automacao: {e}")
    
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
            
            print("\nAutomacao concluida! Aguardando 60 segundos antes de fechar...")
            await asyncio.sleep(60)
            
        except Exception as e:
            print(f"Erro geral na automacao: {e}")
        
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
        print("\nAutomacao interrompida pelo usuario")
    except Exception as e:
        print(f"Erro fatal: {e}")
        input("Pressione Enter para sair...")
