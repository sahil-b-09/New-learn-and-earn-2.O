
import React from 'react';

interface PaymentOptionProps {
  id: string;
  title: string;
  subtitle: string;
  selected: boolean;
  onChange: () => void;
}

const PaymentOption: React.FC<PaymentOptionProps> = ({ 
  id,
  title, 
  subtitle, 
  selected, 
  onChange 
}) => {
  return (
    <div 
      id={id}
      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
        selected ? 'border-[#00C853] bg-green-50' : 'border-gray-200'
      }`}
      onClick={onChange}
    >
      <div className="mr-4">
        {/* Icon placeholder - we'll get this from the parent */}
        {id === 'upi' && <span className="text-xl">💸</span>}
        {id === 'card' && <span className="text-xl">💳</span>}
        {id === 'netbanking' && <span className="text-xl">🏦</span>}
      </div>
      <div className="flex-grow">
        <h3 className="text-base font-medium">{title}</h3>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
};

export default PaymentOption;
