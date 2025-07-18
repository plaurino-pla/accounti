import React from 'react';

const InvoiceHistory: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Invoice History
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            View all your processed invoices
          </p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceHistory; 