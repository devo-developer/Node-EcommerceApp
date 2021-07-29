var db = require("../config/connection");
var collection = require("../config/collections");
const bcrypt = require("bcrypt");
const { USER_COLLECTION } = require("../config/collections");

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
};
