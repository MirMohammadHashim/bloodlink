const { pool, initDatabase } = require('./db');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT || 3000);

initDatabase()
  .then(() => {
    createApp(pool).listen(PORT, () => console.log(`BloodLink API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to the database, exiting.', err.message);
    process.exit(1); // systemd restarts the service
  });
