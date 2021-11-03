const Fetch = require('node-fetch');
module.exports = async function(text, response) {
    const id = await getCode(text);

    if(id == 'en' ) return response;

    const translated = await getTranslation(response, id);
    return translated ? translated : response;
}

async function getCode(text) {
    const response = await Fetch('https://translate-api.ml/detect/?text='+encodeURIComponent(text)).catch(err => console.error(err));
    if(!response || response.status != 200) return 'en';
    const json = await response.json();
    return json.lang;
}

async function getTranslation(text, lang) {
    const response = await Fetch('https://translate-api.ml/translate/?text='+encodeURIComponent(text)+'&lang='+lang).catch(err => console.error(err));
    if(!response || response.status != 200) return text;
    const json = await response.json();
    return json.translated.text;
}