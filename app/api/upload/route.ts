import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Parser } from 'json2csv';

// Define the expected structure of a row after parsing
type CsvRow = {
  [key: string]: string | undefined;
  'Column K'?: string; // Adjust if needed
  'Date'?: string;     // Adjust if needed
  'CAD Value'?: string;
};

// Mapping from crypto symbols to CoinCap API IDs
const symbolToCoinCapId: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', USDT: 'tether', BNB: 'binance-coin',
  XRP: 'xrp', ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot',
  LTC: 'litecoin', SOL: 'solana', AVAX: 'avalanche',
};
const USD_QUOTE_ID = 'united-states-dollar';

// --- Helper function to encode SSE-like messages for the stream ---
function encodeStreamMessage(event: string, data: unknown): Uint8Array {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(payload);
}

// --- Fetches historical USD price from CoinCap v3 API ---
async function getUsdPrice(coinCapId: string, date: Date): Promise<number | string> {
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
  const startTime = startOfDay.getTime();
  const endTime = endOfDay.getTime();

  const params = new URLSearchParams({
    interval: 'd1', baseId: coinCapId, quoteId: USD_QUOTE_ID,
    start: startTime.toString(), end: endTime.toString(),
  });
  const url = `https://rest.coincap.io/v3/assets/${coinCapId}/history?${params.toString()}`;

  try {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay

    const apiKey = process.env.COINCAPAPI;
    if (!apiKey) return 'API Key Missing';
    const headers = { 'Authorization': `Bearer ${apiKey}` };

    const res = await fetch(url, { headers });

    if (!res.ok) {
      if (res.status === 401) return 'Unauthorized (CoinCap Key Invalid?)';
      if (res.status === 429) return 'Rate Limited (CoinCap)';
      if (res.status === 400) return 'Bad Request (CoinCap Params?)';
      console.error(`CoinCap v3 API error for ${coinCapId} on ${date.toISOString().split('T')[0]}: ${res.status} ${res.statusText}`);
      try {
         const errorBody = await res.json();
         return `API Error ${res.status} (CoinCap: ${errorBody?.error || res.statusText})`;
      } catch { return `API Error ${res.status} (CoinCap)`; }
    }

    const data = await res.json();
    const candleData = data?.data;
    if (!Array.isArray(candleData) || candleData.length === 0) return 'No Data (CoinCap)';
    const closePriceStr = candleData[0]?.priceUsd;
    const price = parseFloat(closePriceStr);
    return !isNaN(price) ? price : 'Invalid Data (CoinCap)';

  } catch (error: unknown) {
    console.error(`Network/fetch error for CoinCap (${coinCapId}) on ${date.toISOString().split('T')[0]}:`, error);
    return 'Fetch Error (CoinCap)';
  }
}

// --- Fetches historical USD/CAD exchange rate from Frankfurter.app ---
async function getUsdCadRate(date: Date): Promise<number | string> {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  const today = new Date(); today.setUTCHours(0,0,0,0);
  if (date > today) return 'Future Date (FX)';
  if (date.getUTCFullYear() < 1999) return 'Date Too Old (FX)';

  const url = `https://api.frankfurter.app/${formattedDate}?from=USD&to=CAD`;

  try {
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay
    const res = await fetch(url);

    if (!res.ok) {
       if (res.status === 429) return 'Rate Limited (FX)';
       if (res.status === 404) return 'Date Not Found (FX)';
       if (res.status === 400) return 'Bad Request (FX)';
       console.error(`Frankfurter API error for ${formattedDate}: ${res.status} ${res.statusText}`);
       return `API Error ${res.status} (FX)`;
    }
    const data = await res.json();
    const rate = data?.rates?.CAD;
    return typeof rate === 'number' ? rate : 'No Rate Data (FX)';
  } catch (error: unknown) {
    console.error(`Network/fetch error for Frankfurter on ${formattedDate}:`, error);
    return 'Fetch Error (FX)';
  }
}

