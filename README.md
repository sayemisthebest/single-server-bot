# Universal Discord Staff Manager

A production-ready Discord moderation and staff management bot built with discord.js v14, SQLite, and Node.js.

## Features

- Multi-guild support
- Staff-only command channel enforcement
- Role management from TXT uploads
- Message link analytics
- Reaction analytics
- After-post analysis
- Role export
- Monthly top poster tracking
- Message logging
- Universal ticket system
- Config and help commands

## Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
4. Fill in your Discord bot credentials.
5. Start the bot:
   ```bash
   npm start
   ```

## Environment Variables

- TOKEN: Discord bot token
- CLIENT_ID: Discord application client ID
- CLIENT_SECRET: Discord application secret
- PREFIX: Bot prefix (default !)
- DATABASE_PATH: SQLite database file path

## Discord Developer Portal Setup

1. Create an application at Discord Developer Portal.
2. Create a bot user.
3. Enable the following intents:
   - Server Members Intent
   - Message Content Intent
4. Invite the bot with the required permissions.

## Invite Link Generation

Use the following URL template:

```text
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=402705311998&scope=bot%20applications.commands
```

## Railway Deployment

1. Create a Railway project.
2. Connect your repository.
3. Add the environment variables.
4. Deploy.

### Railway Variables

- TOKEN
- CLIENT_ID
- CLIENT_SECRET
- PREFIX=! 
- DATABASE_PATH=/app/data/staff-manager.db

## Commands

- !setup
- !setstaffchannel #channel
- !config
- !resetconfig
- !help
- !roleadd @Role
- !roleremove @Role
- !reactionlist <message_link>
- !afterpost <message_link>
- !roleexport @Role
- !topposter #channel
- !postcount #channel
- !ticketsetup
- !ticketclose
- !ticketrename
- !ticketadd
- !ticketremove
- !ticketclaim
- !tickettranscript

## Permissions

The bot requires the following permissions:

- Manage Roles
- Manage Channels
- Manage Messages
- Read Message History
- View Channels
- Send Messages
- Embed Links
- Attach Files
- Manage Threads
- Use External Emojis
- Create Public Threads
- Create Private Threads

## Database

The bot uses SQLite via better-sqlite3. The database file is created automatically on startup.

## Troubleshooting

- Ensure the bot has the required permissions.
- Check that the bot is in the correct staff channel.
- Verify the message link belongs to the current guild.
- Review logs in the logs directory.

## FAQ

### Why are commands ignored outside the staff channel?
Because the bot is configured to only respond in a designated private staff channel per guild.

### Can I use the bot in multiple servers?
Yes. Every guild runs independently with its own configuration.
