# 🔗 Integração Frontend + Backend

## WhatsApp Advanced Automation Suite
**Integração completa React + Python**

### 🏗️ Arquitetura

```
📁 Projeto/
├── 📁 src/                    # Frontend React + TypeScript
│   ├── 📁 components/         # Componentes React
│   ├── 📁 services/           # API Service (comunicação com backend)
│   ├── 📁 hooks/              # React Hooks customizados
│   └── App.tsx                # Aplicação principal
├── 📁 backend/                # Backend Python + Flask
│   ├── app.py                 # API REST Flask
│   ├── requirements.txt       # Dependências Python
│   └── start_backend.py       # Script para iniciar backend
└── start_full_application.py  # Inicia aplicação completa
```

### 🚀 Como Executar

#### Método 1: Aplicação Completa (Recomendado)
```bash
python start_full_application.py
```

#### Método 2: Separadamente

**Backend:**
```bash
cd backend
python start_backend.py
```

**Frontend:**
```bash
npm run dev
```

### 🔌 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/health` | Verifica status da API |
| POST | `/api/upload-csv` | Upload e validação de CSV |
| POST | `/api/automation/start` | Inicia automação |
| POST | `/api/automation/stop` | Para automação |
| POST | `/api/automation/pause` | Pausa automação |
| POST | `/api/automation/resume` | Retoma automação |
| GET | `/api/automation/status` | Status da automação |
| POST | `/api/extraction/start` | Inicia extração |
| POST | `/api/extraction/stop` | Para extração |
| GET | `/api/extraction/status` | Status da extração |
| GET | `/api/download/report` | Download relatório |
| GET | `/api/download/contacts` | Download contatos |

### 🔄 Fluxo de Funcionamento

1. **Upload de CSV:**
   - Frontend envia arquivo via FormData
   - Backend valida e processa CSV
   - Retorna estatísticas e contatos válidos

2. **Automação:**
   - Frontend envia configuração via JSON
   - Backend inicia processamento assíncrono
   - Status atualizado em tempo real via polling

3. **Monitoramento:**
   - Frontend consulta status a cada 2 segundos
   - Backend mantém estado global da aplicação
   - Logs e progresso atualizados automaticamente

### 🛡️ Recursos de Segurança

- **CORS habilitado** para comunicação frontend-backend
- **Validação de dados** no backend Python
- **Tratamento de erros** robusto
- **Consentimento LGPD** obrigatório
- **Proteção anti-ban** integrada

### 📊 Monitoramento em Tempo Real

- ✅ Status da conexão API
- ✅ Progresso da automação
- ✅ Logs em tempo real
- ✅ Estatísticas atualizadas
- ✅ Download de relatórios

### 🔧 Configuração

**Backend (Flask):**
- Porta: 5000
- Host: localhost
- CORS: Habilitado para todas as origens
- Protocolo: HTTP (para desenvolvimento local)

**Frontend (Vite):**
- Porta: 5173
- API Base URL: http://localhost:5000/api

### 📝 Exemplo de Uso

```typescript
// Frontend - Upload de CSV
const file = new File([csvContent], 'contatos.csv');
const result = await apiService.uploadCSV(file);

// Frontend - Iniciar automação
await apiService.startAutomation({
  baseName: 'Grupo VIP',
  enableBanPrevention: true,
  maxGroupsPerSession: 10
});

// Frontend - Monitorar status
const status = await apiService.getAutomationStatus();
```

### 🐛 Solução de Problemas

**Backend não conecta:**
```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Frontend não carrega:**
```bash
npm install
npm run dev
```

**CORS Error:**
- Verifique se backend está rodando na porta 5000
- Confirme que CORS está habilitado no Flask

### 📦 Dependências

**Backend:**
- Flask 2.3.0+
- Flask-CORS 4.0.0+
- Pandas 2.0.0+
- Playwright 1.40.0+

**Frontend:**
- React 18.3.1+
- TypeScript 5.5.3+
- Vite 5.4.2+
- Tailwind CSS 3.4.1+

---

**🎉 Agora você tem uma integração completa Frontend + Backend funcionando!**