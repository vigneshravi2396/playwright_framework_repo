/**
 * Start Codegen with Metadata Recording
 * @description A simple script that starts Playwright codegen and provides instructions
 * for injecting metadata recording into the codegen browser.
 * 
 * @example
 * ```bash
 * node src/customRecorder/start-codegen-with-metadata.js https://example.com
 * ```
 * 
 * @author Playwright Boilerplate Team
 * @version 1.0.0
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Starts Playwright codegen with metadata recording instructions
 */
class CodegenWithMetadata {
  constructor(targetUrl) {
    this.targetUrl = targetUrl;
    this.codegenProcess = null;
  }

  async start() {
    console.log('🚀 Starting Playwright Codegen with Metadata Recording...');
    console.log(`📝 Target URL: ${this.targetUrl}\n`);

    // Read the injector script
    const injectorPath = path.join(__dirname, 'CodegenMetadataInjector.js');
    const injectorScript = fs.readFileSync(injectorPath, 'utf8');

    console.log('📋 Instructions:');
    console.log('1. Wait for the codegen browser to open');
    console.log('2. Open browser dev tools (F12)');
    console.log('3. Go to the Console tab');
    console.log('4. Copy and paste the injector script below into the console');
    console.log('5. Press Enter to execute the script');
    console.log('6. Interact with elements to record metadata');
    console.log('7. Run window.downloadMetadata() when done\n');

    console.log('📄 Injector Script:');
    console.log('─'.repeat(80));
    console.log(injectorScript);
    console.log('─'.repeat(80));
    console.log('');

    // Start Playwright codegen
    this.codegenProcess = spawn('npx', ['playwright', 'codegen', this.targetUrl], {
      stdio: 'inherit',
      shell: true
    });

    this.codegenProcess.on('error', (error) => {
      console.error('❌ Failed to start codegen:', error);
    });

    this.codegenProcess.on('spawn', () => {
      console.log('✅ Playwright codegen started');
      console.log('📋 Follow the instructions above to inject metadata recording');
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping codegen...');
      if (this.codegenProcess) {
        this.codegenProcess.kill();
      }
      process.exit(0);
    });
  }
}

// Main execution
const targetUrl = process.argv[2];
if (!targetUrl) {
  console.error('❌ Please provide a target URL');
  console.log('Usage: node src/customRecorder/start-codegen-with-metadata.js <URL>');
  process.exit(1);
}

const codegen = new CodegenWithMetadata(targetUrl);
codegen.start().catch(console.error);
