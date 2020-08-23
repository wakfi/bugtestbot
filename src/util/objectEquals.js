const arrayEquals = require(`./arrayEquals.js`);

function objectEquals(firstObject,secondObject,ignorePrototype)
{
	if(!(firstObject instanceof Object && secondObject instanceof Object)) throw new TypeError(`firstObject and secondObject must be of type Object`);
	if(typeof Object.prototype.equals === 'function' && !ignorePrototype) return firstObject.equals(secondObject);
	for(propertyName in firstObject)
	{
		if(firstObject.hasOwnProperty(propertyName) != secondObject.hasOwnProperty(propertyName))
		{
            return false;
        } else if (typeof firstObject[propertyName] != typeof secondObject[propertyName]) {
            return false;
        }
	}
	for(propertyName in secondObject)
	{
		if(firstObject.hasOwnProperty(propertyName) != secondObject.hasOwnProperty(propertyName))
		{
            return false;
        } else if (typeof firstObject[propertyName] != typeof secondObject[propertyName]) {
            return false;
        }
		//If the property is inherited, do not check any more (it must be equal if both objects inherit it)
		//- i think this is fallacious so i will ignore it
		//if(!firstObject.hasOwnProperty(propertyName)) continue;
		if(firstObject[propertyName] instanceof Array && secondObject[propertyName] instanceof Array)
		{
			if(!arrayEquals(firstObject[propertyName],secondObject[propertyName],ignorePrototype)) return false;
		} else if(firstObject[propertyName] instanceof Object && secondObject[propertyName] instanceof Object) {
			if(!objectEquals(firstObject[propertyName],secondObject[propertyName],ignorePrototype)) return false;
		} else if(firstObject[propertyName] !== secondObject[propertyName]) {
			return false;
		}
	}
	return true;
}

module.exports = objectEquals;