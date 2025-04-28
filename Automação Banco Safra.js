require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require('fs');
const moment = require('moment');
const path = require('path');
const select = require('puppeteer-select');
const url = "https://epfweb.safra.com.br/Home/Login";
const user = process.env.USER_RESET;
const email_reset = process.env.EMAIL_AMP;

main(url);
async function main(url) {
    console.log(`Abrindo ${url}`)
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: {
            width: 1280,
            height: 800,
        },
    }).then(async (browser) => {
        var page = await browser.newPage();
        await page.goto(url);
        await new Promise(r => setTimeout(r, 1000));

        console.log("Colocando usuário e senha master");
        await page.type("input[name='Usuario.DsLogin']",process.env.USER_MASTER);
        await page.type("input[name='Senha']", process.env.SENHA_MASTER);
        await new Promise(r => setTimeout(r, 1000));
        await page.click("input[name='btnEntrar']");
        await new Promise(r => setTimeout(r, 26000));
        await page.click("input[name='btnEntrar']");


        console.log("Acessando usuáiro Master")
        const buttonSelectors = ".ui-button-icon-primary.ui-icon.ui-icon-closethick";
        await page.waitForSelector(buttonSelectors);
        const buttons = await page.$$(buttonSelectors);

        if (buttons.length >= 2) {
            await buttons[1].click();
            console.log("Primeiro botão clicado!");
        } else {
            console.log("Primeiro botão não encontrado.");
        }

        if (buttons.length >= 1) {
            await buttons[0].click();
            console.log("Segundo botão clicado!");
        } else {
            console.log("Segundo botão não encontrado.");
        }
        await new Promise(r => setTimeout(r, 3000));

        const linkManutencaoUsuariosSelector = `a[href="/SubModulo/Index/https%7Capi%2csafrafinanceira%2ccom%2cbr%3bweb-canais-ccf%3b%23%3bjornada-biometrica"]`;

        try {
            await page.waitForSelector(linkManutencaoUsuariosSelector);
            await page.evaluate((selector) => {
                const link = document.querySelector(selector);
                if (link) {
                    link.click();
                }
            }, linkManutencaoUsuariosSelector);

            await page.waitForNavigation();
            console.log("'Manutenção de Usuários Externos acessado.");
        } catch (error) {
            console.error("Erro ao tentar clicar em 'Manutenção de Usuários Externos'", error);
        } finally {
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

            console.log("Navegando até a opção 'LOGIN'");
            for (let i = 0; i < 4; i++) {
                await page.keyboard.press('ArrowDown');
                await new Promise(r => setTimeout(r, 500));
            }
            console.log("Opção 'LOGIN' Encontrada.");

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
        } finally {
        }

        for (let i = 0; i < 2; i++) {
            await page.keyboard.press('Tab');
            await new Promise(r => setTimeout(r, 500));
        }

        const dsPesquisaSelector = 'input[name="dsPesquisa"]';

        try {
            console.log("Opção 'Login' selecionada.");

            await new Promise(r => setTimeout(r, 500));

            await page.waitForSelector(dsPesquisaSelector, { timeout: 2000 })
                .then(async (inputElement) => {
                    await inputElement.type(user);
                    console.log(`Usuário "${user}" digitado no campo de Login.`);
                })
                .catch(async (error) => {
                    console.log(`Elemento não encontrado na página principal: ${error.message}. Verificando frames...`);
                    const frames = await page.frames();
                    for (const frame of frames) {
                        try {
                            await frame.waitForSelector(dsPesquisaSelector, { timeout: 2000 });
                            const frameInputElement = await frame.$(dsPesquisaSelector);
                            if (frameInputElement) {
                                await frameInputElement.type(user);
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

        await page.frames()[1].locator('button[title="Pesquisar"]').wait();
        await page.frames()[1].click('button[title="Pesquisar"]')
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
                    console.log("Usuário está bloqueado. Clicando no cadeado...");
                    await span.click();
                    usuarioBloqueado = true;
                    cadeadoElement = span;
                    break;
                }
            }

            if (usuarioBloqueado) {
                await new Promise(r => setTimeout(r, 2000));
                console.log("Aguardando e pressionando Enter para confirmar");
                await page.keyboard.press('Enter');
                await new Promise(r => setTimeout(r, 2000));
                await page.keyboard.press('Enter');
                await page.keyboard.press('Enter');
                console.log("Pressionou Enter (confirmação).");

                await frame.waitForSelector('button[title="Pesquisar"]', { timeout: 2000 });
                await frame.click('button[title="Pesquisar"]');
                console.log("Botão pesquisar clicado");

                await frame.waitForSelector('button[mattooltip="Desbloquear senha"]', { timeout: 2000 });
                await frame.click('button[mattooltip="Desbloquear senha"]');
                console.log("Botão de desbloqueio clicado");

                await page.frames()[1].locator('button[title="Pesquisar"]').wait();
                await page.frames()[1].click('button[title="Pesquisar"]');
                console.log("Botão pesquisar clicado");
            } else {
                console.log("Usuário não está bloqueado (ícone 'lock' não encontrado).");
            }
        } else {
            console.error("Erro: Iframe não encontrado.");
        }

        try {
            await page.frames()[1].waitForSelector('button[mattooltip="Visualizar detalhes"]', { timeout: 5000 });
            await page.frames()[1].click('button[mattooltip="Visualizar detalhes"]');
            console.log("Botão de Visualizar detalhes clicado");
            await new Promise(r => setTimeout(r, 3000));

            // Validar e-mail

            await page.frames()[1].waitForSelector("#email");
            await page.frames()[1].click("#email", { clickCount: 3}); 
            await page.frames()[1].type('input[id="email"]',email_reset, { delay: 100 });
            await new Promise(r => setTimeout(r, 2000));
            
            await page.frames()[1].waitForSelector('button[class="btn-save-user ng-star-inserted"]', { timeout: 5000 })
            await page.frames()[1].click('button[class="btn-save-user ng-star-inserted"]', { timeout: 5000 })
            await new Promise(r => setTimeout(r, 2000));
            await page.keyboard.press('Enter');
            console.log("Voltando para pesquisa");

            console.log("Buscando Filtro (Segunda Vez)");
            for (let i = 0; i < 2; i++) {
                await page.keyboard.press('Tab');
                await new Promise(r => setTimeout(r, 500));
            }
            console.log("Encontrado (Segunda Vez).");

            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 500));

            console.log("Navegando até a opção 'LOGIN' (Segunda Vez)");
            for (let i = 0; i < 4; i++) {
                await page.keyboard.press('ArrowDown');
                await new Promise(r => setTimeout(r, 500));
            }
            console.log("Opção 'LOGIN' Encontrada (Segunda Vez).");

            console.log("selecionando 'LOGIN' (Segunda Vez)");
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 500));

            console.log("Opção 'LOGIN' selecionada (Segunda Vez).");

            const selectedTextSegundo = await page.evaluate(() => {
                const selectElement = document.querySelector('select[name="filtro"]');
                return selectElement ? selectElement.options[selectElement.selectedIndex].text : null;
            });

            console.log("Texto selecionado no filtro (Segunda Vez):", selectedTextSegundo);
            if (selectedTextSegundo === 'LOGIN') {
                console.log("Verificação: Opção 'LOGIN' selecionada corretamente (Segunda Vez).");
            } else {
                console.warn("Verificação: A opção selecionada pode não ser 'LOGIN' (Segunda Vez).");
            }

        } catch (error) {
            console.error("Erro durante a interação (Segunda Vez)", error);
        } finally {
            for (let i = 0; i < 2; i++) {
                await page.keyboard.press('Tab');
                await new Promise(r => setTimeout(r, 500));
            }

            const dsPesquisaSelectorSegundo = 'input[name="dsPesquisa"]';

            try {
                console.log("Opção 'Login' selecionada (Segunda Vez).");

                await new Promise(r => setTimeout(r, 500));

                const frameSegundo = await page.frames()[1];
                if (frameSegundo) {
                    await frameSegundo.waitForSelector(dsPesquisaSelectorSegundo, { timeout: 5000 })
                        .then(async (inputElement) => {
                            await inputElement.type(user);
                            console.log(`Usuário "${user}" digitado no campo de Login (Segunda Vez).`);
                        })
                        .catch(async (error) => {
                            console.log(`Elemento não encontrado no frame (Segunda Vez): ${error.message}.`);
                            throw new Error("Campo de Login não encontrado no frame após a seleção do filtro (Segunda Vez).");
                        });
                } else {
                    console.error("Erro: Iframe não encontrado para a segunda busca.");
                    throw new Error("Iframe não encontrado para a segunda busca.");
                }

            } catch (error) {
                console.error("Erro ao interagir com o campo de Login (Segunda Vez):", error);
            }
        }

        const frameFinal = await page.frames()[1];
        if (frameFinal) {
            await frameFinal.waitForSelector('button[title="Pesquisar"]', { timeout: 5000 });
            await frameFinal.click('button[title="Pesquisar"]')
            console.log("Botão pesquisar clicado (Segunda Vez)")
        } else {
            console.error("Erro: Iframe não encontrado para clicar no botão de pesquisa (Segunda Vez).");
        }

        await new Promise(r => setTimeout(r, 500));
        console.log("Pesquisa iniciada (Segunda Vez).");

        try {
            for (let i = 0; i < 8; i++) {
                await page.keyboard.press('Tab');
                await new Promise(r => setTimeout(r, 500));
            }
            console.log("Elemento encontrado (Reset de Senha).");

            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 500));

            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 500));

            console.log("Nova senha encaminhada para o E-mail cadastrado...");
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error("Erro durante a interação (Reset de Senha):", error);
        }
    });
};
