import FileUpload from '../../components/FileUpload';

export default function UploadPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-24">
      <h1 className="text-2xl font-bold mb-4">Coin to CAD Conversion</h1>
      <p className="mt-2 mb-4 text-gray-700">
        Upload your trade reports (.csv) from Binance or Kraken here. The tool will process the file and add the corresponding Canadian Dollar (CAD) value for each trade.
      </p>
      <FileUpload />
    </main>
  );
}