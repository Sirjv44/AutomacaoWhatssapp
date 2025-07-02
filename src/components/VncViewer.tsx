import React from 'react';

const VncViewer = () => {
  return (
    <div style={{ marginTop: 20 }}>
      <h2>Acesso ao Navegador da Automação</h2>
      <p>
        Abaixo está o navegador automatizado. Você pode observar o Playwright controlando o WhatsApp Web:
      </p>
      <iframe
        src="https://stem-carefully-cutting-families.trycloudflare.com"
        width="100%"
        height="600px"
        style={{
          border: '2px solid #888',
          borderRadius: '8px'
        }}
        title="Navegador Playwright via VNC"
      />
    </div>
  );
};

export default VncViewer;
