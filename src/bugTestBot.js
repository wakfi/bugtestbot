function main(){
//loads in Discord.js library
const Discord = require("discord.js");
const clientOps = require('./components/clientOps.json');
const client = new Discord.Client(clientOps);
var d = new Date();

const delay = require(`${process.cwd()}/util/delay.js`);
const millisecondsToString = require(`${process.cwd()}/util/millisecondsToString.js`);
const parseArgs = require(`${process.cwd()}/util/parseArgs.js`);
const parseTime = require(`${process.cwd()}/util/parseTime.js`);
const printTimePretty = require(`${process.cwd()}/util/printTimePretty.js`);
const selfDeleteReply = require(`${process.cwd()}/util/selfDeleteReply.js`);
const authorReply = require(`${process.cwd()}/util/authorReply.js`);

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
const config = require("./components/config.json");
client.once("ready", async () => {
	//fixLogs(); 
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
	
	if(message.channel.id == '712972942451015683')
	{
		await message.react('735712895601606686');
		await message.react('735713063529087066');
	}

	
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
		//sends a quote at random from the quote channel to the spooky book, except on demand instead of timed
		
		//gives the bot the appearance of speaking by deleting the command message and stealing the content. Will evevntually streamline for remote control (from terminal or dm)
		"say": async function() {
			const pargs = parseArgs(args, ['time','message'], ['in','m']);
			if(pargs.time)
			{
				const waitTime = pargs.time.join(' ');
				message.channel.send(`Waiting for ${printTimePretty(millisecondsToString(parseTime(waitTime)))}`);
				await delay(waitTime);
			}
			const sayMessage = pargs.message.join(' ') || pargs.args.join(' ');
			message.delete().catch(O_o=>{console.error(O_o)});
			message.channel.send(sayMessage).catch(err=>{});
		},

		
		//utilizes a bulk message deltion feature available to bots, able to do up to 100 messages at once, minimum 3. Adjusted to erase command message as well
		"purge": async function() {
			if(message.author.id != 193160566334947340)
				return message.author.send(`Sorry, you don't have permissions to use this!`);
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
			const rid = args.join(' ');
			const target = await message.guild.channels.get('712972942451015683').fetchMessage(rid);
			await message.delete();
			if(target)
			{
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
							return '-i mac';
						case 'saved Windows system info':
							return '-i windows';
						case 'saved Android system info':
							return '-i android';
						case 'saved iOS system info':
							return '-i ios';
						default:
							return `-s ${info}`;
					}
				})(embed.fields[2].value);
				const client = embed.fields[3].value;
				const report = `!submit -t ${title} -r ${steps} -e ${expect} -a ${actual} ${system} -c ${client}`;
				message.channel.send('```' + report + '```');
			} else {
				selfDeleteReply(message, `Couldn't find a report with message ID: \`${rid}\``);
			}
		},
		
		"submit": async function() {
			if(message.type === 'dm') return;
			const pargs = parseArgs(args, ['title','repro','expected','actual','system','client','infosys'], ['t','r','e','a','s','c','i']);
			const { title,repro,expected,actual,system,client,infosys } = pargs;
			if(!(title && repro && expected && actual && client && (system || infosys))) return authorReply(message, `Missing flags\n\`\`\`${args.join}\`\`\``);
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
			await message.delete();
			selfDeleteReply(message, `Submitted your report!`);
			await sent.react('735712895601606686');
			await sent.react('735713063529087066');
		},
		
		"edit": async function() {
			if(message.type === 'dm') return;
			const pargs = parseArgs(args, ['title','repro','expected','actual','system','client','infosys'], ['t','r','e','a','s','c','i']);
			const rid = pargs.args.join(' ');
			const target = await message.guild.channels.get('712972942451015683').fetchMessage(rid);
			await message.delete();
			if(target)
			{
				const { title,repro,expected,actual,system,client,infosys } = pargs;
				const embed = new Discord.RichEmbed(target.embeds[0]);
				if(!(title || repro || expected || actual || client || system || infosys)) return selfDeleteReply(message, 'You need to include one or more flag(s)');
				if(title) embed.setTitle(title);
				if(repro)
				{
					const stepsRegex = / ~/g;
					const steps = '- ' + repro.replace(stepsRegex, '\n-');
					embed.setDescription(steps);
				}
				if(expected) embed.fields[0].value = expected;
				if(actual) embed.fields[1].value = actual;
				if(system || infosys) 
				{
					embed.fields[2].value = system ? system : 
						(function(info) 
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
						})(infosys.toLowerCase());
				}
				if(client) embed.fields[3].value = client;
				await target.edit(embed);
				selfDeleteReply(message, `Updated report at ${rid}`);
			} else {
				selfDeleteReply(message, `Couldn't find a report with message ID: \`${rid}\``);
			}
		},
		
		"nuke": async function() {
			if(message.type === 'dm') return;
			const target = await message.guild.channels.get('712972942451015683').fetchMessage(args.join(' '));
			await message.delete();
			if(target)
			{
				await target.delete();
				selfDeleteReply(message, `I killed the report with 🔥`);
			} else {
				selfDeleteReply(message, `Couldn't find a report with message ID: \`${args.join(' ')}\``);
			}
		},
		
		"rebuild": async function() {
			if(message.type === 'dm') return;
			const sargs = args.join(' ').split('-');
			const title = sargs.shift().replace('\n','');
			const nsplit = sargs.pop().split('\n');
			sargs.push(nsplit.shift());
			const reproRegex = /\n-/g
			const steps = sargs.join('-').slice(1).replace(reproRegex, ' ~');
			nsplit.shift();
			const expect = nsplit.shift();
			nsplit.shift();
			const actual = nsplit.shift();
			nsplit.shift();
			const system = nsplit.shift();
			nsplit.shift();
			const client = nsplit.shift();
			const report = `!submit -t ${title} -r ${steps} -e ${expect} -a ${actual} -s ${system} -c ${client}`;
			message.channel.send('```' + report + '```');
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
		
		"ios": async function() {
			const apostropheRegex = /’/g;
			const quoteRegex = /[“”]/g;
			const messageContent = args.join(' ');
			const cleanContent = messageContent.replace(apostropheRegex, `'`).replace(quoteRegex, `"`);
			message.channel.send(cleanContent).catch(console.error);
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
