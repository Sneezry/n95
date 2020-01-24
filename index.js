const puppeteer = require('puppeteer');
const fs = require('fs');
const rules = require('./rules.json');

var browser;
var MAX_CONNECTIONS = 5;
var CURRENT_CONNECTIONS = 0;

async function init() {
    console.log('Setup browser...');
    browser = browser || await puppeteer.launch({headless: false});
}

async function dispose() {
    console.log('Close browser...');
    if (browser) {
        await browser.close();
        browser = undefined;
    }
}

async function fetchInfo(url) {
    const page = await browser.newPage();
    // Disable WebP for iOS
    await page.setExtraHTTPHeaders({Accept: 'text/html,application/xhtml+xml,application/xml;q=0.8'});
    await page.goto(url, {waitUntil: 'load', timeout: 0});
    let info;
    for (const rule of rules) {
        const urlRegExp = new RegExp(rule.url);
        if (urlRegExp.test(url)) {
            const soldoutSelector = await page.$(rule.soldoutSelector);
            const soldoutText = soldoutSelector ? await soldoutSelector.evaluate(node => node.innerText) : null;
            soldoutSelector && await soldoutSelector.dispose();
            const soldout = soldoutText && new RegExp(rule.soldoutKeyword).test(soldoutText);
            const takeoffSelector = await page.$(rule.takeoffSelector);
            const takeoffText = takeoffSelector ? await takeoffSelector.evaluate(node => node.innerText) : null;
            takeoffSelector && await takeoffSelector.dispose();
            const takeoff = takeoffText && new RegExp(rule.takeoffKeyword).test(takeoffText);
            const imageSelector = await page.$(rule.imageSelector);
            const imgSrc = imageSelector ? await imageSelector.evaluate(node => node.src) : null;
            imageSelector && await imageSelector.dispose();
            const priceSelector = await page.$(rule.priceSelector);
            const price = priceSelector ? await priceSelector.evaluate(node => node.innerText) : null;
            priceSelector && await priceSelector.dispose();
            const itemNameSelector = await page.$(rule.itemNameSelector);
            const itemName = itemNameSelector ? await itemNameSelector.evaluate(node => node.innerText) : null;
            itemNameSelector && await itemNameSelector.dispose();
            info = {url, imgSrc, soldout, takeoff, price, itemName};
        }
    }
    await page.close();
    console.log('Fetched ' + url);
    return info;
}

async function getUrls() {
    console.log('Get URLs...');
    const urls = fs.readFileSync('urls.txt', 'utf8').split(/[\r\n]+/).filter(url => !!url);
    return urls.filter(function(url, pos) {
        return urls.indexOf(url) == pos;
    });
}

async function run() {
    const urls = await getUrls();
    console.log('Found ' + urls.length + ' URL(s).');
    const data = {
        datetime: Date.now(),
        results: []
    }
    await init();
    const urlTotal = urls.length;

    startToFetch(urlTotal, urls, data);
}

async function startToFetch(urlTotal, urls, data) {
    if (CURRENT_CONNECTIONS >= MAX_CONNECTIONS || !urls.length) {
        return;
    }
    const url = urls.shift();
    CURRENT_CONNECTIONS++;
    console.log((urlTotal - urls.length) +'/' + urlTotal + ' - Start to fetch ' + url + '...');

    if (CURRENT_CONNECTIONS < MAX_CONNECTIONS) {
        startToFetch(urlTotal, urls, data);
    }
    
    fetchInfo(url).then(async info => {
        if (info) {
            data.results.push(info);
        }
        
        CURRENT_CONNECTIONS--;

        if (urls.length === 0 && !CURRENT_CONNECTIONS) {
            fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
            await dispose();
        } else {
            startToFetch(urlTotal, urls, data);
        }
    });
}

run();