const fetch = require('node-fetch');

const urlRegex = /(https?:\/\/[^ ]*)/;

function extractUrlsFromContent(content) {
    try {
        let urls = [];

        if (!content)
            return urls;

        let url;
        content.match(urlRegex).forEach((match) => {
            urls.push(match);
        });

        return urls.filter(onlyUnique);
    } catch (err) {
        console.log("unable to parse URLs: " + err);
        return [];
    }
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function isRestrictedHeader(contentType) {
    if (!contentType)
        return false;

    contentType = contentType.toLowerCase();

    if (contentType === "image/gif")
        return true;

    return false;
}

async function checkIfIsRestricted(url) {
    try {
        const response = await fetch(url, {
            method: "HEAD",
            headers: {
                "Accept": "*/*",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36"
            }
        });

        if (response && response.headers && response.headers.get) {
            const contentType = response.headers.get("Content-Type");
            
            return isRestrictedHeader(contentType);
        }

        return false;
    } catch (err) {
        console.log("Unable to process URL");

        return false;
    }
}

module.exports = {
    extractUrlsFromContent,
    checkIfIsRestricted
};