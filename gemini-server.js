import {GoogleGenAI} from "@google/genai";
import express from "express";
import cors from "cors";


const app = express();
app.use(express.json({limit:"1mb"}));
app.use(cors())

const GEMINI_API_KEY = ""
if(!GEMINI_API_KEY){
    console.log("missing Gemini API key")
}

const client = new GoogleGenAI({apiKey: GEMINI_API_KEY});
const DEFAULT_MODEL = "gemini-2.5-flash"

const buildPrompt = (mode, text) => {
    switch(mode){
        case "keypoints":
            return `Summerize into 5-7 concise bullet points with short evidence quotes.\n\n${text}`;
        case "actions":
            return `Extract action items. Return strict JSON: {"actions":[{"title":string,"owner":string|null,"due":string|null}]}\n\n${text}}`;
        case "exec":
            return `Write an executive brief (5 bullets + conclusion).\n\n${text}`;
        default:
            return `Summarize in 2-3 sentences:\n\n${text}`
    }
}


app.post("/summarize", async(req,res) => {
    try {
        const { text, mode="tldr",model=DEFAULT_MODEL} = req.body || {};
        if(!text?.trim()) return res.status(400).json({error:"Text is required"});
        const prompt=buildPrompt(mode,text);

        const result = await client.models.generateContent({
            model:model,
            contents:prompt,
        });
        const summary = result.text;

        res.json({summary})
    } catch(error){
        console.error("Gemini summerize failed", error);
        res.status(500).json({error:"Summerization failed", details: String(error?.message || err)});
    }
})

// streaming -> user doesn't see a spinner

// app.post("/summarize-stream", async(req,res) => {
//     try{
//         const{text,mode="tldr",model=DEFAULT_MODEL} = req.body||{};
//         if(!text?.trim()) return res.status(400).end("Text required");

//         const modelClient = client.models.getGenerativeModel({model});
//         const prompt = buildPrompt(mode, text);

//         res.setHeader("Content-Type", "text/event-stream")
//         res.setHeader("Cache-Control", "no-cache");
//         res.setHeader("Connection", "keep-alive")

//         const stream = await modelClient.generateContentStream(prompt)
//         for await (const chunk of stream.stream){
//             const token = chunk.text();
//             if (token) res.write(`date:${JSON.stringify(token)}\n\n`);
//         }
//         res.write("event: done\ndata: end\n\n");
//         res.end();
//     } catch (err){
//         console.error("Streaming error", err);
//         res.write(`event: error\ndata:${JSON.stringify(String(err?.message || err))}\n\n`);
//         res.end();
//     }
// })

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Gemini server running on port ${PORT}`))
