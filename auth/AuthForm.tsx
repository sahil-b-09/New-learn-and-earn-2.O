import React, { useState } from 'react';

const AuthForm: React.FC = () => {
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [emailValue, setEmailValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted with:', emailValue);
  };

  return (
    <div className="w-full shadow-[0_1px_2px_-1px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.1)] bg-white px-10 py-8 rounded-lg">
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setAuthMethod('email')}
          className={`flex items-center gap-2 text-sm cursor-pointer px-4 py-2.5 rounded-md ${
            authMethod === 'email' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_1_149)">
              <path
                d="M16.8232 3.83337H3.48991C2.56943 3.83337 1.82324 4.57957 1.82324 5.50004V15.5C1.82324 16.4205 2.56943 17.1667 3.48991 17.1667H16.8232C17.7437 17.1667 18.4899 16.4205 18.4899 15.5V5.50004C18.4899 4.57957 17.7437 3.83337 16.8232 3.83337Z"
                stroke={authMethod === 'email' ? "#1D4ED8" : "#374151"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18.4899 6.33337L11.0149 11.0834C10.7576 11.2446 10.4602 11.33 10.1566 11.33C9.85298 11.33 9.55552 11.2446 9.29824 11.0834L1.82324 6.33337"
                stroke={authMethod === 'email' ? "#1D4ED8" : "#374151"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
            <defs>
              <clipPath id="clip0_1_149">
                <rect width="20" height="20" fill="white" transform="translate(0.15625 0.5)" />
              </clipPath>
            </defs>
          </svg>
          <span>Email</span>
        </button>
        <button
          onClick={() => setAuthMethod('phone')}
          className={`flex items-center gap-2 text-sm cursor-pointer px-4 py-2.5 rounded-md ${
            authMethod === 'phone' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M15.042 2.16663H6.70866C5.78818 2.16663 5.04199 2.91282 5.04199 3.83329V17.1666C5.04199 18.0871 5.78818 18.8333 6.70866 18.8333H15.042C15.9625 18.8333 16.7087 18.0871 16.7087 17.1666V3.83329C16.7087 2.91282 15.9625 2.16663 15.042 2.16663Z"
              stroke={authMethod === 'phone' ? "#1D4ED8" : "#374151"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.875 15.5H10.8833"
              stroke={authMethod === 'phone' ? "#1D4ED8" : "#374151"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Phone</span>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="email-input" className="text-xs text-gray-700">
            {authMethod === 'email' ? 'Email address' : 'Phone number'}
          </label>
          <input
            id="email-input"
            type={authMethod === 'email' ? 'email' : 'tel'}
            placeholder={authMethod === 'email' ? 'you@example.com' : '+1 (555) 000-0000'}
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            className="w-full border border-gray-300 text-sm px-[13px] py-[9px] rounded-md border-solid focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 text-white text-xs cursor-pointer bg-blue-600 p-2.5 rounded-md border-[none] hover:bg-blue-700 transition-colors"
        >
          <span>Continue</span>
          <svg width="16" height="16" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3.61426 8.5H12.9476"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.28125 3.83337L12.9479 8.50004L8.28125 13.1667"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default AuthForm;
