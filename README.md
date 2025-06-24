# WhatsApp Advanced Automation Suite

Ferramenta completa para automação do WhatsApp Web com proteção anti-banimento e extração de contatos.

## 🚀 Recursos

### Automação de Grupos
- ✅ Criação automática de múltiplos grupos
- ✅ Processamento de milhares de contatos
- ✅ Proteção anti-banimento com delays inteligentes
- ✅ Controle de sessão e retomada automática
- ✅ Backup contínuo do progresso
- ✅ Mensagens de boas-vindas automáticas
- ✅ Promoção automática de administradores
- ✅ Relatórios detalhados em CSV e JSON

### Extração de Contatos
- ✅ Extração de contatos de todos os grupos
- ✅ Identificação de administradores
- ✅ Remoção de duplicatas
- ✅ Filtros por nome de grupo
- ✅ Exportação em CSV e JSON

## 📋 Requisitos

- Python 3.8+
- Windows, macOS ou Linux
- Conexão com internet estável

## 🔧 Instalação

### Método 1: Instalação Automática
```bash
python install_dependencies.py
```

### Método 2: Instalação Manual
```bash
# Instalar dependências
pip install playwright pandas

# Instalar navegadores
playwright install chromium
```

## 📊 Formato do CSV

Crie um arquivo CSV com as seguintes colunas:

```csv
nome,numero,tipo
João Silva,5562999999999,lead
Maria Santos,5562888888888,administrador
Pedro Costa,5562777777777,lead
Ana Lima,5562666666666,lead
Carlos Admin,5562555555555,administrador
```

### Regras:
- **nome**: Opcional, pode estar vazio
- **numero**: Obrigatório, com DDI (55 para Brasil)
- **tipo**: "lead" ou "administrador"

## 🤖 Como Usar

### Automação de Grupos
```bash
python whatsapp_advanced_automation.py
```

1. Execute o script
2. Informe o caminho do arquivo CSV
3. Configure as opções (nome dos grupos, proteção anti-ban, etc.)
4. Escaneie o QR Code no navegador que abrir
5. Aguarde a automação processar todos os contatos

### Extração de Contatos
```bash
python whatsapp_contact_extractor.py
```

1. Execute o script
2. Configure filtros opcionais
3. Escaneie o QR Code
4. Aguarde a extração de todos os grupos

## 🛡️ Proteção Anti-Banimento

### Recursos de Segurança:
- **Delays inteligentes**: 30-90 segundos entre grupos
- **Controle de sessão**: Máximo 10 grupos por sessão
- **Detecção de desconexão**: Monitoramento automático
- **Backup contínuo**: Progresso salvo automaticamente
- **Retomada inteligente**: Continue de onde parou

### Configurações Recomendadas:
- Máximo 10 grupos por sessão
- Pausa de 20 minutos entre sessões
- Use em horários de menor movimento
- Teste com poucos contatos primeiro

## 📄 Relatórios Gerados

### Automação de Grupos:
- `relatorio_advanced_whatsapp_YYYYMMDD_HHMMSS.csv`
- `resumo_advanced_whatsapp_YYYYMMDD_HHMMSS.txt`
- `backup_session_YYYYMMDD_HHMMSS.json`

### Extração de Contatos:
- `contatos_extraidos_YYYYMMDD_HHMMSS.csv`
- `contatos_extraidos_YYYYMMDD_HHMMSS.json`

## 🔄 Retomada de Automação

Se a automação for interrompida:

1. Execute novamente o script
2. Quando perguntado, escolha "s" para retomar
3. Faça login novamente se necessário
4. A automação continuará de onde parou

## ⚠️ Avisos Importantes

### Uso Responsável:
- ✅ Use apenas com contatos que consentiram
- ✅ Respeite os termos de uso do WhatsApp
- ✅ Não envie spam ou conteúdo inadequado
- ✅ Teste com poucos contatos primeiro
- ✅ Use em horários apropriados

### Limitações:
- Máximo 999 membros por grupo (limite do WhatsApp)
- Dependente da estabilidade da conexão
- Pode ser afetado por atualizações do WhatsApp Web

## 🐛 Solução de Problemas

### Erro: "Navegador não abre"
```bash
playwright install chromium
```

### Erro: "QR Code não aparece"
- Verifique sua conexão com internet
- Tente fechar outros navegadores
- Reinicie o script

### Erro: "Contatos não encontrados"
- Verifique o formato do CSV
- Certifique-se que os números têm DDI
- Verifique se os contatos estão salvos no WhatsApp

### Automação para ou trava
- Verifique os logs no arquivo `.log`
- Use a função de retomada
- Reduza o número de grupos por sessão

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique os logs gerados
2. Consulte este README
3. Teste com configurações mais conservadoras
4. Use a proteção anti-ban

## 📜 Licença

Este projeto é fornecido "como está" para fins educacionais e de automação pessoal. Use com responsabilidade e respeite os termos de serviço do WhatsApp.

---

**⚠️ IMPORTANTE**: Esta ferramenta é para uso pessoal e educacional. O uso inadequado pode resultar em banimento da sua conta do WhatsApp. Use com responsabilidade!