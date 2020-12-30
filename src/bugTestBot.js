function main(){
//loads in Discord.js library
const Discord = require('discord.js');
const imgur = require('imgur');
const nf = require('node-fetch');
const rp = async (query) => await (await nf(query)).text(); //originally algorithm/approach written using request-promise, now deprecated. This lambda is for backwards compatability
const clientOps = require('./components/clientOps.json');
const client = new Discord.Client(clientOps);
const config = require("./components/config.json");
let d = new Date();
imgur.setClientId(config.imgur.id);

const delay = require(`${process.cwd()}/util/delay.js`);
const millisecondsToString = require(`${process.cwd()}/util/millisecondsToString.js`);
const parseArgs = require(`${process.cwd()}/util/parseArgs.js`);
const parseTime = require(`${process.cwd()}/util/parseTime.js`);
const printTimePretty = require(`${process.cwd()}/util/printTimePretty.js`);
const selfDeleteReply = require(`${process.cwd()}/util/selfDeleteReply.js`);
const authorReply = require(`${process.cwd()}/util/authorReply.js`);
const arrayEquals = require(`${process.cwd()}/util/arrayEquals.js`);

const imgurCdn = `https://i.imgur.com/`;
const imgurUploadFormatRegex = /\.(?:png|jpg|jpeg|gif)$/;
const imgur404Regex = /s\.\imgur\.com\/images\/404/;
const escapedEmbedLink = /<(https:\/\/.*)>/;
const imgurDirectRegex = /https:\/\/(?:i\.)?imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]{7})\..{3,4}/;
//potential alternate, need to verify imgur's valid extensions
//const imgurDirectRegex = /https:\/\/(?:i\.)?imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]{7})\.(?:png|jpg|jpeg|mp4|gif|gifv|webm)/;
const imgurAlbumRegex = /imgur\.com\/(?:gallery\/|a\/)?[a-zA-Z0-9]{7}#?$/;
const imgurImgOrVideo = /<link rel="image_src" href="/;
const imgurUriRegex = /\{"hash":"([a-zA-Z0-9]{7})".*?"ext":"(\..{3,4}?).*?\}/g;

//adds timestamps to log outputs
function fixLogs()
{
	let origLogFunc = console.log;
	let origErrFunc = console.error;
	console.log = input =>
	{
		d = new Date();
		let ms = d.getMilliseconds();
		if(typeof input === 'string')
		{
			let inArr = input.split(`\n`);
			inArr.map(tex => {origLogFunc(`${d.toLocaleString('en-US',{year:'numeric',month:'numeric',day:'numeric'})} ${d.toLocaleTimeString(undefined,{hour12:false})}:${ms}${ms>99?'  ':ms>9?'   ':'    '}${tex}`)});
		} else {
			origLogFunc(`${d.toLocaleString('en-US',{year:'numeric',month:'numeric',day:'numeric'})} ${d.toLocaleTimeString(undefined,{hour12:false})}:${ms}${ms>99?'  ':ms>9?'   ':'    '}${input}`)
		}
	}
	console.error = input =>
	{
		d = new Date();
		let ms = d.getMilliseconds();
		if(typeof input === 'string')
		{
			let inArr = input.split(`\n`);
			inArr.map(tex => {origErrFunc(`${d.toLocaleString('en-US',{year:'numeric',month:'numeric',day:'numeric'})} ${d.toLocaleTimeString(undefined,{hour12:false})}:${ms}${ms>99?'  ':ms>9?'   ':'    '}${tex}`)});
		} else {
			origErrFunc(`${d.toLocaleString('en-US',{year:'numeric',month:'numeric',day:'numeric'})} ${d.toLocaleTimeString(undefined,{hour12:false})}:${ms}${ms>99?'  ':ms>9?'   ':'    '}${input}`)
		}
	}
}

//this is the file that holds the login info, to keep it seperate from the source code for safety
client.once("ready", async () => {
	fixLogs(); 
	console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
	client.user.setActivity(`Time to catch bugs 🐞`);
});

/*
 modified from https://github.com/AnIdiotsGuide/discordjs-bot-guide/blob/master/coding-guides/raw-events.md
*/
client.on(`raw`, packet => 
{
	// We don't want this to run on unrelated packets
    if (!['MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE'].includes(packet.t)) return;
    // Grab the channel to check the message from
    const channel = client.channels.get(packet.d.channel_id);
    // Let's fetch it
    channel.fetchMessage(packet.d.message_id).then(message => {
        // Emojis can have identifiers of name:id format, so we have to account for that case as well
        const emoji = packet.d.emoji.id ? `${packet.d.emoji.name}:${packet.d.emoji.id}` : packet.d.emoji.name;
        // This gives us the reaction we need to emit the event properly, in top of the message object
        const reaction = message.reactions.get(emoji) || new Discord.MessageReaction(message, packet.d.emoji, 0, false);
        // Adds the currently reacting user to the reaction's users collection.
        // Check which type of event it is before emitting
        if (packet.t === 'MESSAGE_REACTION_ADD') {
			if (reaction) reaction.users.set(packet.d.user_id, client.users.get(packet.d.user_id));
            reactionAdd(reaction, client.users.get(packet.d.user_id));//.then(()=>{}).catch(console.error);
        }
        if (packet.t === 'MESSAGE_REACTION_REMOVE') {
            reactionRemove(reaction, client.users.get(packet.d.user_id));//.then(()=>{}).catch(console.error);
        }
    });
});

function reactionAdd(reaction, user) 
{
	if(reaction.emoji == '📌')
	{
		if(reaction.count == 1)
		{
			reaction.message.pin().catch(console.error);
		}
	}
}

function reactionRemove(reaction, user)
{
	if(reaction.emoji == '📌')
	{
		if(reaction.count == 0)
		{
			reaction.message.unpin().catch(console.error);
		}
	}
}

//this event triggers when a message is sent in a channel the bot has access to
client.on("message", async message => {
	
	const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();
	
	if(message.author.bot) return;	
	
	if(message.content.indexOf(config.prefix) !== 0) return;
	
	// commands from users using prefix go below here
	let commandLUT = {
		//Emergency Kill switch, added after channel spam so that i would have a way other than ssh to stop it
		"kill": async function() {
			if(!message.author.id != 193160566334947340) {
				return null;
			} else {
				process.exit(1);
			}
		},
		
		// Calculates ping between sending a message and editing it, giving a nice round-trip latency.
		// The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
		"ping": async function() {
			const m = await message.channel.send("Ping?");
			m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
		},
		
		//gives the bot the appearance of speaking by deleting the command message and stealing the content. Will evevntually streamline for remote control (from terminal or dm)
		"say": async function() {
			const pargs = parseArgs(args, {'time':['-in','-time','i','t'],'message':['m','-message']});
			if(pargs.time)
			{
				const waitTime = pargs.time.split(' ').join('');
				try {
					message.channel.send(`Waiting for ${printTimePretty(millisecondsToString(parseTime(waitTime)))}`);
				} catch(e) {
					console.error(e.stack);
					return message.channel.send(`Failed to parse: ${waitTime}`);
				}
				await delay(waitTime);
			}
			const sayMessage = pargs.message || pargs.args.join(' ');
			if(message.channel.type != 'dm') message.delete().catch(O_o=>{console.error(O_o)});
			message.channel.send(sayMessage).catch(err=>{});
		},

		
		//utilizes a bulk message deltion feature available to bots, able to do up to 100 messages at once, minimum 3. Adjusted to erase command message as well
		"purge": async function() {
			if(message.author.id != 193160566334947340)
				return authorReply(message,`Sorry, you don't have permissions to use this!`);
			// This command removes all messages from all users in the channel, up to 100
			
			// get the delete count, as an actual number.
			const deleteCount = parseInt(args[0], 10) + 1;
			
			// Ooooh nice, combined conditions. <3
			if(!deleteCount || deleteCount < 2 || deleteCount > 100)
				return message.reply(`Please provide a number between 2 and 99 (inclusive) for the number of messages to delete`);
			
			// So we get our messages, and delete them. Simple enough, right?
			const fetched = await message.channel.fetchMessages({count: deleteCount});
			message.channel.bulkDelete(deleteCount)
			.catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
		},
		
		//responds with the current time connected to the discord server in hh:mm:ss format. If hour exceeds 99, will adjust to triple digit, etc
		"uptime": async function() {
			function pad(n, z) {
				z = z || 2;
				return ('00' + n).slice(-z);
			}
			let s = client.uptime;
			let ms = s % 1000;
			s = (s - ms) / 1000;
			let secs = s % 60;
			s = (s - secs) / 60;
			let mins = s % 60;
			let hrs = (s - mins) / 60;
			let p = Math.floor(Math.log10(hrs)) + 1;
			if(Math.log10(hrs) < 2) {
				p = false;
			}
			message.channel.send("I have been running for " + pad(hrs, p) + ':' + pad(mins) + ':' + pad(secs)).catch(err=>{});
		},
		
		"report": async function() {
			if(message.type === 'dm') return;
			if(args.length == 0) return selfDeleteReply(message, `Usage: \`${config.prefix}report <messageID>\``, {sendStandard:true});
			const rid = args.join(' ');
			if(!/^\d+$/.test(rid)) return selfDeleteReply(message, `input \`${rid}\` is not a snowflake`);
			try {
				const target = await message.guild.channels.get('712972942451015683').fetchMessage(rid);
				delay('3s', () => {message.delete()});
				const reproRegex = /\n-/g
				const embed = target.embeds[0];
				const title = embed.title;
				const steps = embed.description.slice(2).replace(reproRegex, ' ~');
				const expect = embed.fields[0].value;
				const actual = embed.fields[1].value;
				const system = (function(info) 
				{
					switch(info)
					{
						case 'saved Mac system info':
							return '--storedinfo mac';
						case 'saved Windows system info':
							return '--storedinfo windows';
						case 'saved Android system info':
							return '--storedinfo android';
						case 'saved iOS system info':
							return '--storedinfo ios';
						default:
							return `--system ${info}`;
					}
				})(embed.fields[2].value);
				const client = embed.fields[3].value;
				const report = `!submit --title ${title} --repro-steps ${steps} --expected ${expect} --actual ${actual} ${system} --client ${client}`; //${system} IS NOT SUPPOSED TO HAVE A FLAG IN FRONT OF IT. It gets that from the switch (-i/-s)
				message.channel.send('```\n' + report + '\n```');
			} catch(e) {
				return selfDeleteReply(message, `couldn't find a report with message ID: \`${rid}\``);
			}
		},
		
		"submit": async function() {
			if(message.type === 'dm') return;
			const pargs = parseArgs(args, {'title':['t','-title'], 'repro':['r','-repro-steps'], 'expected':['e','-expected'], 'actual':['a','-actual'], 'system':['s','-system'], 'client':['c','-client'], 'infosys':['i','-storedinfo']});
			const { title,repro,expected,actual,system,client,infosys } = pargs;
			if(!(title && repro && expected && actual && client && (system || infosys)))
			{
				const missingFlags = [];
				if(!title) missingFlags.push('--title');
				if(!repro) missingFlags.push('--repro-steps');
				if(!expected) missingFlags.push('--expected');
				if(!actual) missingFlags.push('--actual');
				if(!system) missingFlags.push('--system');
				if(!client) missingFlags.push('--client');
				return authorReply(message, `Missing flags: \`${missingFlags.join('`, `')}\`\n\nHere is your command:\n\`\`\`${message.content}\`\`\``);
			}
			if(!system)
			{
				pargs.system = (function(info) 
				{
					switch(info)
					{
						case 'mac':
							return 'saved Mac system info';
						case 'windows':
							return 'saved Windows system info';
						case 'android':
							return 'saved Android system info';
						case 'ios':
							return 'saved iOS system info';
						default:
							return `unknown system "${info}"`;
					}
				})(infosys);
			}
			const stepsRegex = / ~/g;
			const steps = '- ' + repro.replace(stepsRegex, '\n-');
			const author = message.author;
			const embed = new Discord.RichEmbed()
				.setAuthor(`${author.username}#${author.discriminator} (${author.id})`)
				.setTitle(title)
				.setDescription(steps)
				.addField(`Expected Result`, expected)
				.addField(`Actual Result`, actual)
				.addField(`System Settings`, system || pargs.system)
				.addField(`Client Settings`, client)
				.setFooter(`#000`)
				.setTimestamp(new Date())
				.setColor(0xFF00FF);
			const sent = await message.guild.channels.get('712972942451015683').send(embed);
			selfDeleteReply(message, `Submitted your report!`);
			delay('3s', () => {message.delete()});
			await sent.react('735712895601606686');
			await sent.react('735713063529087066');
		},
		
		"edit": async function() {
			if(message.type === 'dm') return;
			if(args.length == 0) return selfDeleteReply(message, `Usage: \`${config.prefix}edit <messageID> <DBug edit syntax>\``, {sendStandard:true});
			const pargs = parseArgs(args, {'title':['t','-title'], 'repro':['r','-repro-steps'], 'expected':['e','-expected'], 'actual':['a','-actual'], 'system':['s','-system'], 'client':['c','-client']});
			const rid = pargs.args.join(' ');
			if(rid.length == 0) return selfDeleteReply(message, `you must provide a message ID`);
			if(!/^\d+$/.test(rid)) return selfDeleteReply(message, `input \`${rid}\` is not a snowflake`);
			try  {
				const target = await message.guild.channels.get('712972942451015683').fetchMessage(rid);
				delay('3s', () => {message.delete()});
				const { title,repro,expected,actual,system,client } = pargs;
				const embed = new Discord.RichEmbed(target.embeds[0]);
				if(!(title || repro || expected || actual || client || system)) return selfDeleteReply(message, `you need to include one or more flags`);
				if(title) embed.setTitle(title);
				if(repro)
				{
					const stepsRegex = / ~/g;
					const steps = '- ' + repro.replace(stepsRegex, '\n-');
					embed.setDescription(steps);
				}
				if(expected) embed.fields[0].value = expected;
				if(actual) embed.fields[1].value = actual;
				if(system) embed.fields[2].value = system;
				if(client) embed.fields[3].value = client;
				await target.edit(embed);
				selfDeleteReply(message, `updated report at ${rid}`);
			} catch(e) {
				return selfDeleteReply(message, `couldn't find a report with message ID: \`${rid}\``);
			}
		},
		
		"nuke": async function() {
			if(message.type === 'dm') return;
			if(args.length == 0) return selfDeleteReply(message, `Usage: \`${config.prefix}nuke <messageID>\``, {sendStandard:true});
			const rid = args.join(' ');
			if(!/^\d+$/.test(rid)) return selfDeleteReply(message, `input \`${rid}\` is not a snowflake`);
			try {
				const target = await message.guild.channels.get('712972942451015683').fetchMessage(rid);
				delay('3s', () => {message.delete()});
				if(target && target.deletable)
				{
					if(target.author.id != client.user.id) return selfDeleteReply(message, `\`${config.prefix}nuke\` cannot be used on target message`);
					target.delete();
					selfDeleteReply(message, `I killed the report with 🔥`);
				} else {
					selfDeleteReply(message, `Couldn't find a report with message ID: \`${args.join(' ')}\``);
				}
			} catch(e) {
				return selfDeleteReply(message, `couldn't find a report with message ID: \`${rid}\``);
			}
		},
		
		"rebuild": async function() {
			if(args.length == 0) return selfDeleteReply(message, `Usage: \`${config.prefix}rebuild <copy & pasted text from report embed>\``, {sendStandard:true});
			const nargs = args.join(' ').split('\n');
			const title = nargs.shift();
			const esplit = nargs.join('\n').split('Expected Result');
			const repro = esplit.shift().trim();
			const sargs = ['', ...esplit].join('Expected Result').split('\n');
			const reproRegex = /\s*\n-/g;
			const leadingTildeRegex = /^\s*~\s?/;
			const steps = repro.slice(2).replace(reproRegex, ' ~').replace(leadingTildeRegex, '');
			sargs.shift();
			const expect = sargs.shift();
			sargs.shift();
			const actual = sargs.shift();
			sargs.shift();
			const system = sargs.shift();
			sargs.shift();
			const client = sargs.shift();
			const report = `!submit --title ${title} --repro-steps ${steps} --expected ${expect} --actual ${actual} --system ${system} --client ${client}`;
			message.channel.send('```\n' + report + '\n```');
		},
		
		"approve": async function(){commandLUT["canrepro"]},
		"cr": async function(){commandLUT["canrepro"]},
		"canrepro": async function() {
			if(message.type === 'dm') return;
			
		},
		
		"deny": async function(){commandLUT["cantrepro"]},
		"cnr": async function(){commandLUT["cantrepro"]},
		"cantrepro": async function(){
			if(message.type === 'dm') return;
			
		},
		
		"status": async function() {
			if(message.author.id != 193160566334947340) {
				return null;
			} else {
				client.user.setActivity(args.join(" "));
			}
		},
		
		"embed": async function() {
			const pargs = parseArgs(args, {'author':['a', '-author'], 'avatar':['p', '-author-avatar', '-author-picture'], 'color':['c', '-color'], 'thumbnail':['b', '-thumbnail'], 'title':['t', '-title'], 'description':['d', '-description'], 'url':['u', '-url', '-link'], 'footer':['f', '-footer'], 'footerAvatar':['o', '-footer-avatar', '-footer-picture', '--footer-icon'], 'timestamp':['s', '-timestamp'], 'image':['i', '-image']});
			const author = pargs.author;
			const avatar = pargs.avatar;
			const color = pargs.color;
			const thumbnail = pargs.thumbnail;
			const title = pargs.title;
			const description = pargs.description;
			const url = pargs.url;
			const footer = pargs.footer;
			const footerAvatar = pargs.footerAvatar;
			const timestamp = pargs.timestamp === 'now' ? Date.now() : pargs.timestamp;
			const image = pargs.image;
			let rargs = [...pargs.args];
			const embed = new Discord.RichEmbed();
			if(author) embed.setAuthor(author,avatar);
			if(thumbnail) embed.setThumbnail(thumbnail);
			if(color) embed.setColor(color);
			if(title) embed.setTitle(title);
			if(description) embed.setDescription(description);
			if(url) embed.setURL(url);
			if(footer) embed.setFooter(footer,footerAvatar);
			if(timestamp !== undefined) embed.setTimestamp(Number(timestamp));
			if(image) embed.setImage(image);
			while(rargs != false)
			{
				const fargs = parseArgs(rargs, {'name':'n','value':'v','inline':['e','-inline']});
				if(fargs.name !== undefined || fargs.value !== undefined)
				{
					const name = fargs.name || '\u200B';
					const value = fargs.value || '\u200B';
					const inline = fargs.inline;
					embed.addField(name, value, inline);
				}
				if(arrayEquals(rargs,fargs.args)) break;
				rargs = [...fargs.args];
			}
			message.channel.send(embed);
		},
		
		"dlink": async function() { return; // broken due to imgur website design update
			const escapedLinks = [];
			const resolveDirect = async (img) => {
				if(escapedEmbedLink.test(img)) img = escapedEmbedLink.exec(img)[1];
				const oimg = img;
				if(imgurDirectRegex.test(img))
				{
					/*
					 * Check if the link is already a direct link.
					 * In theory this segment will recover album links that are incorrectly/invalidly turned into direct links
					 * by adding an extension directly to the album link, or by doing the same thing but also changing the domain
					 * to imgur's 'i.imgur.com' CDN; after recovery this album link can be turned into the correct direct link
					 */
					const modifiedUrl = `https://imgur.com/a/${imgurDirectRegex.exec(img)[1]}`;
					try {
						const response = await rp(modifiedUrl);
						if(imgur404Regex.test(response)) 
						{
							escapedLinks.push(`<${img}>`);
							return;
						}
					} catch(e) {
						console.log(e.stack);
						escapedLinks.push(`<${img}>`);
						return;
					}
					img = modifiedUrl;
				}
				if(imgurAlbumRegex.test(img))
				{
					const response = await rp(img);
					const itemCount = response.split(`album_images`)[1].split(`"count":`)[1].split(`,`)[0];
					let messageBody = null;
					if(itemCount == 1)
					{
						const link = imgurImgOrVideo.test(response) ? response.split(`<link rel="image_src" href="`)[1].split(`"`)[0]				    :
																	  response.split(`<meta property="og:video"`)[1].split(`content="`)[1].split(`"`)[0];
						escapedLinks.push(`<${link}>`);
					} else {
						const imageData = [...response.split(`album_images`)[1].split(`"images":[`)[1].split(`]},`)[0].matchAll(imgurUriRegex)];
						const imageUris = imageData.map(hashAndExt => hashAndExt.slice(1).join(``));
						const imageLinks = imageUris.map(uri => [imgurCdn,uri].join(``));
						imageLinks.forEach(link => escapedLinks.push(`<${link}>`));
					}
					return;
				}
				return selfDeleteReply(message, `invalid link (<${oimg}>); I only eat imgur links`);
			};
			if(args.every(arg =>
			{
				const esc = escapedEmbedLink.test(arg) ? escapedEmbedLink.exec(arg)[1] : arg;
				return imgurDirectRegex.test(esc) || imgurAlbumRegex.test(esc);
			}))
			{
				for(let i = 0; i < args.length; i++)
				{
					await resolveDirect(args[i]);
				}
			} else {
				await resolveDirect(args[0]);
			}
			const messageBody = escapedLinks.join(`\n`);
			message.channel.send(messageBody);
		},
		
		"up": async function() {commandLUT["upload"]},
		"upload": async function() {
			const imageLinks = [];
			const uploadAttachment = async (attachment) =>
			{
				const image = await imgur.uploadUrl(attachment.url);
				imageLinks.push(`<${image.data.link}>`);
			};
			if(message.attachments.size == 0) return selfDeleteReply(message, `you must provide an image to upload`);
			if(!imgurUploadFormatRegex.test(message.attachments.first().filename)) return selfDeleteReply(message, `I can only upload these image formats: PNG, JPG/JPEG, GIF`);
			if(message.attachments.size > 1)
			{
				const attachmentsArray = message.attachments.array();
				const length = attachmentsArray.length;
				for(let i = 0; i < length; i++)
				{
					if(imgurUploadFormatRegex.test(attachmentsArray[i].filename))
					{
						await uploadAttachment(attachmentsArray[i]);
					}
				}
			} else {
				await uploadAttachment(message.attachments.first());
			}
			const messageBody = imageLinks.join('\n');
			message.channel.send(messageBody);
		},
		
		"ios": async function() {
			const apostropheRegex = /’/g;
			const quoteRegex = /[“”]/g;
			const messageContent = args.join(' ');
			const cleanContent = messageContent.replace(apostropheRegex, `'`).replace(quoteRegex, `"`);
			message.channel.send('```\n' + cleanContent + '\n```').catch(console.error);
		},
		
		"deletehook": async function() {
			let hooks = await message.channel.fetchWebhooks();
			let hook = hooks.first();
			hook.delete();
			message.channel.send(`Deleted ${hook.name}`);
		},
		
		"edithook": async function() {
			let hooks = await message.channel.fetchWebhooks();
			let hook = hooks.first();
			let oldName = hook.name;
			hook.edit(args.join(" "));
			message.channel.send(`Renamed ${oldName} to ${args.join(" ")}`);
		},
		
		"pingmein": async function() {
			let ping = new Promise((resolve,reject) =>
			{
				let timeToDelay = +args.shift() * 1000;
				setTimeout(function(){resolve(message.channel.send(`${message.author}`))}, timeToDelay);
			});
			await ping;
		},
		
		"sayin10seconds": async function() {
			if(args.length == 0) return selfDeleteReply(message, `Usage: \`${config.prefix}sayIn10Seconds <text to say>\``, {sendStandard:true});
			let ping = new Promise((resolve,reject) =>
			{
				let timeToDelay = 10000;
				setTimeout(function(){resolve(message.channel.send(args.join(' ')))}, timeToDelay);
			});
			await ping;
		},
		
		"addrole": async function() {
			if(message.author.id == 193160566334947340)
			{
				try {
					message.member.addRole(args.join(' '));
				} catch (e) {
					console.error(e);
				}
			}
		},
		
		"removerole": async function() {
			if(message.author.id == 193160566334947340)
			{
				try {
					message.member.removeRole(args.join(' '));
				} catch (e) {
					console.error(e);
				}
			}
		},
		
		//restricted
		"createguild": async function() {
			if(message.author.id == 193160566334947340)
			{
				try {
					const guild = await client.user.createGuild(args.join(" "));
					const defaultChannel = await guild.createChannel("general2", {"type" : "text"});
					const invite = await defaultChannel.createInvite();
					await message.author.send(invite.url);
					const role = await guild.createRole({ name:'Tester', permissions:['ADMINISTRATOR'] });
					await message.author.send(role.id);
				} catch (e) {
					console.error(e);
				}
			}
		},
		
		//only the specified users (the bot owner, usually) can user this, changes the status message
		"status": async function() {
			if(message.author.id == 193160566334947340) 
			{
				client.user.setActivity(args.join(" "));
			}
		},
	}
	
	let log = true;
	let execute = commandLUT[command] || async function(){log=false;}
	if(log) console.log("processing " + command + " command");
	execute();
});

client.on('error', e => console.error(e.message));

//executes the function to log the client into discord
client.login(config.token);
}

main();