// --- POST handler modified to return a ReadableStream ---
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const csvData = buffer.toString('utf-8');

    let records: CsvRow[];
    try {
        records = parse(csvData, { columns: true, skip_empty_lines: true, trim: true, bom: true });
    } catch (parseError: unknown) {
        const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
        console.error('CSV Parsing Error:', errorMessage);
        // Cannot return stream on parse error, return standard JSON error
        return NextResponse.json({ error: `CSV Parsing Failed: ${errorMessage}` }, { status: 400 });
    }

    const totalRows = records.length;
    let processedCount = 0;

    // --- Create the ReadableStream ---
    const stream = new ReadableStream({
      async start(controller) {
        console.log('CSV processing started...'); // ADD START LOG
        // Send initial status
        controller.enqueue(encodeStreamMessage('status', { total: totalRows, processed: 0 }));
        controller.enqueue(encodeStreamMessage('log', { message: `Starting processing for ${totalRows} rows...` }));

        for (const row of records) {
          const rowIndex = processedCount + 1; // 1-based index for logging
        
          // --- Kraken CSV override ---
          if (row['pair'] && row['type']) {
            // Extract the coin symbol from the pair and the cost amount
            const pair = row['pair'] as string;
            const [ , coinQuote ] = pair.split('/'); // Use the coin after '/'
            const costValue = row['cost'] || '';       // Always use the cost column
            // Overwrite the field to match the expected "amount+coin" format (e.g., "0.004691BTC")
            row['Column K'] = costValue + coinQuote;
        
            // Optionally, set the date if Kraken's CSV uses a different field (like "time")
            if (row['time'] && !row['Date']) {
              row['Date'] = row['time'];
            }
          }
        
          // --- Standard Processing ---
          // Retrieve raw amount/coin string from common columns for both Kraken and Binance CSVs
          const rawAmountCoin = row['Change'] || row['Amount'] || row['Column K'] || Object.values(row)[10];
          const dateStr = row['Date(UTC)'] || row['Date'] || Object.values(row)[0];
          let finalCadValue: string = 'Processing...';
          let logSuffix = ''; // Used to display coin/date details in logs
        
          if (!rawAmountCoin || !dateStr) {
            finalCadValue = 'Missing Data';
            controller.enqueue(encodeStreamMessage('log', { message: `Row ${rowIndex}: ${finalCadValue}` }));
          } else {
            // Expect rawAmountCoin to be a string like "0.004691BTC"
            const match = rawAmountCoin.match(/^(-?[\d.]+)([A-Z]+)$/);
            // Append a 'Z' to ensure we parse in UTC
            const date = new Date(dateStr + 'Z');
            logSuffix = ` (${match ? match[2] : 'N/A'} on ${dateStr})`;
        
            if (!match || isNaN(date.getTime())) {
              finalCadValue = 'Invalid Format';
              controller.enqueue(encodeStreamMessage('log', { message: `Row ${rowIndex}: ${finalCadValue}${logSuffix}` }));
            } else {
              const amount = parseFloat(match[1]);
              const symbol = match[2];
              const coinCapId = symbolToCoinCapId[symbol];
        
              if (!coinCapId) {
                finalCadValue = 'Unsupported Coin';
                controller.enqueue(encodeStreamMessage('log', { message: `Row ${rowIndex}: ${finalCadValue}${logSuffix}` }));
              } else {
                controller.enqueue(encodeStreamMessage('log', { message: `Row ${rowIndex}: Fetching price/rate${logSuffix}...` }));
                const usdPriceResult = await getUsdPrice(coinCapId, date);
                const usdCadRateResult = await getUsdCadRate(date);
        
                if (typeof usdPriceResult === 'number' && typeof usdCadRateResult === 'number') {
                  finalCadValue = (amount * usdPriceResult * usdCadRateResult).toFixed(2);
                  controller.enqueue(encodeStreamMessage('log', { message: `Row ${rowIndex}: Calculated CAD ${finalCadValue}${logSuffix}` }));
                } else {
                  const priceError = typeof usdPriceResult !== 'number' ? usdPriceResult : null;
                  const rateError = typeof usdCadRateResult !== 'number' ? usdCadRateResult : null;
                  if (priceError && rateError) finalCadValue = `${priceError}; ${rateError}`;
                  else if (priceError) finalCadValue = priceError;
                  else if (rateError) finalCadValue = rateError;
                  else finalCadValue = 'Unknown Calc Error';
                  controller.enqueue(encodeStreamMessage('log', { message: `Row ${rowIndex}: Error - ${finalCadValue}${logSuffix}` }));
                }
              }
            }
          }
        
          // Save the calculated CAD value back to the row
          row['CAD Value'] = finalCadValue;
          processedCount++;
          // Update progress after processing each row
          controller.enqueue(encodeStreamMessage('status', { total: totalRows, processed: processedCount }));
        }
        // --- End of processing loop ---        

        // --- Processing finished, save the file ---
        controller.enqueue(encodeStreamMessage('log', { message: `Saving processed file...` }));
        console.log('CSV processing finished, saving file...'); // ADD SAVE START LOG
        const outputDir = path.join(process.cwd(), 'public', 'output');
        // Use a more readable timestamp in filename: YYYY-MM-DD_HH-MM-SS
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `processed_${timestamp}.csv`;
        const outputPath = path.join(outputDir, filename);
        const publicDownloadPath = `/output/${filename}`;

        try {
            const json2csv = new Parser();
            const processedCsv = json2csv.parse(records);
            await fs.mkdir(outputDir, { recursive: true });
            await fs.writeFile(outputPath, processedCsv);

            // Send completion message
            controller.enqueue(encodeStreamMessage('complete', { download: publicDownloadPath }));
            controller.enqueue(encodeStreamMessage('log', { message: `File saved. Download ready.` }));
            console.log('CSV processed and saved successfully.'); // ADD SAVE END LOG
        } catch (writeError: unknown) {
             const writeErrorMessage = writeError instanceof Error ? writeError.message : String(writeError);
             console.error('Error writing final CSV:', writeErrorMessage);
             // Send error message over the stream
             controller.enqueue(encodeStreamMessage('error', { message: `Failed to save processed file: ${writeErrorMessage}` }));
        } finally {
            controller.close(); // Close the stream
        }
      },
      cancel(reason) {
        console.log('Stream cancelled:', reason);
        // Handle cancellation if needed (e.g., stop processing loop)
      }
    });

    // Return the stream as the response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream', // Set correct MIME type
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    // Catch errors that happen *before* the stream starts
    const topLevelErrorMessage = error instanceof Error ? error.message : String(error);
    console.error('Upload API Top-Level Error:', topLevelErrorMessage);
    return NextResponse.json({ error: `An unexpected error occurred: ${topLevelErrorMessage}` }, { status: 500 });
  }
}
