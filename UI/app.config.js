const appJson = require('./app.json');
const { applyInviteAppLinksConfig } = require('./config/appLinks');

module.exports = () => applyInviteAppLinksConfig(appJson.expo, process.env);
