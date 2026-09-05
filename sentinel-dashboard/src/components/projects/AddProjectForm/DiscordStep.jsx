import React from 'react';
import CredentialField from '../CredentialField';

export default function DiscordStep({ data, onChange, errors, testState, onTest }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Discord Server (Guild) ID</label>
          <input
            type="text"
            name="discord_guild_id"
            value={data.discord_guild_id || ''}
            onChange={onChange}
            placeholder="e.g. 1496039331565932626"
            className={`input ${errors.discord_guild_id ? 'input-error' : ''}`}
          />
          {errors.discord_guild_id && <span className="text-xs text-red-400 font-medium">{errors.discord_guild_id}</span>}
        </div>

        <div>
          <label className="label">Discord Channel ID</label>
          <input
            type="text"
            name="discord_channel_id"
            value={data.discord_channel_id || ''}
            onChange={onChange}
            placeholder="e.g. 1496039331565932633"
            className={`input ${errors.discord_channel_id ? 'input-error' : ''}`}
          />
          {errors.discord_channel_id && <span className="text-xs text-red-400 font-medium">{errors.discord_channel_id}</span>}
        </div>
      </div>

      <div>
        <CredentialField
          label="Discord Bot Token"
          name="discord_bot_token"
          value={data.discord_bot_token || ''}
          onChange={onChange}
          placeholder="MTQ5NjA4MTg2NDk0NTk1OTAxMg.GF8OwN.xxxxxxxxxxxxxxxxxxxxx"
          error={errors.discord_bot_token}
          testLoading={testState.loading}
          testSuccess={testState.success}
          testError={testState.error}
          onTest={onTest}
        />
        <p className="text-[10px] text-dark-400 mt-1">
          Requires the Bot to be present in the guild and have <code>Read Messages</code> and <code>Read Message History</code> scopes in the target channel.
        </p>
      </div>
    </div>
  );
}
