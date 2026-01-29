const { spawn } = require('child_process');
const path = require('path');

/**
 * Runs the NudeNet moderation script on a given image
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<object>} - Moderation result { status: 'safe'|'blocked'|'error', reason: [], error: null }
 */
const moderateImage = (imagePath) => {
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', [
            path.join(__dirname, 'moderate.py'),
            imagePath
        ]);

        let output = '';
        let errorOutput = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            const stderrStr = data.toString();
            errorOutput += stderrStr;
            console.log(`[Python Debug]: ${stderrStr.trim()}`);
        });

        pythonProcess.on('close', (code) => {
            try {
                if (code !== 0 && !output) {
                    return resolve({
                        status: 'error',
                        error: `Python process exited with code ${code}. Stderr: ${errorOutput}`
                    });
                }

                // Find the first valid JSON line in case of warnings
                const lines = output.trim().split('\n');
                for (const line of lines) {
                    if (line.trim().startsWith('{')) {
                        return resolve(JSON.parse(line));
                    }
                }

                resolve({ status: 'error', error: 'No valid JSON output from moderation script' });
            } catch (err) {
                resolve({ status: 'error', error: 'Failed to parse moderation output: ' + err.message });
            }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
            pythonProcess.kill();
            resolve({ status: 'error', error: 'Moderation timed out after 30 seconds' });
        }, 30000);
    });
};

module.exports = { moderateImage };
