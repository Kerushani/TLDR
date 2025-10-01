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
        const tabId = tabs[0].id;
        const pageUrl = tabs[0].url;
        const pageTitle = tabs[0].title;

        // Ask content script for selected or full text
        chrome.tabs.sendMessage(tabId, { action: "extractText" }, async (response) => {
            const text = response?.text || '';

            // Build prompts via gemini-server using keypoints and exec
            let keypoints = '';
            let execBrief = '';
            try {
                const [kpRes, execRes] = await Promise.all([
                    fetch("http://localhost:3000/summarize", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text, mode: "keypoints" })
                    }).then(r => r.json()),
                    fetch("http://localhost:3000/summarize", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text, mode: "exec" })
                    }).then(r => r.json())
                ]);

                keypoints = kpRes.summary || '';
                execBrief = execRes.summary || '';
            } catch (e) {
                keypoints = "- Unable to generate key points.";
                execBrief = "Unable to generate executive summary.";
            }

            // Render a printable HTML with markdown-like styling and a print-to-PDF option
            const encoded = encodeURIComponent(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Notes - ${pageTitle}</title>
    <style>
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color:#111; background:#fafafa; margin:0; }
      .container { max-width: 900px; margin: 40px auto; padding: 32px; background:#fff; border:1px solid #eee; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.06); }
      .topbar { display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; }
      .meta { color:#666; font-size:13px; }
      h1 { font-size: 26px; margin: 12px 0 8px; }
      h2 { font-size: 18px; margin: 24px 0 8px; }
      p, li { line-height: 1.6; }
      pre { background:#0f172a; color:#e2e8f0; padding: 14px; border-radius:8px; overflow:auto; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:#f4f4f5; padding:2px 6px; border-radius:6px; }
      .pill { display:inline-block; padding:4px 10px; border-radius:9999px; border:1px solid #e5e7eb; background:#f8fafc; color:#334155; font-size:12px; }
      .toolbar { display:flex; gap:8px; }
      .btn { border:1px solid #e5e7eb; background:#111; color:#fff; padding:8px 12px; border-radius:8px; cursor:pointer; font-size:13px; }
      .btn.outline { background:#fff; color:#111; }
      .card { border:1px solid #e5e7eb; border-radius:10px; padding:16px; background:#fff; }
      .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
      @media (max-width: 800px){ .grid{ grid-template-columns:1fr; } }
      hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
      ul { padding-left: 18px; }
    </style>
  </head>
  <body>
    <div class="container">
       <div class="topbar">
         <div>
           <div class="pill">Notes</div>
           <h1>${pageTitle}</h1>
           <div class="meta">Source: <a href="${pageUrl}">${pageUrl}</a></div>
         </div>
         <div class="toolbar">
           <button class="btn" onclick="window.print()">Download PDF</button>
           <button class="btn outline" onclick="copyMarkdown()">Copy Markdown</button>
         </div>
       </div>

       <div class="grid">
         <div class="card">
           <h2>Key Points</h2>
           <div id="kp">${keypoints.replace(/</g,'&lt;')}</div>
         </div>
         <div class="card">
           <h2>Executive Summary</h2>
           <div id="exec">${execBrief.replace(/</g,'&lt;')}</div>
         </div>
       </div>

       <hr />
       <h2>Raw Extracted Text</h2>
       <div class="card" style="white-space:pre-wrap">${(text || '').substring(0, 20000).replace(/</g,'&lt;')}</div>
    </div>

    <script>
      function copyMarkdown(){
        const md = `# ${pageTitle}\n\n## Key Points\n${keypoints}\n\n## Executive Summary\n${execBrief}`;
        navigator.clipboard.writeText(md).then(()=>alert('Markdown copied to clipboard'));
      }
      // Use print styles to export to PDF via browser print dialog
      const style = document.createElement('style');
      style.textContent = `@media print { body{background:#fff} .btn,.pill,.toolbar,.meta a{ display:none!important } .container{ box-shadow:none; border:none; } }`;
      document.head.appendChild(style);
    </script>
  </body>
</html>`);

            chrome.tabs.create({ url: `data:text/html;charset=utf-8,${encoded}` });
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