#!/usr/bin/env python3
"""
Backend Flask para WhatsApp Advanced Automation Suite
API REST para integração com o frontend React
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import csv
import asyncio
import threading
import time
from datetime import datetime
import subprocess
import sys
from pathlib import Path

app = Flask(__name__)
CORS(app)  # Permite requisições do frontend React

# Diretórios
UPLOAD_FOLDER = 'uploads'
REPORTS_FOLDER = 'reports'
LOGS_FOLDER = 'logs'

# Cria diretórios se não existirem
for folder in [UPLOAD_FOLDER, REPORTS_FOLDER, LOGS_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Estado global da aplicação
app_state = {
    'automation_running': False,
    'extraction_running': False,
    'current_contacts': [],
    'automation_status': {
        'isRunning': False,
        'isPaused': False,
        'currentStep': '',
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
    'extraction_status': {
        'isRunning': False,
        'currentStep': '',
        'progress': 0,
        'totalGroups': 0,
        'processedGroups': 0,
        'currentGroup': '',
        'logs': [],
        'estimatedTimeRemaining': '',
        'extractedContacts': [],
        'uniqueContacts': 0,
        'duplicatesFound': 0,
    }
}

def validate_csv_content(content):
    """Valida o conteúdo do CSV"""
    try:
        lines = content.strip().split('\n')
        if len(lines) < 2:
            return False, "CSV deve ter pelo menos um cabeçalho e uma linha de dados"
        
        # Verifica cabeçalho
        header = lines[0].lower()
        required_fields = ['numero', 'tipo']
        for field in required_fields:
            if field not in header:
                return False, f"Campo obrigatório '{field}' não encontrado no cabeçalho"
        
        # Valida algumas linhas de dados
        valid_contacts = 0
        for i, line in enumerate(lines[1:6], 2):  # Valida até 5 linhas
            if not line.strip():
                continue
                
            parts = line.split(',')
            if len(parts) < 2:
                return False, f"Linha {i}: Formato inválido - mínimo 2 colunas necessárias"
            
            # Valida número (último campo obrigatório)
            numero = parts[-2] if len(parts) >= 3 else parts[0]
            if not numero.strip():
                return False, f"Linha {i}: Número é obrigatório"
            
            # Valida tipo
            tipo = parts[-1].strip().lower()
            if tipo not in ['lead', 'administrador', 'admin']:
                return False, f"Linha {i}: Tipo inválido '{tipo}' - use 'lead' ou 'administrador'"
            
            valid_contacts += 1
        
        if valid_contacts == 0:
            return False, "Nenhum contato válido encontrado"
        
        return True, f"CSV válido com {len(lines)-1} linhas de dados"
        
    except Exception as e:
        return False, f"Erro ao validar CSV: {str(e)}"

def process_csv_file(file_path):
    """Processa arquivo CSV e retorna lista de contatos"""
    try:
        contacts = []
        with open(file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            for row_num, row in enumerate(csv_reader, 2):
                # Extrai campos
                nome = row.get('nome', '').strip() or None
                numero = row.get('numero', '').strip()
                tipo = row.get('tipo', '').strip().lower()
                
                # Valida número
                if not numero:
                    continue
                
                # Limpa e formata número
                numero_clean = numero.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
                if not numero_clean.startswith('55') and len(numero_clean) >= 10:
                    numero_clean = f"55{numero_clean}"
                
                # Normaliza tipo
                if tipo == 'admin':
                    tipo = 'administrador'
                
                if tipo in ['lead', 'administrador']:
                    contacts.append({
                        'nome': nome,
                        'numero': numero_clean,
                        'tipo': tipo
                    })
        
        return contacts
        
    except Exception as e:
        raise Exception(f"Erro ao processar CSV: {str(e)}")

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
    """Endpoint para upload e validação de arquivo CSV"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
        
        if not file.filename.lower().endswith('.csv'):
            return jsonify({'error': 'Arquivo deve ser um CSV'}), 400
        
        # Salva arquivo temporariamente
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"contacts_{timestamp}.csv"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        # Valida conteúdo
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        is_valid, message = validate_csv_content(content)
        if not is_valid:
            os.remove(file_path)
            return jsonify({'error': message}), 400
        
        # Processa contatos
        contacts = process_csv_file(file_path)
        app_state['current_contacts'] = contacts
        
        # Calcula estatísticas
        leads = [c for c in contacts if c['tipo'] == 'lead']
        admins = [c for c in contacts if c['tipo'] == 'administrador']
        estimated_groups = (len(leads) + 998) // 999  # Arredonda para cima
        
        return jsonify({
            'success': True,
            'message': f'CSV processado com sucesso',
            'filename': filename,
            'stats': {
                'totalContacts': len(contacts),
                'totalLeads': len(leads),
                'totalAdmins': len(admins),
                'estimatedGroups': estimated_groups,
                'validationMessage': message
            },
            'contacts': contacts[:10]  # Retorna apenas os primeiros 10 para preview
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/automation/start', methods=['POST'])
def start_automation():
    """Inicia a automação de grupos"""
    try:
        if app_state['automation_running']:
            return jsonify({'error': 'Automação já está em execução'}), 400
        
        if not app_state['current_contacts']:
            return jsonify({'error': 'Nenhum contato carregado'}), 400
        
        data = request.get_json()
        config = data.get('config', {})
        
        # Atualiza estado
        app_state['automation_running'] = True
        app_state['automation_status'].update({
            'isRunning': True,
            'isPaused': False,
            'currentStep': 'Iniciando automação...',
            'progress': 0,
            'totalContacts': len(app_state['current_contacts']),
            'processedContacts': 0,
            'currentGroup': '',
            'currentGroupIndex': 0,
            'totalGroups': (len([c for c in app_state['current_contacts'] if c['tipo'] == 'lead']) + 998) // 999,
            'logs': ['🚀 Automação iniciada via API'],
            'estimatedTimeRemaining': '5 min',
            'canResume': False,
            'sessionPersisted': False,
            'connectionStatus': 'connecting',
            'currentSessionId': f"api-session-{int(time.time())}",
            'groupsInCurrentSession': 0,
        })
        
        # Inicia automação em thread separada
        def run_automation():
            try:
                # Simula progresso da automação
                for i in range(101):
                    if not app_state['automation_running']:
                        break
                    
                    time.sleep(0.5)  # Simula processamento
                    
                    app_state['automation_status'].update({
                        'progress': i,
                        'processedContacts': int((i / 100) * app_state['automation_status']['totalContacts']),
                        'currentStep': f'Processando contatos... {i}%',
                        'estimatedTimeRemaining': f'{(100-i)//10} min' if i < 100 else '0 min'
                    })
                    
                    if i == 20:
                        app_state['automation_status']['connectionStatus'] = 'connected'
                        app_state['automation_status']['logs'].append('✅ Conectado ao WhatsApp Web')
                    elif i == 40:
                        app_state['automation_status']['logs'].append('👥 Criando primeiro grupo')
                    elif i == 60:
                        app_state['automation_status']['logs'].append('👑 Promovendo administradores')
                    elif i == 80:
                        app_state['automation_status']['logs'].append('💬 Enviando mensagens de boas-vindas')
                
                # Finaliza automação
                app_state['automation_running'] = False
                app_state['automation_status'].update({
                    'isRunning': False,
                    'currentStep': 'Automação concluída com sucesso!',
                    'sessionPersisted': True,
                    'canResume': False
                })
                app_state['automation_status']['logs'].append('✅ Automação concluída')
                
            except Exception as e:
                app_state['automation_running'] = False
                app_state['automation_status'].update({
                    'isRunning': False,
                    'currentStep': f'Erro na automação: {str(e)}'
                })
                app_state['automation_status']['logs'].append(f'❌ Erro: {str(e)}')
        
        thread = threading.Thread(target=run_automation)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Automação iniciada com sucesso',
            'sessionId': app_state['automation_status']['currentSessionId']
        })
        
    except Exception as e:
        app_state['automation_running'] = False
        return jsonify({'error': str(e)}), 500

