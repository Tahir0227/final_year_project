const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');

async function fetchDiscordMetrics(guildId, channelId) {
  return new Promise(async (resolve) => {
    try {
      if (!config.discord.botToken) {
        return resolve({ success: false, error: 'Discord bot token not configured' });
      }

      const client = new Client({ 
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
      });

      await client.login(config.discord.botToken);

      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        client.destroy();
        return resolve({ success: false, error: 'Channel not found' });
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let rawMessages = [];
      let lastId = null;
      let keepFetching = true;

      // Fetch last 500 messages max
      while (keepFetching && rawMessages.length < 500) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const fetched = await channel.messages.fetch(options);
        if (fetched.size === 0) {
          keepFetching = false;
          break;
        }

        for (const [id, msg] of fetched) {
          if (msg.createdAt >= sevenDaysAgo) {
            rawMessages.push(msg);
          } else {
            // Because messages are sorted by date descending, we can stop
            keepFetching = false;
            break;
          }
          lastId = id;
          if (rawMessages.length >= 500) break;
        }
      }

      client.destroy();

      const messages_per_day = rawMessages.length / 7.0;
      
      const authors = new Set();
      const messagesFormatted = [];

      for (const m of rawMessages) {
        authors.add(m.author.id);
        messagesFormatted.push({
          message_id: m.id,
          author_id: m.author.id,
          author_name: m.author.username,
          content: m.content,
          sent_at: m.createdAt
        });
      }

      resolve({
        metrics: {
          messages_per_day,
          active_users: authors.size
        },
        messages: messagesFormatted
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [discordAdapter] ${error.message}`);
      resolve({ success: false, error: error.message });
    }
  });
}

module.exports = { fetchDiscordMetrics };
