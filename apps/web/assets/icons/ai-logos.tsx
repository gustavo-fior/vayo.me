import OpenAI from "./open-ai";
import Anthropic from "./anthropic";
import Mistral from "./mistral";
import Cohere from "./cohere";
import Claude from "./claude";
import Gemini from "./gemini";
import Google from "./google";
import XAI from "./xai";
import DeepSeek from "./deepseek";
import Perplexity from "./perplexity";

const aiLogos = {
  openai: OpenAI,
  anthropic: Anthropic,
  mistral: Mistral,
  cohere: Cohere,
  claude: Claude,
  gemini: Gemini,
  google: Google,
  xai: XAI,
  deepseek: DeepSeek,
  perplexity: Perplexity,
};

export default aiLogos;
