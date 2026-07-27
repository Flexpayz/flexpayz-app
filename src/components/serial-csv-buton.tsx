import React from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import Papa from 'papaparse';
import { DB_COLLECTIONS } from './baby-journal-settings';
import { db } from '../App';

interface SerialData {
  serialNumber: string;
  productID: string;
  unlockCode: string;
}

const ExportSerialsCSVButton: React.FC = () => {
  const handleExport = async () => {
    const serialsRef = collection(db, DB_COLLECTIONS.SERIAL_NUMBERS);

    try {
      const serialsSnapshot = await getDocs(serialsRef);
      const rows: SerialData[] = [];

      for (const serialDoc of serialsSnapshot.docs) {
        const serialNumber = serialDoc.id;
        const productID = serialDoc.data().productID || '';

        let unlockCode = '';

        if (productID) {
          const productDocRef = doc(db, DB_COLLECTIONS.PRODUCTS, productID);
          const productDoc = await getDoc(productDocRef);

          if (productDoc.exists()) {
            unlockCode = productDoc.data().unlockCode || '';
          }
        }

        rows.push({ serialNumber, productID, unlockCode });
      }

      // Convert data to CSV
      const csv = Papa.unparse(rows);

      // Download the CSV file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'serials_export.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
    >
      Export Serials CSV
    </button>
  );
};

export default ExportSerialsCSVButton;
