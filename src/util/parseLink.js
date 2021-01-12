const linkRegex = /^<?(https?:\/\/.+?)>?$/;

function parseLink(url)
{
	if(!url) return url;
	const matches = linkRegex.exec(url);
	if(!matches) return undefined;
	const link = matches[1];
	return link;
}

module.exports = parseLink;