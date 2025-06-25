import React, { useState } from 'react';

interface AdminConfiguratorProps {
  admins: string[];
  onChange: (newAdmins: string[]) => void;
}

export const AdminConfigurator: React.FC<AdminConfiguratorProps> = ({ admins, onChange }) => {
  const [newNumber, setNewNumber] = useState('');

  const addAdmin = () => {
    const trimmed = newNumber.trim();
    if (trimmed && !admins.includes(trimmed)) {
      onChange([...admins, trimmed]);
      setNewNumber('');
    }
  };

  const removeAdmin = (number: string) => {
    onChange(admins.filter(a => a !== number));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Administradores Manuais</h2>
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          placeholder="Digite número com DDI (ex: 5562987654321)"
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
        />
        <button
          onClick={addAdmin}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Adicionar
        </button>
      </div>

      {admins.length > 0 && (
        <ul className="space-y-2">
          {admins.map((number, idx) => (
            <li key={idx} className="flex justify-between items-center border-b pb-2">
              <span className="text-gray-700">{number}</span>
              <button
                onClick={() => removeAdmin(number)}
                className="text-sm text-red-500 hover:underline"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
