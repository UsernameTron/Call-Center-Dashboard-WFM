import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { FileText, CheckCircle } from 'lucide-react';
import { CSVData } from '../App';

interface FileUploadProps {
  onDataLoaded: (data: CSVData) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

interface FileStatus {
  name: string;
  required: boolean;
  uploaded: boolean;
  size?: string;
  rows?: number;
  columns?: number;
  description: string;
  data?: any[];
}

const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, loading, setLoading }) => {
  const [files, setFiles] = useState<FileStatus[]>([
    {
      name: 'training Agent Status Summary.csv',
      required: true,
      uploaded: false,
      description: 'Agent utilization, logged time, queue time, break time'
    },
    {
      name: 'Training Agent Performance Summary.csv', 
      required: true,
      uploaded: false,
      description: 'Calls answered, handle times, transfers, holds'
    },
    {
      name: 'Training Interactions.csv',
      required: true,
      uploaded: false,
      description: 'Individual call records, abandonment, duration, queues'
    },
    {
      name: 'HistoricalAdherence 7_24.csv',
      required: false,
      uploaded: false,
      description: 'Schedule adherence, conformance, exceptions - adds workforce management insights'
    },
    {
      name: 'CalculatedTimeSummaryByWeek-L1-L3GroupedHoursSummary_1756248847844.csv',
      required: false,
      uploaded: false,
      description: 'Weekly time tracking - adds time utilization analysis (separate from call center data)'
    }
  ]);

  const handleFileUpload = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fileSize = (file.size / (1024 * 1024)).toFixed(2);
        
        setFiles(prev => prev.map(f => 
          f.name === file.name ? {
            ...f,
            uploaded: true,
            size: `${fileSize} MB`,
            rows: results.data.length,
            columns: results.meta.fields?.length || 0,
            data: results.data
          } : f
        ));
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
      }
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(file => {
      if (files.some(f => f.name === file.name)) {
        handleFileUpload(file);
      }
    });
  }, [files, handleFileUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, fileName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const requiredFiles = files.filter(f => f.required);
  const optionalFiles = files.filter(f => !f.required);
  const allRequiredUploaded = requiredFiles.every(f => f.uploaded);
  const uploadedCount = files.filter(f => f.uploaded).length;

  const handleAnalyzeData = () => {
    setLoading(true);
    
    // Simulate processing time
    setTimeout(() => {
      const csvData: CSVData = {
        agentStatus: files.find(f => f.name.includes('Status'))?.data || [],
        agentPerformance: files.find(f => f.name.includes('Performance'))?.data || [],
        trainingInteractions: files.find(f => f.name.includes('Interactions'))?.data || [],
        historicalAdherence: files.find(f => f.name.includes('Adherence'))?.data || [],
        timeSummary: files.find(f => f.name.includes('CalculatedTimeSummaryByWeek'))?.data || []
      };
      
      onDataLoaded(csvData);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Upload CSV Data Files</h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload CSV files to analyze call center performance. Required files are marked with "*". 
          Optional files provide additional insights.
        </p>
      </div>

      {/* Required Files Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">*Required Files</h3>
        
        <div className="space-y-6">
          {requiredFiles.map((file, index) => (
            <div key={index} className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="mb-4">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {file.name.replace('.csv', '').replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <p className="text-sm text-gray-600">
                  {file.uploaded ? `${file.rows} rows, ${file.columns} columns - ` : ''}{file.description}
                </p>
              </div>

              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file.uploaded 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {file.uploaded ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                    <p className="text-sm font-medium text-green-700">{file.name}</p>
                    <p className="text-xs text-green-600">{file.size}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-2" />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileInput(e, file.name)}
                        className="hidden"
                      />
                      <span className="text-sm text-blue-600 hover:text-blue-500">
                        Click to upload or drag and drop
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Files Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Optional Enhancement Files</h3>
        
        <div className="space-y-6">
          {optionalFiles.map((file, index) => (
            <div key={index} className="border rounded-lg p-6">
              <div className="mb-4">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {file.name.includes('Adherence') ? 'Historical Adherence' : 'Calculated Time Summary'}
                </h4>
                <p className="text-sm text-gray-600">
                  {file.uploaded ? `${file.rows} rows, ${file.columns} columns - ` : ''}{file.description}
                </p>
              </div>

              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file.uploaded 
                    ? 'border-green-300 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {file.uploaded ? (
                  <div className="flex flex-col items-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                    <p className="text-sm font-medium text-green-700">{file.name}</p>
                    <p className="text-xs text-green-600">{file.size}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-2" />
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => handleFileInput(e, file.name)}
                        className="hidden"
                      />
                      <span className="text-sm text-blue-600 hover:text-blue-500">
                        Click to upload or drag and drop
                      </span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status and Analysis Button */}
      {uploadedCount > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
          <div className="mb-4">
            <p className="text-lg font-medium text-blue-600">
              {uploadedCount} of {files.length} files uploaded. {allRequiredUploaded ? 'Analysis ready!' : ''}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Required: {requiredFiles.map(f => f.uploaded ? '✓' : '○').join(' ')} Agent Status, Agent Performance, Training Interactions
              <br />
              Optional: {optionalFiles.map(f => f.uploaded ? '✓' : '○').join(' ')} Historical Adherence, Time Summary
            </p>
          </div>

          {allRequiredUploaded && (
            <button
              onClick={handleAnalyzeData}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors"
            >
              {loading ? 'Processing Data...' : 'Analyze Data'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;