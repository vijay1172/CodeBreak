// PM2 process definition for the BrokenRepo backend (AWS EC2 / any VM).
// Started by ops/aws/setup.sh with:  pm2 start ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: "brokenrepo-api",
      script: "src/index.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "1500M", // t4g.small has 2 GiB; leave headroom for the OS
      env: {
        NODE_ENV: "production",
      },
      // dotenv (src/config.js) reads server/.env; nothing secret lives here.
      time: true,
      out_file: "/home/ubuntu/.pm2/logs/brokenrepo-api-out.log",
      error_file: "/home/ubuntu/.pm2/logs/brokenrepo-api-error.log",
    },
  ],
};
