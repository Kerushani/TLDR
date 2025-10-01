let isSpeaking = false;
let speechUtterance = null;
let summaryCount = 0;
let timeSaved = 0;

document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    setupEventListeners();
    updateStats();
});

function loadStats() {
    chrome.storage.local.get(['summaryCount', 'timeSaved'], (result) => {
        summaryCount = result.summaryCount || 0;
        timeSaved = result.timeSaved || 0;
        updateStats();
    });
}

function saveStats() {
    chrome.storage.local.set({
        summaryCount: summaryCount,
        timeSaved: timeSaved
    });
}

function updateStats() {
    document.getElementById('summaryCount').textContent = summaryCount;
    document.getElementById('timeSaved').textContent = timeSaved;
}

function setupEventListeners() {
    document.getElementById("summarize").addEventListener("click", handleSummarize);
    
    document.getElementById("readAloud").addEventListener("click", handleReadAloud);
    
    document.getElementById("summarizeCard").addEventListener("click", () => {
        document.getElementById("summarize").click();
    });
    
    document.getElementById("notesCard").addEventListener("click", handleNotes);
    document.getElementById("focusCard").addEventListener("click", handleFocusMode);
    
    document.getElementById("exportBtn").addEventListener("click", handleExport);
}

async function handleSummarize() {
    const summaryElement = document.getElementById("summary");
    const readAloudButton = document.getElementById("readAloud");
    const summarizeButton = document.getElementById("summarize");
    console.log("we checking if this works")

    summaryElement.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>Summarizing the content...</span>
        </div>
    `;
    summaryElement.classList.add("show");
    readAloudButton.disabled = true;
    summarizeButton.disabled = true;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        const timeoutId = setTimeout(() => {
            console.log("Timeout: No response from content script, re-enabling buttons");
            readAloudButton.disabled = false;
            summarizeButton.disabled = false;
        }, 10000); 

        chrome.tabs.sendMessage(tab.id, { action: "summarize" }, async (response) => {
            clearTimeout(timeoutId);
            console.log("Received response from content script:", response);
            
            const reEnableButtons = () => {
                summarizeButton.disabled = false;
                readAloudButton.disabled = false;
                readAloudButton.removeAttribute('disabled');
                console.log("Read aloud button enabled (post-render):", !readAloudButton.disabled);
            };

            if (chrome.runtime.lastError) {
                console.error("Error:", chrome.runtime.lastError.message);
                summaryElement.innerHTML = `
                    <div class="result-text">
                        <strong>Error:</strong> Content script not loaded. Please reload the page and try again.
                    </div>
                `;
                reEnableButtons();
                return;
            }

            if (!response || !response.summary) {
                summaryElement.innerHTML = `
                    <div class="result-text">
                        <strong>Failed:</strong> ${response?.error || "Unable to extract text from this page."}
                    </div>
                `;
                reEnableButtons();
                return;
            }

            if (response.isSelectedText) {
                summaryElement.innerHTML = `
                    <div class="selected-text-notification">
                        <div class="notification-indicator"></div>
                        <div class="notification-icon">S</div>
                        <div class="notification-content">
                            <div class="notification-title">Selected Text Summary</div>
                            <div class="notification-subtitle">Summarizing highlighted content from the page</div>
                        </div>
                    </div>
                    <div class="result-text">${response.summary}</div>
                `;
                readAloudButton.disabled = false;
                readAloudButton.removeAttribute('disabled');
            } else {
                summaryElement.innerHTML = `
                    <div class="result-text">${response.summary}</div>
                `;
                readAloudButton.disabled = false;
                readAloudButton.removeAttribute('disabled');
            }
            
            summaryCount++;
            timeSaved += 5; 
            saveStats();
            updateStats();
            
            reEnableButtons();
        });
    } catch (error) {
        console.error("Summarization failed:", error);
        summaryElement.innerHTML = `
            <div class="result-text">
                <strong>Error:</strong> Unable to connect to the AI service.
            </div>
        `;
        readAloudButton.disabled = true;
        summarizeButton.disabled = false;
        console.log("Read aloud button enabled after error:", readAloudButton.disabled);
    }
}


function handleReadAloud() {
    const summaryElement = document.getElementById("summary");
    const resultTextElement = summaryElement.querySelector('.result-text');
    const summaryText = resultTextElement ? resultTextElement.textContent : summaryElement.textContent;
    const readAloudButton = document.getElementById("readAloud");

    console.log("Read aloud clicked, summary text:", summaryText);
    console.log("Button disabled:", readAloudButton.disabled);

    if (!summaryText || summaryText.includes("Your AI-generated summary") || summaryText.includes("Your summary will appear here")) {
        console.log("No valid summary text found");
        return;
    }

    if (isSpeaking) {
        speechSynthesis.cancel();
        isSpeaking = false;
        readAloudButton.innerHTML = 'Read Aloud';
    } else {
        speechUtterance = new SpeechSynthesisUtterance(summaryText);
        speechUtterance.rate = 0.9;
        speechUtterance.pitch = 1;
        speechUtterance.volume = 0.8;

        speechSynthesis.speak(speechUtterance);
        isSpeaking = true;
        readAloudButton.innerHTML = 'Stop';
        
        speechUtterance.onend = () => {
            isSpeaking = false;
            readAloudButton.innerHTML = 'Read Aloud';
        };
    }
}

function handleNotes() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url;
        const title = tabs[0].title;
        
        chrome.tabs.create({
            url: `data:text/html,
                <html>
                    <head><title>Notes - ${title}</title></head>
                    <body style="font-family: Inter, sans-serif; padding: 20px; background: #f8fafc;">
                        <h1 style="color: #37352f;">Notes</h1>
                        <p><strong>Page:</strong> ${title}</p>
                        <p><strong>URL:</strong> <a href="${url}">${url}</a></p>
                        <hr>
                        <h2>Your Notes:</h2>
                        <textarea style="width: 100%; height: 300px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; font-family: Inter;"></textarea>
                        <br><br>
                        <button onclick="saveNotes()" style="background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">Save Notes</button>
                        <script>
                            function saveNotes() {
                                const notes = document.querySelector('textarea').value;
                                localStorage.setItem('studynotes_' + '${url}', notes);
                                alert('Notes saved!');
                            }
                            // Load existing notes
                            const savedNotes = localStorage.getItem('studynotes_' + '${url}');
                            if (savedNotes) {
                                document.querySelector('textarea').value = savedNotes;
                            }
                        </script>
                    </body>
                </html>`
        });
    });
}

function handleFocusMode() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "focusMode" }, (response) => {
            const focusCard = document.getElementById("focusCard");
            const originalText = focusCard.querySelector('.feature-title').textContent;
            
            if (response && response.focusMode) {
                focusCard.querySelector('.feature-title').textContent = "Focus On";
                focusCard.style.background = "#fef3c7";
                focusCard.style.borderColor = "#f59e0b";
            } else {
                focusCard.querySelector('.feature-title').textContent = "Focus Off";
                focusCard.style.background = "#f0f9ff";
                focusCard.style.borderColor = "#3b82f6";
            }
            
            setTimeout(() => {
                focusCard.querySelector('.feature-title').textContent = originalText;
                focusCard.style.background = "white";
                focusCard.style.borderColor = "#e2e8f0";
            }, 2000);
        });
    });
}


function handleExport() {
    const summaryText = document.getElementById("summary").querySelector('.result-text')?.textContent;
    
    if (!summaryText || summaryText.includes("Your AI-generated summary")) {
        alert("Please generate a summary first!");
        return;
    }
    
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studynotes_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showFeedback("exportBtn", "Exported!");
}

function showFeedback(buttonId, message) {
    const button = document.getElementById(buttonId);
    const originalText = button.textContent;
    button.textContent = message;
    button.style.background = "#f0f9ff";
    button.style.borderColor = "#3b82f6";
    button.style.color = "#3b82f6";
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = "white";
        button.style.borderColor = "#e2e8f0";
        button.style.color = "#64748b";
    }, 2000);
}