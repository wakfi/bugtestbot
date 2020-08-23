const objectEquals = require(`./objectEquals.js`);

function arrayEquals(firstArray,secondArray,ignorePrototype)
{
	if(!(firstArray instanceof Array && secondArray instanceof Array)) throw new TypeError(`firstArray and secondArray must be of type Array`);
	if(typeof Array.prototype.equals === 'function' && !ignorePrototype) return firstArray.equals(secondArray);
	if(firstArray.length != secondArray.length) return false;
	const len = firstArray.length;
	for(let i = 0; i < len; i++)
	{
		if(firstArray[i] instanceof Array && secondArray instanceof Array)
		{
			if(!arrayEquals(firstArray[i],secondArray[i],ignorePrototype)) return false;
		} else if(firstArray[i] instanceof Object && secondArray instanceof Object) {
			if(!objectEquals(firstArray[i],secondArray[i],ignorePrototype)) return false;
		} else if(firstArray[i] !== secondArray[i]) {
			return false;
		}
	}
	return true;
}

module.exports = arrayEquals;