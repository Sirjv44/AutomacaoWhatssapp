import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, AlertTriangle, Users, Crown, Shield, X } from 'lucide-react';
import { apiService, UploadResponse } from '../services/api';
import Papa from 'papaparse';


interface IntegratedFileUploadProps {
  onFileUpload: (stats: UploadResponse['stats']) => void;
  onError: (error: string) => void;
  lgpdConsent: boolean;
  manualAdmins: Contact[]; // novo
}

export interface Contact {
  nome?: string;
  numero: string;
  tipo: 'lead' | 'administrador';
}

export const IntegratedFileUpload: React.FC<IntegratedFileUploadProps> = ({
  onFileUpload,
  onError,
  lgpdConsent,
  manualAdmins // ← aqui
}) => {

  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const processFile = useCallback(async (file: File) => {
  console.log('📁 Processando arquivo:', file.name);

  if (!lgpdConsent) {
    onError('É necessário aceitar os termos LGPD antes de fazer upload de contatos');
    return;
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    onError('Por favor, selecione um arquivo CSV válido');
    setSelectedFile(null);
    return;
  }

  setSelectedFile(file);
  setIsUploading(true);
  setUploadResult(null);

  try {
    console.log('🔄 Lendo CSV local...');
    const csvText = await file.text();

    // Parse o CSV original
    const parsed = Papa.parse<Contact>(csvText, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      throw new Error('Erro ao ler o arquivo CSV');
    }

    const originalContacts = parsed.data.filter((c) => c.numero); // ignora contatos vazios

    console.log(`📊 CSV original tem ${originalContacts.length} contatos`);
    console.log('➕ Adicionando administradores manuais:', manualAdmins);

    // Junta os contatos do CSV com os admins da tela
    const allContacts: Contact[] = [...originalContacts, ...manualAdmins];

    // Converte de volta para CSV
    const mergedCSV = Papa.unparse(allContacts, {
      columns: ['nome', 'numero', 'tipo'],
    });

    // Cria um novo arquivo para enviar
    const mergedFile = new File([mergedCSV], `merged_${file.name}`, {
      type: 'text/csv',
    });

    console.log('📤 Enviando arquivo modificado para o backend...');
    const result = await apiService.uploadCSV(mergedFile);
    console.log('✅ Resultado do backend:', result);

    setUploadResult(result);
    onFileUpload(result.stats);
    onError('');

  } catch (error) {
    console.error('❌ Erro no upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar arquivo';
    onError(errorMessage);
    setSelectedFile(null);
    setUploadResult(null);
  } finally {
    setIsUploading(false);
  }
}, [onFileUpload, onError, lgpdConsent, manualAdmins]);



  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!lgpdConsent || isUploading) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile, lgpdConsent, isUploading]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (lgpdConsent && !isUploading) {
      setIsDragOver(true);
    }
  }, [lgpdConsent, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    if (lgpdConsent && !isUploading) {
      document.getElementById('csv-file-input')?.click();
    }
  }, [lgpdConsent, isUploading]);

  const removeFile = useCallback(() => {
    console.log('🗑️ Removendo arquivo e limpando estado');
    setSelectedFile(null);
    setUploadResult(null);
    
    // Reset the input
    const input = document.getElementById('csv-file-input') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
    
    // Limpa o estado da aplicação principal
    onError('');
  }, [onError]);

  return (
    <div className="space-y-6">
      {!lgpdConsent && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-red-600" />
            <div>
              <h3 className="font-medium text-red-800">Consentimento LGPD Necessário</h3>
              <p className="text-red-700 mt-1">
                É necessário aceitar os termos de proteção de dados antes de fazer upload de contatos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result Success */}
      {uploadResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">✅ Arquivo processado com sucesso!</p>
                <p className="text-sm text-green-700">
                  {uploadResult.stats.totalContacts} contatos carregados • {uploadResult.stats.estimatedGroups} grupos estimados
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-green-100 rounded-full transition-colors"
              title="Carregar outro arquivo"
            >
              <X className="h-4 w-4 text-green-600" />
            </button>
          </div>
        </div>
      )}

      {/* Arquivo Selecionado (mas não processado ainda) */}
      {selectedFile && !uploadResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">{selectedFile.name}</p>
                <p className="text-sm text-blue-700">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-1 hover:bg-blue-100 rounded-full transition-colors"
              title="Remover arquivo"
            >
              <X className="h-4 w-4 text-blue-600" />
            </button>
          </div>
          {isUploading && (
            <div className="mt-3 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">Processando arquivo...</span>
            </div>
          )}
        </div>
      )}

      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
          isDragOver
            ? 'border-blue-400 bg-blue-50 scale-105'
            : lgpdConsent && !isUploading
              ? 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600 font-medium">Enviando e validando arquivo...</p>
            <p className="text-xs text-gray-500">Processando contatos com validação LGPD...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Upload className={`mx-auto h-16 w-16 ${lgpdConsent ? 'text-gray-400' : 'text-gray-300'}`} />
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${lgpdConsent ? 'text-gray-900' : 'text-gray-500'}`}>
              {uploadResult ? '✅ Arquivo processado com sucesso!' : selectedFile ? '📁 Arquivo selecionado' : 'Arraste o arquivo CSV aqui'}
            </h3>
            <p className={`mb-2 ${lgpdConsent ? 'text-gray-500' : 'text-gray-400'}`}>
              {uploadResult ? 'Clique para carregar outro arquivo' : selectedFile ? 'Clique para selecionar outro arquivo' : 'ou clique para selecionar do seu computador'}
            </p>
            <p className={`text-sm font-medium mb-6 ${lgpdConsent ? 'text-blue-600' : 'text-gray-400'}`}>
              ⚡ Processamento integrado com backend Python
            </p>
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              disabled={!lgpdConsent || isUploading}
              className="hidden"
            />
            <button 
              disabled={!lgpdConsent || isUploading}
              className={`px-8 py-4 rounded-lg font-medium shadow-lg transition-all duration-200 ${
                lgpdConsent && !isUploading
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (lgpdConsent && !isUploading) {
                  document.getElementById('csv-file-input')?.click();
                }
              }}
            >
              {uploadResult ? '📁 Carregar Outro Arquivo' : selectedFile ? '📁 Selecionar Outro Arquivo' : '📁 Selecionar Arquivo CSV'}
            </button>
          </>
        )}
      </div>

      {uploadResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <FileText className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Resultado do Processamento</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-bold text-xl text-green-900">{uploadResult.stats.totalContacts.toLocaleString()}</p>
                <p className="text-sm text-green-700">Contatos válidos</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Users className="h-6 w-6 text-blue-600" />
              <div>
                <p className="font-bold text-xl text-blue-900">{uploadResult.stats.totalLeads.toLocaleString()}</p>
                <p className="text-sm text-blue-700">Leads</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <Crown className="h-6 w-6 text-purple-600" />
              <div>
                <p className="font-bold text-xl text-purple-900">{uploadResult.stats.totalAdmins}</p>
                <p className="text-sm text-purple-700">Administradores</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <Users className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-bold text-xl text-amber-900">{uploadResult.stats.estimatedGroups}</p>
                <p className="text-sm text-amber-700">Grupos estimados</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h4 className="font-medium text-green-900">Arquivo processado com sucesso!</h4>
            </div>
            <p className="text-sm text-green-800">{uploadResult.stats.validationMessage}</p>
            <p className="text-xs text-green-700 mt-1">
              Arquivo salvo no backend: {uploadResult.filename}
            </p>
          </div>

          {uploadResult.contacts.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 mb-3">Preview dos Contatos (primeiros 10)</h4>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 border-b">Nome</th>
                      <th className="text-left p-2 border-b">Número</th>
                      <th className="text-left p-2 border-b">Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.contacts.map((contact, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{contact.nome || '(sem nome)'}</td>
                        <td className="p-2 font-mono">{contact.numero}</td>
                        <td className="p-2">
                          {contact.tipo === 'administrador' ? (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">Admin</span>
                          ) : (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Lead</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Formato do Arquivo CSV - Integração Backend</span>
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-blue-800">
            O arquivo será processado automaticamente pelo backend Python com validação completa:
          </p>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-900">nome</span>
                <p className="text-gray-600">(opcional)</p>
              </div>
              <div>
                <span className="font-medium text-gray-900">numero</span>
                <p className="text-red-600">(obrigatório com DDI)</p>
              </div>
              <div>
                <span className="font-medium text-gray-900">tipo</span>
                <p className="text-red-600">(lead ou administrador)</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">Exemplo com validação automática:</p>
            <pre className="text-green-400 text-xs font-mono">
{`nome,numero,tipo
João Silva,5562999999999,lead
,5562888888888,administrador
Maria Santos,62777777777,lead
Pedro Admin,5562666666666,administrador
,5562555555555,lead
Ana Costa,62444444444,lead`}
            </pre>
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            <p>• <strong>Validação automática:</strong> DDI, formato de número e tipos</p>
            <p>• <strong>Processamento backend:</strong> Dados salvos e validados no servidor Python</p>
            <p>• <strong>Integração completa:</strong> Frontend React + Backend Flask</p>
            <p>• <strong>Estatísticas em tempo real:</strong> Contagem automática de leads e admins</p>
          </div>
        </div>
      </div>
    </div>
  );
};