const fetch = require('node-fetch');

async function testUploadUrl() {
  console.log('Testing upload URL endpoint...');
  
  const response = await fetch('http://localhost:5000/api/job-cards/1/files/upload-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'connect.sid=s%3A8Q-W9TD7xziKiw1O2bwyk_kuQcURnYZT.vwVd9lnh%2FuvgOUVqHF7dYHOXjNyphyx%2BxO5fzDEX5vw'
    },
    body: JSON.stringify({
      fileName: 'DSC03313.dng',
      contentType: 'image/x-adobe-dng',
      mediaType: 'raw',
      fileSize: 25000000
    })
  });
  
  console.log('Response status:', response.status);
  console.log('Response headers:', response.headers);
  
  const text = await response.text();
  console.log('Response body:', text);
  
  if (response.ok) {
    const data = JSON.parse(text);
    console.log('Parsed data:', data);
  }
}

testUploadUrl().catch(console.error);