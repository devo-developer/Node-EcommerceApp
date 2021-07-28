var express = require("express");
var productHelpers = require("../helpers/product-helpers");
var router = express.Router();

/* GET users listing. */
router.get("/", function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    res.render("user/view-products", { products, admin: false });
  });
});

module.exports = router;
