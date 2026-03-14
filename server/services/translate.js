const axios = require("axios");

async function translateText(text, source = 'Autodetect', target = 'en') {
  let langPair;
  if (source === 'Autodetect') {
      langPair = `Autodetect|${target}`;
  } else {
      langPair = `${source}|${target}`;
  }

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
  
  try {
    const response = await axios.get(url);
    
    if (response.data && response.data.responseStatus === 200) {
      return response.data.responseData.translatedText;
    } else {
      throw new Error(response.data?.responseDetails || 'Translation failed');
    }
  } catch (error) {
    console.error("MyMemory API Error:", error.message);
    throw error;
  }
}

module.exports = { translateText };