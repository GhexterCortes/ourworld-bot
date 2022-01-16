const StringSimilarity = require('string-similarity');

module.exports = (message, bannedWords, config) => {
    const words = message.trim().split(' ');
    const banned = [];
    const matches = words.filter(word => bannedWords.some(bannedWord => {
            let test = false;

            if(!config.fullWord) {
                test = config.caseSensitive ? word.startsWith(bannedWord.word) : word.toLowerCase().startsWith(bannedWord.word.toLowerCase())
                    || 
                    config.similarityMatch.enabled && StringSimilarity.compareTwoStrings(word, bannedWord.word) >= config.similarityMatch.percentage;
            } else {
                test = config.caseSensitive ? bannedWord.word == word : bannedWord.word.toLowerCase() == word.toLowerCase()
                    || 
                    config.similarityMatch.enabled && StringSimilarity.compareTwoStrings(word, bannedWord.word) >= config.similarityMatch.percentage;
            }

            if(test) banned.push(bannedWord);
            return test;
        })
    );

    return { status: matches?.length ? true : false, matches: matches, banned: banned, words: { messageContent: words, bannedWords: bannedWords } };
}