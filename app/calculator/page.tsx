import React from 'react';

export default function CalculatorPage() {
  return (
    <main className="p-8 max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Crypto Tax Calculator</h1>
      <p>
        Upload your .csv trade reports from Coinbase, Kraken, Binance, Shakepay, and Newton.
        You can select multiple files at once. The calculator will process them together
        to determine your capital gains or losses.
      </p>
      <input
        type="file"
        multiple
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-red file:text-black hover:file:text-white hover:file:bg-red-700 mt-4 mb-4"
      />
    </main>
  );
}