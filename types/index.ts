export type CsvRow = {
    [key: string]: string | undefined; // Allow undefined in index signature
    'Column K'?: string;
    'Date'?: string;
    'CAD Value'?: string;
  };
