module.exports = (message, config) => {
    const autoDetect = config.autoDetect;

    // If autoDetect should be enabled
    if(!autoDetect.enabled || !message.content) return false;

    // Identify Eligible Channels
    if(!checkChannelList(message.channelId, autoDetect.channels)) return false;

    // Check message
    if(autoDetect.mustContainLink && !containsLink(message.content) || !checkLength(message.content, autoDetect.messageLengthLimit)) return false;

    // Check words
    if(!checkWords(message.content, autoDetect.scamWords)) return false;

    return true;
}

function checkChannelList(currentChannel, config) {
    const channelList = config.blacklist;
    const convertToWhitelist = config.convertToWhitelist;
    
    if(!convertToWhitelist && typeof channelList.find(channel => channel.toString() === currentChannel) !== 'undefined') return false;
    if(convertToWhitelist && typeof channelList.find(channel => channel.toString() === currentChannel) === 'undefined') return false;

    return true;
}

function checkLength(content, lengthLimit) {
    if(!lengthLimit || !content.length) return false;
    
    return content.length > lengthLimit;
}

function containsLink(content) {
    const regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/;
    return regex.test(content);
}

function checkWords(content, words) {
    let list = content.toLowerCase().split(' ');
    words = words.map(word => word.toLowerCase());

    if(!list.length) return false;


    list = list.filter(word => words.includes(word));

    return list.length > 0;
}