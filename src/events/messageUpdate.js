module.exports = async (oldMessage, newMessage) => {
  if (!newMessage.guild || oldMessage.content === newMessage.content) return;
};
