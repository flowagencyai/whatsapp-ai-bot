const { chromium } = require('playwright');

(async () => {
  console.log('Iniciando teste do QR Code com Playwright...');
  
  // Inicia o navegador
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Navega para o WhatsApp Web
    console.log('Abrindo WhatsApp Web...');
    await page.goto('https://web.whatsapp.com/', { 
      waitUntil: 'networkidle' 
    });
    
    // Aguarda o QR code aparecer
    console.log('Aguardando QR code do WhatsApp Web...');
    await page.waitForSelector('canvas[aria-label*="Scan"]', { timeout: 30000 });
    
    // Tira screenshot para comparação
    await page.screenshot({ path: 'whatsapp-qr.png' });
    console.log('Screenshot do QR code salvo em whatsapp-qr.png');
    
    // Agora vamos verificar o QR code do bot
    console.log('\nAbrindo página do bot...');
    const page2 = await context.newPage();
    await page2.goto('http://localhost:3000/api/qr');
    
    const response = await page2.evaluate(() => {
      return document.body.innerText;
    });
    
    console.log('\nResposta da API do bot:');
    console.log(JSON.parse(response));
    
    // Aguarda 30 segundos para você comparar manualmente
    console.log('\nMantenha o navegador aberto para comparar os QR codes...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    await browser.close();
  }
})();