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

const websocketConfig = {
  socketBaseURL: "http://localhost:3001", // Replace with your WebSocket URL
};

module.exports = websocketConfig;























//  NOT NEEDED.  BUT CAN USE INCASE IF HAVE ANY HIDDEN LINK
/*const WebSocket = require('ws');
let wsConnection;

module.exports = {
  connectToWebSocket: (server) => {
    wsConnection = new WebSocket.Server({ server });

    wsConnection.on('connection', (socket) => {
      // handle WebSocket connection logic here
      console.log('WebSocket connection established');
      
      // You can add more logic to handle messages, events, etc.
      socket.on('message', (message) => {
        if (Buffer.isBuffer(message)) {
          // Convert Buffer to a UTF-8 encoded string
          const textMessage = message.toString('utf-8');
          console.log('Received message:', textMessage);
          // Handle the text message
        } else {
          console.log('Received message:', message);
          // Handle other types of messages
        }
      });

      socket.on('close', () => {
        console.log('WebSocket connection closed');
        // Handle the connection closed event
      });
    });
  },
  getWebSocket: () => wsConnection,
};*/
