import React from 'react';
import { Stethoscope } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white font-sans text-[#333333]">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <Stethoscope className="h-8 w-8 text-[#00338D]" />
            <h1 className="text-2xl font-bold text-[#333333]">
              PharmaClient Validator
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">Assisted GDP Compliance Verification</p>
        </div>
      </header>
      <main>
        {children}
      </main>
    </div>
  );
};

export default Layout;