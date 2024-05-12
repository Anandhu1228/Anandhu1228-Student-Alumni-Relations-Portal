const WebSocket = require('ws');

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
};
