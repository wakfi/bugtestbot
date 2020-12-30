const dashflagRegex = /(?<=\s|^)-([a-zA-Z]+)(?=\s|$)/g;
const doubleDashMatching = '[a-zA-Z-]+';
const dashMatching = '[a-zA-Z]+';
const dashflag = '-';

/**
typedef parseOptions
	options.flagPrefix {string}
	options.flagMatching {string}
	options.flagRegex {RegExp}
	options.disableAutoPrefix {boolean}
	options.singlePosition {boolean} - parsePositionalArgs only
	options.disableDoublePrefix {boolean}
	options.doublePrefix {string}
	options.doubleMatching {string}
	options.doubleRegex {RegExp}
*/

function parseTruthyArgs(args,flags,options) 
{
	if(typeof options === 'undefined') options = {};
	const flagPrefix = options.flagPrefix || dashflag;
	const flagMatching = options.flagMatching || dashMatching;
	const flagRegex = options.flagRegex || ((options.flagMatching || options.flagPrefix) ? new RegExp(`(?<=\\s|^)${flagPrefix}(${flagMatching})(?=\\s|$)`,`g`) : dashflagRegex);
	if(!(flagRegex instanceof RegExp)) throw new TypeError(`flagRegex must be a Regular Expression`);
	const argsCopy = [...args];
	const flagsMap = new Map();
	const obj = {};
	if(!options.disableAutoPrefix)
	{
		for(const [ key, flag ] of Object.entries(flags))
		{
			if(flag instanceof Array)
			{
				const flagSet = [];
				flag.forEach(subflag => flagSet.push(flagPrefix + subflag));
				flagsMap.set(key, flagSet);
			} else {
				flagsMap.set(key, flagPrefix + flag);
			}
		}
	} else {
		for(const [ key, flag ] of Object.entries(flags))
		{
			flagsMap.set(key, flag);
		}
	}
	const doublePrefix = options.doublePrefix || [flagPrefix,flagPrefix].join('');
	const doubleMatching = options.doubleMatching || doubleDashMatching;
	const doubleRegex = options.doubleRegex || new RegExp(`(?<=\\s|^)${doublePrefix}${doubleMatching}(?=\\s|$)`,`g`);
	const doubleFound = options.disableDoublePrefix ? [] : [...argsCopy.join(' ').matchAll(doubleRegex)];
	
	/* line by line version of variable 'found' declaration
	const argstring = argsCopy.join(' ');
	const allMatchesIterator = argstring.matchAll(flagRegex);
	const foundAllAsList = [...allMatchesIterator];
	const prefixesRemoved = foundAllAsList.map(tuple => tuple.slice(1));
	const singleMatches = prefixesRemoved.flat(Infinity);
	const joinedMatches = singleMatches.join('');
	const noPrefixes = joinedMatches.split(flagPrefix);
	const joinedMatchesNoPrefixes = noPrefixes.join('');
	const splitMatchesNoPrefixes = joinedMatchesNoPrefixes.split('');
	const prefixed = splitMatchesNoPrefixes.map(foundItem => [flagPrefix,foundItem].join(''));
	const found = [...doubleFound, ...prefixed];
	*/
	const found = [...doubleFound, ...[...argsCopy.join(' ').matchAll(flagRegex)].map(tuple => tuple.slice(1)).flat(Infinity).join('').split(flagPrefix).join('').split('').map(foundItem => [flagPrefix,foundItem].join(''))];
	let count = 0;
	const parse = (key,flag) => 
	{
		if(found.includes(flag))
		{
			const indexKey = found.indexOf(flag);
			found.splice(indexKey,1);
			argsCopy.splice(argsCopy.indexOf(key),1);
			count++;
			return true;
		}
		return false;
	};
	for(const [ key, value ] of flagsMap)
	{
		if(value instanceof Array)
		{
			let matchMade = false;
			for(const flag of value)
			{
				if(parse(key,flag))
				{
					matchMade = true;
					break;
				}
			}
			Object.defineProperty(obj, key, {value: matchMade, writable: false, enumerable: true, configurable: true});
		} else {
			Object.defineProperty(obj, key, {value: parse(key,value), writable: false, enumerable: true, configurable: true});
		}
	}
	Object.defineProperty(obj, 'args', {value: argsCopy, writable: false, enumerable: true, configurable: true});
	Object.defineProperty(obj, 'found', {value: found, writable: false, enumerable: true, configurable: true});
	Object.defineProperty(obj, 'count', {value: count, writable: false, enumerable: true, configurable: true});
	return obj;
}

module.exports = parseTruthyArgs;