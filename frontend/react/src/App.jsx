import React, { useState } from 'react';
import DownloadOriginButton from './DownloadOriginButton';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [file, setFile] = useState(null);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState(null);

  const addLog = (message) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const handleProcess = async () => {
    if (!file) return alert("Please select a file first");
    
    setIsProcessing(true);
    setLogs([]);
    setDownloadInfo(null);
    let currentJobId = null;

    try {
      // Step 1: Validate Key
      addLog("Validating GS-Key...");
      await fetch(`${API_BASE_URL}/validate`, { method: 'POST' });

      // Step 2: Open Job
      addLog("Opening new job...");
      const openJobRes = await fetch(`${API_BASE_URL}/open-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileSize: file.size })
      });
      const openJobData = await openJobRes.json();
      currentJobId = openJobData.JobID;
      addLog(`Job created: ${currentJobId}`);

      // Step 3: Upload File
      addLog("Uploading file to scanner...");
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobId', currentJobId);
      
      await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      addLog("File uploaded successfully.");

      // Step 4: Activate Job
      addLog("Activating job...");
      await fetch(`${API_BASE_URL}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: currentJobId })
      });

	// Step 5: Poll Scan Status
      addLog("Scanning in progress...");
      let isDone = false;
      let finalFileName = null;

      while (!isDone) {
        await delay(2000); // Poll every 2 seconds
        const statusRes = await fetch(`${API_BASE_URL}/status/${currentJobId}`);
        const statusData = await statusRes.json();
        
        if (statusData.ScanProgress === 100 || statusData.Scan_Status_c === 3) {
          isDone = true;
          
          // 🔍 DIAGNOSTIC: Print the full object to your browser console to inspect keys
          console.log("🔍 FULL SCANNER RAW DATA LOG:", statusData);
          
          const scanLog = statusData.ScansLogArr && statusData.ScansLogArr[0];
          if (scanLog) {
            // Prioritize OutputFileName as requested by the manual documentation
            finalFileName = scanLog.OutputFileName || scanLog.UniqueFileName || scanLog.FileName;
            addLog(`Scan complete! Selected target file: ${finalFileName}`);
          } else {
            addLog("Scan reports complete, but ScansLogArr structure is missing.");
          }
       }  else {
          addLog(`Scanning... ${statusData.ScanProgress}%`);
        }
      }

      // 🏁 Prepare Download (Crucial state updates added back)
      if (finalFileName) {
        setDownloadInfo({ jobId: currentJobId, fileName: finalFileName });
        addLog("Ready for download.");
      } else {
        addLog("ERROR: Scan finished but no filename could be determined.");
      }

} catch (error) {
      addLog(`ERROR: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadInfo) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(downloadInfo)
      });

      if (!res.ok) {
	console.log("handleDownload not ok");
	 throw new Error("Download failed");
      }

      // Create a blob and force the browser to download it
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scanned_${file.name}`; // Original file name with prefix
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
	console.log("Download Catch Error : ", error.message);
      addLog(`Download ERROR: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2>SASA GSIS Scanner</h2>
      
      <div style={{ marginBottom: '1rem' }}>
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files[0])} 
          disabled={isProcessing}
        />
      </div>

      <button 
        onClick={handleProcess} 
        disabled={!file || isProcessing}
        style={{ padding: '0.5rem 1rem', cursor: 'pointer', marginBottom: '1rem' }}
      >
        {isProcessing ? 'Processing...' : 'Start Scan'}
      </button>

      {downloadInfo && (
        <button 
          onClick={handleDownload}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer', marginBottom: '1rem', marginLeft: '1rem', backgroundColor: '#4CAF50', color: 'white', border: 'none' }}
        >
          Download Scanned File
        </button>
      )}

     {downloadInfo && (
	<DownloadOriginButton 
	jobId={downloadInfo.jobId} 
	fileName={downloadInfo.fileName} 
        />
      )}

      <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', minHeight: '200px' }}>
        <strong>Process Logs:</strong>
        <ul style={{ listStyleType: 'none', paddingLeft: 0, fontSize: '0.9rem' }}>
          {logs.map((log, index) => (
            <li key={index}>{log}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;