@app.route('/api/automation/stop', methods=['POST'])
def stop_automation():
    """Para a automação de grupos"""
    try:
        app_state['automation_running'] = False
        app_state['automation_status'].update({
            'isRunning': False,
            'isPaused': False,
            'currentStep': 'Automação interrompida pelo usuário',
            'canResume': True
        })
        app_state['automation_status']['logs'].append('⏹️ Automação interrompida')
        
        return jsonify({
            'success': True,
            'message': 'Automação interrompida com sucesso'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/automation/pause', methods=['POST'])
def pause_automation():
    """Pausa a automação de grupos"""
    try:
        app_state['automation_running'] = False
        app_state['automation_status'].update({
            'isRunning': False,
            'isPaused': True,
            'currentStep': 'Automação pausada',
            'canResume': True
        })
        app_state['automation_status']['logs'].append('⏸️ Automação pausada')
        
        return jsonify({
            'success': True,
            'message': 'Automação pausada com sucesso'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/automation/resume', methods=['POST'])
def resume_automation():
    """Retoma a automação de grupos"""
    try:
        if app_state['automation_running']:
            return jsonify({'error': 'Automação já está em execução'}), 400
        
        app_state['automation_running'] = True
        app_state['automation_status'].update({
            'isRunning': True,
            'isPaused': False,
            'currentStep': 'Retomando automação...',
            'canResume': False
        })
        app_state['automation_status']['logs'].append('▶️ Automação retomada')
        
        return jsonify({
            'success': True,
            'message': 'Automação retomada com sucesso'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/automation/status', methods=['GET'])
def get_automation_status():
    """Retorna o status atual da automação"""
    return jsonify(app_state['automation_status'])

@app.route('/api/extraction/start', methods=['POST'])
def start_extraction():
    """Inicia a extração de contatos"""
    try:
        if app_state['extraction_running']:
            return jsonify({'error': 'Extração já está em execução'}), 400
        
        data = request.get_json()
        config = data.get('config', {})
        
        # Atualiza estado
        app_state['extraction_running'] = True
        app_state['extraction_status'].update({
            'isRunning': True,
            'currentStep': 'Iniciando extração...',
            'progress': 0,
            'totalGroups': 25,  # Simulado
            'processedGroups': 0,
            'currentGroup': '',
            'logs': ['🔍 Extração iniciada via API'],
            'estimatedTimeRemaining': '3 min',
            'extractedContacts': [],
            'uniqueContacts': 0,
            'duplicatesFound': 0,
        })
        
        # Inicia extração em thread separada
        def run_extraction():
            try:
                # Simula progresso da extração
                for i in range(101):
                    if not app_state['extraction_running']:
                        break
                    
                    time.sleep(0.3)  # Simula processamento
                    
                    app_state['extraction_status'].update({
                        'progress': i,
                        'processedGroups': int((i / 100) * 25),
                        'currentStep': f'Extraindo contatos... {i}%',
                        'estimatedTimeRemaining': f'{(100-i)//20} min' if i < 100 else '0 min'
                    })
                    
                    if i == 30:
                        app_state['extraction_status']['logs'].append('📱 Conectado ao WhatsApp Web')
                    elif i == 50:
                        app_state['extraction_status']['logs'].append('👥 Extraindo do Grupo VIP 1')
                    elif i == 70:
                        app_state['extraction_status']['logs'].append('🔍 Removendo duplicatas')
                
                # Simula contatos extraídos
                extracted_contacts = [
                    {'nome': 'João Silva', 'numero': '5562999999999', 'grupo': 'Grupo VIP 1', 'isAdmin': False},
                    {'nome': 'Maria Santos', 'numero': '5562888888888', 'grupo': 'Grupo VIP 1', 'isAdmin': True},
                    {'nome': 'Pedro Costa', 'numero': '5562777777777', 'grupo': 'Grupo VIP 2', 'isAdmin': False},
                ]
                
                # Finaliza extração
                app_state['extraction_running'] = False
                app_state['extraction_status'].update({
                    'isRunning': False,
                    'currentStep': 'Extração concluída com sucesso!',
                    'extractedContacts': extracted_contacts,
                    'uniqueContacts': len(extracted_contacts),
                    'duplicatesFound': 0
                })
                app_state['extraction_status']['logs'].append('✅ Extração concluída')
                
            except Exception as e:
                app_state['extraction_running'] = False
                app_state['extraction_status'].update({
                    'isRunning': False,
                    'currentStep': f'Erro na extração: {str(e)}'
                })
                app_state['extraction_status']['logs'].append(f'❌ Erro: {str(e)}')
        
        thread = threading.Thread(target=run_extraction)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Extração iniciada com sucesso'
        })
        
    except Exception as e:
        app_state['extraction_running'] = False
        return jsonify({'error': str(e)}), 500

@app.route('/api/extraction/stop', methods=['POST'])
def stop_extraction():
    """Para a extração de contatos"""
    try:
        app_state['extraction_running'] = False
        app_state['extraction_status'].update({
            'isRunning': False,
            'currentStep': 'Extração interrompida pelo usuário'
        })
        app_state['extraction_status']['logs'].append('⏹️ Extração interrompida')
        
        return jsonify({
            'success': True,
            'message': 'Extração interrompida com sucesso'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/extraction/status', methods=['GET'])
def get_extraction_status():
    """Retorna o status atual da extração"""
    return jsonify(app_state['extraction_status'])

@app.route('/api/download/report', methods=['GET'])
def download_report():
    """Gera e baixa relatório CSV"""
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'relatorio_whatsapp_{timestamp}.csv'
        file_path = os.path.join(REPORTS_FOLDER, filename)
        
        # Gera CSV de exemplo
        with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['grupo', 'nome', 'numero', 'tipo', 'status', 'erro', 'timestamp']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            
            # Dados de exemplo baseados nos contatos carregados
            for i, contact in enumerate(app_state['current_contacts'][:10]):
                writer.writerow({
                    'grupo': f"Grupo VIP {(i//5)+1}",
                    'nome': contact.get('nome', ''),
                    'numero': contact['numero'],
                    'tipo': contact['tipo'],
                    'status': 'Adicionado',
                    'erro': '',
                    'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                })
        
        return send_file(file_path, as_attachment=True, download_name=filename)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/contacts', methods=['GET'])
def download_contacts():
    """Baixa contatos extraídos"""
    try:
        format_type = request.args.get('format', 'csv')
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if format_type == 'csv':
            filename = f'contatos_extraidos_{timestamp}.csv'
            file_path = os.path.join(REPORTS_FOLDER, filename)
            
            with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
                fieldnames = ['nome', 'numero', 'grupo', 'is_admin', 'extracted_at']
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                
                writer.writeheader()
                
                for contact in app_state['extraction_status']['extractedContacts']:
                    writer.writerow({
                        'nome': contact.get('nome', ''),
                        'numero': contact['numero'],
                        'grupo': contact['grupo'],
                        'is_admin': 'Sim' if contact.get('isAdmin', False) else 'Não',
                        'extracted_at': datetime.now().isoformat()
                    })
            
            return send_file(file_path, as_attachment=True, download_name=filename)
        
        elif format_type == 'json':
            filename = f'contatos_extraidos_{timestamp}.json'
            file_path = os.path.join(REPORTS_FOLDER, filename)
            
            data = {
                'extraction_info': {
                    'timestamp': datetime.now().isoformat(),
                    'total_contacts': len(app_state['extraction_status']['extractedContacts'])
                },
                'contacts': app_state['extraction_status']['extractedContacts']
            }
            
            with open(file_path, 'w', encoding='utf-8') as jsonfile:
                json.dump(data, jsonfile, ensure_ascii=False, indent=2)
            
            return send_file(file_path, as_attachment=True, download_name=filename)
        
        else:
            return jsonify({'error': 'Formato inválido'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/python/generate', methods=['POST'])
def generate_python_code():
    """Gera código Python personalizado"""
    try:
        data = request.get_json()
        config = data.get('config', {})
        contacts = app_state['current_contacts']
        
        if not contacts:
            return jsonify({'error': 'Nenhum contato carregado'}), 400
        
        # Gera código Python baseado na configuração
        python_code = f'''#!/usr/bin/env python3
"""
Código Python gerado automaticamente pela interface web
WhatsApp Advanced Automation Tool
"""

import asyncio
import json
from datetime import datetime

# Configuração gerada automaticamente
config = {json.dumps(config, indent=2, ensure_ascii=False)}

# Contatos carregados ({len(contacts)} total)
contacts = {json.dumps(contacts[:5], indent=2, ensure_ascii=False)}  # Primeiros 5 contatos

async def main():
    print("🤖 Código Python gerado pela interface web")
    print(f"📊 {{len(contacts)}} contatos carregados")
    print(f"📋 Configuração: {{config.get('baseName', 'Grupo VIP')}}")
    
    # Aqui você pode adicionar sua lógica de automação
    # Este é apenas um exemplo gerado pela interface
    
    print("✅ Execute o script completo para automação real")

if __name__ == "__main__":
    asyncio.run(main())
'''
        
        return jsonify({
            'success': True,
            'code': python_code,
            'filename': f'whatsapp_automation_generated_{int(time.time())}.py'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Iniciando WhatsApp Automation API")
    print("📡 Frontend React pode se conectar em: http://localhost:5000")
    print("📋 Endpoints disponíveis:")
    print("   - POST /api/upload-csv")
    print("   - POST /api/automation/start")
    print("   - GET  /api/automation/status")
    print("   - POST /api/extraction/start")
    print("   - GET  /api/extraction/status")
    print("="*50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)