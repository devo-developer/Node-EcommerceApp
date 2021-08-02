var db = require("../config/connection");
var collection = require("../config/collections");
const bcrypt = require("bcrypt");
const { USER_COLLECTION } = require("../config/collections");
var objectId = require("mongodb").ObjectId;
const { response } = require("express");

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      if (userData.password == userData.confirm_password) {
        userData.password = await bcrypt.hash(userData.password, 10);
        delete userData.confirm_password;

        db.get()
          .collection(collection.USER_COLLECTION)
          .insertOne(userData)
          .then((data) => {
            resolve(data.insertedId.toString());
          });
      }
    });
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email });
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            console.log("Login Success");
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            console.log("Login failed");
            resolve({ status: false });
          }
        });
      } else {
        console.log("Login failed");
        resolve({ status: false });
      }
    });
  },
  addToCart: (proId, userId) => {
    let proObj = {
      item: objectId(proId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        console.log(proExist);
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              {
                user: objectId(userId),
                "products.item": objectId(proId),
              },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          console.log(proObj);
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              {
                $push: {
                  products: proObj,
                },
              }
            )
            .then((response) => {
              resolve();
            });
        }
      } else {
        let cartObj = {
          user: objectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartObj)
          .then((response) => {
            resolve();
          });
      }
    });
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "products",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$products", 0] },
            },
          },
          // {
          //   $lookup: {
          //     from: collection.PRODUCT_COLLECTION,
          //     let: { prodList: "$products" },
          //     pipeline: [
          //       {
          //         $match: {
          //           $expr: {
          //             $in: ["$_id", "$$prodList"],
          //           },
          //         },
          //       },
          //     ],
          //     as: "cartItems",
          //   },
          // },
        ])
        .toArray();
      resolve(cartItems);
    });
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },
  changeProductQuantity: (details) => {
    count = parseInt(details.count);
    quantity = parseInt(details.quantity);
    return new Promise((resolve, reject) => {
      if (count == -1 && quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(details.cart) },
            {
              $pull: { products: { item: objectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              "products.item": objectId(details.product),
            },
            {
              $inc: { "products.$.quantity": count },
            }
          )
          .then((response) => {
            resolve({ status: true });
          });
      }
    });
  },
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item",
              foreignField: "_id",
              as: "products",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$products", 0] },
            },
          },
          {
            // $project: {
            //   total: {
            //     $sum: {
            //       $multiply: [
            //         { $toInt: "$quantity" },
            //         { $toInt: "$product.Price" },
            //       ],
            //     },
            //   },
            // },
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: [
                    { $toInt: "$quantity" },
                    { $toInt: "$product.Price" },
                  ],
                },
              },
            },
          },
        ])
        .toArray();
      resolve(total[0].total);
    });
  },
  placeOrder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      console.log(order, products, total);
      let status = order["payment-method"] == "COD" ? "placed" : "pending";
      let orderObj = {
        deliveryDetails: {
          mobile: order.mobile,
          address: order.address,
          pincode: order.pincode,
        },
        userId: objectId(order.userId),
        paymentMethod: order["payment-method"],
        products: products,
        totalAmount: total,
        status: status,
        date: new Date(),
      };
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: objectId(order.userId) });
          resolve();
        });
    });
  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      resolve(cart.products);
    });
  },
};
