# TLDR - Chrome Extension

A Chrome extension that extracts and summarizes text from any webpage using DeepSeek-r1.

The extension also has a "Read Aloud" function using the Web Speech API. 

## Demo Video

https://github.com/user-attachments/assets/f2e74fc5-7912-4da7-9d6b-4f9edd5be9b7

---

## Installation
1. Download the extension files or clone the repository:
   ```sh
   git clone git@github.com:Kerushani/chrome-extension.git
2. **Go to Chrome Extensions**  
- Open [`chrome://extensions/`](chrome://extensions/) in your browser  
- Enable **Developer Mode** (toggle in the top right corner)  

3. **Load the extension**  
- Click "Load Unpacked"
- Select the folder containing the extension files   

---

## Backend Setup (Node.js + Ollama to run LLM locally)
---

### Step 1: Install Ollama

```bash
ollama --version
```

### Step 2: Run the DeepSeek-R1 Model

```bash
ollama run deepseek-r1
```
### Step 3: Run the Node Backend

```bash
npm install
```
```bash
node server.js
```
```bash
http://localhost:5000
```
