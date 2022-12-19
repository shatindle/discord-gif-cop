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

function isRestrictedHeader(contentType, level) {
    if (!contentType)
        return false;

    contentType = contentType.toLowerCase();

    if (contentType === "image/gif")
        return true;

    if (level === "all") {
        if (contentType.indexOf("image/") === 0) return true;
        if (contentType.indexOf("video/") === 0) return true;

        // not doing audio for now
        // if (contentType.indexOf("audio/") === 0) return true;
    }

    return false;
}

function isKnownGifDomain(url) {
    let domain = (new URL(url));

    if (domain.hostname.endsWith("giphy.com"))
        return true;

    if (domain.hostname.endsWith("tenor.com"))
        return true;

    if (domain.hostname.endsWith("gfycat.com"))
        return true;

    return false;
}

async function checkIfIsRestricted(url, level) {
    try {
        if (isKnownGifDomain(url)) {
            return true;
        }

        const response = await fetch(url, {
            method: "HEAD",
            headers: {
                "Accept": "*/*",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36"
            }
        });

        if (response && response.headers && response.headers.get) {
            const contentType = response.headers.get("Content-Type");
            
            return isRestrictedHeader(contentType, level);
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
