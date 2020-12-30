const parseTime = require('./parseTime.js');

//create a promise that resolves after the specified amount of time
function delay(timeToDelay, callback)
{
	return new Promise(async (resolve,reject) =>
	{
		const timeInMilliseconds = parseTime(timeToDelay);
		if(callback && !(callback instanceof Function)) { console.error(`delay(): callback must be a function (non-fatal)`); callback = undefined }
		setTimeout(async function()
		{
			resolve();
			if(callback !== undefined) callback();
		}, timeInMilliseconds);
	});
}

module.exports = delay;