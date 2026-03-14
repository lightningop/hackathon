const express = require('express');
const { protect } = require('../middleware/auth');
const { translateText } = require('../services/translate');

const router = express.Router();

// POST /api/translate
router.post('/', protect, async (req, res) => {
  const { text, target } = req.body;

  if (!text || !target) {
    return res.status(400).json({ success: false, message: 'text and target language are required' });
  }

  try {
    const translated = await translateText(text, target);
    res.json({ success: true, translatedText: translated });
  } catch (err) {
    console.error('Translation error:', err.message);
    res.status(500).json({ success: false, message: 'Translation failed' });
  }
});

module.exports = router;