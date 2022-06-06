'use strict';

require('dotenv').config();
const puppeteer = require('puppeteer');
const moment = require('moment');
const fs = require('fs');
const nodemailer = require('nodemailer');
// const R = require('ramda');
const setting = require('./setting.json');

(async () => {

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false, // 不開啟瀏覽器
    args: ['--lang=zh-CN,cn'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // 資料夾路徑
  const date = moment().format("YYYYMMDD");
  const path = `/screenshot/${date}/`;
  const urls = setting.urls;
  await fs.promises.mkdir(`.${path}`, { recursive: true })

  // 寄出email
  await sendEmail(
    'ken.chen@sonicsky.net',
    'How to save a webpage as PDF file and send via email using Puppeteer and Nodemailer',
    'I thought you might enjoy this jpg!',
    '6ee1e706.jpg',
    `${path}6ee1e706-da42-11ec-958d-fa164c8ae5b0.jpg`);

  await delay(10000);
  await browser.close(); //FIXME

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
  await page.waitForSelector('div.report', {timeout: 30000});

  // 切換到彈出模式
  await page.waitForSelector('.pop-mode', {timeout: 30000});
  const isNeedClick = await page.evaluate(() => {
    return document.querySelector('.pop-mode').innerHTML === '嵌入模式';
  });
  if (isNeedClick) await page.click('.pop-mode');

  // 截圖
  let urlIndex = 0;
  while (urlIndex < urls.length) {
    const url = urls[urlIndex];
    await page.goto(url);
    await page.waitForNavigation();
    await page.waitForSelector('div.chartjs-size-monitor', {timeout: 60000});

    await page.evaluate(async() => {
      const layoutPane = document.getElementsByClassName("layout-pane");

      // 刪除左側欄
      var topMenu = document.getElementsByClassName("top")[0];
      if (topMenu) topMenu.parentNode.removeChild(topMenu);

      // 調整右側邊欄長度
      if (layoutPane[1]) layoutPane[1].style.width = '200px';
    });

    var newUrl = new URL(url);
    var cfg = newUrl.searchParams.get("cfg");
    const element = await page.$('.no-filters-configs:nth-child(1)');
    const filename = `.${path}${cfg}.jpg`;
    await element.screenshot({path: filename});
    urlIndex++;
  }

  await browser.close();
})();

async function delay(time) {
  return new Promise(function(resolve) { 
	  setTimeout(resolve, time)
  });
}

async function sendEmail(to, subject, text, filename, fileContent) {
  let account = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    service: "Outlook365",
    port: 587,
    secure: false, // secure:true for port 465, secure:false for port 587
    tls: { ciphers: 'SSLv3' },
    auth: {
        user: 's5130112ie@gmail.com',
        pass: 'xxxxxxxx'
    }
  });

  const message = {
      from: 's5130112ie@gmail.com',
      to: to,
      subject: subject,
      text: text,
      html: "<b>Hello world?</b>", // html body
      attachments: [{
          filename: filename,
          content: fileContent
      }]
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(message, (error, info) => {
      if (error) {
        console.log('$$$error: ', error);
        resolve(false);
      } else {
        console.log('Message sent: %s', info.messageId);
        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        resolve(true);
      }
    });
  })
}
  