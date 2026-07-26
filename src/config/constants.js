module.exports = {
  COLORS: {
    SUCCESS: 0x2ecc71,
    INFO: 0x3498db,
    ERROR: 0xe74c3c,
    WARNING: 0xf39c12,
    DEFAULT: 0x5865f2,
  },
  PERMISSIONS: [
    'ManageRoles',
    'ManageChannels',
    'ManageMessages',
    'ReadMessageHistory',
    'ViewChannel',
    'SendMessages',
    'EmbedLinks',
    'AttachFiles',
    'ManageThreads',
    'UseExternalEmojis',
    'CreatePublicThreads',
    'CreatePrivateThreads',
  ],
  PREFIX: process.env.PREFIX || '!',
};
