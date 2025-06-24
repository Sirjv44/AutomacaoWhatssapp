import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, AlertTriangle, Users, Crown } from 'lucide-react';
import { Contact, ValidationResult } from '../types';

interface FileUploadProps {
  onFileUpload: (contacts: Contact[]) => void;
  onError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, onError }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateCSV = (text: string): Contact[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      throw new Error('Arquivo CSV vazio');
    }

    // Detecta se há cabeçalho
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('nome') || firstLine.includes('numero') || firstLine.includes('tipo');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const contacts: Contact[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    dataLines.forEach((line, index) => {
      const lineNumber = index + (hasHeader ? 2 : 1);
      
      // Processa CSV considerando vírgulas dentro de aspas
      const columns = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      const cleanColumns = columns.map(col => col.replace(/^"|"$/g, '').trim());

      if (cleanColumns.length < 2) {
        errors.push(`Linha ${lineNumber}: Formato inválido - mínimo 2 colunas necessárias (numero, tipo)`);
        return;
      }

      let nome: string | undefined;
      let numero: string;
      let tipo: string;

      // Detecta formato baseado no número de colunas
      if (cleanColumns.length === 2) {
        // Formato: numero, tipo
        [numero, tipo] = cleanColumns;
      } else if (cleanColumns.length >= 3) {
        // Formato: nome, numero, tipo
        [nome, numero, tipo] = cleanColumns;
        if (!nome || nome.trim() === '') {
          nome = undefined;
          warnings.push(`Linha ${lineNumber}: Nome vazio`);
        }
      } else {
        errors.push(`Linha ${lineNumber}: Número incorreto de colunas`);
        return;
      }

      // Valida número (obrigatório)
      if (!numero || numero.trim() === '') {
        errors.push(`Linha ${lineNumber}: Número é obrigatório`);
        return;
      }

      // Limpa e valida formato do número
      const cleanNumber = numero.replace(/[\s\-\(\)]/g, '');
      if (!/^\+?[\d]{10,15}$/.test(cleanNumber)) {
        errors.push(`Linha ${lineNumber}: Número inválido "${numero}" - use formato +5511999999999`);
        return;
      }

      // Valida tipo (obrigatório)
      if (!tipo || !['lead', 'administrador', 'admin'].includes(tipo.toLowerCase().trim())) {
        errors.push(`Linha ${lineNumber}: Tipo inválido "${tipo}" - use "lead" ou "administrador"`);
        return;
      }

      // Normaliza tipo
      const normalizedTipo = tipo.toLowerCase().trim() === 'admin' ? 'administrador' : tipo.toLowerCase().trim() as 'lead' | 'administrador';

      contacts.push({
        nome: nome?.trim() || undefined,
        numero: cleanNumber.startsWith('+') ? cleanNumber : `+55${cleanNumber}`,
        tipo: normalizedTipo
      });
    });

    setValidationResult({
      valid: contacts.length,
      invalid: errors.length,
      errors: errors.slice(0, 10), // Mostra apenas os primeiros 10 erros
      warnings: warnings.slice(0, 5) // Mostra apenas os primeiros 5 avisos
    });

    if (errors.length > 0 && contacts.length === 0) {
      throw new Error(`Nenhum contato válido encontrado.\n\nPrimeiros erros:\n${errors.slice(0, 3).join('\n')}`);
    }

    return contacts;
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('Por favor, selecione um arquivo CSV válido');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const text = await file.text();
      const contacts = validateCSV(text);
      onFileUpload(contacts);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao processar arquivo');
    } finally {
      setIsValidating(false);
    }
  }, [onFileUpload, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="space-y-6">
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 scale-105'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${isValidating ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {isValidating ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600 font-medium">Validando arquivo...</p>
            <p className="text-xs text-gray-500">Processando milhares de contatos...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Upload className="mx-auto h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Arraste o arquivo CSV aqui
            </h3>
            <p className="text-gray-500 mb-2">
              ou clique para selecionar do seu computador
            </p>
            <p className="text-sm text-blue-600 font-medium mb-6">
              ⚡ Suporte para milhares de contatos
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl">
              Selecionar Arquivo CSV
            </button>
          </>
        )}
      </div>

      {validationResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Resultado da Validação</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-bold text-xl text-green-900">{validationResult.valid.toLocaleString()}</p>
                <p className="text-sm text-green-700">Contatos válidos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-bold text-xl text-blue-900">
                  {Math.ceil(validationResult.valid / 999)}
                </p>
                <p className="text-sm text-blue-700">Grupos estimados</p>
              </div>
            </div>
            
            {validationResult.invalid > 0 && (
              <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-bold text-xl text-red-900">{validationResult.invalid}</p>
                  <p className="text-sm text-red-700">Erros encontrados</p>
                </div>
              </div>
            )}
          </div>

          {validationResult.warnings.length > 0 && (
            <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h4 className="font-medium text-amber-900">Avisos:</h4>
              </div>
              <ul className="text-sm text-amber-800 space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index} className="flex items-start space-x-1">
                    <span>•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {validationResult.errors.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <h4 className="font-medium text-red-900">Erros encontrados:</h4>
              </div>
              <ul className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                {validationResult.errors.map((error, index) => (
                  <li key={index} className="flex items-start space-x-1">
                    <span>•</span>
                    <span>{error}</span>
                  </li>
                ))}
                {validationResult.invalid > validationResult.errors.length && (
                  <li className="text-red-600 font-medium">
                    ... e mais {validationResult.invalid - validationResult.errors.length} erros
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Formato do Arquivo CSV para Automação em Massa</span>
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-blue-800">
            O arquivo deve conter as seguintes colunas para processar milhares de contatos:
          </p>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">nome</span>
                <p className="text-gray-600">(opcional)</p>
              </div>
              <div>
                <span className="font-medium text-gray-900">numero</span>
                <p className="text-red-600">(obrigatório)</p>
              </div>
              <div>
                <span className="font-medium text-gray-900">tipo</span>
                <p className="text-red-600">(lead ou administrador)</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Exemplo para automação em massa:</p>
            <pre className="text-green-400 text-xs font-mono">
{`nome,numero,tipo
João Silva,+5511999999999,lead
,+5511888888888,administrador
Maria Santos,5511777777777,lead
Pedro Admin,+5511666666666,administrador
,+5511555555555,lead
Ana Costa,5511444444444,lead`}
            </pre>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Leads</span>
              </div>
              <p className="text-xs text-green-700">
                Serão distribuídos em grupos de até 999 membros cada
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Crown className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-800">Administradores</span>
              </div>
              <p className="text-xs text-purple-700">
                Serão adicionados e promovidos em todos os grupos
              </p>
            </div>
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• <strong>Automação em massa:</strong> Suporte para dezenas de milhares de contatos</p>
            <p>• <strong>Grupos automáticos:</strong> Criação sequencial (Grupo VIP 1, 2, 3...)</p>
            <p>• <strong>Limite por grupo:</strong> Máximo 999 membros por grupo</p>
            <p>• <strong>Administradores globais:</strong> Promovidos em todos os grupos criados</p>
          </div>
        </div>
      </div>
    </div>
  );
};