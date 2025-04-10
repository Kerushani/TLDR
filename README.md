# TLDR - Chrome Extension

A Chrome extension that extracts and summarizes text from any webpage using the **BART (large) model**.  

The extension also has a **"Read Aloud"** function using the **Web Speech API**. 

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

## Backend Setup (Node.js + Ollama)

This project uses [Ollama](https://ollama.com) to run the `deepseek-r1` large language model (LLM) **locally**, with an Express.js backend acting as the middleman between your frontend and the LLM.

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- [Ollama](https://ollama.com/download) installed (macOS, Linux, or Windows)

---

### Step 1: Install Ollama

Download and install Ollama for your OS from the official site:

https://ollama.com/download

After installing, verify the CLI is available:

```bash
ollama --version
```

### Step 2: Run the DeepSeek-R1 Model

We're using the `deepseek-r1` model — a powerful.

To download and launch it, run:

```bash
ollama run deepseek-r1
```
### Step 3: Run the Node Backend

Install dependencies:

```bash
npm install
```

Install dependencies:
```bash
node server.js
```
The server will be running at:
```bash
http://localhost:5000
```