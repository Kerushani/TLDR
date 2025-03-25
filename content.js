function getPageText() {
    return document.body.innerText; 
  }
  
  console.log("Content script loaded!");

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "summarize") {
        let selectedText = window.getSelection().toString().trim();
        let text = selectedText || document.body.innerText.trim();

        if (text.length > 0) {
            sendResponse({ text: text });
        } else {
            sendResponse({ error: "No text found or selected." });
        }
    }
    return true;
});

  


  