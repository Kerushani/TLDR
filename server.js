import { Ollama } from 'ollama'

let content = "BART model pre-trained on English language, and fine-tuned on CNN Daily Mail. It was introduced in the paper BART: Denoising Sequence-to-Sequence Pre-training for Natural Language Generation, Translation, and Comprehension by Lewis et al. and first released in [this repository (https://github.com/pytorch/fairseq/tree/master/examples/bart).Disclaimer: The team releasing BART did not write a model card for this model so this model card has been written by the Hugging Face team.Model description BART is a transformer encoder-encoder (seq2seq) model with a bidirectional (BERT-like) encoder and an autoregressive (GPT-like) decoder. BART is pre-trained by (1) corrupting text with an arbitrary noising function, and (2) learning a model to reconstruct the original text.BART is particularly effective when fine-tuned for text generation (e.g. summarization, translation) but also works well for comprehension tasks (e.g. text classification, question answering). This particular checkpoint has been fine-tuned on CNN Daily Mail, a large collection of text-summary pairs."

const summarize = async (content, showThinking = false) => {
    const ollama = new Ollama({ host: 'http://127.0.0.1:11434' })
    const prompt = "Please provide a concise summary of the following content:" 
    const response = await ollama.chat({
      model: 'deepseek-r1:1.5b',
      messages: [{ role: 'user', content: `${prompt} ${content}` }],
    })
    const messageContent = response.message.content
    if (showThinking == true){
        return messageContent
    } else {
        // return messageContent.replace(/<\s*think\s*>[\s\S]*<\s*\/\s*think\s*>/gi, '')
        // return messageContent.split("</think>", 1)[1];
        return messageContent.split("</think>", 2)[1];
    }
}
const response = await summarize(content)
console.log(response)
