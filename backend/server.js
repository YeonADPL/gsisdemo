import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import axios from 'axios';
import https from 'https';

const app = express();
app.use(cors());
app.use(express.json());

// Set up multer to keep files in memory before forwarding
const upload = multer({ storage: multer.memoryStorage() });

// Configuration based on your curl commands
const API_BASE = process.env.API_BASE;
const GS_KEY = process.env.GS_KEY;

// Create an HTTPS agent to ignore self-signed certificate errors (equivalent to curl -k)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Helper to set common headers
const getHeaders = (extraHeaders = {}) => ({
    'GS-Key': GS_KEY,
    ...extraHeaders
});

// 1. Validate GS-Key
app.post('/api/validate', async (req, res) => {
    try {
        const response = await axios.post(`${API_BASE}/ValidateGSKey/${GS_KEY}`, null, {
            headers: getHeaders({'Content-Length': '0'}),
            httpsAgent
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Open Job
app.post('/api/open-job', async (req, res) => {
    const { fileSize } = req.body;
    try {
        const response = await axios.post(`${API_BASE}/OpenJob`, null, {
            headers: getHeaders({
                'BatchScan_DeclaredTotalJobsSizeBytes': fileSize.toString(),
                'BatchScan_DeclareFileCount': '1',
                'Content-Length': '0'
            }),
            httpsAgent
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Upload File
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const { jobId } = req.body;
    const file = req.file;

    try {
        const response = await axios.post(`${API_BASE}/upload/file`, file.buffer, {
            headers: getHeaders({
                'JobID': jobId,
                'FileName': file.originalname,
                'F-Size': file.size.toString(),
                'IsLastFilePart': 'True',
                'AppInfo': 'ReactApp',
                'Content-Type': 'application/octet-stream'
            }),
            httpsAgent
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Activate Job (UPDATED with F-Password Header Formatting)
app.post('/api/activate', async (req, res) => {
    const { jobId, password } = req.body;
    
    try {
        // Base activation headers required by the framework
        const activationHeaders = {
            'ProfileID': '3',
            'AppInfo': 'ReactApp',
            'JobID': jobId,
            'Content-Length': '0'
        };

        // If a password was provided in the frontend, serialize it as an array string
        if (password && password.trim() !== '') {
            // Turning "123456" into '["123456"]' to comply with scanner contracts
            activationHeaders['F-Password'] = JSON.stringify([password]);
            console.log(`🔑 Appending encrypted payload key to activation: ${activationHeaders['F-Password']}`);
        }

        const response = await axios.post(`${API_BASE}/ActivateJob/${jobId}`, null, {
            headers: getHeaders(activationHeaders),
            httpsAgent
        });
        
        res.json(response.data);
    } catch (error) {
        console.error("Activate Job Request Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 5. Scan Status
app.get('/api/status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    try {
        const response = await axios.get(`${API_BASE}/scan/1/${jobId}`, {
            headers: getHeaders({ 'JobID': jobId }),
            httpsAgent
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// ==========================================
// UPGRADED: Helper function to fetch standard scanned file chunks
// ==========================================
function fetchFileChunk(jobId, fileName, position, maxReadBytes) {
    return new Promise((resolve, reject) => {
        const encodedName = encodeURIComponent(fileName);
        
        // DUAL-PASS STRATEGY: URL query parameters + Explicit headers
        const targetUrl = `${API_BASE}/download/file/${jobId}?FileName=${encodedName}&MaxReadBytes=${maxReadBytes}&Position=${position}`;

        const options = {
            method: 'GET',
            rejectUnauthorized: false, 
            headers: {
                'GS-Key': GS_KEY,
                'JobID': jobId,
                'FileName': fileName,
                'MaxReadBytes': String(maxReadBytes),
                'Position': String(position), // Always pass position explicitly
                'User-Agent': 'curl/8.4.0',
                'Accept': 'application/json',
                'Connection': 'close' // CRITICAL: Prevents Windows WCF/IIS socket crashes (ECONNRESET)
            }
        };

        const req = https.request(targetUrl, options, (res) => {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`Scanner status ${res.statusCode}`));
                }
                try {
                    resolve(JSON.parse(rawData));
                } catch (err) {
                    reject(new Error("Failed to parse JSON response payload."));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.end();
    });
}

// ==========================================
// FIXED: Clean Single Reference for Origin Chunk Downloader
// ==========================================
function fetchOriginChunk(jobId, fileName, position, maxReadBytes) {
    return new Promise((resolve, reject) => {
        const encodedName = encodeURIComponent(fileName);
        const targetUrl = `${API_BASE}/downloadOrigin/file/${jobId}?FileName=${encodedName}&MaxReadBytes=${maxReadBytes}&Position=${position}`;
        
        const options = {
            method: 'GET',
            rejectUnauthorized: false,
            headers: {
                'GS-Key': GS_KEY,
                'JobID': jobId,
                'FileName': fileName,
                'MaxReadBytes': String(maxReadBytes),
                'Position': String(position),
                'User-Agent': 'curl/8.4.0',
                'Accept': 'application/json',
                'Connection': 'close' 
            }
        };

        const req = https.request(targetUrl, options, (res) => {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    return reject(new Error(`Server status ${res.statusCode}`));
                }
                try {
                    resolve(JSON.parse(rawData));
                } catch (err) {
                    reject(new Error("Failed to parse response JSON."));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.end();
    });
}

// 6. Download File (Micro-Chunking System)
app.post('/api/download', async (req, res) => {
    console.log("-----------------------------------------");
    console.log("📥 Download triggered from React:", req.body);
    
    const { jobId, fileName } = req.body;
    if (!jobId || !fileName) {
        return res.status(400).json({ error: "Missing jobId or fileName" });
    }

    let position = 0;
    // Lowered from 256KB to 4KB to safely slide under default WCF reader quotas
    const maxReadBytes = 4096; 
    let isEOF = false;
    const fileBuffers = [];

    try {
        console.log(`🏁 Starting micro-chunk download sequence for: ${fileName}`);
        
        while (!isEOF) {
            console.log(`📥 Fetching chunk at byte offset Position: ${position}...`);
            
            const filePart = await fetchFileChunk(jobId, fileName, position, maxReadBytes);
            
            // Handle both PascalCase and camelCase variations safely
            const base64Payload = filePart.Payload !== undefined ? filePart.Payload : filePart.payload;
            const eofFlag = filePart.IsEOF !== undefined ? filePart.IsEOF : filePart.isEOF;

            if (base64Payload === undefined || eofFlag === undefined) {
                throw new Error("Scanner response missing expected 'Payload' or 'IsEOF' fields.");
            }

            const chunkBuffer = Buffer.from(base64Payload, 'base64');
            fileBuffers.push(chunkBuffer);
            
            isEOF = eofFlag;
            position += chunkBuffer.length;

            // Fail-safe circuit breaker
            if (chunkBuffer.length === 0 && !isEOF) {
                console.warn("⚠️ Endless loop protection hit (0 bytes read but EOF false). Force breaking.");
                break;
            }
        }

        console.log(`🎉 Success! File fully assembled. Total Size: ${position} bytes.`);
        const finalPdfBuffer = Buffer.concat(fileBuffers);

        res.writeHead(200, {
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Type': 'application/pdf',
            'Content-Length': finalPdfBuffer.length
        });
        
        res.end(finalPdfBuffer);

    } catch (error) {
        console.error("❌ Chunked Download Process Failed:", error.message);
        res.status(500).json({ error: "Failed to piece together file download", details: error.message });
    }
});



// Helper function to fetch chunks from the Origin endpoint

// New API Route for Origin File Downloads
app.post('/api/download-origin', async (req, res) => {
    console.log("-----------------------------------------");
    console.log("📥 Origin Download triggered from React:", req.body);
    
    const { jobId, fileName } = req.body;
    if (!jobId || !fileName) {
        return res.status(400).json({ error: "Missing jobId or fileName" });
    }

    let position = 0;
    const maxReadBytes = 256 * 1024; // 256KB chunks as recommended in the manual
    let isEOF = false;
    const fileBuffers = [];

    try {
        console.log(`🏁 Starting Origin chunk loop for file: ${fileName}`);
        
        while (!isEOF) {
            console.log(`📥 Fetching origin chunk at byte offset Position: ${position}...`);
            
            const data = await fetchOriginChunk(jobId, fileName, position, maxReadBytes);
            
            // Check for .NET server exceptions returned inside the valid JSON payload
            const serverException = data.Exception || data.exception;
            if (serverException) {
                throw new Error(`WCF Server Exception: ${JSON.stringify(serverException)}`);
            }

            // Capture payload and EOF flags safely (case-insensitive fallback)
            const payload = data.Payload !== undefined ? data.Payload : data.payload;
            const eofFlag = data.IsEOF !== undefined ? data.IsEOF : data.isEOF;

            if (payload === undefined || eofFlag === undefined) {
                throw new Error("Server response missing 'payload' or 'IsEOF' fields.");
            }

            // Convert payload to buffer (Handles both Base64 strings and raw JSON byte arrays)
            let chunkBuffer;
            if (typeof payload === 'string') {
                chunkBuffer = Buffer.from(payload, 'base64');
            } else if (Array.isArray(payload)) {
                chunkBuffer = Buffer.from(payload);
            } else {
                throw new Error("Unexpected payload data type received from server.");
            }

            fileBuffers.push(chunkBuffer);
            console.log(`✅ Received chunk. Extracted ${chunkBuffer.length} bytes.`);

            isEOF = eofFlag;
            position += chunkBuffer.length;

            // Fail-safe protection loop breaker
            if (chunkBuffer.length === 0 && !isEOF) {
                console.warn("⚠️ Loop breaker hit: 0 bytes read but IsEOF is false.");
                break;
            }
        }

        console.log(`🎉 Origin File assembly complete! Total: ${position} bytes.`);
        const finalFileBuffer = Buffer.concat(fileBuffers);

        // Stream the completely assembled file down to the browser
        res.writeHead(200, {
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Type': 'application/pdf', // Adjusted for your PDFs
            'Content-Length': finalFileBuffer.length
        });
        
        res.end(finalFileBuffer);

    } catch (error) {
        console.error("❌ Origin Download Failed:", error.message);
        res.status(500).json({ error: "Failed downloading origin file", details: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Backend proxy running on http://localhost:${PORT}`);
});
