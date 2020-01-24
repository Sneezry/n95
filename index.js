const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const fs = require('fs');

var browser;
var MAX_CONNECTIONS = 10;
var CURRENT_CONNECTIONS = 0;

async function init() {
    console.log('Setup browser...');
    browser = browser || await puppeteer.launch({headless: true});
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
    await page.emulate(devices['iPhone 5']);
    await page.setExtraHTTPHeaders({Accept: 'text/html,application/xhtml+xml,application/xml;q=0.8'});
    await page.goto(url, {waitUntil: 'load', timeout: 0});
    let info;
    if (/jd\.com/.test(url)) {
        info = await getJDInfo(url, page);
    } else if (/suning\.com/.test(url)) {
        info = await getSuningInfo(url, page);
    }
    await page.close();
    console.log('Fetched ' + url);
    return info;
}

async function getJDInfo(url, page) {
    const statusNote = await page.$('#statusNote');
    const status = statusNote ? await statusNote.evaluate(node => node.innerText) : null;
    statusNote && await statusNote.dispose();
    const soldout = status && /无货/.test(status);
    const takeoff = status && /下架/.test(status);
    const firstImage = await page.$('#firstImg');
    const imgSrc = firstImage ? await firstImage.evaluate(node => node.src) : null;
    const priceSale = await page.$('#priceSale');
    const price = priceSale ? await priceSale.evaluate(node => node.innerText) : null;
    const itemName = await page.$('#itemName');
    const name = itemName ? await itemName.evaluate(node => node.innerText) : null;
    return {url, imgSrc, soldout, takeoff, price, name};
}

async function getSuningInfo(url, page) {
    const statusNote = await page.$('#noGoodsP');
    const status = statusNote ? await statusNote.evaluate(node => node.innerText) : null;
    statusNote && await statusNote.dispose();
    const soldout = status && /无货/.test(status);
    const takeoff = status && /下架/.test(status);
    const firstImage = await page.$('.pic-item img');
    const imgSrc = firstImage ? 'https:' + (await firstImage.evaluate(node => node.getAttribute('ori-src'))) : null;
    const priceSale = await page.$('#nopgPriceSymbol');
    const price = priceSale ? await priceSale.evaluate(node => node.innerText) : null;
    const itemName = await page.$('#productName');
    const name = itemName ? await itemName.evaluate(node => node.innerText) : null;
    return {url, imgSrc, soldout, takeoff, price, name};
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