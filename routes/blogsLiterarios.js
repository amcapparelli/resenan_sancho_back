const express = require('express');
const router = express.Router();
const Blogs_literarios = require('../models/blogsLiterarios');

router.get('/', async function (req, res) {
  try {
    const blogs = await Blogs_literarios.find().limit(20);
    res.json({
      blogs
    });
  } catch (error) {
    res.json(error);
  }
});


module.exports = router;