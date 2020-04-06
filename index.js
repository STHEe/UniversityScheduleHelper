const express = require("express");
const puppeteer = require("puppeteer");
const $ = require("cheerio");
const utf8 = require("utf8");
const { google } = require("googleapis");
const fs = require("fs");
const PORT = process.env.PORT || 5000;

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

// Load client secrets from a local file.
fs.readFile("credentials.json", (err, content) => {
  if (err) return console.log("Error loading client secret file:", err);
  authorize(JSON.parse(content), listEvents);
});

var setarValoresNoMapa = (lista) => {
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      return events;
      // events.map((event, i) => {
      //   const start = event.start.dateTime || event.start.date;
      //   console.log(`${start} - ${event.summary}`);
      // });
    } else {
      console.log('No upcoming events found.');
    }
  });

  return null;
};

var scrape_calendario = async () => {
  let browser = await puppeteer.launch();
  let page = await browser.newPage();
  await page.goto("https://lms.uniaraxa.edu.br/app/admin/authentication/login");
  await page.type("#UsuarioAcesso", "037059");
  await page.type("#Senha", "Vitor91154358");
  await page.click("#btnLogin");
  await page.waitForNavigation();
  await page.goto("https://lms.uniaraxa.edu.br/app/Space/Calendario/Index");
  await page.waitFor(1000);
  let conteudo = await page.content();

  let data = [];
  $("#isotope-calendario-grid", conteudo)
    .children()
    .each(function () {
      let temp = [];
      $(this)
        .children()
        .each(function () {
          let $self = $(this);
          let aux = {};

          if ($self.closest(".datainicio").html() != null)
            aux["datainicio"] = $self.closest(".datainicio").html();
          if ($self.closest(".datafim").html() != null)
            aux["datafim"] = $self.closest(".datafim").html();
          if ($self.closest(".titulo").html() != null)
            aux["titulo"] = $self.closest(".titulo").html();
          if ($self.closest(".disciplina").html() != null)
            aux["disciplina"] = $self.closest(".disciplina").html();

          temp.push(aux);
        });
      data.push(temp);
    });

  var replaceChars = (txt) => {
    while (txt.includes(";"))
      txt = txt
        .replace("&#xE3;", "ã")
        .replace("&#xE7;", "ç")
        .replace("&#xF3;", "ó")
        .replace("&#xE9;", "é")
        .replace("&#xED;", "í")
        .replace("&#xEA;", "ê");

    return txt;
  };

  let helper = data.filter((e) => e.length != 0);
  let final = [];
  helper.forEach((e) => {
    let aux = {
      datainicio: e[0].datainicio,
      datafim: e[1].datafim,
      titulo: replaceChars(utf8.decode(e[2].titulo)),
      disciplina: replaceChars(utf8.decode(e[3].disciplina)),
    };

    final.push(aux);
  });

  let res = await setarValoresNoMapa(final);
  return res;
};

express()
  .get("/", async (req, res) => {
    let data = await scrape_calendario();

    res.json(data);
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
