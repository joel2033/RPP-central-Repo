const fs = require('fs');

// Read cookies file
const cookies = fs.readFileSync('cookies.txt', 'utf8');

async function testMediaFilesAPI() {
  try {
    console.log('Testing /api/jobs/17/media-files?mediaType=raw...');
    
    const response = await fetch('http://localhost:5000/api/jobs/17/media-files?mediaType=raw', {
      method: 'GET',
      headers: {
        'Cookie': cookies.replace('\n', ''),
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', [...response.headers.entries()]);
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (response.ok) {
      try {
        const json = JSON.parse(text);
        console.log('Parsed JSON:', json);
        console.log('Number of files:', json.length);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    }
    
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testMediaFilesAPI();