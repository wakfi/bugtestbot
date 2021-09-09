function main(){
//loads in Discord.js library
const Discord = require('discord.js');
const fetch = require('node-fetch');
const FormData = require('form-data');
const rp = async (query) => await (await fetch(query)).text(); //originally algorithm/approach written using request-promise, now deprecated. This lambda is for backwards compatability
const clientOps = require('./components/clientOps.json');
const client = new Discord.Client(clientOps);
const config = require("./components/config.json");
let d = new Date();

const millisecondsToString = require(`${process.cwd()}/util/millisecondsToString.js`);
const {addTimestampLogs} = require(`${process.cwd()}/util/addTimestampLogs.js`);
const printTimePretty = require(`${process.cwd()}/util/printTimePretty.js`);
const selfDeleteReply = require(`${process.cwd()}/util/selfDeleteReply.js`);
const authorReply = require(`${process.cwd()}/util/authorReply.js`);
const arrayEquals = require(`${process.cwd()}/util/arrayEquals.js`);
const {transform} = require(`${process.cwd()}/util/transform.js`);
const parseArgs = require(`${process.cwd()}/util/parseArgs.js`);
const parseTime = require(`${process.cwd()}/util/parseTime.js`);
const parseLink = require(`${process.cwd()}/util/parseLink.js`);
const delay = require(`${process.cwd()}/util/delay.js`);

const imgurUploadFormatRegex = /^.+\.(?:png|jpg|jpeg|gif|mp4|webm|mov|mpe?g|flv|wmv)(\?.+?=.*?)*$/;
const gyazoRegex = /https:\/\/gyazo\.com/g;
const linkRegex = /^<?https?:\/\/.+?>?$/;
const leadingDashRegex = /^\s*-\s?/;
const reproStepRegex = /\s*\n-/g;
const snowflakeRegex = /^\d+$/;
const atMeRegex = /(?<=^|\s)@me(?=\s|$)/gi;

const imgurUpEndpoint = `https://api.imgur.com/3/upload`;
const imgurCdn = `https://i.imgur.com/`;
const imgur404Regex = /s\.\imgur\.com\/images\/404/;
const escapedEmbedLink = /<(https:\/\/.*)>/;
const imgurDirectRegex = /https:\/\/(?:i\.)?imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]{7})\..{3,4}/;
//potential alternate, need to verify imgur's valid extensions
//const imgurDirectRegex = /https:\/\/(?:i\.)?imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]{7})\.(?:png|jpg|jpeg|mp4|gif|gifv|webm)/;
const imgurAlbumRegex = /imgur\.com\/(?:gallery\/|a\/)?[a-zA-Z0-9]{7}#?$/;
const imgurImgOrVideo = /<link rel="image_src" href="/;
const imgurUriRegex = /\{"hash":"([a-zA-Z0-9]{7})".*?"ext":"(\..{3,4}?).*?\}/g;
const linkIsVideo = /^.*\.(mp4|webm|mov|mpe?g|flv|wmv)$/;



//this is the file that holds the login info, to keep it seperate from the source code for safety
client.once("ready", async () => {
	addTimestampLogs();
	console.log(`${client.user.username} has started, with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
	client.user.setActivity(`Time to catch bugs 🐞`);
});

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
			if(message.author.id != 193160566334947340) {
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
			const pargs = parseArgs(args, {'time':['-in','-time','i','t'],'message':['m','-message'],'repeat':['r','-repeat','-repeat-for'],'delay':['d','-delay','-delay-each']});
			if(pargs.time)
			{
				const timeInput = pargs.time.split(' ').join('');
				const waitTime = isNaN(Number(timeInput)) ? timeInput : Number(timeInput) * 1000;
				try {
					message.channel.send(`Waiting for ${printTimePretty(millisecondsToString(parseTime(waitTime)))}`);
				} catch(e) {
					console.error(e.stack);
					return message.channel.send(`Failed to parse: ${timeInput}`);
				}
				await delay(waitTime);
			} else {
				if(message.channel.type != 'dm') message.delete().catch(O_o=>{console.error(O_o)});
			}
			let duration = 0;
			if(pargs.delay && pargs.repeat)
			{
				const delayInput = pargs.delay.split(' ').join('');
				duration = isNaN(Number(delayInput)) ? delayInput : Number(delayInput) * 1000;
			}
			const targs = parseArgs(pargs.args.join(' '), {'mentions': 'M'}, {truthy: true});
			const mentions = !targs.mentions;
			const sayMessage = (pargs.message || targs.args.join(' ')).replace(atMeRegex, message.author.toString());
			const totalTimesToSend = Number(pargs.repeat) || 1;
			const options = {};
			if(!mentions) options.allowedMentions = {parse: []};
			for(let i = 0; i < totalTimesToSend; i++)
			{
				try
				{
					await message.channel.send(await transform(sayMessage, {
						message: message,
						count: i,
						startCount: 1,
					}), options);
				} catch(e) {
					return console.error(e.stack);
				}
				await delay(duration);
			}
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
			if(args.length == 0) return selfDeleteReply(message, `Usage: \`${config.prefix}report <messageID>\``, {sendStandard:true});
			let channelId = message.channel.id;
			let dargs = args;
			if(dargs.join(' ').includes('-'))
			{
				dargs = dargs.join(' ').split('-');
				channelId = dargs.shift();
			}
			const rid = dargs.join(' ');
			if(!snowflakeRegex.test(channelId)) return selfDeleteReply(message, `input \`${channelId}\` is not a snowflake`);
			if(!snowflakeRegex.test(rid)) return selfDeleteReply(message, `input \`${rid}\` is not a snowflake`);
			try {
				let testTarget = null;
				try {
					testTarget = await message.guild.channels.resolve(channelId).messages.fetch(rid);
				} catch(e) {
					testTarget = await message.guild.channels.resolve('712972942451015683').messages.fetch(rid);
				}
				const target = testTarget;
				delay('10s', () => {message.delete()});
				const reproRegex = /\n-/g
				const embed = target.embeds[0];
				const title = embed.title;
				const steps = embed.description.slice(2).replace(reproRegex, ' -');
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
						case 'saved Linux system info':
							return '--storedinfo linux';
						default:
							return `--system ${info}`;
					}
				})(embed.fields[2].value);
				const client = embed.fields[3].value;
				const report = `!submit --title ${title} --repro-steps ${steps} --expected ${expect} --actual ${actual} ${system} --client ${client}`; //${system} IS NOT SUPPOSED TO HAVE A FLAG IN FRONT OF IT. It gets that from the switch (-i/-s)
				message.channel.send('```\n' + report + '\n```');
			} catch(e) {
				return selfDeleteReply(message, `couldn't find a report with ID: \`${channelId==message.channel.id?rid:`${channelId}-${rid}`}\``);
			}
		},

		"focus": async function() {
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
						case 'linux':
							return 'saved Linux system info';
						default:
							return `unknown system "${info}"`;
					}
				})(infosys);
			}
			const stepsRegex = / -/g;
			const steps = '- ' + repro.replace(stepsRegex, '\n-');
			const report =
