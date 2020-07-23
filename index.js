const core = require('@actions/core');
const github = require('@actions/github');

const getPrNumber = () => {
    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        return undefined;
    }
    return pullRequest.number;
}

const getChangedServices = async (client, prNumber) => {
    const listFilesResponse = await client.pulls.listFiles({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber
    });

    const changedFiles = listFilesResponse.data.map(f => f.filename);

    core.debug('found changed files:');
    // const changedServices = new Set();
    for (const file of changedFiles) {
        core.debug('  ' + file);
    }

    return changedFiles;
}

// most @actions toolkit packages have async methods
async function run() {
    try {
        const token = core.getInput('repo-token', { required: true });
        const client = github.getOctokit(token);
        const prNumber = getPrNumber();
        if (!prNumber) {
            throw new Error('Could not get pull request number from context, exiting');
        }
        core.debug(`fetching changed services for pr #${prNumber}`);
        await getChangedServices(client, prNumber);

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();