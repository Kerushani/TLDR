let isSpeaking = false;
let speechUtterance = null;

document.getElementById("summarize").addEventListener("click", async () => {
    const summaryElement = document.getElementById("summary");
    const readAloudButton = document.getElementById("readAloud");

    summaryElement.innerText = "Summarizing...";
    summaryElement.classList.add("show");
    readAloudButton.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        chrome.tabs.sendMessage(tab.id, { action: "summarize" }, async (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError.message);
                summaryElement.innerText = "Error: Content script not loaded. Try reloading the page.";
                return;
            }

            if (!response || !response.text) {
                summaryElement.innerText = response?.error || "Failed to extract text.";
                return;
            }

            const apiResponse = await fetch("http://localhost:5000/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: response.text })
            });

            if (!apiResponse.ok) {
                if (apiResponse.status === 500) {
                    summaryElement.innerText = "Request failed. Document may be too long.";
                    return;
                }
                throw new Error(`Server error: ${apiResponse.status}`);
            }

            const data = await apiResponse.json();

            const summaryText = data.summary?.summary_text || data.summary || "No summary available.";
            summaryElement.innerText = summaryText;
            readAloudButton.disabled = false; 
        });
    } catch (error) {
        console.error("Summarization failed:", error);
        summaryElement.innerText = "Error connecting to the server.";
    }
});

document.getElementById("readAloud").addEventListener("click", () => {
    const summaryText = document.getElementById("summary").innerText;
    
    if (!summaryText || summaryText === "Your summary will appear here...") return;

    if (isSpeaking) {
        speechSynthesis.cancel();
        isSpeaking = false;
        document.getElementById("readAloud").innerText = "🔊 Read Aloud";
    } else {
        speechUtterance = new SpeechSynthesisUtterance(summaryText);
        speechUtterance.rate = 1; 
        speechUtterance.pitch = 1; 
        speechUtterance.volume = 1; 

        speechSynthesis.speak(speechUtterance);
        isSpeaking = true;
        document.getElementById("readAloud").innerText = "⏹ Stop";
        
        speechUtterance.onend = () => {
            isSpeaking = false;
            document.getElementById("readAloud").innerText = "🔊 Read Aloud";
        };
    }
});





