// test_api.js - Script de teste para a API
const http = require('http');

function testAPI() {
  console.log('Testando API de download do YouTube...');
  
  const postData = JSON.stringify({
    url: 'https://www.youtube.com/watch?v=Qhph4bV6i4g',
    type: 'mp4'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/download/youtube',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'X-API-Key': 'test_key'
    }
  };
  
  const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      
      // Tentar fazer parse do JSON
      try {
        const jsonData = JSON.parse(data);
        console.log('JSON válido:', jsonData);
      } catch (parseError) {
        console.log('Erro ao fazer parse do JSON:', parseError.message);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Erro na requisição:', error.message);
  });
  
  req.write(postData);
  req.end();
}

testAPI();