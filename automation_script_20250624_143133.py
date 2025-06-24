#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de Automação REAL do WhatsApp
Gerado automaticamente em 24/06/2025 14:31:33
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

        self.config = {
            'baseName': 'Grupo VIP',
            'maxMembers': 999,
            'delay': {'min': 2, 'max': 6},
            'groupDelay': {'min': 30, 'max': 90},
            'createMultiple': True,
            'welcomeMessage': 'Bem-vindos ao nosso grupo! 🎉\n\nEste é um espaço para compartilharmos informações importantes e mantermos contato.\n\nObrigado por fazer parte da nossa comunidade! 👥',
            'enableScheduling': False,
            'enableBanPrevention': True,
            'maxGroupsPerSession': 10
        }

        self.contacts = [
            {'nome': 'Junin', 'numero': '5562994732873', 'tipo': 'administrador'},
            {'nome': 'João Vitor Parreira Guimarães', 'numero': '5562982747219', 'tipo': 'lead'}
        ]

        print("[INIT] Iniciando WhatsApp Automation REAL", flush=True)
        print(f"[INFO] Sessao: session_{datetime.now().strftime('%Y%m%d_%H%M%S')}", flush=True)
        print(f"[INFO] Total de contatos: {len(self.contacts)}", flush=True)

    async def start_browser(self):
        print("[START] Abrindo navegador Chrome REAL...", flush=True)
        try:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=False)
            context = await self.browser.new_context(
                viewport={'width': 1366, 'height': 768},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self.page = await context.new_page()

            print("[NAV] Acessando WhatsApp Web...", flush=True)
            await self.page.goto('https://web.whatsapp.com', wait_until='load')

            print("[WAIT] Aguardando login no WhatsApp Web (10 minutos)...", flush=True)
            await self.page.wait_for_selector('div[role="grid"]', timeout=600000)
            print("[OK] Login realizado com sucesso!", flush=True)
            await asyncio.sleep(5)
            return True
        except Exception as e:
            print(f"[ERROR] Falha ao iniciar navegador: {e}", flush=True)
            return False

    async def create_group(self, group_name):
        print(f"[START] Criando grupo: {group_name}", flush=True)
        try:
            await asyncio.sleep(3)
            await self.page.click('[aria-label="Mais opções"]')
            await asyncio.sleep(1)
            await self.page.click('text="Novo grupo"')
            await asyncio.sleep(3)
            print(f"[OK] Tela de novo grupo aberta: {group_name}", flush=True)
            return True
        except Exception as e:
            print(f"[ERROR] Erro ao criar grupo {group_name}: {e}", flush=True)
            return False

    async def search_and_add_contact(self, contact):
        print(f"[SEARCH] Procurando contato: {contact['nome']} ({contact['numero']})", flush=True)
        try:
            search_box = await self.page.wait_for_selector('input[placeholder]', timeout=15000)
            await search_box.fill(contact['numero'])
            await asyncio.sleep(3)
            await self.page.wait_for_selector('div[role="button"][tabindex="0"] span[title]', timeout=30000)
            contact_buttons = await self.page.query_selector_all('div[role="button"][tabindex="0"] span[title]')

            if contact_buttons:
                # Clica no primeiro contato da lista (ou ajuste se quiser lógica por nome/número)
                await contact_buttons[0].click()
                print(f"[OK] Contato {contact['nome']} clicado.", flush=True)
                return True
            else:
                print(f"[ERROR] Nenhum contato encontrado na busca por {contact['numero']}", flush=True)
                return False

            await asyncio.sleep(1)
            print(f"[OK] Contato adicionado: {contact['nome']}", flush=True)
            return True
        except Exception as e:
            print(f"[ERROR] Erro ao adicionar contato {contact['nome']}: {e}", flush=True)
            return False

    async def finalize_group_creation(self, group_name):
        print(f"[FINALIZE] Finalizando grupo: {group_name}", flush=True)
        try:
            await self.page.click('div[role="button"][aria-label="Avançar"]')
            await asyncio.sleep(2)
            subject_input = await self.page.wait_for_selector('input[data-testid="group-subject-input"]', timeout=10000)
            await subject_input.fill(group_name)
            await asyncio.sleep(1)
            await self.page.click('[data-testid="create-group-button"]')
            await asyncio.sleep(5)
            print(f"[OK] Grupo '{group_name}' criado com sucesso!", flush=True)
            return True
        except Exception as e:
            print(f"[ERROR] Erro ao finalizar grupo {group_name}: {e}", flush=True)
            return False

    async def send_welcome_message(self, group_name):
        print(f"[SEND] Enviando mensagem de boas-vindas ao grupo: {group_name}", flush=True)
        try:
            message_box = await self.page.wait_for_selector('[data-testid="conversation-compose-box-input"]', timeout=15000)
            await message_box.type(self.config['welcomeMessage'])
            await asyncio.sleep(1)
            await self.page.keyboard.press('Enter')
            print(f"[OK] Mensagem enviada para {group_name}", flush=True)
        except Exception as e:
            print(f"[ERROR] Falha ao enviar mensagem: {e}", flush=True)

    async def process_automation(self):
        print("[PROCESS] Iniciando processo de automação...", flush=True)
        try:
            leads = [c for c in self.contacts if c['tipo'] == 'lead']
            admins = [c for c in self.contacts if c['tipo'] == 'administrador']

            total_groups = max(1, (len(leads) + 998) // 999)
            print(f"[INFO] Total de grupos a criar: {total_groups}", flush=True)

            for group_index in range(total_groups):
                group_name = f"{self.config['baseName']} {group_index + 1}"

                if not await self.create_group(group_name):
                    print(f"[SKIP] Pulando grupo {group_name} devido a erro na criação", flush=True)
                    continue

                for contact in leads + admins:
                    await self.search_and_add_contact(contact)

                await self.finalize_group_creation(group_name)
                await self.send_welcome_message(group_name)

                print(f"[DONE] Grupo {group_name} finalizado!", flush=True)
                await asyncio.sleep(3)

        except Exception as e:
            print(f"[ERROR] Falha no process_automation: {e}", flush=True)

    async def run(self):
        print("[RUN] Iniciando execução da automação...", flush=True)
        try:
            browser_started = await self.start_browser()
            if not browser_started:
                print("[FATAL] Navegador não iniciou. Encerrando...", flush=True)
                return

            await self.process_automation()

        except Exception as e:
            print(f"[ERROR] Erro geral no run(): {e}", flush=True)
        finally:
            try:
                if self.browser:
                    await self.browser.close()
                    print("[CLOSE] Navegador fechado.", flush=True)
                if self.playwright:
                    await self.playwright.stop()
                    print("[CLOSE] Playwright finalizado.", flush=True)
            except Exception as e:
                print(f"[ERROR] Falha ao fechar navegador: {e}", flush=True)

async def main():
    print("[MAIN] WhatsApp REAL Automation Tool Iniciado", flush=True)
    automation = WhatsAppRealAutomation()
    await automation.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("[EXIT] Automação interrompida pelo usuário", flush=True)
    except Exception as e:
        print(f"[FATAL] Erro fatal na execução: {e}", flush=True)
        input("Pressione Enter para sair...")
