import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import './App.css';

export interface CSVData {
  agentStatus: any[];
  agentPerformance: any[];
  trainingInteractions: any[];
  historicalAdherence: any[];
  timeSummary: any[];
}

function App() {
  const [data, setData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDataLoaded = (csvData: CSVData) => {
    setData(csvData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Call Center Training Data Analyzer
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!data ? (
          <FileUpload 
            onDataLoaded={handleDataLoaded} 
            loading={loading}
            setLoading={setLoading}
          />
        ) : (
          <Dashboard data={data} />
        )}
      </main>
    </div>
  );
}

export default App;