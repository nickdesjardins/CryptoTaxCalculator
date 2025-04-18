import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto p-8 bg-white rounded-lg shadow-md space-y-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Simplify Your Crypto Taxes
        </h2>
        <p className="text-gray-700">
          I&apos;m building a friendly, easy-to-use website to help you effortlessly calculate your crypto gains or losses for tax season—especially useful for <strong>Canadian income taxes</strong>. I created this tool because I personally needed a simpler way to report my crypto trades. Let&apos;s face it, government guidelines for crypto tax declarations aren&apos;t always clear, and dealing with multiple exchanges makes it even harder.
        </p>
        <p className="text-gray-700">
          My crypto tax calculator takes your trade reports from popular crypto platforms like Coinbase, Kraken, Binance, Shakepay, and Newton, directly in <code>.csv</code> format. It automatically converts all transactions to <strong>Canadian Dollars (CAD)</strong>, neatly compiles them, and generates a single <code>.csv</code> file ready for you or your accountant to declare your crypto capital gains or losses.
        </p>
        <p className="text-gray-700">
          Although initially built for Canada, my crypto tax calculator can easily accommodate other currencies and regions—like the United States, Europe, and more. If you&apos;d like support for another currency, just reach out!
        </p>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Disclaimer</h3>
          <p className="text-yellow-700">
            <em>This tool is exactly what I used to prepare my own crypto tax declarations, but I can&apos;t guarantee 100% accuracy for all cases. Always verify your numbers carefully and consult a tax professional if you&apos;re unsure.</em>
          </p>
        </div>
        <p className="text-gray-700">
          I&apos;d love your feedback! Right now, my website supports transactions from Coinbase, Kraken, Binance, Shakepay, and Newton. If you use another crypto exchange you&apos;d like to see included, please email me at <a href="mailto:info@webman.dev" className="text-blue-600 hover:underline">info@webman.dev</a> and provide details of your <code>.csv</code> transaction file.
        </p>
        <p className="text-gray-700 font-medium text-center mt-6">
          Let&apos;s simplify crypto taxes together!
        </p>
      </div>
    </main>
  );
}
