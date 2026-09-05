/**
 * discordAdapter.js — Fetches Discord metrics.
 * Accepts optional per-project credentials; falls back to global config.
 */

'use strict';

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');

/**
 * @param {string} guildId
 * @param {string} channelId
 * @param {object} [credentials] - { botToken } overrides global config
 */
async function fetchDiscordMetrics(guildId, channelId, credentials = {}) {
  return new Promise(async (resolve) => {
    let client;
    try {
      const botToken  = credentials.botToken;
      const chanId    = channelId || credentials.channelId;

      if (!botToken || !chanId) {
        return resolve({ success: false, error: 'Discord credentials/channel not fully configured. Please update your project integration settings.' });
      }

      client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
      });

      await client.login(botToken);
      const channel = await client.channels.fetch(chanId);

      if (!channel) {
        client.destroy();
        return resolve({ success: false, error: 'Channel not found' });
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let rawMessages = [];
      let lastId = null;
      let keepFetching = true;

      while (keepFetching && rawMessages.length < 500) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;
        const fetched = await channel.messages.fetch(options);
        if (fetched.size === 0) { keepFetching = false; break; }

        for (const [id, msg] of fetched) {
          if (msg.createdAt >= sevenDaysAgo) {
            rawMessages.push(msg);
          } else {
            keepFetching = false;
            break;
          }
          lastId = id;
          if (rawMessages.length >= 500) break;
        }
      }

      client.destroy();
      client = null;

      const messages_per_day = rawMessages.length / 7.0;
      const authors = new Set();
      const messagesFormatted = [];

      for (const m of rawMessages) {
        authors.add(m.author.id);
        messagesFormatted.push({
          message_id:  m.id,
          author_id:   m.author.id,
          author_name: m.author.username,
          content:     m.content,
          sent_at:     m.createdAt
        });
      }

      resolve({
        metrics: { messages_per_day, active_users: authors.size },
        messages: messagesFormatted
      });

    } catch (error) {
      console.error(`[discordAdapter] ${error.message}`);
      if (client) { try { client.destroy(); } catch (_) {} }
      resolve({ success: false, error: error.message });
    }
  });
}

module.exports = { fetchDiscordMetrics };
