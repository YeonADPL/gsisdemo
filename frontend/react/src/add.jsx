import React, { useState } from 'react';
import DownloadOriginButton from './DownloadOriginButton';
// 1. Import zip.js components
import { ZipReader, BlobReader, NullWriter } from '@zip.js/zip.js';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingScanned, setIsDownloadingScanned] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState(null);

  const addLog = (message) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]);
  };

  // 2. NEW: Local validation utility 
  const validateZipPassword = async (targetFile, zipPassword) => {
    if (!targetFile || !targetFile.name.endsWith('.zip')) {
      return { isValid: true }; // Ignore non-zip files
    }

    const reader = new ZipReader(new BlobReader(targetFile), { password: zipPassword });
    try {
      const entries = await reader.getEntries();
      // Locate the first actual file entry to test decompression
      const testEntry = entries.find(entry => !entry.directory);
      
      if (testEntry) {
        // NullWriter decrypts and processes the stream safely without allocating memory
        await testEntry.getData(new NullWriter());
      }
      
      await reader.close();
      return { isValid: true };
    } catch (error) {
      await reader.close();
      const errorMsg = error.message.toLowerCase();
      
      // Look for common decryption/password error strings from zip.js signature checks
      if (errorMsg.includes('password') || errorMsg.includes('encrypted') || errorMsg.includes('decrypt')) {
        return {
          isValid: false,
          message: zipPassword ? "Incorrect ZIP password. Please check your password and try again." : "This ZIP file is encrypted. Please enter a password to proceed."
        };
      }
      return { isValid: false, message: "Could not read ZIP archive. File may be corrupt." };
    }
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const handleProcess = async () => {
    if (!file) return alert("Please select a file first");
    
    setIsProcessing(true);
    setLogs([]);
    setDownloadInfo(null);

    // 3. NEW: Validate password BEFORE calling any API endpoints
    addLog("Checking ZIP archive integrity and security parameters...");
    const verification = await validateZipPassword(file, password);
    
    if (!verification.isValid) {
      addLog(`Validation Interrupted: ${verification.message}`);
      alert(verification.message);
      setIsProcessing(false);
      return; // Stop the execution loop early
    }
    addLog("Archive verification clear. Initiating upload pipeline...");

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
      
      await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
      addLog("File uploaded successfully.");

      // Step 4: Activate Job 
      addLog("Activating job...");
      await fetch(`${API_BASE_URL}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: currentJobId, password })
      });

      // Step 5: Poll Scan Status
      addLog("Scanning in progress...");
      let isDone = false;
      let finalFileName = null;

      while (!isDone) {
        await delay(2000); 
        const statusRes = await fetch(`${API_BASE_URL}/status/${currentJobId}`);
        const statusData = await statusRes.json();
        
        if (statusData.ScanProgress === 100 || statusData.Scan_Status_c === 3) {
          isDone = true;
          const scanLog = statusData.ScansLogArr && statusData.ScansLogArr[0];
          if (scanLog) {
            finalFileName = scanLog.OutputFileName || scanLog.UniqueFileName || scanLog.FileName;
            addLog(`Scan complete! Selected target file: ${finalFileName}`);
          } else {
            addLog("Scan reports complete, but ScansLogArr structure is missing.");
          }
        } else {
          addLog(`Scanning... ${statusData.ScanProgress}%`);
        }
      }

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

  // ... rest of your handleDownload and JSX remains the same
