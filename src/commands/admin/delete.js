const messageManager = require('../../modules/messageManagement/messageManager');

module.exports = {
  name: 'delete',
  description: 'Launch the interactive message deletion wizard.',
  async execute(message, args) {
    await messageManager.handleDeleteCommand(message, args);
  },
};
