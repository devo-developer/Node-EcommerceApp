var express = require("express");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");

//middleware - login

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET users listing. */
router.get("/", async function (req, res, next) {
  let user = req.session.user;
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }
  productHelpers.getAllProducts().then((products) => {
    res.render("user/view-products", { products, user, cartCount });
  });
});

router.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    res.render("user/login", { loginErr: req.session.loginErr });
    req.session.loginErr = false;
  }
});

router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      //session creation when login
      req.session.loggedIn = true;
      req.session.user = response.user;
      res.redirect("/");
    } else {
      req.session.loginErr = "Invalid username or password.";
      res.redirect("/login");
    }
  });
});

router.get("/signup", (req, res) => {
  res.render("user/signup");
});

router.post("/signup", (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    //session creation when signup
    req.session.loggedIn = true;
    req.session.user = response;
    res.redirect("/");
  });
});

router.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

router.get("/cart", verifyLogin, async (req, res) => {
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }
  let products = await userHelpers.getCartProducts(req.session.user._id);
  console.log(products);
  res.render("user/cart", { products, user: req.session.user, cartCount });
});

router.get("/add-to-cart/:id", (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  });
});

module.exports = router;
