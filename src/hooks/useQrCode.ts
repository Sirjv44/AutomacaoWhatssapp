import { useState, useEffect, useCallback } from 'react';

export function useQrCode() {
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQrCode = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://automacaowhatssapp.onrender.com/api/qrcode');
      if (!response.ok) throw new Error('Falha ao obter QR Code');
      const data = await response.json();
      setQrCodeBase64(data.qr_code_base64);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQrCode();
  }, [fetchQrCode]);

  return {
    qrCodeBase64,
    loading,
    error,
    refreshQrCode: fetchQrCode,
  };
}
