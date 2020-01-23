const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const fs = require('fs');

var browser;
var MAX_CONNECTIONS = 10;

async function init() {
    console.log('Setup browser...');
    browser = browser || await puppeteer.launch();
}

async function dispose() {
    console.log('Close browser...');
    if (browser) {
        await browser.close();
        browser = undefined;
    }
}

async function fetchInfo(url) {
    console.log('Fetch ' + url + '...');
    const page = await browser.newPage();
    await page.emulate(devices['iPhone 5']);
    await page.setExtraHTTPHeaders({Accept: 'text/html,application/xhtml+xml,application/xml;q=0.8'});
    await page.goto(url);
    const statusNote = await page.$('#statusNote');
    const status = statusNote ? await statusNote.evaluate(node => node.innerText) : null;
    await statusNote.dispose();
    const soldout = status && /无货/.test(status);
    const takeoff = status && /下架/.test(status);
    const firstImage = await page.$('#firstImg');
    const imgSrc = firstImage ? await firstImage.evaluate(node => node.src) : null;
    const priceSale = await page.$('#priceSale');
    const price = priceSale ? await priceSale.evaluate(node => node.innerText) : null;
    const itemName = await page.$('#itemName');
    const name = itemName ? await itemName.evaluate(node => node.innerText) : null;
    await page.close();
    console.log('Fetched ' + url);
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
    let index = 0;
    const urlTotal = urls.length;

    while(urls.length) {
        let fetchPromise = [];
        for (let i = 0; i < MAX_CONNECTIONS; i++) {
            if (!urls.length) {
                break;
            }
            console.log((++index) +'/' + urlTotal);
            const url = urls.shift();
            fetchPromise.push(fetchInfo(url));
        }
        const infoChunk = await Promise.all(fetchPromise);
        data.results = data.results.concat(infoChunk);
    }

    await dispose();
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

run();