`\`\`\`
**${title}**
**Steps to reproduce:**
${steps}
**Expected Results:** ${expected}
**Actual Results:** ${actual}
**Client Settings:** ${client}
**System Settings:** ${system || pargs.system}
\`\`\``;
			const sent = await message.channel.send(report);
		},

		// original !submit command
		"queue": async function() {
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
						case 'linux':
							return 'saved Linux system info';
						default:
							return `unknown system "${info}"`;
					}
				})(infosys);
			}
			const stepsRegex = / -/g;
			const steps = '- ' + repro.replace(stepsRegex, '\n-');
			const author = message.author;
			const embed = new Discord.MessageEmbed()
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
			const sent = await message.guild.channels.resolve('712972942451015683').send(embed);
			selfDeleteReply(message, `your report has been submitted!`);
			delay('4s', () => {message.delete()});
			await sent.react('735712895601606686');
			await sent.react('735713063529087066');
		},

		// original !create command
		"create": async function(){commandLUT["submit"]()},
		"submit": async function() {
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
						case 'linux':
							return 'saved Linux system info';
						default:
							return `unknown system "${info}"`;
					}
				})(infosys);
			}
			const stepsRegex = / -/g;
			const steps = '- ' + repro.replace(stepsRegex, '\n-');
			const author = message.author;
			const embed = new Discord.MessageEmbed()
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
			await message.channel.send(embed);
		},

		"edit": async function() {
			if(message.type === 'dm') return;
			if(args.length == 0) return selfDeleteReply(message, `Usage: \`${config.prefix}edit <messageID> <DBug edit syntax>\``, {sendStandard:true});
			const pargs = parseArgs(args, {'title':['t','-title'], 'repro':['r','-repro-steps'], 'expected':['e','-expected'], 'actual':['a','-actual'], 'system':['s','-system'], 'client':['c','-client']});
			let channelId = message.channel.id;
			let dargs = pargs.args;
			if(dargs.join(' ').includes('-'))
			{
				dargs = dargs.join(' ').split('-');
				channelId = dargs.shift();
			}
			const rid = dargs.join(' ');
			if(rid.length == 0) return selfDeleteReply(message, `you must provide a message ID`);
			if(!snowflakeRegex.test(channelId)) return selfDeleteReply(message, `input \`${channelId}\` is not a snowflake`);
			if(!snowflakeRegex.test(rid)) return selfDeleteReply(message, `input \`${rid}\` is not a snowflake`);
			try  {
				let testTarget = null;
				try {
					testTarget = await message.guild.channels.resolve(channelId).messages.fetch(rid);
				} catch(e) {
					testTarget = await message.guild.channels.resolve('712972942451015683').messages.fetch(rid);
				}
				const target = testTarget;
				delay('10s', () => {message.delete()});
				const { title,repro,expected,actual,system,client } = pargs;
				const embed = new Discord.MessageEmbed(target.embeds[0]);
				if(!(title || repro || expected || actual || client || system)) return selfDeleteReply(message, `you need to include one or more flags`);
				if(title) embed.setTitle(title);
				if(repro)
				{
					const stepsRegex = / -/g;
					const steps = '- ' + repro.replace(stepsRegex, '\n-');
					embed.setDescription(steps);
				}
				if(expected) embed.fields[0].value = expected;
				if(actual) embed.fields[1].value = actual;
				if(system) embed.fields[2].value = system;
				if(client) embed.fields[3].value = client;
				await target.edit(embed);
				selfDeleteReply(message, `updated report at ${channelId==message.channel.id?rid:`${channelId}-${rid}`}`);
			} catch(e) {
				return selfDeleteReply(message, `couldn't find a report with ID: \`${channelId==message.channel.id?rid:`${channelId}-${rid}`}\``);
			}
		},

		"nuke": async function() {
			if(message.type === 'dm') return;
			if(args.length == 0) return selfDeleteReply(message, `Usage: \`${config.prefix}nuke <messageID>\``, {sendStandard:true});
			const rid = args.join(' ');
			if(!snowflakeRegex.test(rid)) return selfDeleteReply(message, `input \`${rid}\` is not a snowflake`);
			try {
				const target = await message.guild.channels.resolve('712972942451015683').messages.fetch(rid);
				delay('3s', () => {message.delete()});
				if(target && target.deletable)
				{
					if(target.author.id != client.user.id) return selfDeleteReply(message, `\`${config.prefix}nuke\` cannot be used on target message`);
					target.delete();
					selfDeleteReply(message, `I killed the report with 🔥`);
				} else {
					selfDeleteReply(message, `couldn't find a report with message ID: \`${args.join(' ')}\``);
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
			const steps = repro.slice(2).replace(reproStepRegex, ' -').replace(leadingDashRegex, '');
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

		"approve": async function(){commandLUT["canrepro"]()},
		"cr": async function(){commandLUT["canrepro"]()},
		"canrepro": async function() {
			if(message.type === 'dm') return;

		},

		"deny": async function(){commandLUT["cantrepro"]()},
		"cnr": async function(){commandLUT["cantrepro"]()},
		"cantrepro": async function(){
			if(message.type === 'dm') return;

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
			let remainingArgs = [...pargs.args];
			const embed = new Discord.MessageEmbed();
			if(author) embed.setAuthor(author, parseLink(avatar));
			if(thumbnail) embed.setThumbnail(parseLink(thumbnail));
			if(color) embed.setColor(color);
			if(title) embed.setTitle(title);
			if(description) embed.setDescription(description);
			if(url) embed.setURL(parseLink(url));
			if(footer) embed.setFooter(footer, parseLink(footerAvatar));
			if(timestamp !== undefined) embed.setTimestamp(Number(timestamp));
			if(image) embed.setImage(parseLink(image));
			while(remainingArgs != false)
			{
				const fieldArgs = parseArgs(remainingArgs, {'name':'n','value':'v','inline':['e','-inline']});
				if(fieldArgs.name !== undefined || fieldArgs.value !== undefined)
				{
					const name = fieldArgs.name || '\u200B';
					const value = fieldArgs.value || '\u200B';
					const inline = fieldArgs.inline;
					embed.addField(name, value, inline);
				}
				if(arrayEquals(remainingArgs,fieldArgs.args)) break;
				remainingArgs = [...fieldArgs.args];
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

		"up": async function() {commandLUT["upload"]()},
		"upload": async function() {
			const imageLinks = [];
			const uploadAttachment = async (url) =>
			{
				try
				{
					const form = new FormData();
					form.append(linkIsVideo.test(url) ? 'video' : 'image', url);
					form.append('type', 'url');
					const image = await (await fetch(imgurUpEndpoint, { method: 'post', body: form, headers: { 'Authorization': `Client-ID ${config.imgur.id}` } })).json();
					if(image.status === 200)
					{
						imageLinks.push(`<${image.data.mp4 || image.data.link}>`);
					} else {
						console.log(`Error while uploading an image`);
						console.log(`${image.status} ${image.data.error}`);
					}
				} catch(e) {
					console.error(e.stack);
				}
			};
			const inputLinks = [];
			args.forEach(arg =>
			{
				if(linkRegex.test(arg))
				{
					inputLinks.push(parseLink(arg));
				}
			});
			for(let i = 0; i < inputLinks.length; i++)
			{
				let link = inputLinks[i];
				if(!gyazoRegex.test(link)) break;
				link = link.replace(gyazoRegex, `https://i.gyazo.com`);
				let r = await fetch(link + '.png');
				if(r.ok) {inputLinks[i] = link + '.png'; break}
				r = await fetch(link + '.jpg');
				if(r.ok) {inputLinks[i] = link + '.jpg'; break}
				r = await fetch(link + '.gif');
				if(r.ok) {inputLinks[i] = link + '.gif'; break}
				await selfDeleteReply(message, `Please manually convert gyazo link to a direct image link for: \`${link}\``, {duration: 0, sendStandard: true});
			}
			message.attachments.forEach(attachment =>
			{
				if(imgurUploadFormatRegex.test(attachment.name))
				{
					inputLinks.push(attachment.url);
				}
			});
			const length = inputLinks.length;
			if(length === 0) return selfDeleteReply(message, `you must provide an image or video to upload`);
			if(!imgurUploadFormatRegex.test(inputLinks[0])) return selfDeleteReply(message, `I can only upload these media formats: PNG, JPG/JPEG, GIF, MP4, WEBM, FLV, MPG/MPEG, WMV`);
			for(let i = 0; i < length; i++)
			{
				await uploadAttachment(inputLinks[i]);
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

		"pingme": async function() {commandLUT["pingmein"]()},
		"pingmein": async function() {
			let ping = new Promise((resolve,reject) =>
			{
				const timeInput = args.shift();
				const timeToDelay = isNaN(Number(timeInput)) ? parseTime(timeInput) : Number(timeInput) * 1000;
				setTimeout(function(){resolve(message.channel.send(`${message.author}`))}, timeToDelay);
				if(!isNaN(timeToDelay))
				{
					selfDeleteReply(message, `Ok! I'll ping you in ${printTimePretty(millisecondsToString(timeToDelay))}`, {sendStandard:true});
				}
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
	try
	{
		await execute();
	} catch(e) {
		console.error(e.stack);
		return message.channel.send('Uh Oh! Something bad happened :( Please inform a developer about this issue').catch(o_O=>{});
	}
	if(log) console.log('processing ' + command + ' command');
});

client.on('error', e => console.error(e.stack));

//executes the function to log the client into discord
client.login(config.token);
}

main();
