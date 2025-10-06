
import React from 'react';

interface TransactionItemProps {
  title: string;
  type: string;
  date: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Failed';
  isPositive: boolean;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  title,
  type,
  date,
  amount,
  status,
  isPositive
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-100">
      <div className="flex items-center">
        <div className="mr-4">
          {isPositive ? (
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.6666 5.83331L7.49992 15L3.33325 10.8333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 5V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 13.3333H10.0083" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.99996 16.6667C13.6819 16.6667 16.6666 13.682 16.6666 10C16.6666 6.31802 13.6819 3.33334 9.99996 3.33334C6.31798 3.33334 3.33329 6.31802 3.33329 10C3.33329 13.682 6.31798 16.6667 9.99996 16.6667Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <div className="flex items-center text-sm text-gray-500">
            <span>{type}</span>
            <span className="mx-2">•</span>
            <span>{date}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : '-'}₹ {amount}
        </div>
        <div 
          className={`text-xs px-2 py-1 rounded-full ${
            status === 'Paid' ? 'bg-green-100 text-green-800' : 
            status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}
        >
          {status}
        </div>
      </div>
    </div>
  );
};

export default TransactionItem;
