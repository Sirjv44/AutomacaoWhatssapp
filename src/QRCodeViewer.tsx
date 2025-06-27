import React from 'react';
import { useQrCode } from './hooks/useQrCode'; // caminho correto para o hook que você criou

export function QRCodeViewer() {
  const { qrCodeBase64, loading, error, refreshQrCode } = useQrCode();

  if (loading) return <p>Carregando QR Code...</p>;
  if (error) return (
    <div>
      <p>Erro ao carregar QR Code: {error}</p>
      <button onClick={refreshQrCode}>Tentar novamente</button>
    </div>
  );

  if (!qrCodeBase64) return <p>QR Code não disponível</p>;

  return (
    <div>
      <img
        src={`data:image/png;base64,${qrCodeBase64}`}
        alt="QR Code para login WhatsApp"
        style={{ width: 300, height: 300 }}
      />
      <button onClick={refreshQrCode}>Atualizar QR Code</button>
    </div>
  );
}
