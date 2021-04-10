const isTimeFormat = require('./isTimeFormat.js');

const yearReg = /(-?(?:\d+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?e-?\d+|0x[\dabcedf]+))y/i;
const weekReg = /(-?(?:\d+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?e-?\d+|0x[\dabcedf]+))w/i;
const dayReg = /(-?(?:\d+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?e-?\d+|0x[\dabcedf]+))d/i;
const hourReg = /(-?(?:\d+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?e-?\d+|0x[\dabcedf]+))h/i;
const minReg = /(-?(?:\d+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?e-?\d+|0x[\dabcedf]+))m(?!s)/i;
const secReg = /(-?(?:\d+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?e-?\d+|0x[\dabcedf]+))s/i;
const msReg = /(-?(?:\d+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?e-?\d+|0x[\dabcedf]+))ms/i;

/*
 parse time accepts inputs with flexible syntax. accepts any mix of years, weeks, days, hours, minutes, seconds, milliseconds.
 does not accept months because how many days is a month anyways? why do you need that?
 
 1h15m30s200ms
 1h
 15m
 30s
 200ms
 1h30s
 15m30s
*/
function parseTime(timeToParse, options)
{
	let timeValue = timeToParse;
	if(options === undefined) options = {};
	if(isNaN(timeToParse))
	{
		const timeString = timeToParse;
		if(!isTimeFormat(timeString))
		{
			if(options.throwIfInvalid)
			{
				throw new TypeError('must be in the format 1d 2h 3m 4s 5ms (any segment is optional, such as `1h 1m` is valid)');
			} else {
				return NaN;
			}
		} else {
			let match = null;
			let years = 0;
			let weeks = 0;
			let days = 0;
			let hours = 0;
			let minutes = 0;
			let seconds = 0;
			let milliseconds = 0;
			match = yearReg.exec(timeString);
			if(match !== null)
			{
				years = Number(match[1]);
			}
			match = null;
			match = weekReg.exec(timeString);
			if(match !== null)
			{
				weeks = Number(match[1]);
			}
			match = null;
			match = dayReg.exec(timeString);
			if(match !== null)
			{
				days = Number(match[1]);
			}
			match = null;
			match = hourReg.exec(timeString);
			if(match !== null)
			{
				hours = Number(match[1]);
			}
			match = null;
			match = minReg.exec(timeString);
			if(match !== null)
			{
				minutes = Number(match[1]);
			}
			match = null;
			match = secReg.exec(timeString);
			if(match !== null)
			{
				seconds = Number(match[1]);
			}
			match = null;
			match = msReg.exec(timeString);
			if(match !== null)
			{
				milliseconds = Number(match[1]);
			}
			days += 365*years;
			days += 7*weeks;
			hours += 24*days;
			minutes += hours*60;
			seconds += minutes*60;
			milliseconds += seconds*1000;
			timeValue = milliseconds;
		}
	}
	return timeValue;
}

module.exports = parseTime;