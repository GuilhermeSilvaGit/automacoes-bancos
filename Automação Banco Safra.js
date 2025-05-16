require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const select = require('puppeteer-select');
const url = "https://epfweb.safra.com.br/Home/Login";


const usuarioMaster = process.argv[2];
const senhaMaster = process.argv[3];
const usuarioParaDesbloquear = process.argv[4];
const emailDestino = process.argv[5];

if (!usuarioMaster || !senhaMaster || !usuarioParaDesbloquear || !emailDestino) {
    console.error("Erro:forneça o LOGIN Master, a SENHA Master, o LOGIN do usuário e o E-mail.");
    process.exit(1); 
}

main(url, usuarioMaster, senhaMaster, usuarioParaDesbloquear, emailDestino);

async function main(url, masterUser, masterPassword, userToUnlock, destinationEmail) {
    console.log(`Abrindo ${url}`)
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 1280,
            height: 800,
        },
        channel: 'chrome' 
    }).then(async (browser) => {
        var page = await browser.newPage();
        await page.goto(url);
        await new Promise(r => setTimeout(r, 1000)); 

        console.log("Colocando usuário e senha Master");
        await page.type("input[name='Usuario.DsLogin']", masterUser, { delay: 25 }); 
        await page.type("input[name='Senha']", masterPassword, { delay: 25 }); 
        await new Promise(r => setTimeout(r, 1000)); 
        await page.click("input[name='btnEntrar']");
        await new Promise(r => setTimeout(r, 26000)); 
        await page.click("input[name='btnEntrar']");
        await new Promise(r => setTimeout(r, 2000)); 


        console.log("Acessando usuáiro Master")
        const buttonSelectors = ".ui-button-icon-primary.ui-icon.ui-icon-closethick";
        await page.waitForSelector(buttonSelectors, { timeout: 7000 }); 
        const buttons = await page.$$(buttonSelectors);

        if (buttons.length >= 2) {
            await buttons[1].click();
            await new Promise(r => setTimeout(r, 1500)); 
            console.log("Primeiro botão clicado!");
        } else {
            console.log("Primeiro botão não encontrado.");
        }

        if (buttons.length >= 1) {
            await buttons[0].click();
            await new Promise(r => setTimeout(r, 1500)); 
            console.log("Segundo botão clicado!");
        } else {
            console.log("Segundo botão não encontrado.");
        }
        await new Promise(r => setTimeout(r, 3000)); 

        const linkManutencaoUsuariosSelector = `a[href="/SubModulo/Index/https%7Capi%2csafrafinanceira%2ccom%2cbr%3bweb-canais-ccf%3b%23%3bjornada-biometrica"]`;

        try {
            await page.waitForSelector(linkManutencaoUsuariosSelector, { timeout: 10000 }); 
            await page.evaluate((selector) => {
                const link = document.querySelector(selector);
                if (link) {
                    link.click();
                }
            }, linkManutencaoUsuariosSelector);

            await page.waitForNavigation({ timeout: 15000 }); 
            console.log("'Manutenção de Usuários Externos acessado.");
        } catch (error) {
            console.error("Erro ao tentar clicar em 'Manutenção de Usuários Externos'", error);
        }

        try {
            console.log("Buscando Filtro");
            for (let i = 0; i < 7; i++) {
                await page.keyboard.press('Tab');
                await new Promise(r => setTimeout(r, 500)); 
            }
            console.log("Encontrado.");

            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 500)); 

            console.log("opção 'LOGIN' acessada.");
            for (let i = 0; i < 4; i++) {
                await page.keyboard.press('ArrowDown');
                await new Promise(r => setTimeout(r, 300)); 
            }
    
            console.log("selecionando 'LOGIN'");
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 500)); 

            console.log("Opção 'LOGIN' selecionada.");

            const selectedText = await page.evaluate(() => {
                const selectElement = document.querySelector('select[name="filtro"]');
                return selectElement ? selectElement.options[selectElement.selectedIndex].text : null;
            });

            console.log("Texto selecionado no filtro:", selectedText);
            if (selectedText === 'LOGIN') {
                console.log("Verificação: Opção 'LOGIN' selecionada corretamente.");
            } else {
                console.warn("Verificação: A opção selecionada pode não ser 'LOGIN'.");
            }

        } catch (error) {
            console.error("Erro durante a interação", error);
        }

        for (let i = 0; i < 2; i++) {
            await page.keyboard.press('Tab');
            await new Promise(r => setTimeout(r, 500)); 
        }

        const dsPesquisaSelector = 'input[name="dsPesquisa"]';

        try {
            console.log("Opção 'Login' selecionada.");

            await new Promise(r => setTimeout(r, 800)); 

            await page.waitForSelector(dsPesquisaSelector, { timeout: 5000 }) 
                .then(async (inputElement) => {
                    await inputElement.type(userToUnlock, { delay: 50 }); 
                    console.log(`Usuário "${userToUnlock}" digitado no campo de Login.`);
                })
                .catch(async (error) => {
                    console.log(`Elemento não encontrado na página principal: ${error.message}. Verificando frames`);
                    const frames = await page.frames();
                    for (const frame of frames) {
                        try {
                            await frame.waitForSelector(dsPesquisaSelector, { timeout: 5000 }); 
                            const frameInputElement = await frame.$(dsPesquisaSelector);
                            if (frameInputElement) {
                                await frameInputElement.type(userToUnlock, { delay: 50 }); 
                                console.log("Campo de Login encontrado e preenchido dentro do frame:", frame.name());
                                return;
                            }
                        } catch (frameError) {
                        }
                    }
                    console.log("Campo de Login não encontrado em nenhum frame.");
                    throw new Error("Campo de Login não encontrado após a seleção do filtro.");
                });

        } catch (error) {
            console.error("Erro ao interagir com o campo de Login:", error);
        }

        await page.frames()[1].locator('button[title="Pesquisar"]').wait({ timeout: 10000 }); 
        await page.frames()[1].click('button[title="Pesquisar"]')
        await new Promise(r => setTimeout(r, 1500)); 
        console.log("Botão pesquisar clicado")

        await new Promise(r => setTimeout(r, 1000)); 

        console.log("Pesquisa iniciada.");

        console.log("Validando bloqueio");
        let usuarioBloqueado = false;
        let cadeadoElement = null;

        const frame = page.frames()[1];

        if (frame) {
            const spans = await frame.$$('span');
            for (const span of spans) {
                const textoSpan = await span.evaluate(node => node.textContent.trim());
                if (textoSpan === 'lock') {
                    console.log(`Usuário "${userToUnlock}" está bloqueado. Clicando no cadeado`);
                    await span.click();
                    await new Promise(r => setTimeout(r, 1500)); 
                    usuarioBloqueado = true;
                    cadeadoElement = span;
                    break;
                }
            }

            if (usuarioBloqueado) {
                await new Promise(r => setTimeout(r, 2000)); 
                console.log("Aguardando");
                await page.keyboard.press('Enter');
                await new Promise(r => setTimeout(r, 1500)); 
                await page.keyboard.press('Enter');
                await new Promise(r => setTimeout(r, 1500)); 
                await page.keyboard.press('Enter');
                await new Promise(r => setTimeout(r, 1500)); 
                console.log("(confirmação).");

                await frame.waitForSelector('button[title="Pesquisar"]', { timeout: 10000 }); 
                await frame.click('button[title="Pesquisar"]');
                await new Promise(r => setTimeout(r, 1500)); 
                console.log("Botão pesquisar clicado");

                await frame.waitForSelector('button[mattooltip="Desbloquear senha"]', { timeout: 10000 }); 
                await frame.click('button[mattooltip="Desbloquear senha"]');
                await new Promise(r => setTimeout(r, 1500)); 
                console.log("Botão de desbloqueio clicado");

                await page.frames()[1].locator('button[title="Pesquisar"]').wait({ timeout: 10000 }); 
                await page.frames()[1].click('button[title="Pesquisar"]');
                await new Promise(r => setTimeout(r, 1500));
                console.log("Botão pesquisar clicado");
            } else {
                console.log("Usuário não está bloqueado.");
            }
        } else {
            console.error("Erro: Iframe não encontrado.");
        }

        try {
            await page.frames()[1].waitForSelector('button[mattooltip="Visualizar detalhes"]', { timeout: 10000 }); 
            await page.frames()[1].click('button[mattooltip="Visualizar detalhes"]');
            await new Promise(r => setTimeout(r, 2000)); 
            console.log("Botão de Visualizar detalhes clicado");
            await new Promise(r => setTimeout(r, 5000)); 

            // Validar e-mail

            await page.frames()[1].waitForSelector("#email", { timeout: 10000 }); 
            await page.frames()[1].click("#email", { clickCount: 3, delay: 200 }); 
            await page.frames()[1].type('input[id="email"]', destinationEmail, { delay: 80 }); 
            await new Promise(r => setTimeout(r, 2000)); 

            await page.frames()[1].waitForSelector('button[class="btn-save-user ng-star-inserted"]', { timeout: 10000 }) 
            await page.frames()[1].click('button[class="btn-save-user ng-star-inserted"]', { timeout: 10000 }); 
            await new Promise(r => setTimeout(r, 2000)); 
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 1500)); 
            console.log("Voltando para pesquisa");

            console.log("Buscando Filtro");
            for (let i = 0; i < 2; i++) {
                await page.keyboard.press('Tab');
                await new Promise(r => setTimeout(r, 500)); 
            }
            console.log("Encontrado.");

            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 500)); 

            console.log("opção 'LOGIN'");
            for (let i = 0; i < 4; i++) {
                await page.keyboard.press('ArrowDown');
                await new Promise(r => setTimeout(r, 300)); 
            }
            console.log("Opção 'LOGIN' Encontrada.");

            console.log("selecionando 'LOGIN'");
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 500)); 

            console.log("Opção 'LOGIN' selecionada.");

            const selectedTextSegundo = await page.evaluate(() => {
                const selectElement = document.querySelector('select[name="filtro"]');
                return selectElement ? selectElement.options[selectElement.selectedIndex].text : null;
            });

            console.log("Texto selecionado no filtro:", selectedTextSegundo);
            if (selectedTextSegundo === 'LOGIN') {
                console.log("Verificação: Opção 'LOGIN' selecionada corretamente.");
            } else {
                console.warn("Verificação: A opção selecionada pode não ser 'LOGIN'.");
            }

        } catch (error) {
            console.error("Erro durante a interação", error);
        } finally {
            for (let i = 0; i < 2; i++) {
                await page.keyboard.press('Tab');
                await new Promise(r => setTimeout(r, 500)); 
            }

            const dsPesquisaSelectorSegundo = 'input[name="dsPesquisa"]';

            try {
                console.log("Opção 'Login' selecionada (Segunda Vez).");

                await new Promise(r => setTimeout(r, 1000)); 

                const frameSegundo = await page.frames()[1];
                if (frameSegundo) {
                    await frameSegundo.waitForSelector(dsPesquisaSelectorSegundo, { timeout: 10000 }) 
                        .then(async (inputElement) => {
                            await inputElement.type(userToUnlock, { delay: 50 });
                            console.log(`Usuário "${userToUnlock}" digitado no campo de Login.`);
                        })
                        .catch(async (error) => {
                            console.log(`Elemento não encontrado no frame: ${error.message}.`);
                            throw new Error("Campo de Login não encontrado");
                                throw new Error("Campo de Login não encontrado no frame após a seleção do filtro.");
                        });
                } else {
                    console.error("Erro: Iframe não encontrado.");
                    throw new Error("Iframe não encontrado.");
                }

            } catch (error) {
                console.error("Erro ao interagir com o campo de Login:", error);
            }
        }

        const frameFinal = await page.frames()[1];
        if (frameFinal) {
            await frameFinal.waitForSelector('button[title="Pesquisar"]', { timeout: 10000 }); 
            await frameFinal.click('button[title="Pesquisar"]')
            await new Promise(r => setTimeout(r, 1500)); 
            console.log("Botão pesquisar clicado (Segunda Vez)")
        } else {
            console.error("Erro: Iframe não encontrado para clicar no botão de pesquisa.");
        }

        await new Promise(r => setTimeout(r, 1000)); 
        console.log("Pesquisa iniciada.");

        try {
            for (let i = 0; i < 8; i++) {
                await page.keyboard.press('Tab');
                await new Promise(r => setTimeout(r, 500)); 
            }
            console.log("Elemento encontrado.");

            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 800)); 

            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 800)); 

            console.log(`Nova senha encaminhada para o E-mail: ${destinationEmail}`);
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 800)); 

        } catch (error) {
            console.error("Erro durante a interação (Reset de Senha):", error);
        } finally {
            await browser.close();
            await new Promise(r => setTimeout(r, 2000)); 
            console.log("Navegador fechado.");
        }
    });
};
