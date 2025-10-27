import React, { useState } from 'react';
import { sendFeedback } from '../services/api';

interface RateLimitModalProps {
  onClose: () => void;
}

const RateLimitModal: React.FC<RateLimitModalProps> = ({ onClose }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleResponse = async (interestedInPaying: boolean) => {
    setSubmitting(true);
    try {
      await sendFeedback(interestedInPaying);
      setSubmitted(true);

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error sending feedback:', error);
      // Still close the modal even if feedback fails
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {!submitted ? (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Daily Limit Reached</h2>

            <div className="mb-6 space-y-3">
              <p className="text-gray-700 text-base">
                You've used your <span className="font-semibold">50 free API calls</span> for today.
              </p>

              <p className="text-gray-700 text-base">
                Are you eager to try it more and want to pay for continued access?
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleResponse(false)}
                disabled={submitting}
                className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                NO
              </button>
              <button
                onClick={() => handleResponse(true)}
                disabled={submitting}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                YES
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-600">Your feedback has been recorded.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RateLimitModal;
