const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Iniciando teste da interface com Playwright...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Captura logs do console
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text());
      } else if (msg.type() === 'warning') {
        console.log('⚠️ Console Warning:', msg.text());
      }
    });
    
    // Captura erros de rede
    page.on('requestfailed', request => {
      console.log('🔴 Request Failed:', request.url(), request.failure().errorText);
    });
    
    // Teste 1: Verificar se o dashboard carrega
    console.log('📊 Testando dashboard...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
    
    // Aguarda o conteúdo carregar
    await page.waitForSelector('h1', { timeout: 10000 });
    const title = await page.textContent('h1');
    console.log(`✅ Dashboard carregado: ${title}`);
    
    // Teste 2: Navegar para página do QR Code
    console.log('🔍 Navegando para página do QR Code...');
    await page.click('text=QR Code');
    
    console.log('⏳ Aguardando página do QR Code carregar...');
    await page.waitForTimeout(3000); // Dar tempo para a página carregar
    
    // Verificar se há erro na página
    const errorMessage = await page.$('text=Erro de Conexão');
    if (errorMessage) {
      const errorText = await errorMessage.textContent();
      console.log('❌ Erro encontrado na página:', errorText);
    }
    
    // Tentar aguardar QR Code com timeout maior
    console.log('🔍 Procurando por QR Code na página...');
    await page.waitForSelector('img[alt*="QR Code"], pre.qr-code', { timeout: 20000 });
    
    // Verifica se existe uma imagem de QR Code
    const qrImage = await page.$('img[alt*="QR Code"]');
    const qrAscii = await page.$('pre.qr-code');
    
    if (qrImage) {
      const src = await qrImage.getAttribute('src');
      console.log('✅ QR Code encontrado como imagem');
      console.log(`📷 Tipo: ${src?.startsWith('data:image') ? 'Base64 Image' : 'External Image'}`);
      
      // Tira screenshot da página
      await page.screenshot({ path: 'qr-test-image.png', fullPage: true });
      console.log('📸 Screenshot salvo: qr-test-image.png');
      
    } else if (qrAscii) {
      const content = await qrAscii.textContent();
      console.log('⚠️  QR Code encontrado apenas como ASCII art');
      console.log(`📝 Primeiros 100 caracteres: ${content?.substring(0, 100)}...`);
      
      // Tira screenshot da página
      await page.screenshot({ path: 'qr-test-ascii.png', fullPage: true });
      console.log('📸 Screenshot salvo: qr-test-ascii.png');
      
    } else {
      console.log('❌ Nenhum QR Code encontrado!');
      await page.screenshot({ path: 'qr-test-error.png', fullPage: true });
      console.log('📸 Screenshot de erro salvo: qr-test-error.png');
    }
    
    // Teste 3: Verificar se a API está respondendo
    console.log('🔌 Testando API diretamente...');
    const apiResponse = await page.goto('http://localhost:3000/api/qr');
    const apiText = await page.textContent('body');
    const apiData = JSON.parse(apiText);
    
    console.log('📡 Resposta da API:');
    console.log(`  - Success: ${apiData.success}`);
    console.log(`  - QR Code String: ${apiData.qrCode ? 'Presente' : 'Ausente'}`);
    console.log(`  - QR Code Image: ${apiData.qrCodeImage ? 'Presente' : 'Ausente'}`);
    console.log(`  - Is Connected: ${apiData.isConnected}`);
    
    // Teste 4: Verificar se é possível escanear o QR
    if (apiData.qrCodeImage) {
      console.log('🔍 Analisando QR Code gerado...');
      
      // Verifica se é uma imagem válida em base64
      const isValidBase64 = apiData.qrCodeImage.startsWith('data:image/png;base64,');
      console.log(`📊 Base64 válido: ${isValidBase64}`);
      
      if (isValidBase64) {
        const base64Length = apiData.qrCodeImage.length;
        console.log(`📏 Tamanho da imagem: ${base64Length} caracteres`);
        
        // Estima o tamanho da imagem em KB
        const estimatedKB = Math.round((base64Length * 0.75) / 1024);
        console.log(`💾 Tamanho estimado: ${estimatedKB}KB`);
      }
    }
    
    console.log('\n🎉 Teste concluído! Aguardando 10 segundos para você verificar...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    await page.screenshot({ path: 'qr-test-failed.png', fullPage: true });
    console.log('📸 Screenshot de falha salvo: qr-test-failed.png');
  } finally {
    await browser.close();
    console.log('👋 Teste finalizado.');
  }
})();