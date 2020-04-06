const express = require("express");
const puppeteer = require("puppeteer");
const $ = require("cheerio");
const utf8 = require('utf8');
const PORT = process.env.PORT || 5000;

var setarValoresNoMapa = (lista) => {
  console.log(lista);

  return null;
}

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
      let temp = []
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

          temp.push(aux)
        });
        data.push(temp);
    });
    
    var replaceChars = (txt) => {
      while(txt.includes(";"))
        txt = txt.replace("&#xE3;", "ã").replace("&#xE7;", "ç").replace("&#xF3;", "ó").replace("&#xE9;", "é").replace("&#xED;", "í").replace("&#xEA;", "ê")

      return txt;
    }
    
    let helper = data.filter(e => e.length != 0);
    let final = []
    helper.forEach(e => {
      let aux = {
        datainicio: e[0].datainicio,
        datafim: e[1].datafim,
        titulo: replaceChars(utf8.decode(e[2].titulo)),
        disciplina: replaceChars(utf8.decode(e[3].disciplina)),
      }
      
      final.push(aux);
    })

    let res = await setarValoresNoMapa(final);
    return res;
};

express()
  .get("/", async (req, res) => {
    let data = await scrape_calendario();

    res.json(data);
  })
  .listen(PORT, () => console.log(`Listening on ${PORT}`));
