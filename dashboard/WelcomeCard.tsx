import React from 'react';

interface WelcomeCardProps {
  userName: string;
  walletBalance: number;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({ userName, walletBalance }) => {
  return (
    <div className="flex justify-between items-center mb-8 p-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 max-sm:flex-col max-sm:text-center max-sm:gap-4">
      <div className="text-white">
        <h1 className="text-[26px] font-bold mb-2">Welcome, {userName}!</h1>
        <p className="text-sm text-blue-100">Learn new skills and earn through referrals</p>
      </div>
      <div className="bg-[rgba(255,255,255,0.1)] p-4 rounded-lg">
        <div className="text-xs text-white mb-1">Wallet Balance</div>
        <div className="text-[17px] font-bold text-white">₹{walletBalance}</div>
      </div>
    </div>
  );
};

export default WelcomeCard;
