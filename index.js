'use strict';

require('dotenv').config();
const puppeteer = require('puppeteer');
const moment = require('moment');
const setting = require('./setting.json');
var fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    args: ['--lang=zh-CN,cn'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 資料夾路徑
  const date = moment().format("YYYYMMDD");
  const path = `./screenshot/${date}/`;
  await fs.promises.mkdir(path, { recursive: true })

  // 瀏覽器語系, 讓infoq顯示中文
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'cn'
  });
  // Set the language forcefully on javascript
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "language", {
        get: function() {
            return "zh-CN";
        }
    });
    Object.defineProperty(navigator, "languages", {
        get: function() {
            return ["zh-CN", "cn"];
        }
    });
  });

  // 登入
  await page.goto(`http://infoq.oppoer.me/login`);
  await page.waitForSelector('button.login_view_btn', { timeout: 30000 });
  await page.type('#username', process.env.USERNAME);
  await page.type('#password', process.env.PASSWORD);
  await delay(2000);
  await page.click('.login_view_btn');
  await page.waitForSelector('div.report', {timeout: 10000});

  // 切換到彈出模式
  await page.waitForSelector('.pop-mode');
  const isNeedClick = await page.evaluate(() => {
    return document.querySelector('.pop-mode').innerHTML === '嵌入模式';
  });
  if (isNeedClick) await page.click('.pop-mode');

  // 截圖
  let urlIndex = 0;
  const urls = setting.urls;
  while (urlIndex < urls.length) {
    const url = urls[urlIndex];
    await page.goto(url);
    await page.waitForSelector('div.chartjs-size-monitor', {timeout: 60000});

    await page.evaluate(() => {
      // 調整右側邊欄長度
      const layoutPane = document.getElementsByClassName("layout-pane");
      layoutPane[1].style.width = '200px';

      // 刪除左側懶
      var topMenu = document.getElementsByClassName("top")[0];
      if (topMenu) topMenu.parentNode.removeChild(topMenu);
    });

    await delay(2000);
    var newUrl = new URL(url);
    var cfg = newUrl.searchParams.get("cfg");
    const element = await page.$('.no-filters-configs:nth-child(1)');
    await element.screenshot({path: `${path}${cfg}.png`});
    urlIndex++;
  }
  // await autoScroll(page);
  await browser.close();
})();

function delay(time) {
  return new Promise(function(resolve) { 
	  setTimeout(resolve, time)
  });
}
