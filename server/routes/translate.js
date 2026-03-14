const express = require('express');
const { protect } = require('../middleware/auth');
const { translateText } = require('../services/translate');

const router = express.Router();

// POST /api/translate
router.post('/', protect, async (req, res) => {
  const { text, source, target } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, message: 'text is required' });
  }

  try {
    const translatedText = await translateText(text, source || 'Autodetect', target || 'en');
    res.json({ success: true, translatedText });
  } catch (err) {
    console.error('Translation error:', err.message);
    res.status(500).json({ success: false, message: 'Translation failed' });
  }
});

module.exports = router;