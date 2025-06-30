// Serviço para comunicação com a API backend
//const API_BASE_URL = 'http://18.119.121.25:10000/api';
const API_BASE_URL = 'http://localhost:5000/api';


export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  filename: string;
  stats: {
    totalContacts: number;
    totalLeads: number;
    totalAdmins: number;
    estimatedGroups: number;
    validationMessage: string;
  };
  contacts: any[];
}

export interface AutomationStatus {
  isRunning: boolean;
  isPaused: boolean;
  currentStep: string;
  progress: number;
  totalContacts: number;
  processedContacts: number;
  currentGroup: string;
  currentGroupIndex: number;
  totalGroups: number;
  logs: string[];
  estimatedTimeRemaining: string;
  canResume: boolean;
  sessionPersisted: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
  currentSessionId: string;
  groupsInCurrentSession: number;
}

export interface ExtractionStatus {
  isRunning: boolean;
  currentStep: string;
  progress: number;
  totalGroups: number;
  processedGroups: number;
  currentGroup: string;
  logs: string[];
  estimatedTimeRemaining: string;
  extractedContacts: any[];
  uniqueContacts: number;
  duplicatesFound: number;
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // Upload CSV
  async uploadCSV(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload-csv`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  // Automação de grupos
  async startAutomation(config: any): Promise<ApiResponse> {
    return this.request('/automation/start', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  }

  async stopAutomation(): Promise<ApiResponse> {
    return this.request('/automation/stop', {
      method: 'POST',
    });
  }

  async pauseAutomation(): Promise<ApiResponse> {
    return this.request('/automation/pause', {
      method: 'POST',
    });
  }

  async resumeAutomation(): Promise<ApiResponse> {
    return this.request('/automation/resume', {
      method: 'POST',
    });
  }

  async getAutomationStatus(): Promise<AutomationStatus> {
    return this.request('/automation/status');
  }

  // Extração de contatos
  async startExtraction(config: any): Promise<ApiResponse> {
    return this.request('/extraction/start', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  }

  async stopExtraction(): Promise<ApiResponse> {
    return this.request('/extraction/stop', {
      method: 'POST',
    });
  }

  async getExtractionStatus(): Promise<ExtractionStatus> {
    return this.request('/extraction/status');
  }

  // Downloads
  async downloadReport(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/download/report`);
    if (!response.ok) {
      throw new Error('Erro ao baixar relatório');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_whatsapp_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async downloadContacts(format: 'csv' | 'json' = 'csv'): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/download/contacts?format=${format}`);
    if (!response.ok) {
      throw new Error('Erro ao baixar contatos');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contatos_extraidos_${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Geração de código Python
  async generatePythonCode(config: any): Promise<{ success: boolean; code: string; filename: string }> {
    return this.request('/python/generate', {
      method: 'POST',
      body: JSON.stringify({ config }),
    });
  }
}

export const apiService = new ApiService();