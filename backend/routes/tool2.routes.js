const express = require("express");
const router = express.Router();

router.post("/test", (req, res) => {
  res.json({ message: "Tool 2 working" });
});

module.exports = router;
