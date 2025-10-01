
let focusModeActive = false;
let highlightModeActive = false;
let translateModeActive = false;

document.addEventListener('DOMContentLoaded', () => {
    console.log('StudyHub content script loaded');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case "summarize":
            handleSummarize(sendResponse);
            break;
        case "focusMode":
            handleFocusMode(sendResponse);
            break;
        case "extractText": {
            const selectedText = window.getSelection().toString().trim();
            const text = selectedText || document.body.innerText.trim();
            const isSelectedText = selectedText.length > 0;
            sendResponse({ text, isSelectedText });
            break;
        }
        default:
            sendResponse({ error: "Unknown action" });
    }
    return true;
});

async function handleSummarize(sendResponse) {
    console.log("Content script: handleSummarize called");
    let selectedText = window.getSelection().toString().trim();
    let text = selectedText || document.body.innerText.trim();
    let isSelectedText = selectedText.length > 0;

    console.log("Text being sent for summarization:", text);
    console.log("Is selected text:", isSelectedText);

    if (isSelectedText) {
        showNotification("Selected Text Detected", "Summarizing highlighted content...");
    } else {
        showNotification("Full Page Summary", "Summarizing entire page content...");
    }

    if (text.length > 0) {
        try {
            const response = await fetch("http://localhost:3000/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            const data = await response.json();
            console.log("Raw Data from AI:", data);

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

            console.log("Content script: Sending successful response");
            sendResponse({ summary: summaryText, isSelectedText: isSelectedText });
        } catch (error) {
            console.error("Error during fetch:", error);
            console.log("Content script: Sending error response");
            sendResponse({ error: "Failed to summarize. Please check if the server is running." });
        }
    } else {
        console.log("Content script: No text found, sending error");
        sendResponse({ error: "No text found or selected." });
    }
}

function handleFocusMode(sendResponse) {
    focusModeActive = !focusModeActive;
    
    if (focusModeActive) {
        const style = document.createElement('style');
        style.id = 'studynub-focus-mode';
        style.textContent = `
            /* Hide distracting elements */
            .ad, .advertisement, .ads, .sidebar, .social-share, 
            .comments, .related-articles, .newsletter, .popup,
            .banner, .promo, .sponsored, .recommended {
                display: none !important;
            }
            
            /* Focus on main content */
            body {
                background: #f8fafc !important;
            }
            
            /* Highlight main content area */
            main, article, .content, .post, .entry {
                background: white !important;
                border-radius: 12px !important;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
                padding: 24px !important;
                margin: 20px auto !important;
                max-width: 800px !important;
            }
        `;
        document.head.appendChild(style);
        
        showNotification("Focus Mode Activated", "Distractions hidden for better concentration");
    } else {
        const existingStyle = document.getElementById('studynub-focus-mode');
        if (existingStyle) {
            existingStyle.remove();
        }
        showNotification("Focus Mode Deactivated", "All content restored");
    }
    
    sendResponse({ focusMode: focusModeActive });
}


function showNotification(title, message) {
    const existing = document.getElementById('studynub-notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'studynub-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
        z-index: 10000;
        font-family: Inter, sans-serif;
        font-size: 14px;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 4px;">${title}</div>
        <div style="opacity: 0.9; font-size: 12px;">${message}</div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }
    }, 3000);
}
