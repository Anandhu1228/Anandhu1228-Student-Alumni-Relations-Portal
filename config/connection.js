/*
Website developed by Anandhu Mohan for the Alumni Relations Cell of a college. 
Features include:
  - Job portal, Internship portal, Mentorship portal
  - Search functionality for users, students, and alumni
  - Group chat and private individual chat systems
  - Notification system and user profiles for each member
  - Admin panel to control the entire site, handle issues, and manage inquiries
  - Superadmin overseeing the activities of admins and users
  - Maintainer responsible for the main page content and styling, visible to users and external visitors
  - Advanced machine learning features that sort jobs and internships based on user profile preferences
  - Periodic email notifications and security enhancements
*/

const { MongoClient } = require("mongodb");

let dbConnection;
const mongoURI = "mongodb://0.0.0.0:27017/alumni";
//const mongoURI = "mongodb+srv://anandhumohan2018:7QQr7qbtssOjzq5b@alumni.lf2wz2i.mongodb.net/?retryWrites=true&w=majority&appName=alumni";

module.exports = {
  connectToDb: (cb) => {
    MongoClient.connect(mongoURI /*, { useNewUrlParser: true, useUnifiedTopology: true }*/)
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