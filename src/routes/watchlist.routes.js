const express = require("express");
const { requireAuth } = require("../middlewares/require-auth.middleware");
const {
  listWatchlistItemsByUserId,
} = require("../data-access/repositories/watchlist.repository");

const router = express.Router();

router.get("/", requireAuth, (req, res, next) => {
  try {
    const items = listWatchlistItemsByUserId(req.authUser.id);

    return res.status(200).json({
      items,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
