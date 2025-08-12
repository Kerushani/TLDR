import express from "express";
import cors from "cors";
import { Ollama } from "ollama";

const app = express();
app.use(express.json());
app.use(cors());

const ollama = new Ollama();

app.post("/summarize", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Text is required - try selecting the text you want to summarize." });
        }

        console.log("Text being sent to BART:", text);

        const response = await ollama.chat({
            model: "deepseek-r1:1.5b",
            messages: [{ role: "user", content: `Summarize this text in 2-3 sentences: ${text}` }],
        });

        console.log("Server esponse from BART:", response);

        if (!response || !response.message || !response.message.content || response.message.content.trim() === "{}") {
            return res.status(500).json({ error: "Unexpected response from BART. Try again with a shorter text." });
        }

        let summary = response.message.content.trim();

        if(summary.includes("</think")){
            summary = summary.split("</think>", 2)[1]?.trim() || summary; 
        }

        res.json({ summary });

    } catch (error) {
        console.error("Threw an error:", error);
        res.status(500).json({ error: "BART cannot summarize", details: error.message });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
