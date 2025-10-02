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
    
}

function formatToBulletHTML(raw = "") {
    let s = String(raw).replace(/\r\n/g, "\n").trim();
  
    const firstBullet = s.search(/(^|\n)\s*(?:[-*]|\d+[.)])\s+/);
    if (firstBullet > 0) s = s.slice(firstBullet).trim();
  
    const lines = s.split("\n").map(l => l.trim()).filter(Boolean);
    const items = [];
    for (const line of lines) {
      const m = line.match(/^(?:[-*]|\d+[.)])\s+(.*)$/);
      if (m) {
        items.push(m[1]);
      } else if (items.length) {
        items[items.length - 1] += " " + line;
      }
    }
  
    if (!items.length) return `<p>${escapeHtml(s)}</p>`;
  
    const md = (t) =>
      escapeHtml(t)
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/`([^`]+)`/g, "<code>$1</code>");
  
    return `<ul class="tldr-list">${items.map(li => `<li>${md(li)}</li>`).join("")}</ul>`;
  }
  
  function escapeHtml(x = "") {
    return x.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
  }
  
  (function ensureListStyles(){
    if (document.getElementById("tldr-list-styles")) return;
    const style = document.createElement("style");
    style.id = "tldr-list-styles";
    style.textContent = `
      .result-text .tldr-list { margin: 0; padding-left: 1.2em; }
      .result-text .tldr-list li { margin: 6px 0; line-height: 1.5; }
      .result-text code { background:#f4f4f5; padding:2px 6px; border-radius:6px; }
    `;
    document.head.appendChild(style);
  })();

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
                <strong>Error:</strong> Unable to connect to the summarizing service.
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

function showNotificationMessage(msg) {
    const container = document.getElementById("notificationArea");
    if (!container) return;
  
    container.innerHTML = `
      <div style="
        margin:8px 0; padding:10px 14px;
        background:#f0f9ff; border:1px solid #bae6fd;
        border-radius:8px; font-size:13px; color:#0369a1;s
        font-family: Inter, sans-serif;">
        ${msg}
      </div>
    `;
  }

function handleNotes() {
    showNotificationMessage("Notes are being generated...")
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      const title = tabs[0].title;
  
      chrome.tabs.sendMessage(tabs[0].id, { action: "extractText" }, async (response) => {
        const text = response?.text || "";
  
        let keypoints = "";
        let execBrief = "";
  
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
          keypoints = kpRes.summary || "";
          execBrief = execRes.summary|| "";
        } catch {
          keypoints = "- Unable to generate key points.";
          execBrief = "Unable to generate executive summary.";
        }
        showNotificationMessage("Notes opened in a new tab");
        const encoded = encodeURIComponent(`
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>Notes - ${title}</title>
    <style>
      body { font-family: Inter, sans-serif; padding: 32px; background: #fafafa; color:#111; }
      .container { max-width: 800px; margin:auto; background:#fff; padding:24px; border-radius:12px; }
      h1 { font-size: 24px; margin-bottom: 8px; }
      h2 { font-size: 18px; margin-top: 20px; }
      .meta { color:#555; font-size:13px; margin-bottom: 20px; }
      .btn { padding: 8px 12px; border:none; border-radius:6px; background:#3b82f6; color:white; cursor:pointer; }
      @media print { .btn { display:none !important; } body { background:#fff; } .container { box-shadow:none; } }
    </style>
  </head>
  <body>
    <div class="container">
        <button class="btn" onclick="window.print()">Download PDF</button>
      <h1>${title}</h1>
      <div class="meta">Source: <a href="${url}">${url}</a></div>
  
      <h2>Key Points</h2>
      <div>${formatToBulletHTML(keypoints)}</div>
  
      <h2>Executive Summary</h2>
      <div>${formatToBulletHTML(execBrief)}</div>
  
      <h2>Raw Extracted Text</h2>
      <div style="white-space:pre-wrap; border:1px solid #eee; padding:12px; border-radius:8px;">
        ${(text || "").substring(0, 20000).replace(/</g, "&lt;")}
      </div>
  
      <br>
    </div>
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