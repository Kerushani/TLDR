chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "summarize") {
        let selectedText = window.getSelection().toString().trim();
        let text = selectedText || document.body.innerText.trim();

        console.log("Text being sent to BART:", text);

        if (text.length > 0) {
            fetch("http://localhost:5000/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            })
                .then(response => response.json())
                .then(data => {
                    console.log("Raw Data from BART:", data);

                    let summaryText = data.summary;

                    if (typeof summaryText === "string" && summaryText.startsWith("{")) {
                        try {
                            let parsed = JSON.parse(summaryText);
                            if (parsed && typeof parsed === "object") {
                                summaryText = parsed.summary || summaryText;
                            }
                        } catch (e) {
                            console.error("Error parsing nested JSON:", e);
                        }
                    }

                    sendResponse({ summary: summaryText });
                })
                .catch(error => {
                    console.error("Error during fetch:", error);
                    sendResponse({ error: "Failed to summarize." });
                });

            return true;
        } else {
            sendResponse({ error: "No text found or selected." });
        }
    }
    return true;
});
