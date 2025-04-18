'use client';
import { useState, useEffect, useRef } from 'react';

// Define types for stream messages from the backend
interface StatusUpdate {
  processed: number;
  total: number;
}
interface LogMessage {
  message: string;
}
interface CompleteMessage {
  download: string;
}
interface ErrorMessage {
  message: string;
}

export default function FileUpload() {
  const [message, setMessage] = useState<string | null>(null); // For final status message
  const [download, setDownload] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<StatusUpdate | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Ref to control fetch cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function to abort fetch if component unmounts or file changes
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        console.log('Aborting fetch request...');
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Function to process the stream from the backend
  const processStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();
    let buffer = ''; // Buffer to handle partial messages
    let completeEventReceived = false; // Track completion independently of React state

    while (true) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream finished. Done:', done, 'Download set:', !!download, 'Error set:', !!error, 'CompleteEvent:', completeEventReceived);
          // Use our local variable instead of React state for the check
          if (!completeEventReceived && !error) { // If stream finishes without complete/error event
             setError("Processing finished unexpectedly. Check server logs.");
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true }); // Decode chunk

        // Process buffer line by line (SSE format: event: ...\ndata: ...\n\n)
        const messages = buffer.split('\n\n');
        buffer = messages.pop() || ''; // Keep the last partial message in buffer

        for (const msg of messages) {
          if (!msg.trim()) continue;

          let event = 'message'; // Default event type
          let dataStr = '';

          const lines = msg.split('\n');
          for (const line of lines) {
            if (line.startsWith('event:')) {
              event = line.substring(6).trim();
            } else if (line.startsWith('data:')) {
              dataStr = line.substring(5).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);
              // --- Added logging for event handling ---
              console.log('Stream Event Received:', event, data);
              if (event === 'status') {
                setProgress(data as StatusUpdate);
                console.log('  Status updated:', data);
              } else if (event === 'log') {
                setLogs(prev => [...prev, (data as LogMessage).message]);
                console.log('  Log added:', (data as LogMessage).message);
              } else if (event === 'complete') {
                completeEventReceived = true; // Mark that we've received a complete event
                setMessage('Processing complete!');
                setIsLoading(false);
                setDownload((data as CompleteMessage).download); // Set download link directly and synchronously
                console.log('  Complete event - Download set:', (data as CompleteMessage).download, 'CompleteEvent:', completeEventReceived);
              } else if (event === 'error') {
                setError((data as ErrorMessage).message);
                setIsLoading(false); // Stop loading on error
                console.log('  Error event - Error set:', data); // Log error events
              }
            } catch (e) {
              console.error('Failed to parse stream data:', dataStr, e); // Keep error logging
            }
          }
        }
      } catch (streamError: unknown) { // Use unknown
         // Handle stream reading errors
         console.error('Stream reading error:', streamError);
         const isAbortError = streamError instanceof Error && streamError.name === 'AbortError';
         if (!isAbortError) {
            const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
            setError(`Stream error: ${errorMessage}`);
         }
         setIsLoading(false);
         break; // Exit loop on stream error
      }
    }
     // Final cleanup - isLoading is handled in event handlers
     setIsLoading(false); // Redundant, but keep for safety
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Reset states
    setMessage(null); setDownload(null); setError(null);
    setProgress(null); setLogs([]); setIsLoading(true);

    // Abort previous fetch if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController(); // Create new controller for this request

    const file = e.target.files?.[0];
    if (!file) { setIsLoading(false); return; }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file.'); setIsLoading(false); return;
    }

    const form = new FormData();
    form.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: form,
        signal: abortControllerRef.current.signal, // Link fetch to abort controller
      });

      if (!response.ok || !response.body) {
         let errorMsg = `Upload initiation failed: ${response.statusText}`;
         try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch {}
         throw new Error(errorMsg);
      }

      // Start processing the stream
      const reader = response.body.getReader();
      await processStream(reader); // Process the stream asynchronously

    } catch (err: unknown) {
      // Catch errors during fetch initiation or if processStream throws before finishing
      if (err instanceof Error && err.name !== 'AbortError') {
         console.error('Upload initiation/stream error:', err);
         setError(err.message);
      } else {
         console.log('Fetch aborted.'); // Log aborts but don't show as error
      }
      setIsLoading(false); // Ensure loading stops
    } finally {
       // Don't set isLoading false here if processStream is running
       // It will be set inside processStream on completion/error/abort
       e.target.value = ''; // Clear file input
       abortControllerRef.current = null; // Clear controller ref after use
    }
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700">
        Select Binance CSV File:
      </label>
      <input
        id="file-upload" type="file" accept=".csv" onChange={handleFileChange} disabled={isLoading}
        className={`block w-full text-sm text-gray-500 border border-gray-300 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
      />

      {/* Progress Indicator */}
      {isLoading && !error && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-blue-700">Processing...</p>
          </div>
          {progress && (
            <p className="text-sm text-blue-600">
              Processed {progress.processed} / {progress.total} rows
            </p>
          )}
        </div>
      )}

      {/* Log Display */}
      {logs.length > 0 && (
        <div className="mt-4 space-y-1 max-h-60 overflow-y-auto bg-gray-50 p-3 rounded-md border border-gray-200">
          <p className="text-sm font-medium text-gray-600 mb-1">Logs:</p>
          {logs.map((log, index) => (
            <p key={index} className="text-xs text-gray-500 font-mono">{log}</p>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-700 bg-red-100 p-3 rounded-md border border-red-200">{error}</p>
      )}

      {/* Final Success Message */}
      {message && !error && (
         <p className="mt-2 text-sm text-green-700 bg-green-100 p-3 rounded-md border border-green-200">{message}</p>
      )}

      {/* Download Link */}
      {download && !error && (
        <a
          href={download} download
          className={`mt-4 inline-block px-6 py-2.5 bg-green-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-green-700 hover:shadow-lg focus:bg-green-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-green-800 active:shadow-lg transition duration-150 ease-in-out ${isLoading ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
          aria-disabled={isLoading}
        >
          Download Processed CSV
        </a>
      )}
    </div>
  );
}
