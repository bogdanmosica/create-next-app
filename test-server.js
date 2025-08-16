// Simple test script to verify the MCP server works
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test the MCP server by sending a list tools request
const server = spawn('node', [join(__dirname, 'dist', 'index.js')]);

// Send MCP request to list tools
const listToolsRequest = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list",
  params: {}
}) + '\n';

let responseData = '';

server.stdout.on('data', (data) => {
  responseData += data.toString();
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('Server stderr:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  
  try {
    // Parse the response to verify it contains our tool
    const lines = responseData.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const response = JSON.parse(lastLine);
    
    if (response.result && response.result.tools) {
      const hasCreateTool = response.result.tools.some(tool => tool.name === 'create_nextjs_app');
      if (hasCreateTool) {
        console.log('✅ Test passed: create_nextjs_app tool found in response');
      } else {
        console.log('❌ Test failed: create_nextjs_app tool not found');
      }
    } else {
      console.log('❌ Test failed: Invalid response format');
    }
  } catch (error) {
    console.log('❌ Test failed: Could not parse response', error.message);
  }
});

// Send the request
server.stdin.write(listToolsRequest);

// Close after 3 seconds
setTimeout(() => {
  server.kill();
}, 3000);