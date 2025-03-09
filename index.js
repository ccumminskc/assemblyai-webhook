/**
 * Webhook endpoint to receive updates from AssemblyAI
 */
app.post('/webhook/transcription', async (req, res) => {
    try {
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
    } catch (error) {
        console.error("❌ Webhook Processing Error:", error);
        res.status(500).send('Error processing webhook');
    }
});
