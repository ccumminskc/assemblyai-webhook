const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Load FileMaker API credentials from .env file
const FILEMAKER_SERVER = process.env.FILEMAKER_SERVER;
const FILEMAKER_DATABASE = process.env.FILEMAKER_DATABASE;
const FILEMAKER_USERNAME = process.env.FILEMAKER_USERNAME;
const FILEMAKER_PASSWORD = process.env.FILEMAKER_PASSWORD;
const FILEMAKER_LAYOUT = process.env.FILEMAKER_LAYOUT;

/**
 * Get an authentication token from FileMaker
 */
async function getFileMakerToken() {
    const authURL = `${FILEMAKER_SERVER}/fmi/data/vLatest/databases/${FILEMAKER_DATABASE}/sessions`;

    try {
        const response = await axios.post(authURL, {}, {
            auth: {
                username: FILEMAKER_USERNAME,
                password: FILEMAKER_PASSWORD
            }
        });

        return response.data.response.token; // Return session token
    } catch (error) {
        console.error("FileMaker Authentication Error:", error.response.data);
        throw new Error("Failed to authenticate with FileMaker.");
    }
}

/**
 * Find a record in FileMaker by transcript_id
 */
async function findFileMakerRecord(transcriptId, token) {
    const findURL = `${FILEMAKER_SERVER}/fmi/data/vLatest/databases/${FILEMAKER_DATABASE}/layouts/${FILEMAKER_LAYOUT}/_find`;

    const payload = {
        query: [{ transcript_id: transcriptId.toString() }]
    };

    try {
        const response = await axios.post(findURL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const records = response.data.response.data;
        if (records.length > 0) {
            return records[0].recordId; // Return the recordId of the first matching record
        } else {
            throw new Error(`No record found with transcript_id: ${transcriptId}`);
        }
    } catch (error) {
        console.error("Error finding FileMaker record:", error.response.data);
        throw new Error("Failed to find record in FileMaker.");
    }
}

/**
 * Update the transcript record in FileMaker
 */
async function updateFileMakerRecord(transcriptId, text) {
    const token = await getFileMakerToken();

    try {
        // Find the recordId based on transcriptId
        const recordId = await findFileMakerRecord(transcriptId, token);

        // Update the record using the recordId
        const updateURL = `${FILEMAKER_SERVER}/fmi/data/vLatest/databases/${FILEMAKER_DATABASE}/layouts/${FILEMAKER_LAYOUT}/records/${recordId}`;

        const payload = {
            fieldData: {
                call_transcript: text,
                transcriptProcess: "Completed"
            }
        };

        await axios.patch(updateURL, payload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Updated transcript ${transcriptId} in FileMaker.`);
    } catch (error) {
        console.error("Error updating FileMaker:", error.response.data);
    }
}

/**
 * Webhook endpoint to receive updates from AssemblyAI
 */
app.post('/webhook/transcription', async (req, res) => {
    console.log("🚀 Webhook Received from AssemblyAI:");
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));

    const { transcript_id, status, text } = req.body;
    console.log(`📌 Extracted transcript_id: ${transcript_id}`);

    if (status === "completed") {
        console.log("⏳ Waiting 5 seconds before searching in FileMaker...");
        await new Promise(resolve => setTimeout(resolve, 5000)); // Delay before searching

        await updateFileMakerRecord(transcript_id, text);
    }

    res.status(200).send('Webhook received'); // Explicitly return 200
});

    try {
        const { transcript_id, status, text } = req.body;
        console.log(`Received webhook for transcript_id: ${transcript_id}`);

        if (status === "completed") {
            app.post('/webhook/transcription', async (req, res) => {
                console.log("Received Webhook Payload:", JSON.stringify(req.body, null, 2));
                
                const { transcript_id, status, text } = req.body;
                console.log(`Extracted transcript_id: ${transcript_id}`);
            
                if (status === "completed") {
                    console.log("Waiting 5 seconds before searching in FileMaker...");
                    await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second delay
            
                    await updateFileMakerRecord(transcript_id, text);
                }
            
                res.status(200).send('Webhook received');
            });
            
        }

        res.status(200).send('Webhook received');
    } catch (error) {
        console.error("Webhook Processing Error:", error);
        res.status(500).send('Error processing webhook');
    }
});

app.listen(3000, () => console.log('Webhook server running on port 3000'));
