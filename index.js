const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const fs = require('fs');

var browser;

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

async function capture(url) {
    console.log('Fetch ' + url + '...');
    const page = await browser.newPage();
    await page.emulate(devices['iPhone 5'])
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
    return {imgSrc, soldout, takeoff, price, name};
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
    const results = [];
    const data = {
        datetime: Date.now(),
        results,
    }
    await init();
    let index = 0;
    for (const url of urls) {
        console.log((++index) +'/' + urls.length);
        const info = await capture(url);
        results.push(Object.assign({url}, info));
    }
    await dispose();
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

run();