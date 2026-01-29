const express = require("express");
const router = express.Router();

// example route
router.post("/test", (req, res) => {
  res.json({ message: "Tool 1 working" });
});

module.exports = router;
