import React, { useState } from 'react';
import { Code, Download, Copy, Check, Terminal, Zap, AlertTriangle } from 'lucide-react';
import { Contact, GroupConfig, AdvancedAutomationStats } from '../types';
import { apiService } from '../services/api';

interface AdvancedPythonGeneratorProps {
  contacts: Contact[];
  config: GroupConfig;
  stats: AdvancedAutomationStats;
}

export const AdvancedPythonGenerator: React.FC<AdvancedPythonGeneratorProps> = ({
  contacts,
  config,
  stats,
}) => {
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndDownloadPython = async () => {
    try {
      setIsGenerating(true);
      const result = await apiService.generatePythonCode(config);
      
      // Download do arquivo
      const blob = new Blob([result.code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Erro ao gerar código Python:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const result = await apiService.generatePythonCode(config);
      await navigator.clipboard.writeText(result.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
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
          <span>Gerador de Código Python Avançado</span>
        </h2>
        
        <div className="flex space-x-3">
          <button
            onClick={copyToClipboard}
            disabled={isGenerating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 text-sm transition-all duration-200"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar'}</span>
          </button>
          
          <button
            onClick={generateAndDownloadPython}
            disabled={isGenerating}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 text-sm transition-all duration-200"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isGenerating ? 'Gerando...' : 'Download Python'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-center space-x-2 mb-3">
            <Terminal className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Instruções de Uso</h3>
          </div>
          <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
            <li>Clique em "Download Python" para baixar o script</li>
            <li>Instale as dependências: <code className="bg-blue-100 px-2 py-1 rounded text-xs">pip install playwright pandas</code></li>
            <li>Instale o navegador: <code className="bg-blue-100 px-2 py-1 rounded text-xs">playwright install chromium</code></li>
            <li>Execute: <code className="bg-blue-100 px-2 py-1 rounded text-xs">python whatsapp_automation.py</code></li>
          </ol>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Configuração Atual</h3>
          </div>
          <div className="text-sm text-green-800 space-y-1">
            <p>• <strong>Nome base:</strong> {config.baseName}</p>
            <p>• <strong>Total de contatos:</strong> {stats.totalContacts.toLocaleString()}</p>
            <p>• <strong>Grupos estimados:</strong> {stats.estimatedGroups}</p>
            <p>• <strong>Tempo estimado:</strong> {stats.estimatedTime}</p>
            <p>• <strong>Proteção anti-ban:</strong> {config.enableBanPrevention ? 'Ativada' : 'Desativada'}</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800 mb-2">⚠️ Importante:</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• O código Python será gerado com suas configurações atuais</li>
              <li>• Todos os {stats.totalContacts.toLocaleString()} contatos serão incluídos no script</li>
              <li>• Execute o script em um ambiente com Python 3.8+ instalado</li>
              <li>• Use com responsabilidade e respeite os termos do WhatsApp</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};