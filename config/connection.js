const { MongoClient } = require("mongodb");

let dbConnection;
const mongoURI = "mongodb+srv://anandhumohan2018:7QQr7qbtssOjzq5b@alumni.lf2wz2i.mongodb.net/?retryWrites=true&w=majority&appName=alumni";
//const mongoURI = "mongodb://0.0.0.0:27017/alumni";

module.exports = {
  connectToDb: (cb) => {
    MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
      .then((client) => {
        dbConnection = client.db();
        return cb();
      })
      .catch((err) => {
        console.log(err);
        return cb(err);
      });
  },
  getDb: () => dbConnection,
};