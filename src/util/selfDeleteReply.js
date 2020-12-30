const path = require('path');
const Message = require((require.resolve('discord.js')).split(path.sep).slice(0, -1).join(path.sep) + `${path.sep}structures${path.sep}Message.js`);
const MessageEmbed = require((require.resolve('discord.js')).split(path.sep).slice(0, -1).join(path.sep) + `${path.sep}structures${path.sep}MessageEmbed.js`);
const delay = require('./delay.js');

/** Options
 * Options include all options for discord.js TextChannel.send() MessageOptions
 * @property sendStandard [boolean]: send as standard message instead of as reply message
 */
 
function selfDeleteReply(message, input, options)
{
	return new Promise(async (resolve,reject) =>
	{
		let emb = undefined;
		if(typeof input === 'object' && typeof options === 'undefined') {options = input; input = '';}
		let duration = (typeof options === 'object') ? options.duration : options; //backwards compatability
		if(typeof options !== 'object') options = {};
		if(!(message instanceof Message)) throw new TypeError(`message is not Discord Message`);
		if(typeof input === 'undefined') input = 'an unknown error occured';
		if(typeof duration === 'undefined') duration = '15s';
		if(input instanceof MessageEmbed) {emb = input;input='';}
		else {emb = options.embed;}
		if(input) {options.content = input; input = ''}
		if(!options.allowedMentions) options.allowedMentions = {parse:options.parse,users:options.users,roles:options.roles}
		input = options.content;
		const messageOptions = {embed:emb, allowedMentions:options.allowedMentions,content:options.content,tts:options.tts,nonce:options.nonce,files:options.files,code:options.code,split:options.split,reply:options.reply};
		const errReply = (options.sendStandard) ? await message.channel.send(input, messageOptions) : await message.reply(input, messageOptions);
		if(duration == 0) resolve();
		await delay(duration);
		await errReply.delete();
		resolve();
	});
}

module.exports = selfDeleteReply;
