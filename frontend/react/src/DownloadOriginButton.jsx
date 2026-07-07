import React, { useState } from 'react';
import axios from 'axios';

const DownloadOriginButton = ({ jobId, fileName }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    console.log(`Sending origin download request for Job: ${jobId}`);

    try {
      const response = await axios({
        url: 'http://localhost:3001/api/download-origin',
        method: 'POST',
        data: { jobId, fileName },
        responseType: 'blob' // CRITICAL: Tells Axios to process the response as raw binary data
      });

      // 1. Create a binary Blob from the combined chunks sent by the Node backend
      const fileBlob = new Blob([response.data], { type: 'application/pdf' });
      
      // 2. Create a temporary local URL inside the browser pointing to that blob
      const downloadUrl = window.URL.createObjectURL(fileBlob);
      
      // 3. Create a hidden 'a' tag to programmatically click and force the save-as dialog
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', fileName || 'scanned-document.pdf');
      
      document.body.appendChild(link);
      link.click();
      
      // 4. Cleanup: Remove the element and free up browser memory
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log("🎉 File downloaded to browser successfully!");
    } catch (err) {
      console.error("❌ Error during file download:", err);
      setError("Download failed. Check backend console logs.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div style={{ margin: '10px 0' }}>
      <button 
        onClick={handleDownload} 
        disabled={isDownloading}
        style={{
          padding: '10px 16px',
          backgroundColor: isDownloading ? '#cccccc' : '#007bff',
          color: '#ffffff',
          border: 'none',
          borderRadius: '4px',
          cursor: isDownloading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          transition: 'background-color 0.2s'
        }}
      >
        {isDownloading ? '📥 Downloading Chunks...' : '📄 Download Original File'}
      </button>

      {error && (
        <p style={{ color: 'red', fontSize: '14px', marginTop: '5px' }}>
          {error}
        </p>
      )}
    </div>
  );
};

export default DownloadOriginButton;
