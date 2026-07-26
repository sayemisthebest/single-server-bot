function hasStaffPermission(member) {
  if (!member) return false;
  return member.permissions.has('Administrator') || member.permissions.has('ManageRoles');
}

function hasBotPermissions(channel) {
  if (!channel?.guild) return false;
  const perms = channel.permissionsFor(channel.guild.members.me);
  return perms?.has(['ManageRoles', 'ManageChannels', 'ManageMessages', 'ReadMessageHistory', 'ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles', 'ManageThreads', 'UseExternalEmojis', 'CreatePublicThreads', 'CreatePrivateThreads']);
}

module.exports = { hasStaffPermission, hasBotPermissions };
