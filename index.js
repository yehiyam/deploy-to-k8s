const core = require('@actions/core');
const github = require('@actions/github');
const regex = /^core\/(.+)\/.*$/;
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
    const changedServices = new Set();
    for (const file of changedFiles) {
        const match = file.match(regex);
        if (match && match.length > 2) {
            changedServices.add(match[1])
        }
    }
    core.debug(changedServices)
    return [...changedServices.keys()];
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
        const changedServices = await getChangedServices(client, prNumber);
        core.info(`changed services: ${changedServices}`);

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();