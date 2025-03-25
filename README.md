# Web Summarizer - Chrome Extension

A Chrome extension that extracts and summarizes text from any webpage using the **BART (large) model**.  

The extension also features a **"Read Aloud"** function using the **Web Speech API**. 

## Demo Video

https://github.com/user-attachments/assets/1edca9a0-0b38-4025-9840-86c557379f0a

---

## Installation
1. **Download the extension files** or clone the repository:
   ```sh
   git clone git@github.com:Kerushani/chrome-extension.git
2. **Go to Chrome Extensions**  
- Open [`chrome://extensions/`](chrome://extensions/) in your browser  
- Enable **Developer Mode** (toggle in the top right corner)  

3. **Load the extension**  
- Click **"Load Unpacked"**  
- Select the folder containing the extension files  

---

## How to Use  
1. Visit any website or article  
2. **Click the extension icon** in the toolbar  
3. **Click "Summarize"**:  
   - If you **highlight text** → Only the selection is summarized  
   - If **no text is highlighted** → The full page is summarized  
4. **Click "Read Aloud"** to hear the summary  

---

## Backend Setup (Flask Server)  
This extension requires a Flask backend to process summaries.  

### 1. Install dependencies  
   ```sh 
   pip install flask flask-cors huggingface_hub python-dotenv
   ```

### 2. Set up the API Key  
Create a `.env` file in the Flask project and add:  

```sh
API_KEY=your-huggingface-api-key
```

### 3. Run the Server  
To start the Flask backend, run:  

```sh
python3 server.py
```

## Speech Synthesis Fix
If "Read Aloud" does not work, try running this in Chrome DevTools (F12 > Console):

```sh
speechSynthesis.speak(new SpeechSynthesisUtterance("Test speech synthesis."));
```


