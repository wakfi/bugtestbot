const genericTransformRegex = /\{!(\S+?)!\}/g;
const util = require('util');
let baseReplaceIndex = 0;

exports.TransformError = class TransformError extends Error
{
	constructor(message = 'An unknown error occurred while transforming text', ...args)
	{
		super(message, ...args);
		if(Error.captureStackTrace)
		{
			Error.captureStackTrace(this, TransformError);
		}
		this.name = 'TransformError';
	}
};

exports.TransformTokenError = class TransformTokenError extends Error
{
	constructor(token = 'undefined token', ...args)
	{
		super(...args);
		if(Error.captureStackTrace)
		{
			Error.captureStackTrace(this, TransformTokenError);
		}
		this.name = 'TransformTokenError';
		this.token = 'token';
		this.message = `Encountered an error while executing transform function of token "${token}"`;
	}
};

const tokenTransforms = {
	...(require(`${process.cwd()}/components/tokenTransforms.json`)),
	...({
		//_: (_) => {return },
		//_: (_) => {return `${}`},
		//_: (args) => {return `${}`},
		//_: async (args) => {return },
		//_: async (args) => {return void },
		count: (args) => {return `${args.count + (args.countStart??0)}`},
		timestamp: (_) => {return `${Date.now()}`},
		fulldate: (_) => {return `${new Date()}`},
		date: (_) => {return (new Date()).toLocaleDateString()},
		utctime: (_) => {return (new Date()).toUTCString()},
		'#ch': (args) => {return `${args.message.channel}`},
		'topic': (args) => {return `${args.message.channel.topic ?? undefined}`},
		'chname': (args) => {return `${args.message.channel.name}`},
		guild: (args) => {return `${args.message.guild}`},
		lastauthor: (args) => {return `${args.message.channel.lastMessage?.author}`},
		roles: (args) => {
			const message = args.message;
			const target = args.target ?? message.member ?? {};
			if(target.roles === undefined) throw new exports.TransformTokenError('roles');
			return `${target.roles.cache.array().map(role => role.toString()).join(' ')}`
		},
		lastauditlog: async (args) => {
			const act = (action) => {
				switch(action)
				{
					case 1:  return 'GUILD_UPDATE';
					case 10: return 'CHANNEL_CREATE';
					case 11: return 'CHANNEL_UPDATE';
					case 12: return 'CHANNEL_DELETE';
					case 13: return 'CHANNEL_OVERWRITE_CREATE';
					case 14: return 'CHANNEL_OVERWRITE_UPDATE';
					case 15: return 'CHANNEL_OVERWRITE_DELETE';
					case 20: return 'MEMBER_KICK';
					case 21: return 'MEMBER_PRUNE';
					case 22: return 'MEMBER_BAN_ADD';
					case 23: return 'MEMBER_BAN_REMOVE';
					case 24: return 'MEMBER_UPDATE';
					case 25: return 'MEMBER_ROLE_UPDATE';
					case 26: return 'MEMBER_MOVE';
					case 27: return 'MEMBER_DISCONNECT';
					case 28: return 'BOT_ADD';
					case 30: return 'ROLE_CREATE';
					case 31: return 'ROLE_UPDATE';
					case 32: return 'ROLE_DELETE';
					case 40: return 'INVITE_CREATE';
					case 41: return 'INVITE_UPDATE';
					case 42: return 'INVITE_DELETE';
					case 50: return 'WEBHOOK_CREATE';
					case 51: return 'WEBHOOK_UPDATE';
					case 52: return 'WEBHOOK_DELETE';
					case 60: return 'EMOJI_CREATE';
					case 61: return 'EMOJI_UPDATE';
					case 62: return 'EMOJI_DELETE';
					case 72: return 'MESSAGE_DELETE';
					case 73: return 'MESSAGE_BULK_DELETE';
					case 74: return 'MESSAGE_PIN';
					case 75: return 'MESSAGE_UNPIN';
					case 80: return 'INTEGRATION_CREATE';
					case 81: return 'INTEGRATION_UPDATE';
					case 82: return 'INTEGRATION_DELETE';
					default: return 'UNKNOWN_ACTION';
				}
			};
			
			const guild = args.message.guild;
			const loginfo = [];
			const audit = (await guild.fetchAuditLogs({limit: 1})).entries?.first();
			if(!audit) throw new exports.TransformTokenError('lastauditlog');
			const {action, changes, createdAt, extra, executer} = audit;
			const reason = audit.reason;
			const target = audit.target;
			const targetType = audit.targetType;
			
			loginfo.push(`${createdAt}: ${executer} ${act(action)}`);
			if(extra) loginfo.push(`${extra}:`);
			if(target) loginfo.push(`${target}`);
			if(changes.length) loginfo.push(changes.map((key, oldVal, newVal) => ` **${key}** from **${oldVal}** to **${newVal}**`).join('; '));
			if(reason) loginfo.push(`with reason **${reason}**`);
			
			return loginfo.join(' ');
		},
		
		//_: async (args) => {return },
		//_: (args) => {return `${}`},
	})
};

exports.transform = async function(content, ...args)
{
	let match;
	baseReplaceIndex = 0;
	genericTransformRegex.lastIndex = 0;
	while(match = genericTransformRegex.exec(content))
	{
		const token = match[1];
		const tokenTransformer = tokenTransforms[token];
		if(!tokenTransformer) // matches to the generic pattern that aren't defined transformations are left unchanged
		{
			baseReplaceIndex = genericTransformRegex.lastIndex;
			continue;
		}
		content = content.replace(match[0], await tokenTransformer(...args) ?? '');
		genericTransformRegex.lastIndex = baseReplaceIndex;
	}
	return content;
};
