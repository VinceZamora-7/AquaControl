require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const pool = require('./config/database');

const {
  setIO,
} = require('./services/socket.service');

const PORT = Number(
  process.env.PORT || 3000
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

setIO(io);

io.on('connection', (socket) => {
  console.log(
    'Socket connected:',
    socket.id
  );

  socket.on(
    'device:subscribe',
    (deviceId) => {
      if (!deviceId) {
        return;
      }

      socket.join(
        `device:${deviceId}`
      );

      console.log(
        `${socket.id} subscribed to ${deviceId}`
      );
    }
  );

  socket.on(
    'device:unsubscribe',
    (deviceId) => {
      socket.leave(
        `device:${deviceId}`
      );
    }
  );

  socket.on('disconnect', () => {
    console.log(
      'Socket disconnected:',
      socket.id
    );
  });
});

async function startServer() {
  try {
    const connection =
      await pool.getConnection();

    console.log(
      'MySQL connected successfully.'
    );

    connection.release();

    server.listen(
      PORT,
      '0.0.0.0',
      () => {
        console.log(
          `Water Quality API running on port ${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      'Failed to start backend:',
      error
    );

    process.exit(1);
  }
}

startServer();