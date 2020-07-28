const process = require('process');
const cp = require('child_process');
const path = require('path');

const { getChangedServices } = require('./index')

const clientMock = {
    pulls: {
        listFiles: () => ({
            data: [
                { filename: 'core/algorithm-queue/file1.js' },
                { filename: 'core/algorithm-builder/file2.js' },
                { filename: 'core/algorithm-builder/dockerfile/file2.js' },
                { filename: 'file1.js' },
            ]
        })
    }
}
// shows how the runner will run a javascript action with env / stdout protocol
xtest('test runs', () => {
    process.env['INPUT_MILLISECONDS'] = 500;
    const ip = path.join(__dirname, 'index.js');
    console.log(cp.execSync(`node ${ip}`, { env: process.env }).toString());
})

test('changed services', async () => {
    const res = await getChangedServices(clientMock, 0);
    expect(res).toHaveLength(2)
})
