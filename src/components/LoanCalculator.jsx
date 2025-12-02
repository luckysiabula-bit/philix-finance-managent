import React, { useState } from 'react';

// Weekly loan calculation with fixed rates
const calculateWeeklyLoan = (principal, weeks) => {
  const P = Number(principal || 0);
  const w = Number(weeks || 0);

  if (P <= 0 || w <= 0) return { weekly: 0, total: 0, interest: 0, rate: 0 };

  let interestRate = 0;
  if (w === 1) interestRate = 13;
  else if (w === 2) interestRate = 20;
  else if (w === 3) interestRate = 30;
  else if (w === 4) interestRate = 35;
  else interestRate = (w / 4) * 35;

  const interest = P * (interestRate / 100);
  const total = P + interest;
  const weekly = total / w;

  return { weekly, total, interest, rate: interestRate };
};

const assessCollateralValue = ({
  marketValue = 0,
  ageYears = 0,
  depreciationPctPerYear = 10,
  liquidityDiscountPct = 15,
}) => {
  const mv = Number(marketValue || 0);
  const dep = Math.max(0, 1 - (Number(depreciationPctPerYear) / 100) * Number(ageYears));
  const depreciated = mv * dep;
  const afterLiquidity = depreciated * (1 - Number(liquidityDiscountPct) / 100);
  const assessed = afterLiquidity;
  return {
    depreciated,
    afterLiquidity,
    assessed,
  };
};

const LoanCalculator = ({ isOpen, onClose }) => {
  const [calculatorMode, setCalculatorMode] = useState('collateral');
  const [loanCalculation, setLoanCalculation] = useState(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🧮  Admin Loan Calculator</h2>
          <button onClick={() => {
            onClose();
            setLoanCalculation(null);
            setCalculatorMode('collateral');
          }} className="text-gray-500 hover:text-gray-700 text-3xl font-bold">×</button>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setCalculatorMode('collateral')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              calculatorMode === 'collateral'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📦 Collateral-Based Loan
          </button>
          <button
            onClick={() => setCalculatorMode('weekly')}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              calculatorMode === 'weekly'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📅 Weekly Loan
          </button>
        </div>

        {/* Collateral Calculator */}
        {calculatorMode === 'collateral' && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Collateral Assessment Calculator</h3>
              <p className="text-sm text-blue-700">
                Calculate the maximum loanable amount based on collateral value, depreciation, and risk factors.
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const result = assessCollateralValue({
                marketValue: parseFloat(formData.get('marketValue') || 0),
                ageYears: parseFloat(formData.get('ageYears') || 0),
                depreciationPctPerYear: parseFloat(formData.get('depreciationPctPerYear') || 10),
                liquidityDiscountPct: parseFloat(formData.get('liquidityDiscountPct') || 15),
              });
              setLoanCalculation(result);
            }} className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Market Value (ZMK) *</label>
                  <input type="number" name="marketValue" required min="0" step="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 50000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Age (Years)</label>
                  <input type="number" name="ageYears" min="0" step="0.5" defaultValue="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Depreciation % per Year</label>
                  <input type="number" name="depreciationPctPerYear" min="0" max="100" step="0.1" defaultValue="10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Liquidity Discount %</label>
                  <input type="number" name="liquidityDiscountPct" min="0" max="100" step="0.1" defaultValue="15"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
                Calculate Collateral Value
              </button>
            </form>

            {loanCalculation && loanCalculation.assessed !== undefined && (
              <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                <h3 className="font-bold text-green-900 text-lg mb-4">Assessment Results</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-green-200">
                    <span className="text-gray-700">After Depreciation:</span>
                    <span className="font-semibold text-gray-900">ZMK {loanCalculation.depreciated.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-green-200">
                    <span className="text-gray-700">After Liquidity Discount:</span>
                    <span className="font-semibold text-gray-900">ZMK {loanCalculation.afterLiquidity.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 bg-green-100 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                    <span className="text-lg font-bold text-green-900">Maximum Loan Amount:</span>
                    <span className="text-2xl font-bold text-green-700">ZMK {loanCalculation.assessed.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Weekly Loan Calculator */}
        {calculatorMode === 'weekly' && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Weekly Loan Calculator</h3>
              <p className="text-sm text-blue-700">Calculate weekly payments and total interest for short-term loans (1-4 weeks).</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const principal = parseFloat(formData.get('principal') || 0);
              const weeks = parseInt(formData.get('weeks') || 0);
              const result = calculateWeeklyLoan(principal, weeks);
              setLoanCalculation({ ...result, principal, weeks });
            }} className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Amount (ZMK) *</label>
                  <input type="number" name="principal" required min="300" max="50000" step="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., 5000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Term *</label>
                  <select name="weeks" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option value="">Select term</option>
                    <option value="1">1 Week (13% interest)</option>
                    <option value="2">2 Weeks (20% interest)</option>
                    <option value="3">3 Weeks (30% interest)</option>
                    <option value="4">4 Weeks (35% interest)</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition">
                Calculate Weekly Loan
              </button>
            </form>

            {loanCalculation && loanCalculation.principal && (
              <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                <h3 className="font-bold text-green-900 text-lg mb-4">Loan Calculation Results</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-green-200">
                    <span className="text-gray-700">Principal Amount:</span>
                    <span className="font-semibold text-gray-900">ZMK {loanCalculation.principal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-green-200">
                    <span className="text-gray-700">Loan Term:</span>
                    <span className="font-semibold text-gray-900">{loanCalculation.weeks} week{loanCalculation.weeks > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-green-200">
                    <span className="text-gray-700">Interest Rate:</span>
                    <span className="font-semibold text-gray-900">{loanCalculation.rate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-green-200">
                    <span className="text-gray-700">Total Interest:</span>
                    <span className="font-semibold text-gray-900">ZMK {loanCalculation.interest.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-green-200">
                    <span className="text-gray-700">Weekly Payment:</span>
                    <span className="font-semibold text-indigo-700 text-lg">ZMK {loanCalculation.weekly.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 bg-green-100 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                    <span className="text-lg font-bold text-green-900">Total Repayment:</span>
                    <span className="text-2xl font-bold text-green-700">ZMK {loanCalculation.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanCalculator;
