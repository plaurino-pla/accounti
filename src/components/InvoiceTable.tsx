import React from 'react';
import { Invoice } from '../services/api';

interface InvoiceTableProps {
  invoices: Invoice[];
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ invoices }) => {
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
      }
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
        <p className="text-gray-500 mb-6">
          Start by clicking "Fetch New Invoices" to scan your Gmail for invoice attachments.
        </p>
        <div className="bg-blue-50/50 backdrop-blur-sm rounded-xl p-4 text-left border border-blue-100/50">
          <h4 className="font-medium text-blue-900 mb-2">What we'll look for:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• PDF and image attachments in your emails</li>
            <li>• Documents containing invoice keywords (invoice, factura, bill, receipt)</li>
            <li>• Multilingual support for global invoices</li>
            <li>• Automatic data extraction and organization</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50/50 backdrop-blur-sm">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Invoice Details
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Vendor
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-white/50 transition-colors duration-150">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-sm">
                      <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-semibold text-gray-900">
                      {invoice.invoiceNumber || 'No Invoice #'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {invoice.originalFilename}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{invoice.vendorName || 'Unknown Vendor'}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-bold text-gray-900">
                  {formatCurrency(invoice.amount || 0, invoice.currency)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {invoice.issueDate ? formatDate(invoice.issueDate) : 'Unknown'}
                </div>
                {invoice.dueDate && (
                  <div className="text-sm text-gray-500">
                    Due: {formatDate(invoice.dueDate)}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                    invoice.processed
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}
                >
                  {invoice.processed ? 'Processed' : 'Processing'}
                </span>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(invoice.confidence * 100)}% confidence
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  {invoice.driveLink && (
                    <a
                      href={invoice.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      <span>View</span>
                    </a>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InvoiceTable; 