require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // In development mode, synchronize tables
    // await sequelize.sync({ alter: true });
    console.log('Database schema synchronized.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
      require('./services/autosubmit.service').startAutoSubmitJob();
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

startServer();
