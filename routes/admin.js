var express = require("express");
var productHelpers = require("../helpers/product-helpers");
var router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    res.render("admin/view-products", { admin: true, products });
  });
});

router.get("/add-product", function (req, res) {
  res.render("admin/add-product");
});

router.post("/add-product", (req, res) => {
  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.Image;
    image.mv("./public/product-images/" + id + ".jpg", (err, done) => {
      if (!err) {
        res.render("admin/add-product");
      } else {
        console.log("error" + err);
      }
    });
  });
});

router.get("/delete-product/:id", (req, res) => {
  let proId = req.params.id;
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect("/admin/");
  });
});
//second method
// router.get('/delete-product/', (req, res)=>{
//   let proId=req.query.id
//   let proName=req.query.name
// })

module.exports = router;
