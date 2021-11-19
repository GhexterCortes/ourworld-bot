module.exports = (message, config) => {
    const domainDetect = config.domainNameMatch;

    if(message?.content && domainDetect.blacklistedDomains.some(word => message.content.toLowerCase().includes(word))) return true;

    return false;
}